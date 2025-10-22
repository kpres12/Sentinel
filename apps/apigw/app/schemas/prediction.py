"""
Prediction and modeling schemas for API requests and responses.
"""
from datetime import datetime
from typing import Dict, List
from pydantic import BaseModel, Field


class Point(BaseModel):
    latitude: float
    longitude: float
    altitude: float = 0.0


class EnvironmentalConditions(BaseModel):
    timestamp: datetime
    latitude: float
    longitude: float
    temperature_c: float
    relative_humidity: float = Field(ge=0, le=100)
    wind_speed_mps: float = Field(ge=0)
    wind_direction_deg: float = Field(ge=0, le=360)
    fuel_moisture: float = Field(ge=0, le=1)
    soil_moisture: float = Field(ge=0, le=1)
    fuel_model: int = Field(ge=1, le=13)
    slope_deg: float = Field(ge=0, le=90)
    aspect_deg: float = Field(ge=0, le=360)
    canopy_cover: float = Field(ge=0, le=1)
    elevation_m: float


class SpreadParameters(BaseModel):
    ignition_points: List[Point]
    conditions: EnvironmentalConditions
    simulation_hours: int = Field(gt=0, le=168)
    time_step_minutes: float = Field(gt=0, le=60)
    monte_carlo_runs: int = Field(gt=0, le=1000)
    custom_parameters: Dict[str, float] = {}


class Isochrone(BaseModel):
    hours_from_start: int = Field(ge=0)
    geometry: List[Point]
    area_hectares: float = Field(ge=0)
    perimeter_km: float = Field(ge=0)


class SpreadConfidence(BaseModel):
    overall_confidence: float = Field(ge=0, le=1)
    weather_confidence: float = Field(ge=0, le=1)
    fuel_confidence: float = Field(ge=0, le=1)
    terrain_confidence: float = Field(ge=0, le=1)
    confidence_factors: str = ""


class SpreadResult(BaseModel):
    simulation_id: str
    created_at: datetime
    isochrones: List[Isochrone]
    perimeter: List[Point]
    total_area_hectares: float = Field(ge=0)
    max_spread_rate_mph: float = Field(ge=0)
    simulation_duration_hours: float = Field(ge=0)
    statistics: Dict[str, float] = {}
    confidence: SpreadConfidence