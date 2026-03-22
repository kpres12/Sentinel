"""
Sensor fusion and risk scoring schemas.
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class EnvironmentalInput(BaseModel):
    latitude: float
    longitude: float
    timestamp: datetime
    fuel_model: int = Field(ge=1, le=13)

    @field_validator('latitude')
    @classmethod
    def validate_lat(cls, v):
        if not -90 <= v <= 90:
            raise ValueError(f'Latitude must be between -90 and 90, got {v}')
        return v

    @field_validator('longitude')
    @classmethod
    def validate_lng(cls, v):
        if not -180 <= v <= 180:
            raise ValueError(f'Longitude must be between -180 and 180, got {v}')
        return v
    slope_deg: float = Field(ge=0, le=90)
    aspect_deg: float = Field(ge=0, le=360)
    canopy_cover: float = Field(ge=0, le=1)
    soil_moisture: float = Field(ge=0, le=1)
    fuel_moisture: float = Field(ge=0, le=1)
    temperature_c: float
    relative_humidity: float = Field(ge=0, le=100)
    wind_speed_mps: float = Field(ge=0)
    wind_direction_deg: float = Field(ge=0, le=360)
    elevation_m: float
    lightning_strikes_24h: int = 0
    historical_ignitions: int = 0


class RiskScoreResponse(BaseModel):
    latitude: float
    longitude: float
    risk_score: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    contributing_factors: Dict[str, float]
    timestamp: str


class HeatmapRequest(BaseModel):
    cells: List[EnvironmentalInput]


class HeatmapResponse(BaseModel):
    scores: List[RiskScoreResponse]
    model_trained: bool
    method: str


class ModelStatus(BaseModel):
    is_trained: bool
    feature_count: int
    feature_importance: Dict[str, float]
