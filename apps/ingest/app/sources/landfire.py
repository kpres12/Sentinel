"""
LANDFIRE fuel model data adapter.
Provides Anderson 13 and Scott-Burgan 40 fuel model data.
Data is fetched from the LANDFIRE Map Service (ArcGIS REST).
"""

import logging
from typing import List, Dict, Any, Optional

import httpx

from app.config import config

logger = logging.getLogger(__name__)

# LANDFIRE ArcGIS Map Service for fuel models
LANDFIRE_BASE_URL = "https://landfire.cr.usgs.gov/arcgis/rest/services"
FBFM13_LAYER = "/Landfire/US_200/MapServer/10"  # Anderson 13 fuel model


async def fetch_fuel_models(
    min_lat: Optional[float] = None,
    min_lon: Optional[float] = None,
    max_lat: Optional[float] = None,
    max_lon: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch fuel model data for the area of interest via LANDFIRE REST identify.
    For large areas, this samples at grid points.
    """
    min_lat = min_lat or config.AOI_MIN_LAT
    min_lon = min_lon or config.AOI_MIN_LON
    max_lat = max_lat or config.AOI_MAX_LAT
    max_lon = max_lon or config.AOI_MAX_LON

    records = []

    # Sample at ~0.05° intervals (roughly 5km)
    lat_step = 0.05
    lon_step = 0.05
    lat = min_lat
    while lat <= max_lat:
        lon = min_lon
        while lon <= max_lon:
            fuel_model = await _identify_fuel_model(lat, lon)
            if fuel_model is not None:
                records.append({
                    "latitude": lat,
                    "longitude": lon,
                    "fuel_model": fuel_model,
                    "source": "landfire",
                })
            lon += lon_step
        lat += lat_step

    logger.info(f"LANDFIRE: fetched {len(records)} fuel model records")
    return records


async def _identify_fuel_model(lat: float, lon: float) -> Optional[int]:
    """Query LANDFIRE for fuel model at a specific point."""
    url = f"{LANDFIRE_BASE_URL}{FBFM13_LAYER}/identify"
    params = {
        "geometry": f"{lon},{lat}",
        "geometryType": "esriGeometryPoint",
        "sr": 4326,
        "tolerance": 1,
        "mapExtent": f"{lon-0.01},{lat-0.01},{lon+0.01},{lat+0.01}",
        "imageDisplay": "100,100,96",
        "returnGeometry": "false",
        "f": "json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            if results:
                pixel_value = results[0].get("attributes", {}).get("Pixel Value", "")
                return int(pixel_value) if pixel_value and pixel_value.isdigit() else None
        except Exception as e:
            logger.debug(f"LANDFIRE identify failed for ({lat}, {lon}): {e}")
            return None

    return None
