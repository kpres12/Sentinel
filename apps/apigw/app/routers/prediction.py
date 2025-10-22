"""
Prediction API endpoints for fire spread simulation.
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException

# Local API schemas
from app.schemas.prediction import (
    SpreadParameters as ApiSpreadParameters,
    SpreadResult as ApiSpreadResult,
    Isochrone as ApiIsochrone,
    SpreadConfidence as ApiSpreadConfidence,
    Point as ApiPoint,
)

# Algorithms engine from shared package
try:
    from packages.algorithms.src.spread_modeling import (
        FireSpreadEngine,
        SpreadParameters as AlgoSpreadParameters,
        SpreadResult as AlgoSpreadResult,
    )
except Exception as e:
    # Fallback: make import error visible when endpoint is hit
    FireSpreadEngine = None  # type: ignore
    AlgoSpreadParameters = None  # type: ignore
    AlgoSpreadResult = None  # type: ignore

router = APIRouter()


def _map_api_to_algo(params: ApiSpreadParameters) -> AlgoSpreadParameters:  # type: ignore
    ignition_points = [(p.latitude, p.longitude) for p in params.ignition_points]
    cond = params.conditions
    return AlgoSpreadParameters(
        ignition_points=ignition_points,
        wind_speed=cond.wind_speed_mps,
        wind_direction=cond.wind_direction_deg,
        temperature=cond.temperature_c,
        humidity=cond.relative_humidity,
        fuel_moisture=cond.fuel_moisture,
        fuel_model=cond.fuel_model,
        simulation_hours=params.simulation_hours,
        time_step_minutes=int(params.time_step_minutes),
        monte_carlo_runs=params.monte_carlo_runs,
    )


def _map_algo_to_api(result: AlgoSpreadResult, duration_hours: float) -> ApiSpreadResult:  # type: ignore
    # Convert perimeter points
    perimeter_points: List[ApiPoint] = [
        ApiPoint(latitude=lat, longitude=lon, altitude=0.0) for (lat, lon) in result.perimeter
    ]

    # Convert isochrones (engine returns tuples list in geometry)
    api_isochrones: List[ApiIsochrone] = []
    for iso in result.isochrones:
        geom = [ApiPoint(latitude=lat, longitude=lon, altitude=0.0) for (lat, lon) in iso.get("geometry", [])]
        api_isochrones.append(
            ApiIsochrone(
                hours_from_start=int(iso.get("hours_from_start", 0)),
                geometry=geom,
                area_hectares=float(iso.get("area_hectares", 0.0)),
                perimeter_km=float(iso.get("perimeter_km", 0.0)),
            )
        )

    conf_value = float(result.confidence)
    api_conf = ApiSpreadConfidence(
        overall_confidence=conf_value,
        weather_confidence=conf_value,
        fuel_confidence=conf_value,
        terrain_confidence=conf_value,
        confidence_factors="heuristic",
    )

    return ApiSpreadResult(
        simulation_id=result.simulation_id,
        created_at=datetime.now(tz=timezone.utc),
        isochrones=api_isochrones,
        perimeter=perimeter_points,
        total_area_hectares=float(result.total_area_hectares),
        max_spread_rate_mph=float(result.max_spread_rate_mph),
        simulation_duration_hours=float(duration_hours),
        statistics={k: float(v) for k, v in (result.statistics or {}).items()},
        confidence=api_conf,
    )


@router.post("/simulate", response_model=ApiSpreadResult)
async def simulate_spread(body: ApiSpreadParameters) -> ApiSpreadResult:
    """Run a fire spread simulation using the shared algorithms engine."""
    if FireSpreadEngine is None or AlgoSpreadParameters is None:
        raise HTTPException(status_code=500, detail="Algorithms package not available on PYTHONPATH")

    try:
        engine = FireSpreadEngine()
        algo_params = _map_api_to_algo(body)
        algo_result = engine.simulate_spread(algo_params)
        return _map_algo_to_api(algo_result, duration_hours=body.simulation_hours)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")