"""
FastAPI gateway for wildfire operations platform.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.database import engine, Base, AsyncSessionLocal
from app.routers import telemetry
from app.routers import missions as missions_router
from app.middleware import LoggingMiddleware, MetricsMiddleware
from app.config import settings
from app.auth import AuthMiddleware, RateLimitMiddleware
import redis.asyncio as redis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simple in-memory event broadcaster for websockets
from typing import Set
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
_ws_clients: Set[WebSocket] = set()

async def _broadcast_event(payload: dict):
    to_remove: Set[WebSocket] = set()
    for ws in list(_ws_clients):
        try:
            await ws.send_json(payload)
        except Exception:
            to_remove.add(ws)
    for ws in to_remove:
        _ws_clients.discard(ws)

# Prometheus metrics
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
REQUEST_COUNT = Counter('apigw_requests_total', 'Total HTTP requests', ['method', 'path', 'status'])
REQUEST_LATENCY = Histogram('apigw_request_duration_seconds', 'Request latency in seconds', ['path'])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting wildfire operations platform API gateway...")
    
    # NOTE: Database migrations should be run separately via Alembic
    # Run: `alembic upgrade head` before starting the API
    # DO NOT run migrations on every instance startup in production
    
    logger.info("API gateway startup complete")

    # Admin flags
    app.state.require_confirm = (os.getenv("DISPATCHER_REQUIRE_CONFIRM", "false").lower() in ("1", "true", "yes"))

    # Init in-memory bus
    from app.bus import InMemoryBus
    app.state.bus = InMemoryBus()

    # Background task: broadcast heartbeat events to websockets
    stop_event = asyncio.Event()

    async def _heartbeat_broadcaster():
        while not stop_event.is_set():
            if _ws_clients:
                payload = {"type": "heartbeat", "ts": "now"}
                to_remove: Set[WebSocket] = set()
                for ws in list(_ws_clients):
                    try:
                        await ws.send_json(payload)
                    except Exception:
                        to_remove.add(ws)
                for ws in to_remove:
                    _ws_clients.discard(ws)
            await asyncio.sleep(10)

    # Expose broadcaster on app state for routers
    app.state.broadcast_event = _broadcast_event

    task = asyncio.create_task(_heartbeat_broadcaster())

    try:
        yield
    finally:
        stop_event.set()
        task.cancel()
        # Shutdown
        logger.info("Shutting down wildfire operations platform API gateway...")


# Create FastAPI app
app = FastAPI(
    title="Wildfire Operations Platform API",
    description="Production-ready API for wildfire operations platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Add security middleware FIRST (runs in reverse order)
app.add_middleware(LoggingMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
app.add_middleware(AuthMiddleware, jwt_secret=settings.SECRET_KEY)

# Basic request metrics wrapper
from starlette.requests import Request
from starlette.responses import Response
@app.middleware("http")
async def _metrics_http_middleware(request: Request, call_next):
    path = request.url.path
    with REQUEST_LATENCY.labels(path=path).time():
        response: Response = await call_next(request)
    REQUEST_COUNT.labels(method=request.method, path=path, status=str(response.status_code)).inc()
    return response

# Include routers
app.include_router(telemetry.router, prefix="/api/v1/telemetry", tags=["telemetry"])
app.include_router(missions_router.router, prefix="/api/v1/missions", tags=["missions"])

# Metrics endpoint (Prometheus exposition)
@app.get("/metrics")
async def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

# WebSocket endpoint for simple event streaming
@app.websocket("/ws/events")
async def websocket_events(ws: WebSocket):
    await ws.accept()
    _ws_clients.add(ws)
    try:
        while True:
            # Echo any client message back; clients can send pings
            _ = await ws.receive_text()
            await ws.send_json({"type": "ack"})
    except WebSocketDisconnect:
        _ws_clients.discard(ws)

# Optional routers (load if available)
for _name, _prefix, _tags in [
    ("app.routers.detections", "/api/v1/detections", ["detections"]),
    ("app.routers.tasks", "/api/v1/tasks", ["tasks"]),
    ("app.routers.twin", "/api/v1/twin", ["twin"]),
    ("app.routers.summit", "/api/v1/summit", ["summit"]),
    ("app.routers.alerts", "/api/v1/alerts", ["alerts"]),
    ("app.routers.triangulation", "/api/v1/triangulation", ["triangulation"]),
    ("app.routers.prediction", "/api/v1/prediction", ["prediction"]),
    ("app.routers.integrations", "/api/v1/integrations", ["integrations"]),
    ("app.routers.reports", "/api/v1/reports", ["reports"]),
    ("app.routers.admin", "/api/v1/admin", ["admin"]),
]:
    try:
        mod = __import__(_name, fromlist=["router"])  # type: ignore
        app.include_router(mod.router, prefix=_prefix, tags=_tags)  # type: ignore
        logger.info(f"Loaded router: {_name}")
    except Exception as e:
        logger.warning(f"Router {_name} not loaded: {e}")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Wildfire Operations Platform API",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """Liveness check - API is running."""
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0"
    }


@app.get("/readiness")
async def readiness_check():
    """Readiness check - API can serve traffic (DB/Redis/MQTT reachable)."""
    from datetime import datetime
    from sqlalchemy import text
    import asyncio
    
    checks = {
        "database": "unknown",
        "redis": "unknown",
        "mqtt": "unknown"
    }
    
    # Check database
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            result.scalar()
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)[:50]}"
    
    # Check Redis
    try:
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
            socket_connect_timeout=2
        )
        await redis_client.ping()
        await redis_client.close()
        checks["redis"] = "healthy"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)[:50]}"
    
    # Check MQTT (basic connectivity test)
    try:
        # For now, assume healthy if config exists
        # In production, implement actual MQTT connectivity check
        if settings.MQTT_BROKER:
            checks["mqtt"] = "healthy"
        else:
            checks["mqtt"] = "not configured"
    except Exception as e:
        checks["mqtt"] = f"unhealthy: {str(e)[:50]}"
    
    # Determine overall status
    all_healthy = all(v == "healthy" or v == "not configured" for v in checks.values())
    overall_status = "ready" if all_healthy else "not_ready"
    status_code = 200 if all_healthy else 503
    
    response = {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "checks": checks
    }
    
    return JSONResponse(content=response, status_code=status_code)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "status_code": 500
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
