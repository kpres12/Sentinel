import os
import time
import uuid
import pytest
import requests

API = os.getenv("APIGW_URL", "http://localhost:8000")

@pytest.mark.skipif(os.getenv("RUN_E2E") != "1", reason="Set RUN_E2E=1 to run against a live apigw")
def test_detection_to_mission_flow():
    # Post a detection
    det = {
        "type": "fire",
        "confidence": 0.9,
        "lat": 40.001,
        "lon": -119.999,
        "timestamp": "2024-01-01T00:00:00Z",
        "source_id": f"test-{uuid.uuid4().hex[:6]}"
    }
    r = requests.post(f"{API}/api/v1/detections/", json=det, timeout=5)
    assert r.status_code in (200, 201), r.text

    # Allow async mission creation
    time.sleep(1)

    # List missions
    r = requests.get(f"{API}/api/v1/missions", timeout=5)
    assert r.status_code == 200, r.text
    missions = r.json()
    assert isinstance(missions, list)
    assert any(m.get("status") in ("pending", "proposed", "active") for m in missions)
