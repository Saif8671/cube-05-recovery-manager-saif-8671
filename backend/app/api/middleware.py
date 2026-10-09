import time
import json
import uuid
import logging
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("recovery_manager.access")

class RequestIdAndLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Ensure Request ID is assigned
        request_id = request.headers.get("X-Request-ID")
        if not request_id or not request_id.strip():
            request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.time()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception:
            raise
        finally:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            # 2. Structured JSON logging (no secrets, no file bytes)
            log_record = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else None
            }
            logger.info(json.dumps(log_record))
