"""
NASA FIRMS (Fire Information for Resource Management System) adapter.
Provides active fire / hotspot detections from MODIS and VIIRS satellites.
Requires a MAP_KEY from https://firms.modaps.eosdis.nasa.gov/api/area/
"""

import csv
import io
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

import httpx

from app.config import config

logger = logging.getLogger(__name__)


async def fetch_active_fires(source: str = "VIIRS_SNPP_NRT", days: int = 1) -> List[Dict[str, Any]]:
    """
    Fetch active fire detections from NASA FIRMS.
    source: MODIS_NRT, VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT
    days: 1-10
    """
    if not config.FIRMS_MAP_KEY:
        logger.warning("FIRMS_MAP_KEY not set — skipping satellite fire fetch")
        return []

    bbox = f"{config.AOI_MIN_LON},{config.AOI_MIN_LAT},{config.AOI_MAX_LON},{config.AOI_MAX_LAT}"
    url = f"{config.FIRMS_BASE_URL}/{config.FIRMS_MAP_KEY}/{source}/{bbox}/{days}"

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            return _parse_firms_csv(resp.text, source)
        except Exception as e:
            logger.error(f"FIRMS fetch failed: {e}")
            return []


def _parse_firms_csv(csv_text: str, source: str) -> List[Dict[str, Any]]:
    """Parse FIRMS CSV response into detection records."""
    records = []
    reader = csv.DictReader(io.StringIO(csv_text))

    for row in reader:
        try:
            lat = float(row.get("latitude", 0))
            lon = float(row.get("longitude", 0))
            confidence = row.get("confidence", "")

            # Map confidence to 0-1 scale
            if confidence in ("high", "h"):
                conf_score = 0.9
            elif confidence in ("nominal", "n"):
                conf_score = 0.7
            elif confidence in ("low", "l"):
                conf_score = 0.4
            else:
                try:
                    conf_score = float(confidence) / 100.0
                except (ValueError, TypeError):
                    conf_score = 0.5

            acq_date = row.get("acq_date", "")
            acq_time = row.get("acq_time", "0000")

            try:
                timestamp = datetime.strptime(f"{acq_date} {acq_time}", "%Y-%m-%d %H%M").replace(tzinfo=timezone.utc)
            except ValueError:
                timestamp = datetime.now(tz=timezone.utc)

            records.append({
                "type": "hotspot",
                "latitude": lat,
                "longitude": lon,
                "confidence": conf_score,
                "timestamp": timestamp.isoformat(),
                "source": f"firms_{source.lower()}",
                "frp": float(row.get("frp", 0)),  # Fire Radiative Power (MW)
                "brightness": float(row.get("bright_ti4", row.get("brightness", 0))),
                "scan": float(row.get("scan", 0)),
                "track": float(row.get("track", 0)),
            })
        except Exception as e:
            logger.warning(f"Failed to parse FIRMS row: {e}")
            continue

    logger.info(f"FIRMS: parsed {len(records)} active fire detections")
    return records
