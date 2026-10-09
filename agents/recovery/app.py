#!/usr/bin/env python3
"""
Recovery Agent Orchestrator Adapter & Client
Cube Buildathon Round 3 · Pod 3 Integration
"""
import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("agents.recovery")

MANIFEST_PATH = Path(__file__).resolve().parent / "agent.json"


def get_agent_manifest() -> Dict[str, Any]:
    """Loads the agent manifest for orchestrator discovery."""
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Manifest not found at {MANIFEST_PATH}")
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


class RecoveryAgentClient:
    """
    HTTP Client for invoking the Recovery Agent service from the Pod 3 orchestrator.
    Handles service URL resolution, authentication headers, tenant scoping, and errors.
    """

    def __init__(
        self,
        service_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout_seconds: float = 30.0
    ):
        raw_url = (
            service_url
            or os.getenv("RECOVERY_AGENT_URL")
            or os.getenv("SERVICE_URL")
            or "http://localhost:8000"
        )
        self.service_url = raw_url.rstrip("/")
        self.api_key = api_key or os.getenv("AGENT_API_KEY", "")
        self.timeout_seconds = timeout_seconds

    def _build_headers(self, org_id: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        if org_id:
            headers["X-Org-ID"] = org_id
        return headers

    def health(self) -> Dict[str, Any]:
        """Performs liveness health check."""
        url = f"{self.service_url}/health"
        with httpx.Client(timeout=self.timeout_seconds) as client:
            resp = client.get(url, headers=self._build_headers())
            resp.raise_for_status()
            return resp.json()

    def health_ready(self) -> Dict[str, Any]:
        """Performs readiness check verifying database connectivity."""
        url = f"{self.service_url}/health/ready"
        with httpx.Client(timeout=self.timeout_seconds) as client:
            resp = client.get(url, headers=self._build_headers())
            resp.raise_for_status()
            return resp.json()

    def run(self, payload: Dict[str, Any], org_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Invokes POST /run on the Recovery Agent service.
        Extracts org_id from subject if not provided directly.
        """
        if not org_id and isinstance(payload.get("subject"), dict):
            org_id = payload["subject"].get("org_id")
        if not org_id and payload.get("org_id"):
            org_id = payload.get("org_id")

        headers = self._build_headers(org_id=org_id)
        url = f"{self.service_url}/run"

        with httpx.Client(timeout=self.timeout_seconds) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code >= 400:
                try:
                    err_json = resp.json()
                    err_detail = err_json.get("error", err_json)
                except Exception:
                    err_detail = resp.text
                raise httpx.HTTPStatusError(
                    message=f"Recovery Agent returned error {resp.status_code}: {err_detail}",
                    request=resp.request,
                    response=resp
                )
            return resp.json()


def main():
    """CLI runner for direct testing and debugging."""
    import argparse
    parser = argparse.ArgumentParser(description="Recovery Agent Orchestrator Client CLI")
    parser.add_argument("--health", action="store_true", help="Check health")
    parser.add_argument("--ready", action="store_true", help="Check database readiness")
    parser.add_argument("--manifest", action="store_true", help="Print agent manifest")
    parser.add_argument("--url", default=None, help="Recovery service base URL")
    parser.add_argument("--key", default=None, help="Agent API Key")
    parser.add_argument("--run-file", default=None, help="Path to JSON request file to run")
    args = parser.parse_args()

    if args.manifest:
        print(json.dumps(get_agent_manifest(), indent=2))
        return

    client = RecoveryAgentClient(service_url=args.url, api_key=args.key)

    if args.health:
        res = client.health()
        print(json.dumps(res, indent=2))
        return

    if args.ready:
        res = client.health_ready()
        print(json.dumps(res, indent=2))
        return

    if args.run_file:
        with open(args.run_file, "r", encoding="utf-8") as f:
            payload = json.load(f)
        res = client.run(payload)
        print(json.dumps(res, indent=2))
        return

    parser.print_help()


if __name__ == "__main__":
    main()
