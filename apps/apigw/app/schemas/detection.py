"""
Detection schemas for API requests and responses.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl
from uuid import UUID, uuid4

class WindVector(BaseModel):
    speed_mps: float = Field(ge=0)
    direction_deg: float = Field(ge=0, le=360)

class DetectionIn(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    type: str = Field(pattern="^[a-zA-Z_]+$")
    confidence: float = Field(ge=0, le=1)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    alt: Optional[float] = None
    timestamp: datetime
    source_id: str
    image_refs: Optional[List[HttpUrl]] = None
    heat_index: Optional[float] = None
    wind_vector: Optional[WindVector] = None

class DetectionOut(BaseModel):
    id: UUID
    type: str
    confidence: float
    lat: float
    lon: float
    alt: Optional[float] = None
    timestamp: datetime
    source_id: str
    created_at: datetime

class TrackPosition(BaseModel):
    lat: float
    lon: float
    alt: Optional[float] = None
    timestamp: datetime

class TrackOut(BaseModel):
    track_id: UUID
    positions: List[TrackPosition]
    classification: Optional[str] = None
    confidence: Optional[float] = None
