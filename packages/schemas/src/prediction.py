"""
Prediction and modeling data models for fire spread simulation.
"""
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from enum import Enum

from .telemetry import Point


class FireLineType(str, Enum):
    DOZER = "dozer"
    HAND = "hand"
    WET_LINE = "wet_line"
    BACKFIRE = "backfire"


class FireLineStatus(str, Enum):
    PLANNED = "planned"
    UNDER_CONSTRUCTION = "under_construction"
    COMPLETED = "completed"
    BREACHED = "breached"


class ScenarioModificationType(str, Enum):
    WIND_CHANGE = "wind_change"
    HUMIDITY_CHANGE = "humidity_change"
    FUEL_MOISTURE_CHANGE = "fuel_moisture_change"
    ADD_FIRE_LINE = "add_fire_line"
    REMOVE_FIRE_LINE = "remove_fire_line"
    IGNITION_POINT_CHANGE = "ignition_point_change"


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
    fuel_model: int = Field(ge=1, le=13)  # Anderson 13 fuel model
    slope_deg: float = Field(ge=0, le=90)
    aspect_deg: float = Field(ge=0, le=360)
    canopy_cover: float = Field(ge=0, le=1)
    elevation_m: float


class FireLine(BaseModel):
    line_id: str
    geometry: List[Point]
    width_meters: float = Field(gt=0)
    type: FireLineType
    status: FireLineStatus
    effectiveness: float = Field(ge=0, le=1)


class SpreadParameters(BaseModel):
    ignition_points: List[Point]
    conditions: EnvironmentalConditions
    fire_lines: List[FireLine] = []
    simulation_hours: int = Field(gt=0, le=168)  # max 1 week
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


class ScenarioModification(BaseModel):
    type: ScenarioModificationType
    parameters: Dict[str, float]
    description: str


class WhatIfRequest(BaseModel):
    base_simulation_id: str
    modifications: List[ScenarioModification]
    scenario_name: str
    created_by: str


class ScenarioComparison(BaseModel):
    area_difference_hectares: float
    perimeter_difference_km: float
    max_spread_rate_difference_mph: float
    confidence_change: float
    summary: str


class WhatIfResult(BaseModel):
    scenario_id: str
    base_simulation_id: str
    scenario_name: str
    created_at: datetime
    created_by: str
    modifications: List[ScenarioModification]
    result: SpreadResult
    comparison: ScenarioComparison
