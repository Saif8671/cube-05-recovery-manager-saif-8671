import os
import sys
import json
import uuid
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend and root paths are available
BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.main import app
from app.config.settings import settings
from agents.recovery.app import RecoveryAgentClient, get_agent_manifest

TEST_API_KEY = "test-agent-secret-key-round3"


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


# -----------------------------------------------------------------------------
# 1. Valid POST /run & Strict Schema Validation
# -----------------------------------------------------------------------------

def test_valid_post_run_and_schema_validation(client, monkeypatch):
    """
    Validates standard POST /run payload, verifying all returned fields,
    data types, and schema compliance matching Pod 3 specification.
    """
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)
    monkeypatch.setattr(settings, "ALLOWED_ORGS", "org_demo_alpha,org_demo_bravo")

    payload = {
        "workflow_id": f"wf-val-{uuid.uuid4().hex[:6]}",
        "stage": "recovery",
        "subject": {
            "org_id": "org_demo_alpha",
            "unit_id": "UNIT-POD3-001",
            "shipment_id": "FBA-POD3-100",
            "sku": "SKU-PROD-A",
            "fnsku": "X001ABC"
        },
        "fee_lines": [
            {
                "charge_id": "CH-VAL-01",
                "reason": "inbound_defect_fee",
                "amount": 42.50,
                "currency": "USD"
            }
        ],
        "previous_evidence": [
            {
                "record_id": "PRP-VAL-01",
                "source_stage": "prep",
                "finding": "PASS",
                "unit_id": "UNIT-POD3-001",
                "shipment_id": "FBA-POD3-100",
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

    # Required top-level fields
    assert isinstance(data["workflow_id"], str)
    assert data["stage"] == "recovery"
    assert isinstance(data["subject"], dict)
    assert data["subject"]["org_id"] == "org_demo_alpha"
    assert data["subject"]["unit_id"] == "UNIT-POD3-001"
    assert data["verdict"] in ["claim_recommended", "no_claim", "needs_human"]
    assert data["outcome"] == data["verdict"]

    # Checks array validation
    assert isinstance(data["checks"], list)
    assert len(data["checks"]) == 1
    chk = data["checks"][0]
    assert chk["check_key"] == "charge:CH-VAL-01"
    assert chk["verdict"] in ["PASS", "FAIL", "SILENT", "UNCERTAIN", "DUPLICATE", "ALREADY_REIMBURSED"]
    assert isinstance(chk["expected"], str)
    assert isinstance(chk["observed"], str)
    assert isinstance(chk["detail"], str)
    assert isinstance(chk["confidence"], (int, float))
    assert isinstance(chk["upstream_refs"], list)
    assert "PRP-VAL-01" in chk["upstream_refs"]
    assert isinstance(chk["payload"], dict)
    assert chk["payload"]["charge_id"] == "CH-VAL-01"
    assert chk["payload"]["claim_amount"] == 42.50
    assert chk["payload"]["currency"] == "USD"

    # Summary payload validation
    pld = data["payload"]
    assert isinstance(pld["total_recoverable_amount"], (int, float))
    assert pld["total_recoverable_amount"] == 42.50
    assert isinstance(pld["needs_human"], bool)
    assert pld["needs_human"] is False
    assert pld["charges_analyzed"] == 1
    assert pld["claims_recommended"] == 1

    # Metadata validation
    meta = data["metadata"]
    assert isinstance(meta["model"], str)
    assert isinstance(meta["model_version"], str)
    assert isinstance(meta["llm_calls"], int)
    assert isinstance(meta["cost_usd"], (int, float))
    assert len(meta["sha256"]) == 64
    assert isinstance(meta["produced_at"], str)


# -----------------------------------------------------------------------------
# 2. Unsupported Actions and Operations Handling
# -----------------------------------------------------------------------------

def test_unsupported_action_returns_422(client, monkeypatch):
    """Providing an unknown or unauthorized action/operation must return 422 INVALID_INPUT."""
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)

    payload = {
        "workflow_id": "wf-invalid-action",
        "action": "delete_all_database_records",
        "subject": {"org_id": "org_demo_alpha", "unit_id": "U1"},
        "fee_lines": [{"charge_id": "C1", "reason": "defect", "amount": 10.0}]
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "INVALID_INPUT"
    assert "Unsupported operation" in err["message"]


def test_supported_action_succeeds(client, monkeypatch):
    """Providing supported operations like 'investigate' or 'recovery' succeeds."""
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)

    payload = {
        "workflow_id": "wf-valid-action",
        "action": "investigate",
        "subject": {"org_id": "org_demo_alpha", "unit_id": "U1"},
        "fee_lines": [{"charge_id": "C1", "reason": "defect", "amount": 10.0}]
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 200


# -----------------------------------------------------------------------------
# 3. Missing Recovery Records
# -----------------------------------------------------------------------------

def test_missing_recovery_records_returns_422(client, monkeypatch):
    """Requests with empty charges / fee_lines list must return 422 INVALID_INPUT."""
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)

    payload = {
        "workflow_id": "wf-empty-charges",
        "subject": {"org_id": "org_demo_alpha", "unit_id": "U1"},
        "fee_lines": []
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "INVALID_INPUT"
    assert "No fee lines or charges provided" in err["message"]


# -----------------------------------------------------------------------------
# 4. Authentication Modes: Missing, Incorrect, and Explicitly Disabled
# -----------------------------------------------------------------------------

def test_auth_enabled_missing_key_returns_401(client, monkeypatch):
    """When AGENT_API_KEY is configured, omitting X-API-Key returns 401 UNAUTHORIZED."""
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)

    payload = {
        "workflow_id": "wf-no-auth",
        "subject": {"org_id": "org_demo_alpha", "unit_id": "U1"},
        "fee_lines": [{"charge_id": "C1", "reason": "defect", "amount": 10.0}]
    }
    resp = client.post("/run", headers={"X-Org-ID": "org_demo_alpha"}, json=payload)
    assert resp.status_code == 401
    err = resp.json()["error"]
    assert err["code"] == "UNAUTHORIZED"


def test_auth_enabled_invalid_key_returns_401(client, monkeypatch):
    """When AGENT_API_KEY is configured, invalid X-API-Key returns 401 UNAUTHORIZED."""
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)

    payload = {
        "workflow_id": "wf-bad-auth",
        "subject": {"org_id": "org_demo_alpha", "unit_id": "U1"},
        "fee_lines": [{"charge_id": "C1", "reason": "defect", "amount": 10.0}]
    }
    resp = client.post(
        "/run",
        headers={"X-API-Key": "wrong-secret-token", "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp.status_code == 401
    err = resp.json()["error"]
    assert err["code"] == "UNAUTHORIZED"


def test_auth_disabled_behavior_when_explicitly_configured(client, monkeypatch):
    """
    When REQUIRE_AUTH=false and AGENT_API_KEY is empty, authentication is bypassed
    and unauthenticated calls succeed.
    """
    monkeypatch.setattr(settings, "REQUIRE_AUTH", False)
    monkeypatch.setattr(settings, "AGENT_API_KEY", "")

    payload = {
        "workflow_id": "wf-auth-disabled",
        "subject": {"org_id": "org_demo_alpha", "unit_id": "U1"},
        "fee_lines": [{"charge_id": "C1", "reason": "defect", "amount": 10.0}],
        "previous_evidence": []
    }

    resp = client.post(
        "/run",
        headers={"X-Org-ID": "org_demo_alpha"},  # Notice: No X-API-Key supplied
        json=payload
    )
    assert resp.status_code == 200, resp.text


# -----------------------------------------------------------------------------
# 5. Multi-Tenancy: Allowed, Disallowed, and Header/Body Mismatches
# -----------------------------------------------------------------------------

def test_disallowed_org_returns_403(client, monkeypatch):
    """Request with an unknown organization outside ALLOWED_ORGS returns 403."""
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)
    monkeypatch.setattr(settings, "ALLOWED_ORGS", "org_demo_alpha,org_demo_bravo")

    payload = {
        "workflow_id": "wf-disallowed-org",
        "subject": {"org_id": "org_malicious_attacker", "unit_id": "U1"},
        "fee_lines": [{"charge_id": "C1", "reason": "defect", "amount": 10.0}]
    }

    resp = client.post(
        "/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_malicious_attacker"},
        json=payload
    )
    assert resp.status_code == 403
    err = resp.json()["error"]
    assert err["code"] == "FORBIDDEN_TENANT"


def test_both_allowed_orgs_succeed(client, monkeypatch):
    """Both org_demo_alpha and org_demo_bravo succeed when configured."""
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)
    monkeypatch.setattr(settings, "ALLOWED_ORGS", "org_demo_alpha,org_demo_bravo")

    for org in ["org_demo_alpha", "org_demo_bravo"]:
        payload = {
            "workflow_id": f"wf-allowed-{org}",
            "subject": {"org_id": org, "unit_id": f"UNIT-{org}"},
            "fee_lines": [{"charge_id": f"CH-{org}", "reason": "defect", "amount": 10.0}]
        }
        resp = client.post(
            "/run",
            headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": org},
            json=payload
        )
        assert resp.status_code == 200


