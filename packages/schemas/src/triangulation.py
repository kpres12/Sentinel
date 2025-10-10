"""
Triangulation data models for smoke localization.
"""
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from enum import Enum

from .telemetry import Point


class TriangulationMethod(str, Enum):
    BEARING_ONLY = "bearing_only"
    BEARING_ELEVATION = "bearing_elevation"
    RANSAC = "ransac"


class BearingObservation(BaseModel):
    device_id: str
    timestamp: datetime
    device_latitude: float
    device_longitude: float
    device_altitude: float = 0.0
    camera_heading: float = Field(description="Degrees from north")
    camera_pitch: float = Field(description="Degrees from horizontal")
    bearing: float = Field(description="Degrees from north to target")
    confidence: float = Field(ge=0, le=1)
    detection_id: str


class TriangulationResult(BaseModel):
    result_id: str
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: float = 0.0
    confidence: float = Field(ge=0, le=1)
    uncertainty_meters: float = Field(ge=0)
    observation_ids: List[str] = []
    method: TriangulationMethod
    quality_metrics: Dict[str, float] = {}


class TriangulateRequest(BaseModel):
    observations: List[BearingObservation]
    max_distance_km: Optional[float] = None
    min_confidence: Optional[float] = None
    preferred_method: Optional[TriangulationMethod] = None


class TriangulateResponse(BaseModel):
    results: List[TriangulationResult]
    success: bool
    error_message: Optional[str] = None
    observation_count: int
    processing_time_ms: float
