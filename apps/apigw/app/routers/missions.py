"""
Missions API endpoints.
- POST /api/v1/missions: accept a mission, publish to MQTT, and echo back
- GET /api/v1/missions: list recent missions (in-memory store)
"""

from typing import Optional, List
from datetime import datetime, timezone
from collections import deque
from uuid import uuid4
import os

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Mission as MissionModel
from pydantic import BaseModel, Field
from typing import Optional
import paho.mqtt.client as mqtt

# Environment
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MISSIONS_TOPIC = os.getenv("MISSIONS_TOPIC", os.getenv("DISPATCHER_MISSIONS_TOPIC", "missions/updates"))

# Initialize MQTT client
mqtt_client = mqtt.Client(client_id="apigw-missions")
try:
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_start()
except Exception:
    # Will attempt to publish later; failures are handled per publish
    pass

# In-memory store (recent missions)
RECENT_MISSIONS: deque = deque(maxlen=200)

router = APIRouter()


class MissionLocation(BaseModel):
    lat: float
    lng: float
    radius: Optional[float] = 200


class MissionIn(BaseModel):
    mission_id: Optional[str] = None
    type: str = Field(default="surveillance")
    priority: str = Field(default="medium")
    description: Optional[str] = Field(default="AUTOMATED RECON DISPATCH")
    location: MissionLocation
    waypoints: Optional[list] = None
    assets: Optional[list[str]] = None


class MissionOut(BaseModel):
    id: str
    type: str
    status: str
    priority: str
    location: MissionLocation
    description: str
    createdAt: datetime
    updatedAt: datetime
    progress: int
    estimatedDuration: Optional[int] = None


class MissionUpdateIn(BaseModel):
    status: Optional[str] = None  # proposed, pending, active, completed, failed
    progress: Optional[int] = None
    description: Optional[str] = None
    estimatedDuration: Optional[int] = None


@router.post("/", response_model=MissionOut)
async def create_mission(mission: MissionIn, request: Request, db: Session = Depends(get_db)) -> MissionOut:
    """Create a mission record, publish to MQTT, and return UI-friendly object."""
    try:
        mission_id = mission.mission_id or f"recon-{int(datetime.now(tz=timezone.utc).timestamp()*1000)}-{uuid4().hex[:6]}"
        now = datetime.now(tz=timezone.utc)
        out = MissionOut(
            id=mission_id,
            type=mission.type,
            status="pending",
            priority=mission.priority,
            location=mission.location,
            description=mission.description or "",
            createdAt=now,
            updatedAt=now,
            progress=0,
            estimatedDuration=None,
        )

        # Persist in DB
        db_obj = MissionModel(
            mission_id=mission_id,
            type=out.type,
            priority=out.priority,
            description=out.description,
            status=out.status,
            lat=out.location.lat,
            lng=out.location.lng,
            radius=out.location.radius or 200,
            waypoints=mission.waypoints,
            assets=mission.assets,
            progress=out.progress,
            estimated_duration=out.estimatedDuration,
        )
        db.add(db_obj)
        db.commit()

        # Publish to MQTT for real-time UI updates
        try:
            mqtt_client.publish(MISSIONS_TOPIC, out.model_dump_json(), qos=0)
        except Exception:
            pass

        # Broadcast over WebSocket
        try:
            await request.app.state.broadcast_event({"type": "mission_created", "mission": out.model_dump()})
        except Exception:
            pass

        # Schedule simple status transitions (pending->active->completed)
        import asyncio
        async def _advance():
            try:
                await asyncio.sleep(5)
                row = db.query(MissionModel).filter(MissionModel.mission_id == mission_id).first()
                if row:
                    row.status = "active"
                    db.commit()
                    await request.app.state.broadcast_event({"type": "mission_updated", "id": mission_id, "status": "active"})
                await asyncio.sleep(10)
                row = db.query(MissionModel).filter(MissionModel.mission_id == mission_id).first()
                if row:
                    row.status = "completed"
                    row.progress = 100
                    db.commit()
                    await request.app.state.broadcast_event({"type": "mission_updated", "id": mission_id, "status": "completed", "progress": 100})
            except Exception:
                pass
        asyncio.create_task(_advance())

        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create mission: {e}")


@router.get("/", response_model=List[MissionOut])
async def list_missions(limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)) -> List[MissionOut]:
    """List recent missions from in-memory store."""
    try:
        rows = db.query(MissionModel).order_by(desc(MissionModel.created_at)).limit(limit).all()
        results: List[MissionOut] = []
        for r in rows:
            results.append(MissionOut(
                id=r.mission_id,
                type=r.type,
                status=r.status,
                priority=r.priority,
                location=MissionLocation(lat=r.lat, lng=r.lng, radius=r.radius),
                description=r.description or '',
                createdAt=r.created_at,
                updatedAt=r.updated_at,
                progress=r.progress or 0,
                estimatedDuration=r.estimated_duration
            ))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list missions: {e}")


@router.patch("/{mission_id}", response_model=MissionOut)
async def update_mission(mission_id: str, body: MissionUpdateIn, request: Request, db: Session = Depends(get_db)) -> MissionOut:
    """Update mission status/progress and publish MQTT update."""
    try:
        row: MissionModel = db.query(MissionModel).filter(MissionModel.mission_id == mission_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Mission not found")

        if body.status is not None:
            row.status = body.status
        if body.progress is not None:
            row.progress = body.progress
        if body.description is not None:
            row.description = body.description
        if body.estimatedDuration is not None:
            row.estimated_duration = body.estimatedDuration

        db.commit()
        db.refresh(row)

        out = MissionOut(
            id=row.mission_id,
            type=row.type,
            status=row.status,
            priority=row.priority,
            location=MissionLocation(lat=row.lat, lng=row.lng, radius=row.radius),
            description=row.description or '',
            createdAt=row.created_at,
            updatedAt=row.updated_at,
            progress=row.progress or 0,
            estimatedDuration=row.estimated_duration
        )

        # Publish update
        try:
            mqtt_client.publish(MISSIONS_TOPIC, out.model_dump_json(), qos=0)
        except Exception:
            pass
        # Broadcast over WebSocket
        try:
            await request.app.state.broadcast_event({"type": "mission_updated", "mission": out.model_dump()})
        except Exception:
            pass

        return out
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update mission: {e}")
