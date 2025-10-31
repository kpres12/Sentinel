"""
Summit.OS facade: mock vehicles, tasks, telemetry endpoints.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter

router = APIRouter()

_VEHICLES = [
    {"id": "firefly-alpha", "type": "uav", "caps": ["surveil", "track"], "battery_pct": 87},
    {"id": "fireline-alpha", "type": "uav", "caps": ["spray", "track"], "battery_pct": 76},
    {"id": "kofa-bravo", "type": "ugv", "caps": ["patrol"], "battery_pct": 92},
]
_TASKS: List[dict] = []

@router.get("/vehicles")
async def vehicles():
    return {"vehicles": _VEHICLES}

@router.get("/telemetry")
async def telemetry():
    now = datetime.now(tz=timezone.utc).isoformat()
    return {
        "telemetry": [
            {"vehicle_id": v["id"], "timestamp": now, "position": {"lat": 40.0, "lon": -120.0, "alt": 1200}, "battery_pct": v["battery_pct"]}
            for v in _VEHICLES
        ]
    }

@router.get("/tasks")
async def tasks():
    return {"tasks": _TASKS}

@router.post("/tasks")
async def create_task(task: dict):
    tid = task.get("task_id") or f"task-{uuid4().hex[:8]}"
    new_task = {"task_id": tid, "status": "accepted", **task}
    _TASKS.append(new_task)
    return new_task
