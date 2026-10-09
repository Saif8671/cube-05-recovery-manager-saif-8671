import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
import uuid
import logging
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config.settings import settings


TEST_API_KEY = "test-agent-secret-key-xyz"

@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    # Set default test API key
    monkeypatch.setattr(settings, "AGENT_API_KEY", TEST_API_KEY)
    monkeypatch.setattr(settings, "ALLOWED_ORGS", "org_demo_alpha,org_demo_bravo")

@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)

# -------------------------------------------------------------
# 1. Health & Root Endpoints (No Auth Required)
# -------------------------------------------------------------

def test_health_endpoint_no_auth(client):
    """GET /health must return status ok, agent recovery, version from settings without auth."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["agent"] == "recovery"
    assert data["version"] == settings.VERSION
    assert "X-Request-ID" in resp.headers

def test_health_ready_endpoint_db_check(client):
    """GET /health/ready must check DB connectivity and return status ready without auth."""
    resp = client.get("/health/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
    assert data["agent"] == "recovery"
    assert data["version"] == settings.VERSION

def test_root_endpoint_no_auth(client):
    """GET / must return online status and version without auth."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"
    assert data["version"] == settings.VERSION

# -------------------------------------------------------------
# 2. Auth Dependency & Fail Fast on Startup
# -------------------------------------------------------------

def test_auth_missing_api_key_returns_401(client):
    """Protected routes without X-API-Key must return 401 UNAUTHORIZED."""
    resp = client.get("/api/v1/charges", headers={"X-Org-ID": "org_demo_alpha"})
    assert resp.status_code == 401
    err = resp.json()["error"]
    assert err["code"] == "UNAUTHORIZED"
    assert "request_id" in err
    assert resp.headers.get("X-Request-ID") == err["request_id"]

def test_auth_invalid_api_key_returns_401(client):
    """Protected routes with incorrect X-API-Key must return 401 UNAUTHORIZED."""
    resp = client.get(
        "/api/v1/charges",
        headers={"X-API-Key": "wrong-key", "X-Org-ID": "org_demo_alpha"}
    )
    assert resp.status_code == 401
    err = resp.json()["error"]
    assert err["code"] == "UNAUTHORIZED"

def test_auth_valid_api_key_succeeds(client):
    """Protected routes with matching X-API-Key must succeed."""
    resp = client.get(
        "/api/v1/charges",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"}
    )
    assert resp.status_code == 200

def test_auth_refuse_to_start_when_api_key_unset_and_require_auth():
    """If AGENT_API_KEY is unset and REQUIRE_AUTH=true, application startup must raise RuntimeError."""
    from app.config.settings import Settings
    os.environ["REQUIRE_AUTH"] = "true"
    os.environ["SECRET_KEY"] = "some-secret"
    os.environ.pop("AGENT_API_KEY", None)
    
    with pytest.raises(RuntimeError) as exc_info:
        Settings()
    assert "AGENT_API_KEY" in str(exc_info.value)

    # Clean up environment
    os.environ["REQUIRE_AUTH"] = "false"

# -------------------------------------------------------------
# 3. Tenancy (Mandatory org_id, Headers, Body, Conflict, Allowed Orgs)
# -------------------------------------------------------------

def test_tenancy_missing_org_id_returns_422(client):
    """Protected route with valid auth but no org_id must return 422 INVALID_INPUT."""
    resp = client.get("/api/v1/charges", headers={"X-API-Key": TEST_API_KEY})
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "INVALID_INPUT"
    assert "mandatory" in err["message"]

def test_tenancy_header_x_org_id_accepted(client):
    """org_id supplied via X-Org-ID header must be accepted."""
    resp = client.get(
        "/api/v1/charges",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"}
    )
    assert resp.status_code == 200

def test_tenancy_query_param_org_id_accepted(client):
    """org_id supplied via query parameter must be accepted."""
    resp = client.get(
        "/api/v1/charges?org_id=org_demo_alpha",
        headers={"X-API-Key": TEST_API_KEY}
    )
    assert resp.status_code == 200

def test_tenancy_legacy_query_param_company_id_accepted(client):
    """company_id supplied via query parameter must be accepted."""
    resp = client.get(
        "/api/v1/charges?company_id=org_demo_bravo",
        headers={"X-API-Key": TEST_API_KEY}
    )
    assert resp.status_code == 200

def test_tenancy_body_org_id_accepted_in_post(client):
    """org_id supplied via JSON body in POST /charges must be accepted."""
    cid = f"TEST-POST-TENANT-{uuid.uuid4().hex[:6]}"
    payload = {
        "charge_id": cid,
        "reason": "inbound_defect_fee",
        "amount": 25.0,
        "org_id": "org_demo_alpha"
    }
    resp = client.post(
        "/api/v1/charges",
        json=payload,
        headers={"X-API-Key": TEST_API_KEY}
    )
    assert resp.status_code == 200
    assert resp.json()["company_id"] == "org_demo_alpha"

