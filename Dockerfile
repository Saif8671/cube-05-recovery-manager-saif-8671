# Production Dockerfile for RCY Recovery Manager Agent
# Pod 3 · Cube Buildathon Round 3
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend:/app \
    PORT=8000

# Install minimal OS dependencies needed for runtime (libpq for postgres)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install Python dependencies first for efficient layer caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy application source code and agent manifest
COPY backend /app/backend
COPY agents /app/agents

# Create runtime directories for uploads, data, and storage with proper ownership
RUN mkdir -p /app/backend/uploads /app/backend/data && \
    chown -R appuser:appuser /app


# Switch to non-root user
USER appuser

WORKDIR /app/backend

# Expose default HTTP port
EXPOSE 8000

# Health check matching Render and Orchestrator requirements
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, os; port = os.environ.get('PORT', '8000'); urllib.request.urlopen(f'http://127.0.0.1:{port}/health')"

# Start ASGI application binding to 0.0.0.0 and dynamic $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
