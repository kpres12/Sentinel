"""
Configuration for the data ingest service.
"""

import os


class IngestConfig:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://wildfire:***REMOVED***@localhost:5432/wildfire_ops")

    # NWS (free, no key needed)
    NWS_BASE_URL: str = "https://api.weather.gov"
    NWS_USER_AGENT: str = os.getenv("NWS_USER_AGENT", "Sentinel-Wildfire-Ops (contact@bigmt.ai)")
    NWS_POLL_INTERVAL_MIN: int = int(os.getenv("NWS_POLL_INTERVAL_MIN", "30"))

    # NASA FIRMS
    FIRMS_MAP_KEY: str = os.getenv("FIRMS_MAP_KEY", "")
    FIRMS_BASE_URL: str = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
    FIRMS_POLL_INTERVAL_MIN: int = int(os.getenv("FIRMS_POLL_INTERVAL_MIN", "60"))

    # NOAA Lightning
    NOAA_API_TOKEN: str = os.getenv("NOAA_API_TOKEN", "")
    NOAA_POLL_INTERVAL_MIN: int = int(os.getenv("NOAA_POLL_INTERVAL_MIN", "15"))

    # Area of interest (default: Northern California)
    AOI_MIN_LAT: float = float(os.getenv("AOI_MIN_LAT", "38.0"))
    AOI_MAX_LAT: float = float(os.getenv("AOI_MAX_LAT", "42.0"))
    AOI_MIN_LON: float = float(os.getenv("AOI_MIN_LON", "-124.0"))
    AOI_MAX_LON: float = float(os.getenv("AOI_MAX_LON", "-119.0"))

    # Service
    INGEST_PORT: int = int(os.getenv("INGEST_PORT", "8103"))


config = IngestConfig()
