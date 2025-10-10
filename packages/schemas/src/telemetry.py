"""
Telemetry data models for wildfire operations platform.
"""
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class DeviceStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    MAINTENANCE = "maintenance"


class DetectionType(str, Enum):
    SMOKE = "smoke"
    FLAME = "flame"
    HEAT = "heat"


class TaskKind(str, Enum):
    PATROL = "patrol"
    HOLD = "hold"
    BUILD_LINE = "build_line"
    SURVEY_SMOKE = "survey_smoke"
    EMERGENCY_RETURN = "emergency_return"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AlertType(str, Enum):
    SMOKE_DETECTED = "smoke_detected"
    FIRE_DETECTED = "fire_detected"
    DEVICE_OFFLINE = "device_offline"
    LOW_BATTERY = "low_battery"
    COMMS_LOST = "comms_lost"
    EMERGENCY = "emergency"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


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
    yaw: float = 0.0
    pitch: float = 0.0
    roll: float = 0.0
    speed: float = 0.0
    battery_level: float = Field(ge=0, le=100)
    sensors: List[SensorReading] = []
    status: DeviceStatus = DeviceStatus.ONLINE
    comms_rssi: Optional[float] = None
    temperature: Optional[float] = None


class Detection(BaseModel):
    device_id: str
    timestamp: datetime
    type: DetectionType
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    bearing: Optional[float] = None
    confidence: float = Field(ge=0, le=1)
    media_ref: Optional[str] = None
    source: str = "edge"  # edge, cloud
    metadata: Dict[str, str] = {}


class Point(BaseModel):
    latitude: float
    longitude: float
    altitude: float = 0.0


class Task(BaseModel):
    task_id: str
    device_id: str
    kind: TaskKind
    waypoints: List[Point]
    parameters: Dict[str, str] = {}
    created_at: datetime
    deadline: Optional[datetime] = None
    status: TaskStatus = TaskStatus.PENDING
    assigned_by: str


class Alert(BaseModel):
    alert_id: str
    timestamp: datetime
    type: AlertType
    severity: AlertSeverity
    message: str
    location: Point
    device_id: Optional[str] = None
    detection_id: Optional[str] = None
    status: AlertStatus = AlertStatus.ACTIVE
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
