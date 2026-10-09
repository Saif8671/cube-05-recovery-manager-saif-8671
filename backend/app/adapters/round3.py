import os
import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.config.settings import settings
from app.database.session import get_db
from app.api.auth import verify_api_key
from app.api.tenancy import resolve_org_id
from app.models.models import (
    Base,
    Company,
    Charge,
    EvidenceRecord,
    EvidenceChunk,
    Investigation,
    ClaimLedger
)
from app.agents.recovery_agent import RecoveryAgent
from app.rag.retrieval import hybrid_retrieval_engine
from app.services.llm_reasoner import LLMRecoveryReasoner

round3_router = APIRouter(tags=["Round 3 Adapter"])

# In-memory idempotency cache: (org_id, workflow_id, unit_id, input_hash) -> response dict
_IDEMPOTENCY_CACHE: Dict[str, Dict[str, Any]] = {}


def _canonical_json_sha256(data: Any) -> str:
    """Compute sha256 hash of canonicalized JSON (keys sorted)."""
    serialized = json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _extract_subject_info(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Extract and normalize subject metadata with fallback mapping."""
    raw_subj = payload.get("subject")
    subject = dict(raw_subj) if isinstance(raw_subj, dict) else {}

    org_id = (
        payload.get("org_id")
        or subject.get("org_id")
        or payload.get("company_id")
        or subject.get("company_id")
    )
    unit_id = subject.get("unit_id") or payload.get("unit_id")
    shipment_id = (
        subject.get("shipment_id")
        or payload.get("shipment_id")
        or subject.get("fba_shipment_id")
        or payload.get("fba_shipment_id")
    )
    order_id = subject.get("order_id") or payload.get("order_id")
    sku = subject.get("sku") or payload.get("sku")
    fnsku = subject.get("fnsku") or payload.get("fnsku")

    normalized = {
        "org_id": str(org_id).strip() if org_id else None,
        "unit_id": str(unit_id).strip() if unit_id else None,
        "shipment_id": str(shipment_id).strip() if shipment_id else None,
        "order_id": str(order_id).strip() if order_id else None,
        "sku": str(sku).strip() if sku else None,
        "fnsku": str(fnsku).strip() if fnsku else None
    }
    # Preserve other fields from original subject
    for k, v in subject.items():
        if k not in normalized and v is not None:
            normalized[k] = v
    return normalized


def _extract_charges(payload: Dict[str, Any], subject: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract and normalize fee lines / charges from various aliases."""
    raw_charges = (
        payload.get("charges")
        or payload.get("fee_lines")
        or payload.get("fee_report_lines")
        or payload.get("fees")
        or payload.get("fee_report")
        or payload.get("charge")
        or subject.get("charges")
        or subject.get("fee_lines")
    )

    if not raw_charges:
        # Check if subject itself is a single charge
        if "reason" in payload or "charge_type" in payload or "amount" in payload:
            raw_charges = [payload]
        elif "reason" in subject or "charge_type" in subject or "amount" in subject:
            raw_charges = [subject]
        else:
            raw_charges = []

    if isinstance(raw_charges, dict):
        raw_charges = [raw_charges]

    normalized_charges: List[Dict[str, Any]] = []
    for idx, item in enumerate(raw_charges):
        if not isinstance(item, dict):
            continue
        cid = item.get("charge_id") or item.get("line_id") or item.get("id") or f"CH-{idx+1}"
        reason = (
            item.get("reason")
            or item.get("charge_type")
            or item.get("charge_reason")
            or "inbound_defect_fee"
        )
        amt_raw = item.get("amount") if item.get("amount") is not None else item.get("amount_usd", item.get("fee_amount", 0.0))
        try:
            amount = float(amt_raw)
        except (ValueError, TypeError):
            amount = 0.0

        currency = item.get("currency") or "USD"
        charge_date = (
            item.get("charge_date")
            or item.get("posted_date")
            or item.get("date")
            or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        )

        uid = item.get("unit_id") or subject.get("unit_id")
        shp = item.get("shipment_id") or item.get("fba_shipment_id") or subject.get("shipment_id")
        ord_id = item.get("order_id") or subject.get("order_id")
        sku = item.get("sku") or subject.get("sku")
        fnsku = item.get("fnsku") or subject.get("fnsku")

        normalized_charges.append({
            "charge_id": str(cid),
            "reason": str(reason),
            "amount": amount,
            "currency": str(currency),
            "charge_date": str(charge_date),
            "unit_id": str(uid) if uid else None,
            "shipment_id": str(shp) if shp else None,
            "order_id": str(ord_id) if ord_id else None,
            "sku": str(sku) if sku else None,
            "fnsku": str(fnsku) if fnsku else None
        })

    return normalized_charges


def _extract_evidence(payload: Dict[str, Any], subject: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract and normalize previous_evidence records."""
    raw_ev = (
        payload.get("previous_evidence")
        or payload.get("evidence")
        or payload.get("evidence_records")
        or payload.get("operational_records")
        or []
    )

    if isinstance(raw_ev, dict):
        raw_ev = [raw_ev]

    normalized_evidence: List[Dict[str, Any]] = []
    for idx, item in enumerate(raw_ev):
        if not isinstance(item, dict):
            continue

        rid = item.get("record_id") or item.get("evidence_id") or item.get("id") or f"EV-{idx+1}"
        rid_str = str(rid)

        # Source stage
        stage = item.get("source_stage") or item.get("stage") or item.get("source_type")
        if not stage:
            upper = rid_str.upper()
            if upper.startswith("PRP") or "PREP" in upper:
                stage = "prep"
            elif upper.startswith("RCV") or "RECEIV" in upper:
                stage = "receiving"
            elif upper.startswith("PCK") or "PACK" in upper:
                stage = "pack"
            elif upper.startswith("RTN") or "RETURN" in upper:
                stage = "returns"
            else:
                stage = "prep"
        stage = str(stage).lower()

        # Finding / verdict
        finding_raw = (
            item.get("finding")
            or item.get("verdict")
            or item.get("check_result")
            or item.get("status")
            or "PASS"
        )
        finding = str(finding_raw).upper()

        # Build raw payload dictionary from various metadata formats
        payload_dict: Dict[str, Any] = {}
        for sub_key in ["raw_payload", "metadata", "checks", "check_results", "details"]:
            if isinstance(item.get(sub_key), dict):
                payload_dict.update(item[sub_key])

        # Merge direct keys
        direct_keys = [
            "polybag_present_sealed", "original_barcode_covered", "fnsku_label_placement",
            "handling_marks", "suffocation_warning", "carton_damage", "unit_damage",
            "qty_ordered", "qty_received", "observed_state", "operator_disposition"
        ]
        for dk in direct_keys:
            if dk in item and item[dk] is not None:
                payload_dict[dk] = item[dk]

        # Stage-specific defaults based on finding if not provided
        if stage == "prep":
            if finding == "PASS":
                payload_dict.setdefault("polybag_present_sealed", "yes")
                payload_dict.setdefault("original_barcode_covered", "yes")
                payload_dict.setdefault("fnsku_label_placement", "flat")
            elif finding == "FAIL":
                payload_dict.setdefault("polybag_present_sealed", "not_sealed")
                payload_dict.setdefault("original_barcode_covered", "no")
            elif finding in ["UNCERTAIN", "PENDING_REVIEW"]:
                payload_dict.setdefault("polybag_present_sealed", "uncertain")
        elif stage == "receiving":
            if finding == "PASS":
                payload_dict.setdefault("carton_damage", "none")
                payload_dict.setdefault("unit_damage", "none")
            elif finding in ["DAMAGED", "FAIL"]:
                payload_dict.setdefault("carton_damage", "crushing")
        elif stage == "returns":
            payload_dict.setdefault("observed_state", "unopened_mint")
            payload_dict.setdefault("operator_disposition", "restock")

        uid = item.get("unit_id") or subject.get("unit_id")
        shp = item.get("shipment_id") or item.get("fba_shipment_id") or subject.get("shipment_id")
        ord_id = item.get("order_id") or subject.get("order_id")
        sku = item.get("sku") or subject.get("sku")
        cap_at = item.get("captured_at") or item.get("timestamp") or item.get("created_at")

        desc = item.get("description") or f"{stage.capitalize()} operational verification record for {uid or 'unit'}"

        normalized_evidence.append({
            "record_id": rid_str,
            "source_stage": stage,
            "finding": finding,
            "unit_id": str(uid) if uid else None,
            "shipment_id": str(shp) if shp else None,
            "order_id": str(ord_id) if ord_id else None,
            "sku": str(sku) if sku else None,
            "captured_at": str(cap_at) if cap_at else datetime.now(timezone.utc).isoformat(),
            "event_type": str(item.get("event_type") or f"fba_{stage}_compliance"),
            "description": str(desc),
            "photo_refs": str(item.get("photo_refs") or ""),
            "operator_id": str(item.get("operator_id") or "op_round3"),
            "payload_dict": payload_dict
        })

    return normalized_evidence


def _setup_isolated_session(shared_db: Session, org_id: str, evidence_items: List[Dict[str, Any]]):
    """
    Creates an isolated in-memory SQLite database populated with:
    1. Existing shared DB Charges, Investigations, and ClaimLedger for org_id (read state without mutating shared DB).
    2. The request-scoped in-memory EvidenceRecord and EvidenceChunk instances.
    Returns (engine, session).
    """
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionMem = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionMem()

    # Seed Company for foreign keys
    session.add(Company(id=org_id, name=org_id))

    # Read state: Copy existing Charges from shared DB for org_id
    existing_charges = shared_db.query(Charge).filter(Charge.company_id == org_id).all()
    for c in existing_charges:
        session.add(Charge(
            id=c.id,
            company_id=c.company_id,
            charge_id=c.charge_id,
            unit_id=c.unit_id,
            shipment_id=c.shipment_id,
            order_id=c.order_id,
            sku=c.sku,
            fnsku=c.fnsku,
            reason=c.reason,
            amount=c.amount,
            currency=c.currency,
            charge_date=c.charge_date,
            status=c.status
        ))

    # Read state: Copy existing Investigations from shared DB for org_id
    existing_invs = shared_db.query(Investigation).filter(Investigation.company_id == org_id).all()
    for inv in existing_invs:
        session.add(Investigation(
            id=inv.id,
            company_id=inv.company_id,
            charge_id=inv.charge_id,
            assessment=inv.assessment,
            claim_supported=inv.claim_supported,
            claim_amount=inv.claim_amount,
            currency=inv.currency,
            reasoning=inv.reasoning,
            unsupported_reason=inv.unsupported_reason
        ))

    # Read state: Copy existing ClaimLedger from shared DB for org_id
    existing_ledgers = shared_db.query(ClaimLedger).filter(ClaimLedger.company_id == org_id).all()
    for l in existing_ledgers:
        session.add(ClaimLedger(
            id=l.id,
            company_id=l.company_id,
            claim_id=l.claim_id,
            charge_id=l.charge_id,
            unit_id=l.unit_id,
            shipment_id=l.shipment_id,
            order_id=l.order_id,
            claimed_quantity=l.claimed_quantity,
            claimed_amount=l.claimed_amount
        ))

    # Populate request-scoped EvidenceRecord and EvidenceChunk
    for ev in evidence_items:
        rec = EvidenceRecord(
            id=str(uuid.uuid4()),
            company_id=org_id,
            evidence_id=ev["record_id"],  # Preserve original record_id
            source_type=ev["source_stage"],
            unit_id=ev["unit_id"],
            shipment_id=ev["shipment_id"],
            order_id=ev["order_id"],
            sku=ev["sku"],
            event_type=ev["event_type"],
            finding=ev["finding"],
            description=ev["description"],
            raw_payload=ev["payload_dict"],
            photo_refs=ev["photo_refs"],
            operator_id=ev["operator_id"],
            timestamp=ev["captured_at"]
        )
        session.add(rec)

        chunk_text = f"{ev['description']} {ev['source_stage']} {ev['finding']}"
        chunk = EvidenceChunk(
            id=str(uuid.uuid4()),
            company_id=org_id,
            evidence_id=ev["record_id"],
            content=chunk_text,
            embedding=hybrid_retrieval_engine.get_embedding(chunk_text)
        )
        session.add(chunk)

    session.commit()
    return engine, session


@round3_router.post("/run", dependencies=[Depends(verify_api_key)])
@round3_router.post("/api/v1/run", dependencies=[Depends(verify_api_key)])
async def run_recovery_adapter(
    request: Request,
    shared_db: Session = Depends(get_db),
    org_id: str = Depends(resolve_org_id)
) -> Dict[str, Any]:
    """
    Round 3 Orchestrator Adapter endpoint for Recovery Manager:
    - Scoped strictly to org_id without mutating the shared database.
    - Investigates fee report lines against request-scoped previous_evidence.
    - Idempotent and deterministic.
    """
    # 1. Parse JSON body
    try:
        raw_body = await request.body()
        if not raw_body:
            raise HTTPException(status_code=422, detail="Request body cannot be empty")
        body = json.loads(raw_body.decode("utf-8"))
        if not isinstance(body, dict):
            raise HTTPException(status_code=422, detail="Request body must be a JSON object")
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid JSON format")

    # Canonicalize input and compute hash for idempotency and audit metadata
    input_sha256 = _canonical_json_sha256(body)
    workflow_id = str(body.get("workflow_id") or body.get("id") or f"wf-{uuid.uuid4().hex[:8]}")
    stage = str(body.get("stage") or "recovery")

    # 2. Extract and validate subject
    subject = _extract_subject_info(body)
    unit_id = subject.get("unit_id") or "unspecified_unit"

    # Idempotency check: (org_id, workflow_id, unit_id, input_sha256)
    cache_key = f"{org_id}:{workflow_id}:{unit_id}:{input_sha256}"
    if cache_key in _IDEMPOTENCY_CACHE:
        return _IDEMPOTENCY_CACHE[cache_key]

    # 3. Extract fee lines and previous evidence
    charges_to_investigate = _extract_charges(body, subject)
    evidence_records = _extract_evidence(body, subject)

    if not charges_to_investigate:
        raise HTTPException(status_code=422, detail="No fee lines or charges provided for investigation")

    # Reset LLM reasoner call info tracker
    LLMRecoveryReasoner.reset_call_info()

    # 4. Create request-scoped isolated database session
    mem_engine, mem_session = _setup_isolated_session(shared_db, org_id, evidence_records)

    checks: List[Dict[str, Any]] = []
    total_recoverable_amount = 0.0

    try:
        # 5. Run RecoveryAgent.investigate_charge for each fee line
        for charge_data in charges_to_investigate:
            charge_obj = Charge(
                id=str(uuid.uuid4()),
                company_id=org_id,
                charge_id=charge_data["charge_id"],
                unit_id=charge_data["unit_id"],
                shipment_id=charge_data["shipment_id"],
                order_id=charge_data["order_id"],
                sku=charge_data["sku"],
                fnsku=charge_data["fnsku"],
                reason=charge_data["reason"],
                amount=charge_data["amount"],
                currency=charge_data["currency"],
                charge_date=charge_data["charge_date"],
                status="UNINVESTIGATED"
            )

            result = RecoveryAgent.investigate_charge(mem_session, charge_obj)

            # Record charge into in-memory session only to detect intra-batch duplicates
            mem_session.add(charge_obj)
            mem_session.commit()

            # Map assessment to check verdict
            # CONTRADICTED -> FAIL (claim recommended; evidence contradicts fee)
            # SUPPORTED    -> PASS (fee is justified)
            # SILENT       -> SILENT
            # UNCERTAIN    -> UNCERTAIN
            # DUPLICATE / ALREADY_REIMBURSED -> record in payload, no claim
            assessment = result.assessment
            claim_amount = float(result.claim_amount) if result.claim_supported else 0.0

            if assessment == "CONTRADICTED":
                check_verdict = "FAIL"
                expected = f"Documented operational defect or non-compliance for '{charge_data['reason']}'"
                observed = f"Physical evidence contradicts fee deduction: {result.reasoning}"
                confidence = 0.95
                total_recoverable_amount += claim_amount
            elif assessment == "SUPPORTED":
                check_verdict = "PASS"
                expected = f"Operational compliance for '{charge_data['reason']}'"
                observed = f"Operational logs substantiate fee deduction: {result.reasoning}"
                confidence = 0.95
            elif assessment == "SILENT":
                check_verdict = "SILENT"
                expected = f"Operational documentation addressing '{charge_data['reason']}'"
                observed = "No operational records found addressing fee allegation"
                confidence = 0.90
            elif assessment == "UNCERTAIN":
                check_verdict = "UNCERTAIN"
                expected = f"Definitive compliance proof for '{charge_data['reason']}'"
                observed = f"Ambiguous or inconclusive operational documentation: {result.reasoning}"
                confidence = 0.50
            elif assessment == "DUPLICATE":
                check_verdict = "DUPLICATE"
                expected = "Unique billing event"
                observed = f"Duplicate fee detected: {result.reasoning}"
                confidence = 0.99
            elif assessment == "ALREADY_REIMBURSED":
                check_verdict = "ALREADY_REIMBURSED"
                expected = "Unrefunded charge line"
                observed = f"Prior reimbursement located: {result.reasoning}"
                confidence = 0.99
            else:
                check_verdict = "UNCERTAIN"
                expected = "Definitive evidence"
                observed = result.reasoning
                confidence = 0.50

            # Detail format: for SILENT, ensure "SILENT" is present as required
            detail = result.reasoning
            if check_verdict == "SILENT" and not detail.startswith("SILENT"):
                detail = f"SILENT: {detail}"

            check_item = {
                "check_key": f"charge:{charge_data['charge_id']}",
                "verdict": check_verdict,
                "expected": expected,
                "observed": observed,
                "detail": detail,
                "confidence": confidence,
                "upstream_refs": result.evidence_ids or [],
                "payload": {
                    "charge_id": charge_data["charge_id"],
                    "assessment": assessment,
                    "claim_amount": round(claim_amount, 2),
                    "currency": charge_data["currency"],
                    "reason": charge_data["reason"],
                    "unsupported_reason": result.unsupported_reason,
                    "coverage_summary": result.coverage_summary or {}
                }
            }
            checks.append(check_item)

    finally:
        mem_session.close()
        mem_engine.dispose()

    # 6. Overall verdict / outcome: claim_recommended / no_claim / needs_human
    any_uncertain = any(c["verdict"] == "UNCERTAIN" for c in checks)
    if any_uncertain:
        overall_verdict = "needs_human"
        needs_human = True
    elif total_recoverable_amount > 0:
        overall_verdict = "claim_recommended"
        needs_human = False
    else:
        overall_verdict = "no_claim"
        needs_human = False

    # 7. Metadata
    call_info = LLMRecoveryReasoner.last_call_info
    metadata = {
        "model": call_info.get("model", "deterministic-rule-engine"),
        "model_version": call_info.get("model_version", "1.0.0"),
        "llm_calls": call_info.get("llm_calls", 0),
        "cost_usd": round(call_info.get("cost_usd", 0.0), 6),
        "sha256": input_sha256,
        "input_hash": input_sha256,
        "produced_at": datetime.now(timezone.utc).isoformat(),
        "fallback_used": call_info.get("fallback_used", False)
    }

    response_payload = {
        "workflow_id": workflow_id,
        "stage": stage,
        "subject": subject,
        "verdict": overall_verdict,
        "outcome": overall_verdict,
        "checks": checks,
        "payload": {
            "total_recoverable_amount": round(total_recoverable_amount, 2),
            "currency": charges_to_investigate[0]["currency"] if charges_to_investigate else "USD",
            "needs_human": needs_human,
            "charges_analyzed": len(checks),
            "claims_recommended": len([c for c in checks if c["payload"]["claim_amount"] > 0])
        },
        "metadata": metadata
    }

    # Store in idempotency cache
    _IDEMPOTENCY_CACHE[cache_key] = response_payload

    return response_payload
