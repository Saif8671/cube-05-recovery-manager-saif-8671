import json
from typing import Optional
from fastapi import Request, Header, HTTPException
from app.config.settings import settings

async def resolve_org_id(
    request: Request,
    x_org_id: Optional[str] = Header(None, alias="X-Org-ID")
) -> str:
    """
    Resolves and enforces mandatory org_id tenancy:
    1. Reads X-Org-ID header.
    2. Reads org_id (or company_id in legacy routes) from JSON body, form data, or query parameters.
    3. If both header and body/query are present and differ -> 403.
    4. If neither is present -> 422 (mandatory).
    5. Validates against ALLOWED_ORGS (defaults to org_demo_alpha, org_demo_bravo) -> 403 if invalid.
    """
    header_org = x_org_id.strip() if x_org_id and x_org_id.strip() else None

    # Check payload (query params, JSON body, or form data)
    payload_org = None

    # 1. Query parameters
    query_val = request.query_params.get("org_id") or request.query_params.get("company_id")
    if query_val and query_val.strip():
        payload_org = query_val.strip()

    # 2. JSON Body
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body_bytes = await request.body()
            if body_bytes:
                data = json.loads(body_bytes.decode("utf-8"))
                if isinstance(data, dict):
                    subject = data.get("subject") if isinstance(data.get("subject"), dict) else {}
                    body_org_val = data.get("org_id") or subject.get("org_id")
                    body_comp_val = data.get("company_id") or subject.get("company_id")
                    # If multiple differing org identifiers are specified in body, 403
                    all_body_orgs = {str(v).strip() for v in [data.get("org_id"), subject.get("org_id"), data.get("company_id"), subject.get("company_id")] if v is not None and str(v).strip()}
                    if len(all_body_orgs) > 1:
                        raise HTTPException(
                            status_code=403,
                            detail="Body org_id and company_id do not match"
                        )
                    body_val = body_org_val or body_comp_val
                    if body_val and str(body_val).strip():
                        # If query param was also present and differs from body, 403
                        if payload_org and payload_org != str(body_val).strip():
                            raise HTTPException(
                                status_code=403,
                                detail="Query org_id and body org_id do not match"
                            )
                        payload_org = str(body_val).strip()
        except HTTPException:
            raise
        except Exception:
            pass

    # 3. Form / Multipart data
    elif "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        try:
            form = await request.form()
            form_org_val = form.get("org_id")
            form_comp_val = form.get("company_id")
            if form_org_val and form_comp_val and str(form_org_val).strip() != str(form_comp_val).strip():
                raise HTTPException(
                    status_code=403,
                    detail="Form org_id and company_id do not match"
                )
            form_val = form_org_val or form_comp_val
            if form_val and str(form_val).strip():
                if payload_org and payload_org != str(form_val).strip():
                    raise HTTPException(
                        status_code=403,
                        detail="Query org_id and form org_id do not match"
                    )
                payload_org = str(form_val).strip()
        except HTTPException:
            raise
        except Exception:
            pass

    # 4. If both header and payload are present and differ, 403
    if header_org and payload_org and header_org != payload_org:
        raise HTTPException(
            status_code=403,
            detail="Header X-Org-ID and payload org_id/company_id do not match"
        )

    resolved_org = header_org or payload_org
    if not resolved_org:
        raise HTTPException(
            status_code=422,
            detail="org_id is mandatory (must be provided in X-Org-ID header, request body, or query params)"
        )

    # 5. Check allowed orgs
    allowed = settings.allowed_orgs_set
    if resolved_org not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Organization '{resolved_org}' is not permitted"
        )

    request.state.org_id = resolved_org
    return resolved_org
