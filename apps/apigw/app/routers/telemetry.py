"""
Telemetry API endpoints.
"""

from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from app.database import get_db
from app.models import Telemetry
from app.schemas.telemetry import TelemetryData, TelemetryResponse

router = APIRouter()


@router.post("/", response_model=TelemetryResponse)
async def create_telemetry(
    telemetry_data: TelemetryData,
    db: Session = Depends(get_db)
):
    """Create new telemetry record."""
    try:
        # Create telemetry record
        db_telemetry = Telemetry(
            device_id=telemetry_data.device_id,
            timestamp=telemetry_data.timestamp,
            latitude=telemetry_data.latitude,
            longitude=telemetry_data.longitude,
            altitude=telemetry_data.altitude,
            yaw=telemetry_data.yaw,
            pitch=telemetry_data.pitch,
            roll=telemetry_data.roll,
            speed=telemetry_data.speed,
            battery_level=telemetry_data.battery_level,
            status=telemetry_data.status.value,
            comms_rssi=telemetry_data.comms_rssi,
            temperature=telemetry_data.temperature,
            sensors=[sensor.dict() for sensor in telemetry_data.sensors]
        )
        
        db.add(db_telemetry)
        db.commit()
        db.refresh(db_telemetry)
        
        return TelemetryResponse(
            id=str(db_telemetry.id),
            device_id=db_telemetry.device_id,
            timestamp=db_telemetry.timestamp,
            latitude=db_telemetry.latitude,
            longitude=db_telemetry.longitude,
            altitude=db_telemetry.altitude,
            status=db_telemetry.status,
            created_at=db_telemetry.created_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create telemetry: {str(e)}")


@router.get("/", response_model=List[TelemetryResponse])
async def get_telemetry(
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records"),
    db: Session = Depends(get_db)
):
    """Get telemetry records with optional filtering."""
    try:
        query = db.query(Telemetry)
        
        # Apply filters
        if device_id:
            query = query.filter(Telemetry.device_id == device_id)
        
        if start_time:
            query = query.filter(Telemetry.timestamp >= start_time)
        
        if end_time:
            query = query.filter(Telemetry.timestamp <= end_time)
        
        # Order by timestamp descending and limit
        query = query.order_by(desc(Telemetry.timestamp)).limit(limit)
        
        records = query.all()
        
        return [
            TelemetryResponse(
                id=str(record.id),
                device_id=record.device_id,
                timestamp=record.timestamp,
                latitude=record.latitude,
                longitude=record.longitude,
                altitude=record.altitude,
                status=record.status,
                created_at=record.created_at
            )
            for record in records
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve telemetry: {str(e)}")


@router.get("/devices", response_model=List[str])
async def get_devices(db: Session = Depends(get_db)):
    """Get list of unique device IDs."""
    try:
        devices = db.query(Telemetry.device_id).distinct().all()
        return [device[0] for device in devices]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve devices: {str(e)}")


@router.get("/devices/{device_id}/latest", response_model=TelemetryResponse)
async def get_latest_telemetry(
    device_id: str,
    db: Session = Depends(get_db)
):
    """Get latest telemetry for a specific device."""
    try:
        record = db.query(Telemetry).filter(
            Telemetry.device_id == device_id
        ).order_by(desc(Telemetry.timestamp)).first()
        
        if not record:
            raise HTTPException(status_code=404, detail="Device not found")
        
        return TelemetryResponse(
            id=str(record.id),
            device_id=record.device_id,
            timestamp=record.timestamp,
            latitude=record.latitude,
            longitude=record.longitude,
            altitude=record.altitude,
            status=record.status,
            created_at=record.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve latest telemetry: {str(e)}")


@router.delete("/{telemetry_id}")
async def delete_telemetry(
    telemetry_id: str,
    db: Session = Depends(get_db)
):
    """Delete telemetry record."""
    try:
        record = db.query(Telemetry).filter(Telemetry.id == telemetry_id).first()
        
        if not record:
            raise HTTPException(status_code=404, detail="Telemetry record not found")
        
        db.delete(record)
        db.commit()
        
        return {"message": "Telemetry record deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete telemetry: {str(e)}")
