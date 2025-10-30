"""
Admin settings endpoints for toggling runtime flags.
"""
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter()

class RequireConfirmBody(BaseModel):
    value: bool

@router.get("/settings")
async def get_settings(request: Request):
    return {
        "require_confirm": bool(getattr(request.app.state, "require_confirm", False))
    }

@router.post("/require_confirm")
async def set_require_confirm(body: RequireConfirmBody, request: Request):
    try:
        request.app.state.require_confirm = bool(body.value)
        return {"require_confirm": request.app.state.require_confirm}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
