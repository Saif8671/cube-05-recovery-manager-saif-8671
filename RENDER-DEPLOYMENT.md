# Render Deployment Guide: Recovery Manager (Pod 3)

This guide documents the production deployment of the **Recovery Manager Agent** to [Render](https://render.com), its runtime environment variables, database persistence model, Docker configuration, and verification procedures.

---

## 1. Deployment Blueprint

The repository contains a declarative [`render.yaml`](render.yaml) file for one-click Blueprint deployment.

### Service Overview
- **Service Type:** Web Service
- **Environment:** Docker
- **Docker Context:** `.` (Repository root)
- **Dockerfile Path:** `./Dockerfile`
- **Region:** Oregon (US West) or Frankfurt (EU Central)
- **Base Branch:** `main`
- **Health Check Path:** `/health`

---

## 2. Required Environment Variables

Configure the following variables in the Render Dashboard (**Environment** tab):

| Variable | Required? | Recommended Default / Example | Purpose |
|---|---|---|---|
| `REQUIRE_AUTH` | **Yes** | `true` | Enforces fail-fast startup check requiring `AGENT_API_KEY`. |
| `AGENT_API_KEY` | **Yes** | *(Generate 32+ char secret)* | Secret token expected in `X-API-Key` HTTP header. |
| `ALLOWED_ORGS` | **Yes** | `org_demo_alpha,org_demo_bravo` | Comma-separated list of permitted tenant identifiers. |
| `PORT` | **Auto** | Set automatically by Render (`10000`) | Service port (app binds to `0.0.0.0:${PORT:-8000}`). |
| `DATABASE_URL` | Optional | `sqlite:////app/backend/data/recovery_manager.db` | Path to persistent database (or Neon PostgreSQL URI). |
| `SECRET_KEY` | Optional | *(Generate 32+ char secret)* | Legacy session token key (optional). |
| `GEMINI_API_KEY` | Optional | *(Google AI Studio Key)* | AI Reasoner for unmodeled fees (falls back to local rules). |

> [!IMPORTANT]
> **Never commit `.env` or real API keys to Git.** Set all secret values directly in Render's dashboard or secret groups.

---

## 3. Database Persistence Architecture

### A. The Challenge with Ephemeral Containers
Render web services run on ephemeral container instances. On standard free/starter plans without attached storage:
- Restarting or redeploying the container wipes the local container filesystem.
- While `POST /run` is stateless and executes against an in-memory database per request, the **Claim Ledger** (`ClaimLedger` table) and pre-seeded charge history benefit from surviving restarts to prevent duplicate double-filings across multiple separate sessions.

### B. Recommended Persistence Solutions

#### Option 1: Render Persistent Disk (Configured in `render.yaml`)
Attach a Render Persistent Disk:
- **Disk Name:** `recovery-data`
- **Mount Path:** `/app/backend/data`
- **Size:** `1 GB` (Standard tier)
- **Database URL:** `sqlite:////app/backend/data/recovery_manager.db`

#### Option 2: Managed PostgreSQL (Neon / Render Postgres)
Set `DATABASE_URL` to an external PostgreSQL connection string:
```text
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/neondb?sslmode=require
```
The codebase includes `psycopg2-binary` and `psycopg[binary]>=3.1.18` and automatically normalizes `postgres://` to `postgresql://`.

---

## 4. Local Docker Build & Verification Commands

To test the container locally on any Docker-enabled workstation:

### A. Build the Image
```bash
docker build -t recovery-manager:latest -f Dockerfile .
```

### B. Run the Container Locally
```bash
docker run -d \
  --name recovery-manager-local \
  -p 8000:8000 \
  -e REQUIRE_AUTH=true \
  -e AGENT_API_KEY=local-test-secret-key \
  -e ALLOWED_ORGS=org_demo_alpha,org_demo_bravo \
  recovery-manager:latest
```

### C. Verify Health Endpoints
```bash
# 1. Liveness Probe (No Auth Required)
curl -i http://localhost:8000/health

# Expected 200 OK:
# {"status":"ok","agent":"recovery","version":"1.0.0"}

# 2. Readiness Probe (Database Check, No Auth Required)
curl -i http://localhost:8000/health/ready

# Expected 200 OK:
# {"status":"ready","database":"connected","agent":"recovery","version":"1.0.0"}
```

### D. Verify Authenticated `POST /run`
```bash
# Missing Key (Should Return 401 UNAUTHORIZED)
curl -i -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -H "X-Org-ID: org_demo_alpha" \
  -d '{"subject": {"org_id": "org_demo_alpha"}, "fee_lines": [{"charge_id": "C1", "reason": "defect", "amount": 10.0}]}'

# Valid Key & Valid Request (Should Return 200 OK)
curl -i -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-test-secret-key" \
  -H "X-Org-ID: org_demo_alpha" \
  -d '{
    "workflow_id": "wf-local-test",
    "subject": {"org_id": "org_demo_alpha", "unit_id": "U1"},
    "fee_lines": [{"charge_id": "CH-1", "reason": "inbound_defect_fee", "amount": 25.0}],
    "previous_evidence": [{
      "record_id": "PRP-1",
      "source_stage": "prep",
      "finding": "PASS",
      "unit_id": "U1",
      "metadata": {"polybag_present_sealed": "yes", "original_barcode_covered": "yes"}
    }]
  }'
```

---

## 5. Connecting the Pod 3 Orchestrator

The Pod 3 Orchestrator invokes the deployed service via the manifest in [`agents/recovery/agent.json`](agents/recovery/agent.json) and client adapter in [`agents/recovery/app.py`](agents/recovery/app.py).

### Orchestrator Environment Configuration:
```env
RECOVERY_AGENT_URL=https://<your-render-service>.onrender.com
AGENT_API_KEY=<your-agent-api-key>
```

### Python Orchestrator Invocation Example:
```python
from agents.recovery.app import RecoveryAgentClient

client = RecoveryAgentClient(
    service_url="https://<your-render-service>.onrender.com",
    api_key="<your-agent-api-key>"
)

# 1. Health Probe
status = client.health()
print("Health:", status)

# 2. Run Forensic Investigation
result = client.run(payload={
    "workflow_id": "wf-orchestrator-001",
    "subject": {"org_id": "org_demo_alpha", "unit_id": "UNIT-01"},
    "fee_lines": [{"charge_id": "CH-01", "reason": "inbound_defect_fee", "amount": 35.0}],
    "previous_evidence": [...]
})

print("Outcome:", result["outcome"])
print("Recoverable:", result["payload"]["total_recoverable_amount"])
```
