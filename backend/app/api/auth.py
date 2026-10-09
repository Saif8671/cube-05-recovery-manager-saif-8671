import secrets
from typing import Optional
from fastapi import Header, HTTPException
from app.config.settings import settings

def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> str:
    """
    Enforces header X-API-Key == env AGENT_API_KEY on protected routes.
    Constant-time comparison via secrets.compare_digest.
    Returns 401 on missing or invalid key.
    """
    expected_key = settings.AGENT_API_KEY
    # When authentication is explicitly disabled (REQUIRE_AUTH=false and AGENT_API_KEY is unset)
    if not settings.REQUIRE_AUTH and not expected_key:
        return x_api_key or "auth-disabled"

    if not x_api_key or not expected_key:
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid API key"
        )
    if not secrets.compare_digest(x_api_key, expected_key):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid API key"
        )
    return x_api_key
