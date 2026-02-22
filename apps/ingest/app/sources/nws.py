"""
National Weather Service (NWS) data adapter.
Free public API — no key required, just a User-Agent header.
https://www.weather.gov/documentation/services-web-api
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import httpx

from app.config import config

logger = logging.getLogger(__name__)

NWS_HEADERS = {
    "User-Agent": config.NWS_USER_AGENT,
    "Accept": "application/geo+json",
}


async def fetch_grid_forecast(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetch gridded forecast data for a specific point.
    NWS flow: /points/{lat},{lon} -> get gridId + gridX + gridY -> /gridpoints/{office}/{x},{y}
    """
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            # Step 1: resolve point to grid
            point_resp = await client.get(
                f"{config.NWS_BASE_URL}/points/{lat:.4f},{lon:.4f}",
                headers=NWS_HEADERS,
            )
            point_resp.raise_for_status()
            props = point_resp.json()["properties"]
            grid_url = props["forecastGridData"]

            # Step 2: get grid forecast data
            grid_resp = await client.get(grid_url, headers=NWS_HEADERS)
            grid_resp.raise_for_status()
            return grid_resp.json()["properties"]
        except Exception as e:
            logger.error(f"NWS fetch failed for ({lat}, {lon}): {e}")
            return None


def parse_grid_forecast(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Parse NWS grid forecast into env_cell-compatible records.
    Extracts temperature, humidity, wind speed/direction.
    """
    records = []

    def _extract_latest(series_key: str) -> Optional[float]:
        series = raw.get(series_key, {}).get("values", [])
        if series:
            return series[0].get("value")
        return None

    temperature_c = _extract_latest("temperature")
    relative_humidity = _extract_latest("relativeHumidity")
    wind_speed_kmh = _extract_latest("windSpeed")
    wind_dir = _extract_latest("windDirection")

    wind_speed_mps = (wind_speed_kmh / 3.6) if wind_speed_kmh is not None else None

    record = {
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "temperature_c": temperature_c,
        "relative_humidity": relative_humidity,
        "wind_speed_mps": wind_speed_mps,
        "wind_direction_deg": wind_dir,
        "source": "nws",
    }

    # Only include if we got at least temperature
    if temperature_c is not None:
        records.append(record)

    return records


async def fetch_weather_for_aoi() -> List[Dict[str, Any]]:
    """Fetch weather data for grid points across the area of interest."""
    all_records = []

    # Sample grid points across AOI (roughly 0.5° spacing)
    lat_step = 0.5
    lon_step = 0.5
    lat = config.AOI_MIN_LAT
    while lat <= config.AOI_MAX_LAT:
        lon = config.AOI_MIN_LON
        while lon <= config.AOI_MAX_LON:
            raw = await fetch_grid_forecast(lat, lon)
            if raw:
                records = parse_grid_forecast(raw)
                for r in records:
                    r["latitude"] = lat
                    r["longitude"] = lon
                all_records.extend(records)
            lon += lon_step
        lat += lat_step

    logger.info(f"NWS: fetched {len(all_records)} weather records for AOI")
    return all_records
