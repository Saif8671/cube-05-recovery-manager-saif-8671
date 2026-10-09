# Pod 3 Interoperability & Evidence Contract: Recovery Manager

- **Agent Identity:** `recovery` (`RCY Recovery Manager`)
- **Stage:** `recovery` (Step 5 of Warehouse & Logistics Multi-Agent Pod 3)
- **Protocol:** HTTP REST / JSON
- **Specification Version:** `1.0.0`


---

## 1. System Architecture & Request Flow

The **Recovery Manager** acts as the financial defense and claim reconciliation layer within Pod 3. It interfaces upstream with Receiving (Pod 1), Prep (Pod 2), Pack (Pod 3), and Returns (Pod 4) operational records.

```
       ┌────────────────────────────────────────────────────────┐
       │                  Pod 3 Orchestrator                    │
       └──────────────────────────┬─────────────────────────────┘
                                  │ POST /run (X-API-Key, X-Org-ID)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Recovery Manager Service                           │
│                                                                         │
│  1. Authenticate & Resolve Tenancy (X-API-Key, X-Org-ID vs subject)     │
│  2. Canonicalize JSON & Verify SHA-256 Idempotency Cache                │
│  3. Spin up Request-Scoped Isolated In-Memory Database Session          │
│  4. Load Read-Only Historical DB State (Duplicate / Ledger Bounds)       │
│  5. Ingest Previous Operational Evidence (Receiving, Prep, Pack, Rtn)   │
│  6. Execute RecoveryAgent Forensic Reasoner on Each Fee Line            │
│  7. Assemble Check-Level Outcomes & Cryptographic Provenance Citations │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ JSON Response
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │    Standardized Agent Output Envelope (Checks + Verdict)│
       └────────────────────────────────────────────────────────┘
```

---

