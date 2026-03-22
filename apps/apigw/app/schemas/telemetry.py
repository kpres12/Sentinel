"""
Telemetry schemas for API requests and responses.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class DeviceStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    MAINTENANCE = "maintenance"


class SensorReading(BaseModel):
    name: str
    unit: str
    value: float
    timestamp: datetime


class TelemetryData(BaseModel):
    device_id: str
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: float = 0.0

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
    yaw: float = 0.0
    pitch: float = 0.0
    roll: float = 0.0
    speed: float = 0.0
    battery_level: float = Field(ge=0, le=100)
    sensors: List[SensorReading] = []
    status: DeviceStatus = DeviceStatus.ONLINE
    comms_rssi: Optional[float] = None
    temperature: Optional[float] = None


class TelemetryResponse(BaseModel):
    id: str
    device_id: str
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
