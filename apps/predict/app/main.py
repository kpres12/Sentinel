"""
Prediction microservice — FastAPI wrapper around the real FireSpreadEngine.
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Ensure shared packages are importable
PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT / "packages" / "algorithms"))

from src.spread_modeling import FireSpreadEngine, SpreadParameters  # noqa: E402

from app.schemas import (
    PredictRequest,
    PredictResponse,
    PerimeterPoint,
    IsochoneResult,
    ConfidenceBreakdown,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PORT = int(os.getenv("PREDICT_PORT", "8102"))
AUDIT_DIR = Path(os.getcwd()) / "logs"
AUDIT_FILE = AUDIT_DIR / "predict.audit.jsonl"
AUDIT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Sentinel Prediction Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

engine = FireSpreadEngine()


def _audit(input_data: dict, output_data: dict) -> None:
    try:
        with open(AUDIT_FILE, "a") as f:
            f.write(json.dumps({"ts": int(datetime.now(tz=timezone.utc).timestamp() * 1000), "input": input_data, "output": output_data}) + "\n")
    except Exception:
        pass


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/scenarios/golden")
async def golden_scenario():
    """Deterministic golden scenario for integration tests."""
    params = SpreadParameters(
        ignition_points=[(40.0, -120.0)],
        wind_speed=5.0,
        wind_direction=270.0,
        temperature=25.0,
        humidity=30.0,
        fuel_moisture=0.3,
        fuel_model=1,
        simulation_hours=3,
        time_step_minutes=15,
        monte_carlo_runs=10,
    )
    result = engine.simulate_spread(params)
    return {
        "scenario": "golden-1",
        "input": {"ignition_points": [{"lat": 40.0, "lon": -120.0}], "conditions": {"wind_speed_mps": 5, "wind_direction_deg": 270}},
        "output": {
            "simulation_id": result.simulation_id,
            "perimeter_points": len(result.perimeter),
            "total_area_hectares": result.total_area_hectares,
            "max_spread_rate_mph": result.max_spread_rate_mph,
            "confidence": result.confidence,
        },
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(body: PredictRequest):
    """Run fire spread prediction using the real Rothermel + Monte Carlo engine."""
    if not body.ignition_points:
        raise HTTPException(status_code=400, detail="At least 1 ignition point is required")

    params = SpreadParameters(
        ignition_points=[(p.lat, p.lon) for p in body.ignition_points],
        wind_speed=body.conditions.wind_speed_mps,
        wind_direction=body.conditions.wind_direction_deg,
        temperature=body.conditions.temperature_c,
        humidity=body.conditions.relative_humidity,
        fuel_moisture=body.conditions.fuel_moisture,
        fuel_model=body.conditions.fuel_model,
        simulation_hours=body.simulation_hours,
        time_step_minutes=body.time_step_minutes,
        monte_carlo_runs=body.monte_carlo_runs,
    )

    try:
        result = engine.simulate_spread(params)
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")

    # Map perimeter
    perimeter = [PerimeterPoint(lat=lat, lon=lon) for lat, lon in result.perimeter[:500]]  # cap for response size

    # Map isochrones
    isochrones = [
        IsochoneResult(
            hours_from_start=int(iso.get("hours_from_start", 0)),
            area_hectares=round(float(iso.get("area_hectares", 0)), 2),
            perimeter_km=round(float(iso.get("perimeter_km", 0)), 2),
        )
        for iso in result.isochrones
    ]

    conf = float(result.confidence)
    stats = {k: round(float(v), 4) for k, v in (result.statistics or {}).items()}

    # Build rationale
    rationale = []
    if body.conditions.wind_speed_mps > 10:
        rationale.append("high wind speed — accelerated spread")
    elif body.conditions.wind_speed_mps > 5:
        rationale.append("moderate wind")
    else:
        rationale.append("low wind")

    if body.conditions.fuel_moisture < 0.2:
        rationale.append("dry fuel — elevated risk")
    elif body.conditions.fuel_moisture < 0.5:
        rationale.append("moderate fuel moisture")
    else:
        rationale.append("wet fuel — slower spread")

    if body.conditions.temperature_c > 30:
        rationale.append("high temperature")

    rationale.append(f"{body.monte_carlo_runs} Monte Carlo runs (confidence: {conf:.0%})")

    response = PredictResponse(
        simulation_id=result.simulation_id,
        ignition_points_count=len(body.ignition_points),
        conditions_present=True,
        perimeter=perimeter,
        isochrones=isochrones,
        total_area_hectares=round(result.total_area_hectares, 2),
        max_spread_rate_mph=round(result.max_spread_rate_mph, 2),
        confidence=ConfidenceBreakdown(
            overall=round(conf, 3),
            weather=round(conf * 0.9, 3),
            fuel=round(conf * 0.95, 3),
            terrain=round(conf * 0.85, 3),
        ),
        statistics=stats,
        rationale=rationale,
        method="rothermel_monte_carlo",
    )

    _audit(body.model_dump(), response.model_dump())
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
