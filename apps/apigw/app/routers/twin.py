"""
Digital Twin facade: expose in-memory tracks and DB-backed missions/tasks.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Mission as MissionModel, Task as TaskModel
from app.schemas.detection import TrackOut, TrackPosition

# Import tracks from detections module
try:
    from app.routers.detections import TRACKS
except Exception:
    TRACKS = {}

router = APIRouter()

@router.get("/tracks", response_model=List[TrackOut])
async def twin_tracks() -> List[TrackOut]:
    out: List[TrackOut] = []
    for _, t in TRACKS.items():
        out.append(TrackOut(track_id=t["track_id"], positions=t["positions"], classification="fire", confidence=0.8))
    return out

@router.get("/missions")
async def twin_missions(db: Session = Depends(get_db)):
    try:
        rows = db.query(MissionModel).order_by(MissionModel.created_at.desc()).limit(200).all()
        return [
            {
                "id": r.mission_id,
                "type": r.type,
                "status": r.status,
                "priority": r.priority,
                "lat": r.lat,
                "lng": r.lng,
                "radius": r.radius,
                "createdAt": r.created_at.isoformat() if r.created_at else None,
                "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
                "progress": r.progress or 0,
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list missions: {e}")

@router.get("/tasks")
async def twin_tasks(db: Session = Depends(get_db)):
    try:
        rows = db.query(TaskModel).order_by(TaskModel.created_at.desc()).limit(200).all()
        return [
            {
                "task_id": r.task_id,
                "device_id": r.device_id,
                "kind": r.kind,
                "status": r.status,
                "createdAt": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tasks: {e}")
