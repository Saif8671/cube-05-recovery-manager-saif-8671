import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError

from app.config.settings import settings
from app.database.session import init_db, get_db
from app.api.routes import router as api_router
from app.adapters.round3 import round3_router
from app.api.middleware import RequestIdAndLoggingMiddleware
from app.api.errors import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RCY AI-Powered Recovery Operations Center: Evidence-Grounded Financial Recovery Claims Engine"
)

# 1. Request ID and Structured Logging Middleware
app.add_middleware(RequestIdAndLoggingMiddleware)

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Global Exception Handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# 4. Static file serving for tenant uploaded documents
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=settings.LOCAL_STORAGE_DIR), name="uploads")

@app.on_event("startup")
def on_startup():
    if settings.REQUIRE_AUTH:
        if not settings.AGENT_API_KEY:
            raise RuntimeError("AGENT_API_KEY environment variable is required when REQUIRE_AUTH=true")
    init_db()

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "agent": "recovery",
        "version": settings.VERSION
    }

@app.get("/health/ready")
def health_ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "agent": "recovery",
            "version": settings.VERSION
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Database connectivity check failed"
        )

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(round3_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
