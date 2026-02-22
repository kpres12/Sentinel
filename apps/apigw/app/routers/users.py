"""
User management API endpoints.
"""

import os
import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Schemas ──

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: Optional[str] = None
    last_login: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: str
    name: str
    role: str = "observer"


class UserRoleUpdate(BaseModel):
    role: str  # admin, ops, analyst, observer


# ── Endpoints ──

@router.get("/me", response_model=UserOut)
async def get_me(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current authenticated user's profile."""
    sub = user.get("sub", "")
    email = user.get("email", user.get("preferred_username", ""))

    # Try to find user in DB by OIDC sub or email
    db_user = db.query(User).filter(
        (User.oidc_sub == sub) | (User.email == email)
    ).first()

    if db_user:
        # Update last_login
        db_user.last_login = datetime.now(tz=timezone.utc)
        db.commit()
        return UserOut(
            id=str(db_user.id),
            email=db_user.email,
            name=db_user.name,
            role=db_user.role,
            is_active=db_user.is_active,
            created_at=db_user.created_at.isoformat() if db_user.created_at else None,
            last_login=db_user.last_login.isoformat() if db_user.last_login else None,
        )

    # Auto-provision user from OIDC token
    roles = user.get("realm_access", {}).get("roles", [])
    role = "observer"
    for r in ["admin", "ops", "analyst"]:
        if r in roles:
            role = r
            break

    new_user = User(
        id=uuid4(),
        email=email or f"{sub}@sentinel.local",
        name=user.get("name", user.get("given_name", sub)),
        role=role,
        oidc_sub=sub,
        is_active=True,
        last_login=datetime.now(tz=timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserOut(
        id=str(new_user.id),
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at.isoformat() if new_user.created_at else None,
        last_login=new_user.last_login.isoformat() if new_user.last_login else None,
    )


@router.get("/", response_model=List[UserOut])
async def list_users(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all users (admin only)."""
    if user.get("role") != "admin" and "*" not in user.get("permissions", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    users = db.query(User).filter(User.is_active == True).order_by(User.created_at.desc()).all()
    return [
        UserOut(
            id=str(u.id), email=u.email, name=u.name, role=u.role,
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else None,
            last_login=u.last_login.isoformat() if u.last_login else None,
        )
        for u in users
    ]


@router.put("/{user_id}/role", response_model=UserOut)
async def update_role(
    user_id: str,
    body: UserRoleUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a user's role (admin only)."""
    if user.get("role") != "admin" and "*" not in user.get("permissions", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    if body.role not in ("admin", "ops", "analyst", "observer"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be: admin, ops, analyst, observer")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.role = body.role
    db.commit()
    db.refresh(db_user)

    return UserOut(
        id=str(db_user.id), email=db_user.email, name=db_user.name, role=db_user.role,
        is_active=db_user.is_active,
        created_at=db_user.created_at.isoformat() if db_user.created_at else None,
        last_login=db_user.last_login.isoformat() if db_user.last_login else None,
    )


@router.post("/invite", response_model=UserOut)
async def invite_user(
    body: UserCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Invite a new user (admin only). Creates a local record."""
    if user.get("role") != "admin" and "*" not in user.get("permissions", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")

    new_user = User(
        id=uuid4(),
        email=body.email,
        name=body.name,
        role=body.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserOut(
        id=str(new_user.id), email=new_user.email, name=new_user.name, role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at.isoformat() if new_user.created_at else None,
        last_login=None,
    )
