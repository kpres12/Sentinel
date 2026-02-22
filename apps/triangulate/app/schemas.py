"""
Request/response schemas for the triangulation service.
"""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class BearingInput(BaseModel):
    """A single bearing observation from a camera/device."""
    device_id: str = ""
    lat: float
    lon: float
    alt: float = 0.0
    bearing: float = Field(ge=0, le=360, description="Bearing to target in degrees from north")
    camera_heading: float = 0.0
    camera_pitch: float = 0.0
    confidence: float = Field(default=0.8, ge=0, le=1)
    detection_id: str = ""


class TriangulateRequest(BaseModel):
    """POST /triangulate request body."""
    bearings: List[BearingInput]


class UncertaintyEllipse(BaseModel):
    major_m: float
    minor_m: float
    heading_deg: float


class Uncertainty(BaseModel):
    radius_m: float
    ellipse: Optional[UncertaintyEllipse] = None


class QualityMetrics(BaseModel):
    angular_spread: float = 0.0
    baseline_distance: float = 0.0
    residual_error: Optional[float] = None


class TriangulateResponse(BaseModel):
    """POST /triangulate response body."""
    inputCount: int
    estimate: Dict[str, float]
    confidence: float
    uncertainty: Uncertainty
    rationale: List[str]
    method: str
    quality_metrics: QualityMetrics


class GoldenScenario(BaseModel):
    scenario: str
    input: dict
    output: dict
