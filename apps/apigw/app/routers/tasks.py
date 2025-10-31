"""
Tasks router: create and list tasks (mocked for demo flow).
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task as TaskModel

router = APIRouter()

class Waypoint(BaseModel):
    lat: float
    lon: float
    alt: Optional[float] = None

class TaskIn(BaseModel):
    task_id: Optional[str] = None
    device_id: str
    kind: str
    waypoints: Optional[List[Waypoint]] = None
    parameters: Optional[dict] = None
    deadline: Optional[datetime] = None

class TaskOut(BaseModel):
    task_id: str
    device_id: str
    kind: str
    status: str
    createdAt: datetime
    deadline: Optional[datetime] = None

@router.post("/", response_model=TaskOut)
async def create_task(body: TaskIn, db: Session = Depends(get_db)) -> TaskOut:
    try:
        task_id = body.task_id or f"task-{uuid4().hex[:8]}"
        row = TaskModel(
            task_id=task_id,
            device_id=body.device_id,
            kind=body.kind,
            waypoints=[w.model_dump() for w in (body.waypoints or [])],
            parameters=body.parameters,
            status="pending",
            deadline=body.deadline,
        )
        db.add(row)
        db.commit()
        return TaskOut(
            task_id=row.task_id,
            device_id=row.device_id,
            kind=row.kind,
            status=row.status,
            createdAt=row.created_at,
            deadline=row.deadline,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create task: {e}")

@router.get("/", response_model=List[TaskOut])
async def list_tasks(limit: int = 100, db: Session = Depends(get_db)) -> List[TaskOut]:
    try:
        rows = db.query(TaskModel).order_by(TaskModel.created_at.desc()).limit(limit).all()
        return [
            TaskOut(
                task_id=r.task_id,
                device_id=r.device_id,
                kind=r.kind,
                status=r.status,
                createdAt=r.created_at,
                deadline=r.deadline,
            )
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tasks: {e}")
