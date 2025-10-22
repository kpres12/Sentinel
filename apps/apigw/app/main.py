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

from app.database import engine, Base
from app.routers import telemetry
from app.routers import missions as missions_router
from app.middleware import LoggingMiddleware, MetricsMiddleware
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting wildfire operations platform API gateway...")
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database tables created successfully")
    
    yield
    
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

app.add_middleware(LoggingMiddleware)
app.add_middleware(MetricsMiddleware)

# Include routers
app.include_router(telemetry.router, prefix="/api/v1/telemetry", tags=["telemetry"])
app.include_router(missions_router.router, prefix="/api/v1/missions", tags=["missions"])

# Optional routers (load if available)
for _name, _prefix, _tags in [
    ("app.routers.detections", "/api/v1/detections", ["detections"]),
    ("app.routers.alerts", "/api/v1/alerts", ["alerts"]),
    ("app.routers.triangulation", "/api/v1/triangulation", ["triangulation"]),
    ("app.routers.prediction", "/api/v1/prediction", ["prediction"]),
    ("app.routers.integrations", "/api/v1/integrations", ["integrations"]),
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
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z"
    }


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
