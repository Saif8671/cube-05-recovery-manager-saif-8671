import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config.settings import settings
from app.database.session import get_db
from app.models.models import Charge

TEST_API_KEY = "test-agent-secret-key-round3"


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)
    monkeypatch.setattr(settings, "ALLOWED_ORGS", "org_demo_alpha,org_demo_bravo")
    # By default in testing, Gemini key is empty so local fallback is used
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# 1. Contradicted (Claim Recommended)
# ---------------------------------------------------------------------------

def test_round3_contradicted_fee(client):
    """
    CONTRADICTED scenario: Physical prep evidence confirms complete packaging compliance,
    contradicting the inbound_defect_fee deduction.
    Check verdict -> FAIL (claim recommended)
    Overall verdict -> claim_recommended
    """
    payload = {
        "workflow_id": "wf-round3-tc01",
        "stage": "recovery",
        "subject": {
            "org_id": "org_demo_alpha",
            "unit_id": "UNIT-R3-001",
            "shipment_id": "FBA-R3-101"
        },
        "fee_lines": [
            {
                "charge_id": "CH-R3-001",
                "reason": "inbound_defect_fee",
                "amount": 35.00,
                "currency": "USD"
            }
        ],
        "previous_evidence": [
            {
                "record_id": "PRP-R3-001",
                "source_stage": "prep",
                "finding": "PASS",
                "unit_id": "UNIT-R3-001",
                "shipment_id": "FBA-R3-101",
                "metadata": {
                    "polybag_present_sealed": "yes",
                    "original_barcode_covered": "yes",
                    "fnsku_label_placement": "flat"
                }
            }
        ]
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Check overall verdict
    assert data["verdict"] == "claim_recommended"
    assert data["outcome"] == "claim_recommended"
    assert data["payload"]["total_recoverable_amount"] == 35.00
    assert data["payload"]["needs_human"] is False

    # Check individual check
    assert len(data["checks"]) == 1
    chk = data["checks"][0]
    assert chk["check_key"] == "charge:CH-R3-001"
    assert chk["verdict"] == "FAIL"  # Contradicted maps to FAIL (claim recommended)
    assert chk["payload"]["claim_amount"] == 35.00
    assert chk["payload"]["assessment"] == "CONTRADICTED"
    assert "PRP-R3-001" in chk["upstream_refs"]


# ---------------------------------------------------------------------------
# 2. Supported (Fee Justified, No Claim)
# ---------------------------------------------------------------------------

def test_round3_supported_fee(client):
    """
    SUPPORTED scenario: Operational evidence documents actual defect (e.g. polybag not sealed).
    Check verdict -> PASS (fee is justified)
    Overall verdict -> no_claim
    """
    payload = {
        "workflow_id": "wf-round3-tc02",
        "stage": "recovery",
        "subject": {
            "org_id": "org_demo_alpha",
            "unit_id": "UNIT-R3-002",
            "shipment_id": "FBA-R3-102"
        },
        "fee_lines": [
            {
                "charge_id": "CH-R3-002",
                "reason": "inbound_defect_fee",
                "amount": 25.00,
                "currency": "USD"
            }
        ],
        "previous_evidence": [
            {
                "record_id": "PRP-R3-002",
                "source_stage": "prep",
                "finding": "FAIL",
                "unit_id": "UNIT-R3-002",
                "shipment_id": "FBA-R3-102",
                "metadata": {
                    "polybag_present_sealed": "not_sealed",
                    "original_barcode_covered": "no"
                }
            }
        ]
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["verdict"] == "no_claim"
    assert data["payload"]["total_recoverable_amount"] == 0.00
    assert data["payload"]["needs_human"] is False

    chk = data["checks"][0]
    assert chk["check_key"] == "charge:CH-R3-002"
    assert chk["verdict"] == "PASS"  # Supported fee passes audit verification
    assert chk["payload"]["claim_amount"] == 0.00
    assert chk["payload"]["assessment"] == "SUPPORTED"


# ---------------------------------------------------------------------------
# 3. Silent (No Evidence Found)
# ---------------------------------------------------------------------------

def test_round3_silent_fee(client):
    """
    SILENT scenario: No operational records address the alleged fee.
    Check verdict -> SILENT with detail containing 'SILENT'
    Overall verdict -> no_claim
    """
    payload = {
        "workflow_id": "wf-round3-tc03",
        "stage": "recovery",
        "subject": {
            "org_id": "org_demo_alpha",
            "unit_id": "UNIT-GHOST-999"
        },
        "fee_lines": [
            {
                "charge_id": "CH-R3-003",
                "reason": "inbound_defect_fee",
                "amount": 50.00,
                "currency": "USD"
            }
        ],
        "previous_evidence": []
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["verdict"] == "no_claim"
    assert data["payload"]["total_recoverable_amount"] == 0.00

    chk = data["checks"][0]
    assert chk["check_key"] == "charge:CH-R3-003"
    assert chk["verdict"] == "SILENT"
    assert "SILENT" in chk["detail"]
    assert chk["payload"]["claim_amount"] == 0.00
    assert chk["payload"]["assessment"] == "SILENT"


# ---------------------------------------------------------------------------
# 4. Uncertain Upstream (Ambiguous Evidence -> Needs Human)
# ---------------------------------------------------------------------------

def test_round3_uncertain_upstream(client):
    """
    UNCERTAIN scenario: Upstream evidence has ambiguous / pending_review findings.
    Check verdict -> UNCERTAIN
    Overall verdict -> needs_human
    """
    payload = {
        "workflow_id": "wf-round3-tc04",
        "stage": "recovery",
        "subject": {
            "org_id": "org_demo_alpha",
            "unit_id": "UNIT-R3-004",
            "shipment_id": "FBA-R3-104"
        },
        "fee_lines": [
            {
                "charge_id": "CH-R3-004",
                "reason": "inbound_defect_fee",
                "amount": 40.00,
                "currency": "USD"
            }
        ],
        "previous_evidence": [
            {
                "record_id": "PRP-R3-004",
                "source_stage": "prep",
                "finding": "UNCERTAIN",
                "unit_id": "UNIT-R3-004",
                "shipment_id": "FBA-R3-104",
                "metadata": {
                    "polybag_present_sealed": "uncertain"
                }
            }
        ]
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["verdict"] == "needs_human"
    assert data["payload"]["needs_human"] is True
    assert data["payload"]["total_recoverable_amount"] == 0.00

    chk = data["checks"][0]
    assert chk["check_key"] == "charge:CH-R3-004"
    assert chk["verdict"] == "UNCERTAIN"
    assert chk["payload"]["claim_amount"] == 0.00


# ---------------------------------------------------------------------------
# 5. Tenancy & Unauthorized Tenant / Mismatch
# ---------------------------------------------------------------------------

def test_round3_unauthorized_tenant_returns_403(client):
    """Calling with unauthorized org_id must return 403 FORBIDDEN_TENANT."""
    payload = {
        "workflow_id": "wf-test-tenancy",
        "subject": {"org_id": "org_unauthorized_evil", "unit_id": "U1"},
        "fee_lines": [{"charge_id": "C1", "amount": 10.0, "reason": "defect"}]
    }
    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_unauthorized_evil"},
        json=payload
    )
    assert resp.status_code == 403
    err = resp.json()["error"]
    assert err["code"] == "FORBIDDEN_TENANT"


def test_round3_tenant_header_body_mismatch_returns_403(client):
    """Header X-Org-ID and body org_id mismatch must return 403 FORBIDDEN_TENANT."""
    payload = {
        "workflow_id": "wf-test-tenancy",
        "subject": {"org_id": "org_demo_bravo", "unit_id": "U1"},
        "fee_lines": [{"charge_id": "C1", "amount": 10.0, "reason": "defect"}]
    }
    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 403
    err = resp.json()["error"]
    assert err["code"] == "FORBIDDEN_TENANT"


# ---------------------------------------------------------------------------
# 6. Missing Previous Evidence (Graceful Fallback)
# ---------------------------------------------------------------------------

def test_round3_missing_previous_evidence(client):
    """When previous_evidence field is omitted entirely, must handle gracefully as SILENT."""
    payload = {
        "workflow_id": "wf-no-prev-ev",
        "stage": "recovery",
        "subject": {
            "org_id": "org_demo_alpha",
            "unit_id": "UNIT-EMPTY-EV"
        },
        "charges": [
            {
                "charge_id": "CH-EMPTY-01",
                "reason": "inbound_defect_fee",
                "amount": 15.00
            }
        ]
        # previous_evidence omitted
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "no_claim"
    assert data["checks"][0]["verdict"] == "SILENT"


# ---------------------------------------------------------------------------
# 7. Repeated Call Idempotency & No DB Mutation
# ---------------------------------------------------------------------------

def test_round3_repeated_call_idempotency(client):
    """
    Calling /run twice with the identical input:
    1. Must return the exact same output.
    2. Must NOT produce DUPLICATE or ALREADY_REIMBURSED caused by its own earlier run.
    3. Must NOT persist the charge or evidence into the shared DB.
    """
    unique_cid = f"CH-IDEMP-{uuid.uuid4().hex[:6]}"
    unique_uid = f"UNIT-IDEMP-{uuid.uuid4().hex[:6]}"
    unique_eid = f"PRP-IDEMP-{uuid.uuid4().hex[:6]}"

    payload = {
        "workflow_id": f"wf-idemp-{uuid.uuid4().hex[:6]}",
        "stage": "recovery",
        "subject": {
            "org_id": "org_demo_alpha",
            "unit_id": unique_uid
        },
        "charges": [
            {
                "charge_id": unique_cid,
                "reason": "inbound_defect_fee",
                "amount": 35.00,
                "currency": "USD"
            }
        ],
        "previous_evidence": [
            {
                "record_id": unique_eid,
                "source_stage": "prep",
                "finding": "PASS",
                "unit_id": unique_uid,
                "metadata": {
                    "polybag_present_sealed": "yes",
                    "original_barcode_covered": "yes"
                }
            }
        ]
    }

    # First Call
    resp1 = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["verdict"] == "claim_recommended"
    assert data1["checks"][0]["verdict"] == "FAIL"
    assert data1["checks"][0]["payload"]["claim_amount"] == 35.00

    # Second Call
    resp2 = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp2.status_code == 200
    data2 = resp2.json()

    # Second call MUST NOT be flagged as DUPLICATE or ALREADY_REIMBURSED
    assert data2["verdict"] == "claim_recommended"
    assert data2["checks"][0]["verdict"] == "FAIL"
    assert data2["checks"][0]["payload"]["assessment"] == "CONTRADICTED"
    assert data2["checks"][0]["payload"]["claim_amount"] == 35.00
    assert data1["metadata"]["sha256"] == data2["metadata"]["sha256"]


# ---------------------------------------------------------------------------
# 8. Invalid Payload (Validation & Error Envelopes)
# ---------------------------------------------------------------------------

def test_round3_empty_body_returns_422(client):
    """Empty request body must return 422 INVALID_INPUT with request_id."""
    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        content=b""
    )
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "INVALID_INPUT"
    assert "request_id" in err


def test_round3_missing_charges_returns_422(client):
    """Payload without any charges must return 422 INVALID_INPUT."""
    payload = {
        "workflow_id": "wf-no-charges",
        "subject": {
            "org_id": "org_demo_alpha",
            "unit_id": "UNIT-01"
        }
    }
    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "INVALID_INPUT"


def test_round3_missing_org_id_returns_422(client):
    """Payload without any org_id anywhere must return 422 INVALID_INPUT."""
    payload = {
        "workflow_id": "wf-no-org",
        "subject": {"unit_id": "UNIT-01"},
        "charges": [{"charge_id": "C1", "reason": "defect", "amount": 10.0}]
    }
    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY},  # No X-Org-ID header
        json=payload
    )
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "INVALID_INPUT"


# ---------------------------------------------------------------------------
# 9. Metadata & Local Fallback Handling
# ---------------------------------------------------------------------------

def test_round3_metadata_and_local_fallback(client):
    """
    Verify metadata shape:
    - sha256 input hash
    - produced_at ISO timestamp
    - cost_usd and llm_calls
    - model reflects deterministic or local fallback
    """
    payload = {
        "workflow_id": "wf-meta-check",
        "subject": {
            "org_id": "org_demo_bravo",
            "unit_id": "UNIT-BRV-99"
        },
        "fee_lines": [
            {
                "charge_id": "CH-BRV-META-1",
                "reason": "inbound_defect_fee",
                "amount": 20.0
            }
        ],
        "previous_evidence": []
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_bravo"},
        json=payload
    )
    assert resp.status_code == 200
    meta = resp.json()["metadata"]

    assert "model" in meta
    assert "model_version" in meta
    assert "llm_calls" in meta
    assert meta["llm_calls"] == 0
    assert meta["cost_usd"] == 0.0
    assert "sha256" in meta
    assert len(meta["sha256"]) == 64
    assert "produced_at" in meta
    assert "fallback_used" in meta