# -----------------------------------------------------------------------------
# 6. Evidence Provenance & Conservative Business Rule Checks
# -----------------------------------------------------------------------------

def test_evidence_provenance_contradicted_recovery(client, monkeypatch):
    """
    Evidence refuting the defect directly attributes the original record_id
    in upstream_refs and calculates full claim amount.
    """
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)

    payload = {
        "workflow_id": "wf-prov-test",
        "subject": {"org_id": "org_demo_alpha", "unit_id": "U-PROV-1"},
        "fee_lines": [{"charge_id": "C-PROV-1", "reason": "inbound_defect_fee", "amount": 55.0}],
        "previous_evidence": [
            {
                "record_id": "PRP-REC-PROV-999",
                "source_stage": "prep",
                "finding": "PASS",
                "unit_id": "U-PROV-1",
                "metadata": {"polybag_present_sealed": "yes", "original_barcode_covered": "yes"}
            }
        ]
    }

    resp = client.post("/run", headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"}, json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["verdict"] == "claim_recommended"
    assert data["payload"]["total_recoverable_amount"] == 55.0
    chk = data["checks"][0]
    assert chk["verdict"] == "FAIL"
    assert "PRP-REC-PROV-999" in chk["upstream_refs"]


def test_business_rule_silent_when_no_matching_evidence(client, monkeypatch):
    """Missing evidence leads to conservative SILENT result with $0 claim amount."""
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)

    payload = {
        "workflow_id": "wf-silent-rule",
        "subject": {"org_id": "org_demo_alpha", "unit_id": "U-SILENT-1"},
        "fee_lines": [{"charge_id": "C-SILENT-1", "reason": "inbound_defect_fee", "amount": 30.0}],
        "previous_evidence": []
    }

    resp = client.post("/run", headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"}, json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["verdict"] == "no_claim"
    assert data["payload"]["total_recoverable_amount"] == 0.0
    chk = data["checks"][0]
    assert chk["verdict"] == "SILENT"
    assert chk["upstream_refs"] == []
    assert chk["payload"]["claim_amount"] == 0.0


# -----------------------------------------------------------------------------
# 7. Manifest & Adapter Compatibility
# -----------------------------------------------------------------------------

def test_manifest_discovery_and_structure():
    """Validates the agent manifest structure for Pod 3 orchestrator discovery."""
    manifest = get_agent_manifest()

    assert manifest["name"] == "recovery"
    assert manifest["pod"] == "pod-3"
    assert manifest["stage"] == "recovery"
    assert manifest["execution_mode"] == "service"
    assert manifest["endpoints"]["run"]["path"] == "/run"
    assert manifest["endpoints"]["run"]["method"] == "POST"
    assert manifest["endpoints"]["health"]["path"] == "/health"
    assert "schemas" in manifest
    assert "input" in manifest["schemas"]
    assert "output" in manifest["schemas"]


def test_recovery_agent_client_initialization_and_url_resolution(monkeypatch):
    """Validates RecoveryAgentClient reads URLs and environment variables correctly."""
    monkeypatch.setenv("RECOVERY_AGENT_URL", "http://render-test.internal:10000")
    monkeypatch.setenv("AGENT_API_KEY", "env-key-123")

    client = RecoveryAgentClient()
    assert client.service_url == "http://render-test.internal:10000"
    assert client.api_key == "env-key-123"

    headers = client._build_headers(org_id="org_demo_alpha")
    assert headers["X-API-Key"] == "env-key-123"
    assert headers["X-Org-ID"] == "org_demo_alpha"


# -----------------------------------------------------------------------------
# 8. Backward Compatibility of Existing /api/v1 Routes & Health Endpoints
# -----------------------------------------------------------------------------

def test_health_endpoints_accessible_without_auth(client):
    """GET /health and GET /health/ready must never require authentication."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

    resp_ready = client.get("/health/ready")
    assert resp_ready.status_code == 200
    assert resp_ready.json()["status"] == "ready"


def test_api_v1_backward_compatibility(client, monkeypatch):
    """Existing /api/v1 routes remain fully functional and backward-compatible."""
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)
    monkeypatch.setattr(settings, "ALLOWED_ORGS", "org_demo_alpha,org_demo_bravo")

    # /api/v1/companies
    resp_companies = client.get(
        "/api/v1/companies",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"}
    )
    assert resp_companies.status_code == 200
    assert isinstance(resp_companies.json(), list)

    # /api/v1/dashboard/summary
    resp_dash = client.get(
        "/api/v1/dashboard/summary",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"}
    )
    assert resp_dash.status_code == 200
    dash_data = resp_dash.json()
    assert "total_fees" in dash_data
    assert "potential_recovery" in dash_data

    # /api/v1/run alias
    payload = {
        "workflow_id": "wf-v1-alias",
        "subject": {"org_id": "org_demo_alpha", "unit_id": "U1"},
        "fee_lines": [{"charge_id": "C1", "reason": "defect", "amount": 10.0}]
    }
    resp_v1_run = client.post(
        "/api/v1/run",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"},
        json=payload
    )
    assert resp_v1_run.status_code == 200
