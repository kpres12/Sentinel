"""
Request/response schemas for the prediction service.
"""

from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class IgnitionPoint(BaseModel):
    lat: float
    lon: float
    alt: float = 0.0


class WeatherConditions(BaseModel):
    wind_speed_mps: float = Field(ge=0)
    wind_direction_deg: float = Field(ge=0, le=360)
    temperature_c: float = 20.0
    relative_humidity: float = Field(default=40.0, ge=0, le=100)
    fuel_moisture: float = Field(default=0.3, ge=0, le=1)
    fuel_model: int = Field(default=1, ge=1, le=13)


class PredictRequest(BaseModel):
    """POST /predict request body."""
    ignition_points: List[IgnitionPoint]
    conditions: WeatherConditions
    simulation_hours: int = Field(default=24, gt=0, le=168)
    time_step_minutes: int = Field(default=15, gt=0, le=60)
    monte_carlo_runs: int = Field(default=100, gt=0, le=1000)


class PerimeterPoint(BaseModel):
    lat: float
    lon: float


class IsochoneResult(BaseModel):
    hours_from_start: int
    area_hectares: float
    perimeter_km: float


class ConfidenceBreakdown(BaseModel):
    overall: float
    weather: float
    fuel: float
    terrain: float


class PredictResponse(BaseModel):
    """POST /predict response body."""
    simulation_id: str
    ignition_points_count: int
    conditions_present: bool
    perimeter: List[PerimeterPoint]
    isochrones: List[IsochoneResult]
    total_area_hectares: float
    max_spread_rate_mph: float
    confidence: ConfidenceBreakdown
    statistics: Dict[str, float] = {}
    rationale: List[str]
    method: str
