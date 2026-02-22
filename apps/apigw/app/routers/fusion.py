"""
Sensor fusion and risk scoring endpoints.
"""

import sys
import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException

from app.schemas.fusion import (
    EnvironmentalInput,
    RiskScoreResponse,
    HeatmapRequest,
    HeatmapResponse,
    ModelStatus,
)

logger = logging.getLogger(__name__)

# Ensure algorithms package is importable
PROJECT_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(PROJECT_ROOT / "packages" / "algorithms"))

try:
    from src.fusion import SensorFusionEngine, EnvironmentalData
    _engine = SensorFusionEngine()
    logger.info("SensorFusionEngine loaded successfully")
except Exception as e:
    _engine = None
    logger.warning(f"SensorFusionEngine not available: {e}")

router = APIRouter()


def _to_env_data(inp: EnvironmentalInput) -> "EnvironmentalData":
    return EnvironmentalData(
        latitude=inp.latitude,
        longitude=inp.longitude,
        timestamp=inp.timestamp.isoformat(),
        fuel_model=inp.fuel_model,
        slope_deg=inp.slope_deg,
        aspect_deg=inp.aspect_deg,
        canopy_cover=inp.canopy_cover,
        soil_moisture=inp.soil_moisture,
        fuel_moisture=inp.fuel_moisture,
        temperature_c=inp.temperature_c,
        relative_humidity=inp.relative_humidity,
        wind_speed_mps=inp.wind_speed_mps,
        wind_direction_deg=inp.wind_direction_deg,
        elevation_m=inp.elevation_m,
        lightning_strikes_24h=inp.lightning_strikes_24h,
        historical_ignitions=inp.historical_ignitions,
    )


@router.post("/risk", response_model=RiskScoreResponse)
async def calculate_risk(body: EnvironmentalInput):
    """Calculate fire risk score for a single environmental cell."""
    if _engine is None:
        raise HTTPException(status_code=500, detail="SensorFusionEngine not available")

    env_data = _to_env_data(body)
    result = _engine.calculate_risk_score(env_data)
    return RiskScoreResponse(
        latitude=result.latitude,
        longitude=result.longitude,
        risk_score=round(result.risk_score, 4),
        confidence=round(result.confidence, 4),
        contributing_factors={k: round(v, 4) for k, v in result.contributing_factors.items()},
        timestamp=result.timestamp,
    )


@router.post("/heatmap", response_model=HeatmapResponse)
async def calculate_heatmap(body: HeatmapRequest):
    """Calculate risk scores for multiple environmental cells."""
    if _engine is None:
        raise HTTPException(status_code=500, detail="SensorFusionEngine not available")

    if len(body.cells) > 10000:
        raise HTTPException(status_code=400, detail="Maximum 10000 cells per request")

    scores: List[RiskScoreResponse] = []
    for cell in body.cells:
        env_data = _to_env_data(cell)
        result = _engine.calculate_risk_score(env_data)
        scores.append(RiskScoreResponse(
            latitude=result.latitude,
            longitude=result.longitude,
            risk_score=round(result.risk_score, 4),
            confidence=round(result.confidence, 4),
            contributing_factors={k: round(v, 4) for k, v in result.contributing_factors.items()},
            timestamp=result.timestamp,
        ))

    return HeatmapResponse(
        scores=scores,
        model_trained=_engine.is_trained,
        method="ml_model" if _engine.is_trained else "heuristic",
    )


@router.get("/model/status", response_model=ModelStatus)
async def model_status():
    """Check if the ML risk model is trained and its feature importance."""
    if _engine is None:
        raise HTTPException(status_code=500, detail="SensorFusionEngine not available")

    return ModelStatus(
        is_trained=_engine.is_trained,
        feature_count=len(_engine.feature_importance),
        feature_importance={k: round(v, 4) for k, v in _engine.feature_importance.items()},
    )
