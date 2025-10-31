"""
Detections router: accepts detection events, stores in DB, updates in-memory tracks, and triggers mission creation for wildfire.
"""
from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4, UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Detection as DetectionModel, Mission as MissionModel
from app.schemas.detection import DetectionIn, DetectionOut, TrackOut, TrackPosition

router = APIRouter()

# In-memory tracks (very simple correlator by source_id)
TRACKS: Dict[str, Dict[str, any]] = {}  # key: source_id, value: { track_id: UUID, positions: [TrackPosition] }

@router.post("/", response_model=DetectionOut)
async def create_detection(body: DetectionIn, request: Request, db: Session = Depends(get_db)) -> DetectionOut:
    try:
        # Persist detection
        db_det = DetectionModel(
            device_id=body.source_id,
            timestamp=body.timestamp,
            type=body.type,
            latitude=body.lat,
            longitude=body.lon,
            confidence=body.confidence,
            media_ref=(body.image_refs[0] if body.image_refs else None),
            source="edge",
            metadata={"heat_index": body.heat_index} if body.heat_index is not None else None,
        )
        db.add(db_det)
        db.commit()
        db.refresh(db_det)

        # Update track for this source_id
        t = TRACKS.get(body.source_id)
        pos = TrackPosition(lat=body.lat, lon=body.lon, alt=body.alt, timestamp=body.timestamp)
        if not t:
            t = {"track_id": uuid4(), "positions": []}
            TRACKS[body.source_id] = t
        t["positions"].append(pos)

        # Broadcast events
        try:
            payload = {"type": "detection_created", "detection": {
                "id": str(db_det.id),
                "type": body.type,
                "lat": body.lat,
                "lon": body.lon,
                "confidence": body.confidence,
                "timestamp": body.timestamp.isoformat(),
                "source_id": body.source_id,
            }}
            await request.app.state.broadcast_event(payload)
            # Publish on bus
            await request.app.state.bus.publish("detections", payload)
        except Exception:
            pass

        # Auto-create a mission for wildfire detections above threshold
        if body.type in ("fire", "hotspot", "smoke") and body.confidence >= 0.7:
            mission_id = f"auto-{int(datetime.now(tz=timezone.utc).timestamp()*1000)}-{uuid4().hex[:6]}"
            db_m = MissionModel(
                mission_id=mission_id,
                type="ember_damp",
                priority="high",
                description="AUTO: respond to detection",
                status="pending",
                lat=body.lat,
                lng=body.lon,
                radius=200.0,
                waypoints=None,
                assets=None,
                progress=0,
                estimated_duration=None,
            )
            db.add(db_m)
            db.commit()
            try:
                await request.app.state.broadcast_event({"type": "mission_created", "id": mission_id, "lat": body.lat, "lon": body.lon})
            except Exception:
                pass

        return DetectionOut(
            id=db_det.id,
            type=body.type,
            confidence=body.confidence,
            lat=body.lat,
            lon=body.lon,
            alt=body.alt,
            timestamp=body.timestamp,
            source_id=body.source_id,
            created_at=db_det.created_at,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create detection: {e}")


@router.get("/tracks", response_model=List[TrackOut])
async def list_tracks() -> List[TrackOut]:
    out: List[TrackOut] = []
    for _, t in TRACKS.items():
        out.append(TrackOut(track_id=t["track_id"], positions=t["positions"], classification="fire", confidence=0.8))
    return out