def test_tenancy_header_and_body_mismatch_returns_403(client):
    """If X-Org-ID header and payload org_id differ, must return 403 FORBIDDEN_TENANT."""
    cid = f"TEST-CONFLICT-{uuid.uuid4().hex[:6]}"
    payload = {
        "charge_id": cid,
        "reason": "inbound_defect_fee",
        "amount": 25.0,
        "org_id": "org_demo_alpha"
    }
    resp = client.post(
        "/api/v1/charges",
        json=payload,
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_bravo"}
    )
    assert resp.status_code == 403
    err = resp.json()["error"]
    assert err["code"] == "FORBIDDEN_TENANT"
    assert "do not match" in err["message"]

def test_tenancy_header_and_query_mismatch_returns_403(client):
    """If X-Org-ID header and query org_id differ, must return 403 FORBIDDEN_TENANT."""
    resp = client.get(
        "/api/v1/charges?org_id=org_demo_bravo",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"}
    )
    assert resp.status_code == 403
    err = resp.json()["error"]
    assert err["code"] == "FORBIDDEN_TENANT"

def test_tenancy_unauthorized_org_returns_403(client):
    """Org not in org_demo_alpha / org_demo_bravo must return 403 FORBIDDEN_TENANT."""
    resp = client.get(
        "/api/v1/charges",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_unauthorized_corp"}
    )
    assert resp.status_code == 403
    err = resp.json()["error"]
    assert err["code"] == "FORBIDDEN_TENANT"
    assert "not permitted" in err["message"]

def test_tenancy_custom_allowed_orgs_env(client, monkeypatch):
    """When ALLOWED_ORGS includes a custom org, that org must be permitted."""
    monkeypatch.setattr(settings, "ALLOWED_ORGS", "org_demo_alpha,org_custom_enterprise")
    
    # Custom org now allowed
    resp = client.get(
        "/api/v1/charges",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_custom_enterprise"}
    )
    assert resp.status_code == 200

    # Bravo is not in custom allowed list -> 403
    resp_bravo = client.get(
        "/api/v1/charges",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_bravo"}
    )
    assert resp_bravo.status_code == 403

# -------------------------------------------------------------
# 4. Global Exception Handlers (Exact Envelope & Error Codes)
# -------------------------------------------------------------

def test_not_found_returns_structured_error(client):
    """Accessing non-existent charge returns 404 NOT_FOUND with structured error envelope."""
    resp = client.get(
        "/api/v1/charges/CH-NONEXISTENT-9999",
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"}
    )
    assert resp.status_code == 404
    err = resp.json()["error"]
    assert err["code"] == "NOT_FOUND"
    assert "not found" in err["message"].lower()
    assert "request_id" in err

def test_request_validation_error_returns_422_invalid_input(client):
    """Malformed body missing required charge fields returns 422 INVALID_INPUT."""
    resp = client.post(
        "/api/v1/charges",
        json={"bad_payload": True},
        headers={"X-API-Key": TEST_API_KEY, "X-Org-ID": "org_demo_alpha"}
    )
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "INVALID_INPUT"
    assert "request_id" in err

# -------------------------------------------------------------
# 5. Request-ID Middleware & Structured Logging
# -------------------------------------------------------------

def test_request_id_middleware_generates_id_if_missing(client):
    """Middleware must assign and echo a request_id in X-Request-ID header."""
    resp = client.get("/health")
    assert "X-Request-ID" in resp.headers
    assert len(resp.headers["X-Request-ID"]) > 10

def test_request_id_middleware_preserves_incoming_id(client):
    """Middleware must preserve incoming client X-Request-ID."""
    custom_id = "custom-req-id-12345"
    resp = client.get("/health", headers={"X-Request-ID": custom_id})
    assert resp.headers.get("X-Request-ID") == custom_id

def test_structured_logging_emits_json(client, caplog):
    """Middleware logs structured JSON without secrets."""
    caplog.set_level(logging.INFO, logger="recovery_manager.access")
    resp = client.get("/health")
    assert resp.status_code == 200

    # Inspect logs
    matching_logs = [rec.message for rec in caplog.records if "recovery_manager.access" in rec.name]
    assert len(matching_logs) > 0
    parsed = json.loads(matching_logs[-1])
    assert parsed["path"] == "/health"
    assert parsed["status_code"] == 200
    assert "duration_ms" in parsed
    assert "request_id" in parsed
    # Ensure zero secrets in log
    assert TEST_API_KEY not in matching_logs[-1]
