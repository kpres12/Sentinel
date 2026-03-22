"""
Triangulation microservice — FastAPI wrapper around the real TriangulationEngine.
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Ensure the shared packages are importable
PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT / "packages" / "algorithms"))

from src.triangulation import TriangulationEngine, BearingObservation  # noqa: E402

from app.schemas import (
    TriangulateRequest,
    TriangulateResponse,
    Uncertainty,
    UncertaintyEllipse,
    QualityMetrics,
    GoldenScenario,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PORT = int(os.getenv("TRIANGULATE_PORT", "8101"))
AUDIT_DIR = Path(os.getcwd()) / "logs"
AUDIT_FILE = AUDIT_DIR / "triangulate.audit.jsonl"
AUDIT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Sentinel Triangulation Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

engine = TriangulationEngine()


def _audit(input_data: dict, output_data: dict) -> None:
    """Append audit record to JSONL log."""
    try:
        with open(AUDIT_FILE, "a") as f:
            f.write(json.dumps({"ts": int(datetime.now(tz=timezone.utc).timestamp() * 1000), "input": input_data, "output": output_data}) + "\n")
    except Exception as e:
        logger.warning("Failed to write audit log: %s", e)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/scenarios/golden")
async def golden_scenario():
    """Deterministic golden scenario for integration tests."""
    bearings = [
        BearingObservation(device_id="tower-A", latitude=40.0, longitude=-120.0, altitude=1000, camera_heading=0, camera_pitch=5, bearing=45, confidence=0.9, detection_id="det-1"),
        BearingObservation(device_id="tower-B", latitude=40.01, longitude=-120.01, altitude=1000, camera_heading=0, camera_pitch=5, bearing=225, confidence=0.9, detection_id="det-2"),
    ]
    results = engine.triangulate(bearings)
    if not results:
        return GoldenScenario(
            scenario="golden-1",
            input={"bearings": [{"lat": 40.0, "lon": -120.0, "bearing": 45}, {"lat": 40.01, "lon": -120.01, "bearing": 225}]},
            output={"error": "triangulation failed"},
        )
    r = results[0]
    return GoldenScenario(
        scenario="golden-1",
        input={"bearings": [{"lat": 40.0, "lon": -120.0, "bearing": 45}, {"lat": 40.01, "lon": -120.01, "bearing": 225}]},
        output={
            "estimate": {"lat": r.latitude, "lon": r.longitude},
            "confidence": r.confidence,
            "uncertainty": {"radius_m": r.uncertainty_meters},
            "method": r.method,
            "quality_metrics": r.quality_metrics,
        },
    )


@app.post("/triangulate", response_model=TriangulateResponse)
async def triangulate(body: TriangulateRequest):
    """Triangulate smoke location from bearing observations using the real engine."""
    if len(body.bearings) < 2:
        raise HTTPException(status_code=400, detail="At least 2 bearing observations are required")

    observations = [
        BearingObservation(
            device_id=b.device_id or f"obs-{i}",
            latitude=b.lat,
            longitude=b.lon,
            altitude=b.alt,
            camera_heading=b.camera_heading,
            camera_pitch=b.camera_pitch,
            bearing=b.bearing,
            confidence=b.confidence,
            detection_id=b.detection_id or f"det-{i}",
        )
        for i, b in enumerate(body.bearings)
    ]

    results = engine.triangulate(observations)

    if not results:
        # Fallback: return a low-confidence estimate using centroid
        lats = [b.lat for b in body.bearings]
        lons = [b.lon for b in body.bearings]
        response = TriangulateResponse(
            inputCount=len(body.bearings),
            estimate={"lat": sum(lats) / len(lats), "lon": sum(lons) / len(lons)},
            confidence=0.1,
            uncertainty=Uncertainty(radius_m=5000),
            rationale=["triangulation failed — returning centroid fallback"],
            method="fallback_centroid",
            quality_metrics=QualityMetrics(),
        )
        _audit(body.model_dump(), response.model_dump())
        return response

    r = results[0]
    metrics = r.quality_metrics or {}

    # Build rationale from quality metrics
    rationale = []
    if metrics.get("angular_spread", 0) > 60:
        rationale.append("wide angular spread")
    elif metrics.get("angular_spread", 0) > 30:
        rationale.append("moderate angular spread")
    else:
        rationale.append("narrow angular spread — higher uncertainty")

    if metrics.get("baseline_distance", 0) > 5000:
        rationale.append("good baseline distance")
    elif metrics.get("baseline_distance", 0) > 1000:
        rationale.append("moderate baseline distance")
    else:
        rationale.append("short baseline — lower confidence")

    if len(body.bearings) >= 3:
        rationale.append(f"{len(body.bearings)} bearings — multi-observation consensus")
    else:
        rationale.append("2 bearings — minimum for triangulation")

    response = TriangulateResponse(
        inputCount=len(body.bearings),
        estimate={"lat": r.latitude, "lon": r.longitude},
        confidence=round(r.confidence, 4),
        uncertainty=Uncertainty(
            radius_m=round(r.uncertainty_meters, 1),
            ellipse=UncertaintyEllipse(
                major_m=round(r.uncertainty_meters * 1.6, 1),
                minor_m=round(r.uncertainty_meters * 0.6, 1),
                heading_deg=round(metrics.get("angular_spread", 0) / 2, 1),
            ),
        ),
        rationale=rationale,
        method=r.method,
        quality_metrics=QualityMetrics(
            angular_spread=round(metrics.get("angular_spread", 0), 2),
            baseline_distance=round(metrics.get("baseline_distance", 0), 2),
            residual_error=round(metrics.get("residual_error", 0), 4) if "residual_error" in metrics else None,
        ),
    )

    _audit(body.model_dump(), response.model_dump())
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
