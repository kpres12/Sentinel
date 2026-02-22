"""
NOAA lightning strike data adapter.
Uses the NOAA Climate Data Online (CDO) API for lightning data.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

import httpx

from app.config import config

logger = logging.getLogger(__name__)

CDO_BASE_URL = "https://www.ncdc.noaa.gov/cdo-web/api/v2"


async def fetch_lightning_strikes(hours_back: int = 24) -> List[Dict[str, Any]]:
    """
    Fetch recent lightning strike data.
    Falls back to synthetic data if API is unavailable.
    """
    if not config.NOAA_API_TOKEN:
        logger.warning("NOAA_API_TOKEN not set — skipping lightning fetch")
        return []

    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(hours=hours_back)

    headers = {"token": config.NOAA_API_TOKEN}
    params = {
        "datasetid": "GHCND",
        "datatypeid": "WT16",  # Thunder
        "startdate": start.strftime("%Y-%m-%d"),
        "enddate": end.strftime("%Y-%m-%d"),
        "extent": f"{config.AOI_MIN_LAT},{config.AOI_MIN_LON},{config.AOI_MAX_LAT},{config.AOI_MAX_LON}",
        "limit": 1000,
        "units": "metric",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(f"{CDO_BASE_URL}/data", headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
            return _parse_lightning_data(data)
        except Exception as e:
            logger.error(f"NOAA lightning fetch failed: {e}")
            return []


def _parse_lightning_data(data: Dict) -> List[Dict[str, Any]]:
    """Parse NOAA CDO response into lightning strike records."""
    records = []
    results = data.get("results", [])

    for item in results:
        try:
            records.append({
                "type": "lightning",
                "station_id": item.get("station", ""),
                "timestamp": item.get("date", datetime.now(tz=timezone.utc).isoformat()),
                "value": item.get("value", 0),
                "source": "noaa_cdo",
            })
        except Exception as e:
            logger.warning(f"Failed to parse lightning record: {e}")
            continue

    logger.info(f"NOAA Lightning: parsed {len(records)} records")
    return records
