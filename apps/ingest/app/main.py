"""
Data Ingest Service — fetches external data (NWS, FIRMS, NOAA, LANDFIRE)
on a schedule and stores it in the Sentinel database.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from app.config import config
from app.sources import nws, firms, noaa_lightning, landfire

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INGEST_COUNT = Counter("ingest_records_total", "Total records ingested", ["source"])
INGEST_ERRORS = Counter("ingest_errors_total", "Total ingest errors", ["source"])

_stop_event = asyncio.Event()


async def _run_nws_ingest():
    """Periodic NWS weather ingest."""
    while not _stop_event.is_set():
        try:
            logger.info("NWS ingest: starting...")
            records = await nws.fetch_weather_for_aoi()
            INGEST_COUNT.labels(source="nws").inc(len(records))
            logger.info(f"NWS ingest: stored {len(records)} records")
        except Exception as e:
            INGEST_ERRORS.labels(source="nws").inc()
            logger.error(f"NWS ingest failed: {e}")
        await asyncio.sleep(config.NWS_POLL_INTERVAL_MIN * 60)


async def _run_firms_ingest():
    """Periodic NASA FIRMS satellite fire ingest."""
    while not _stop_event.is_set():
        try:
            logger.info("FIRMS ingest: starting...")
            records = await firms.fetch_active_fires()
            INGEST_COUNT.labels(source="firms").inc(len(records))
            logger.info(f"FIRMS ingest: stored {len(records)} detections")
        except Exception as e:
            INGEST_ERRORS.labels(source="firms").inc()
            logger.error(f"FIRMS ingest failed: {e}")
        await asyncio.sleep(config.FIRMS_POLL_INTERVAL_MIN * 60)


async def _run_lightning_ingest():
    """Periodic NOAA lightning data ingest."""
    while not _stop_event.is_set():
        try:
            logger.info("Lightning ingest: starting...")
            records = await noaa_lightning.fetch_lightning_strikes()
            INGEST_COUNT.labels(source="noaa_lightning").inc(len(records))
            logger.info(f"Lightning ingest: stored {len(records)} records")
        except Exception as e:
            INGEST_ERRORS.labels(source="noaa_lightning").inc()
            logger.error(f"Lightning ingest failed: {e}")
        await asyncio.sleep(config.NOAA_POLL_INTERVAL_MIN * 60)


async def _run_landfire_ingest():
    """One-time LANDFIRE fuel model data load (run at startup, then daily)."""
    while not _stop_event.is_set():
        try:
            logger.info("LANDFIRE ingest: starting...")
            records = await landfire.fetch_fuel_models()
            INGEST_COUNT.labels(source="landfire").inc(len(records))
            logger.info(f"LANDFIRE ingest: stored {len(records)} fuel model records")
        except Exception as e:
            INGEST_ERRORS.labels(source="landfire").inc()
            logger.error(f"LANDFIRE ingest failed: {e}")
        await asyncio.sleep(24 * 3600)  # Daily refresh


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Ingest service starting — scheduling data fetchers...")
    tasks = [
        asyncio.create_task(_run_nws_ingest()),
        asyncio.create_task(_run_firms_ingest()),
        asyncio.create_task(_run_lightning_ingest()),
        asyncio.create_task(_run_landfire_ingest()),
    ]
    try:
        yield
    finally:
        _stop_event.set()
        for t in tasks:
            t.cancel()
        logger.info("Ingest service stopped")


app = FastAPI(title="Sentinel Data Ingest Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(tz=timezone.utc).isoformat()}


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/ingest/nws")
async def trigger_nws():
    """Manually trigger NWS weather ingest."""
    records = await nws.fetch_weather_for_aoi()
    return {"source": "nws", "records": len(records)}


@app.post("/ingest/firms")
async def trigger_firms():
    """Manually trigger FIRMS satellite fire ingest."""
    records = await firms.fetch_active_fires()
    return {"source": "firms", "records": len(records)}


@app.post("/ingest/lightning")
async def trigger_lightning():
    """Manually trigger NOAA lightning ingest."""
    records = await noaa_lightning.fetch_lightning_strikes()
    return {"source": "noaa_lightning", "records": len(records)}


@app.post("/ingest/landfire")
async def trigger_landfire():
    """Manually trigger LANDFIRE fuel model ingest."""
    records = await landfire.fetch_fuel_models()
    return {"source": "landfire", "records": len(records)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=config.INGEST_PORT, reload=True)