## 2. Implemented Endpoints

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/health` | `GET` | No | Liveness probe returning agent identity and version |
| `/health/ready` | `GET` | No | Readiness probe verifying database connectivity (`SELECT 1`) |
| `/run` | `POST` | Yes (`X-API-Key`) | Orchestrator runner for evaluating fee deductions |
| `/api/v1/run` | `POST` | Yes (`X-API-Key`) | Backward-compatible alias for `/run` |
| `/` | `GET` | No | Root system discovery info |

---

## 3. Orchestrator Contract: `POST /run`

### A. HTTP Request Specification

- **Headers:**
  - `Content-Type: application/json`
  - `X-API-Key: <AGENT_API_KEY>` (enforced when `REQUIRE_AUTH=true` or key is configured)
  - `X-Org-ID: <org_id>` (enforced tenant isolation; must match `subject.org_id`)
  - `X-Request-ID: <uuid>` (optional; echoed in logs and error responses)

- **Request Body Schema:**
```json
{
  "workflow_id": "wf-round3-2026-001",
  "stage": "recovery",
  "action": "investigate",
  "subject": {
    "org_id": "org_demo_alpha",
    "unit_id": "UNIT-8821",
    "shipment_id": "FBA-17482",
    "order_id": "ORD-99102",
    "sku": "SKU-PREM-BAG",
    "fnsku": "X0091827"
  },
  "fee_lines": [
    {
      "charge_id": "CH-1001",
      "reason": "inbound_defect_fee",
      "amount": 35.00,
      "currency": "USD",
      "charge_date": "2026-10-01"
    }
  ],
  "previous_evidence": [
    {
      "record_id": "PRP-2026-901",
      "source_stage": "prep",
      "finding": "PASS",
      "unit_id": "UNIT-8821",
      "shipment_id": "FBA-17482",
      "captured_at": "2026-09-30T14:22:00Z",
      "metadata": {
        "polybag_present_sealed": "yes",
        "original_barcode_covered": "yes",
        "fnsku_label_placement": "flat"
      }
    }
  ]
}
```

### B. HTTP Response Specification

- **Status Code:** `200 OK`
- **Response Body Schema:**
```json
{
  "workflow_id": "wf-round3-2026-001",
  "stage": "recovery",
  "subject": {
    "org_id": "org_demo_alpha",
    "unit_id": "UNIT-8821",
    "shipment_id": "FBA-17482",
    "order_id": "ORD-99102",
    "sku": "SKU-PREM-BAG",
    "fnsku": "X0091827"
  },
  "verdict": "claim_recommended",
  "outcome": "claim_recommended",
  "checks": [
    {
      "check_key": "charge:CH-1001",
      "verdict": "FAIL",
      "expected": "Documented operational defect or non-compliance for 'inbound_defect_fee'",
      "observed": "Physical evidence contradicts fee deduction: The charge alleges 'inbound_defect_fee', while Prep Manager evidence (PRP-2026-901) confirms packaging integrity and compliance (polybag sealed, barcode covered, label flat) prior to FBA shipment handover.",
      "detail": "The charge alleges 'inbound_defect_fee', while Prep Manager evidence (PRP-2026-901) confirms packaging integrity and compliance (polybag sealed, barcode covered, label flat) prior to FBA shipment handover.",
      "confidence": 0.95,
      "upstream_refs": [
        "PRP-2026-901"
      ],
      "payload": {
        "charge_id": "CH-1001",
        "assessment": "CONTRADICTED",
        "claim_amount": 35.0,
        "currency": "USD",
        "reason": "inbound_defect_fee",
        "unsupported_reason": null,
        "coverage_summary": {
          "verified_items": [
            "Prep Manager polybag sealed verified",
            "Prep Manager barcode covered verified",
            "Prep Manager label placement verified flat"
          ],
          "missing_items": []
        }
      }
    }
  ],
  "payload": {
    "total_recoverable_amount": 35.0,
    "currency": "USD",
    "needs_human": false,
    "charges_analyzed": 1,
    "claims_recommended": 1
  },
  "metadata": {
    "model": "deterministic-rule-engine",
    "model_version": "1.0.0",
    "llm_calls": 0,
    "cost_usd": 0.0,
    "sha256": "4b68ef5c...",
    "input_hash": "4b68ef5c...",
    "produced_at": "2026-10-09T13:30:00Z",
    "fallback_used": false
  }
}
```

---

## 4. Verdict & Assessment Mapping Matrix

| Underlying Assessment | Check Verdict | Expected Claim | Condition / Reason |
|---|---|---|---|
| **`CONTRADICTED`** | **`FAIL`** | Full Fee Amount ($>0$) | Upstream operational logs refute defect claim (claim is recommended to recover loss). |
| **`SUPPORTED`** | **`PASS`** | `$0.00` | Operational logs confirm defect was real; deduction is justified. |
| **`SILENT`** | **`SILENT`** | `$0.00` | No operational logs address the alleged defect; conservative rule forbids frivolous filing. |
| **`UNCERTAIN`** | **`UNCERTAIN`** | `$0.00` (`needs_human: true`) | Ambiguous, missing photo, or operator marked `pending_review`. |
| **`DUPLICATE`** | **`DUPLICATE`** | `$0.00` | Identical charge previously billed; suppressed to protect seller standing. |
| **`ALREADY_REIMBURSED`** | **`ALREADY_REIMBURSED`** | `$0.00` | Offsetting credit or claim ledger already resolved this unit. |

---

## 5. Structured Error Contract

All error responses adhere to the standard envelope:

```json
{
  "error": {
    "code": "FORBIDDEN_TENANT",
    "message": "Organization 'org_unauthorized' is not permitted",
    "request_id": "c1f8a846-993d-429a-8a56-42d634db6b8a"
  }
}
```

- `UNAUTHORIZED` (`401`): Missing or invalid `X-API-Key` header.
- `FORBIDDEN_TENANT` (`403`): Unknown organization, or mismatch between `X-Org-ID` header and payload `subject.org_id`.
- `INVALID_INPUT` (`422`): Malformed JSON, missing mandatory `org_id`, empty `fee_lines`, or unsupported `action`.
- `NOT_FOUND` (`404`): Route not found.
- `INTERNAL` (`500`): Unhandled server exception.
