"""
Database models for wildfire operations platform.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from .database import Base


class Telemetry(Base):
    """Telemetry data from robots and drones."""
    __tablename__ = "telemetry"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(String(100), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, default=0.0)
    yaw = Column(Float, default=0.0)
    pitch = Column(Float, default=0.0)
    roll = Column(Float, default=0.0)
    speed = Column(Float, default=0.0)
    battery_level = Column(Float, default=100.0)
    status = Column(String(20), default="online")
    comms_rssi = Column(Float)
    temperature = Column(Float)
    sensors = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # PostGIS geometry column
    geom = Column(Text)  # Will be set up as PostGIS POINT in migration
    
    __table_args__ = (
        Index('idx_telemetry_device_timestamp', 'device_id', 'timestamp'),
        Index('idx_telemetry_geom', 'geom', postgresql_using='gist'),
    )


class Detection(Base):
    """Detections from edge or cloud processing."""
    __tablename__ = "detections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(String(100), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # smoke, flame, heat
    latitude = Column(Float)
    longitude = Column(Float)
    bearing = Column(Float)
    confidence = Column(Float, nullable=False)
    media_ref = Column(String(500))
    source = Column(String(20), default="edge")  # edge, cloud
    metadata = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # PostGIS geometry column
    geom = Column(Text)  # Will be set up as PostGIS POINT in migration
    
    __table_args__ = (
        Index('idx_detections_device_timestamp', 'device_id', 'timestamp'),
        Index('idx_detections_type_confidence', 'type', 'confidence'),
        Index('idx_detections_geom', 'geom', postgresql_using='gist'),
    )


class Alert(Base):
    """Alerts and notifications."""
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # smoke_detected, fire_detected, etc.
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    message = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    device_id = Column(String(100), index=True)
    detection_id = Column(UUID(as_uuid=True), ForeignKey('detections.id'))
    status = Column(String(20), default="active")  # active, acknowledged, resolved
    acknowledged_by = Column(String(100))
    acknowledged_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # PostGIS geometry column
    geom = Column(Text)  # Will be set up as PostGIS POINT in migration
    
    # Relationships
    detection = relationship("Detection", backref="alerts")
    
    __table_args__ = (
        Index('idx_alerts_timestamp', 'timestamp'),
        Index('idx_alerts_severity_status', 'severity', 'status'),
        Index('idx_alerts_geom', 'geom', postgresql_using='gist'),
    )


class FireLine(Base):
    """Fire lines and barriers."""
    __tablename__ = "fire_lines"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200))
    type = Column(String(20), nullable=False)  # dozer, hand, wet_line, backfire
    status = Column(String(20), default="planned")  # planned, under_construction, completed, breached
    width_meters = Column(Float, default=0.0)
    effectiveness = Column(Float, default=1.0)  # 0-1
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # PostGIS geometry column (LINESTRING)
    geom = Column(Text)  # Will be set up as PostGIS LINESTRING in migration
    
    __table_args__ = (
        Index('idx_fire_lines_type_status', 'type', 'status'),
        Index('idx_fire_lines_geom', 'geom', postgresql_using='gist'),
    )


class EnvironmentalCell(Base):
    """Environmental data for grid cells."""
    __tablename__ = "env_cells"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    h3_index = Column(String(20), unique=True, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    fuel_model = Column(Integer)  # Anderson 13 fuel model
    slope_deg = Column(Float)
    aspect_deg = Column(Float)
    canopy_cover = Column(Float)  # 0-1
    soil_moisture = Column(Float)  # 0-1
    fuel_moisture = Column(Float)  # 0-1
    temperature_c = Column(Float)
    relative_humidity = Column(Float)
    wind_speed_mps = Column(Float)
    wind_direction_deg = Column(Float)
    elevation_m = Column(Float)
    risk_score = Column(Float)  # 0-1
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # PostGIS geometry column (POLYGON)
    geom = Column(Text)  # Will be set up as PostGIS POLYGON in migration
    
    __table_args__ = (
        Index('idx_env_cells_h3_timestamp', 'h3_index', 'timestamp'),
        Index('idx_env_cells_risk_score', 'risk_score'),
        Index('idx_env_cells_geom', 'geom', postgresql_using='gist'),
    )


class Scenario(Base):
    """What-if scenarios and simulations."""
    __tablename__ = "scenarios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    base_simulation_id = Column(UUID(as_uuid=True))
    parameters = Column(JSONB)  # Scenario parameters
    results_ref = Column(String(500))  # Reference to results storage
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    
    __table_args__ = (
        Index('idx_scenarios_created_by', 'created_by'),
        Index('idx_scenarios_status', 'status'),
    )


class Integration(Base):
    """External integrations configuration."""
    __tablename__ = "integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    target = Column(String(50), nullable=False)  # ArcGIS, CAD, Webhook, etc.
    config = Column(JSONB)  # Integration-specific configuration
    status = Column(String(20), default="active")  # active, inactive, error
    last_sync = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_integrations_target', 'target'),
        Index('idx_integrations_status', 'status'),
    )


class Mission(Base):
    """Missions for coordinated operations."""
    __tablename__ = "missions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id = Column(String(100), unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False)
    priority = Column(String(20), default="medium")
    description = Column(Text)
    status = Column(String(20), default="pending")  # proposed, pending, active, completed, failed
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    radius = Column(Float, default=200.0)
    waypoints = Column(JSONB)
    assets = Column(JSONB)
    progress = Column(Integer, default=0)
    estimated_duration = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_missions_status', 'status'),
        Index('idx_missions_created_at', 'created_at'),
    )


class Task(Base):
    """Task assignments to devices."""
    __tablename__ = "tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(String(100), unique=True, nullable=False, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    kind = Column(String(50), nullable=False)  # patrol, hold, build_line, survey_smoke, etc.
    waypoints = Column(JSONB)  # List of waypoints
    parameters = Column(JSONB)  # Task-specific parameters
    status = Column(String(20), default="pending")  # pending, in_progress, completed, failed, cancelled
    assigned_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deadline = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        Index('idx_tasks_device_status', 'device_id', 'status'),
        Index('idx_tasks_kind', 'kind'),
    )
