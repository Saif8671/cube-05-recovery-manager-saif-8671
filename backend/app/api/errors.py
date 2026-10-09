import uuid
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

def map_status_to_code(status_code: int) -> str:
    if status_code == 401:
        return "UNAUTHORIZED"
    elif status_code == 403:
        return "FORBIDDEN_TENANT"
    elif status_code == 404:
        return "NOT_FOUND"
    elif status_code in (400, 422):
        return "INVALID_INPUT"
    else:
        return "INTERNAL" if status_code >= 500 else "INVALID_INPUT"

def get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID") or str(uuid.uuid4())

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = get_request_id(request)
    code = map_status_to_code(exc.status_code)
    status_code = 422 if exc.status_code == 400 else exc.status_code
    message = str(exc.detail) if exc.detail else "An error occurred"
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "request_id": request_id
            }
        },
        headers={"X-Request-ID": request_id}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = get_request_id(request)
    messages = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []) if str(l) != "body")
        msg = err.get("msg", "Invalid value")
        messages.append(f"{loc}: {msg}" if loc else msg)
    message = "; ".join(messages) if messages else "Invalid input"
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "INVALID_INPUT",
                "message": message,
                "request_id": request_id
            }
        },
        headers={"X-Request-ID": request_id}
    )

async def generic_exception_handler(request: Request, exc: Exception):
    request_id = get_request_id(request)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL",
                "message": "Internal server error",
                "request_id": request_id
            }
        },
        headers={"X-Request-ID": request_id}
    )
