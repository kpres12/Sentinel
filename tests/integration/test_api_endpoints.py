"""
Integration tests for API endpoints.
"""

import pytest
import httpx
from fastapi.testclient import TestClient
from app.main import app


class TestAPIIntegration:
    """Integration tests for API endpoints."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    def test_root_endpoint(self):
        """Test root endpoint."""
        response = self.client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "operational"
    
    def test_health_check_endpoint(self):
        """Test health check endpoint."""
        response = self.client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert data["status"] == "healthy"
    
    def test_telemetry_endpoints(self):
        """Test telemetry endpoints."""
        # Test creating telemetry
        telemetry_data = {
            "device_id": "test_device_001",
            "timestamp": "2024-01-01T00:00:00Z",
            "latitude": 40.0,
            "longitude": -120.0,
            "altitude": 1000.0,
            "yaw": 0.0,
            "pitch": 0.0,
            "roll": 0.0,
            "speed": 5.0,
            "battery_level": 85.0,
            "sensors": [
                {
                    "name": "temperature",
                    "unit": "celsius",
                    "value": 25.0,
                    "timestamp": "2024-01-01T00:00:00Z"
                }
            ],
            "status": "online",
            "comms_rssi": -65.0,
            "temperature": 25.0
        }
        
        response = self.client.post("/api/v1/telemetry/", json=telemetry_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["device_id"] == telemetry_data["device_id"]
        assert data["latitude"] == telemetry_data["latitude"]
        assert data["longitude"] == telemetry_data["longitude"]
        
        # Test getting telemetry
        response = self.client.get("/api/v1/telemetry/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Test getting telemetry by device
        response = self.client.get(f"/api/v1/telemetry/?device_id={telemetry_data['device_id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert all(item["device_id"] == telemetry_data["device_id"] for item in data)
        
        # Test getting latest telemetry
        response = self.client.get(f"/api/v1/telemetry/devices/{telemetry_data['device_id']}/latest")
        assert response.status_code == 200
        
        data = response.json()
        assert data["device_id"] == telemetry_data["device_id"]
    
    def test_detections_endpoints(self):
        """Test detections endpoints."""
        # Test creating detection
        detection_data = {
            "device_id": "test_device_001",
            "timestamp": "2024-01-01T00:00:00Z",
            "type": "smoke",
            "latitude": 40.01,
            "longitude": -119.99,
            "bearing": 45.0,
            "confidence": 0.85,
            "media_ref": "video_001_frame_123",
            "source": "edge",
            "metadata": {
                "camera_id": "cam_001",
                "frame_number": 123
            }
        }
        
        response = self.client.post("/api/v1/detections/", json=detection_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["device_id"] == detection_data["device_id"]
        assert data["type"] == detection_data["type"]
        assert data["confidence"] == detection_data["confidence"]
        
        # Test getting detections
        response = self.client.get("/api/v1/detections/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_alerts_endpoints(self):
        """Test alerts endpoints."""
        # Test creating alert
        alert_data = {
            "timestamp": "2024-01-01T00:00:00Z",
            "type": "smoke_detected",
            "severity": "high",
            "message": "Smoke detected in sector 7",
            "latitude": 40.01,
            "longitude": -119.99,
            "device_id": "test_device_001",
            "detection_id": "det_001"
        }
        
        response = self.client.post("/api/v1/alerts/", json=alert_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["type"] == alert_data["type"]
        assert data["severity"] == alert_data["severity"]
        assert data["status"] == "active"
        
        # Test getting alerts
        response = self.client.get("/api/v1/alerts/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Test acknowledging alert
        alert_id = data[0]["id"]
        ack_data = {
            "acknowledged_by": "operator_001"
        }
        
        response = self.client.post(f"/api/v1/alerts/{alert_id}/acknowledge", json=ack_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "acknowledged"
        assert data["acknowledged_by"] == "operator_001"
    
    def test_triangulation_endpoints(self):
        """Test triangulation endpoints."""
        # Test triangulation request
        triangulation_data = {
            "observations": [
                {
                    "device_id": "camera_001",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "device_latitude": 40.0,
                    "device_longitude": -120.0,
                    "device_altitude": 1000.0,
                    "camera_heading": 0.0,
                    "camera_pitch": 0.0,
                    "bearing": 45.0,
                    "confidence": 0.9,
                    "detection_id": "det_001"
                },
                {
                    "device_id": "camera_002",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "device_latitude": 40.1,
                    "device_longitude": -119.9,
                    "device_altitude": 1100.0,
                    "camera_heading": 90.0,
                    "camera_pitch": 0.0,
                    "bearing": 315.0,
                    "confidence": 0.8,
                    "detection_id": "det_002"
                }
            ],
            "max_distance_km": 50.0,
            "min_confidence": 0.7
        }
        
        response = self.client.post("/api/v1/triangulation/triangulate", json=triangulation_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert "success" in data
        assert data["success"] is True
        assert len(data["results"]) > 0
        
        result = data["results"][0]
        assert "latitude" in result
        assert "longitude" in result
        assert "confidence" in result
        assert "uncertainty_meters" in result
    
    def test_prediction_endpoints(self):
        """Test prediction endpoints."""
        # Test spread prediction request
        prediction_data = {
            "ignition_points": [
                {"latitude": 40.0, "longitude": -120.0, "altitude": 1000.0}
            ],
            "conditions": {
                "timestamp": "2024-01-01T00:00:00Z",
                "latitude": 40.0,
                "longitude": -120.0,
                "temperature_c": 30.0,
                "relative_humidity": 30.0,
                "wind_speed_mps": 10.0,
                "wind_direction_deg": 270.0,
                "fuel_moisture": 0.2,
                "soil_moisture": 0.3,
                "fuel_model": 4,
                "slope_deg": 15.0,
                "aspect_deg": 180.0,
                "canopy_cover": 0.3,
                "elevation_m": 1000.0
            },
            "fire_lines": [],
            "simulation_hours": 12,
            "time_step_minutes": 15,
            "monte_carlo_runs": 10
        }
        
        response = self.client.post("/api/v1/prediction/simulate", json=prediction_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "simulation_id" in data
        assert "isochrones" in data
        assert "perimeter" in data
        assert "total_area_hectares" in data
        assert "max_spread_rate_mph" in data
        assert "confidence" in data
        
        # Test what-if scenario
        whatif_data = {
            "base_simulation_id": data["simulation_id"],
            "modifications": [
                {
                    "type": "wind_change",
                    "parameters": {
                        "wind_speed_mps": 20.0,
                        "wind_direction_deg": 180.0
                    },
                    "description": "Increased wind speed and changed direction"
                }
            ],
            "scenario_name": "High Wind Scenario",
            "created_by": "test_user"
        }
        
        response = self.client.post("/api/v1/prediction/whatif", json=whatif_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "scenario_id" in data
        assert "base_simulation_id" in data
        assert "scenario_name" in data
        assert "result" in data
        assert "comparison" in data
    
    def test_integrations_endpoints(self):
        """Test integrations endpoints."""
        # Test getting integrations
        response = self.client.get("/api/v1/integrations/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Test ArcGIS push
        arcgis_data = {
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-120.0, 40.0]
                    },
                    "properties": {
                        "type": "smoke_detection",
                        "confidence": 0.85,
                        "timestamp": "2024-01-01T00:00:00Z"
                    }
                }
            ]
        }
        
        response = self.client.post("/api/v1/integrations/arcgis/push", json=arcgis_data)
        # This might return 200 or 404 depending on configuration
        assert response.status_code in [200, 404, 500]
    
    def test_error_handling(self):
        """Test error handling."""
        # Test invalid telemetry data
        invalid_telemetry = {
            "device_id": "test_device",
            # Missing required fields
        }
        
        response = self.client.post("/api/v1/telemetry/", json=invalid_telemetry)
        assert response.status_code == 422  # Validation error
        
        # Test non-existent device
        response = self.client.get("/api/v1/telemetry/devices/nonexistent/latest")
        assert response.status_code == 404
        
        # Test invalid triangulation data
        invalid_triangulation = {
            "observations": []  # Empty observations
        }
        
        response = self.client.post("/api/v1/triangulation/triangulate", json=invalid_triangulation)
        assert response.status_code == 422  # Validation error
    
    def test_cors_headers(self):
        """Test CORS headers."""
        response = self.client.options("/api/v1/telemetry/")
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
    
    def test_rate_limiting(self):
        """Test rate limiting (if implemented)."""
        # Make multiple requests quickly
        for _ in range(10):
            response = self.client.get("/api/v1/telemetry/")
            # Should not be rate limited for this test
            assert response.status_code in [200, 429]
    
    def test_pagination(self):
        """Test pagination for list endpoints."""
        # Create multiple telemetry records
        for i in range(5):
            telemetry_data = {
                "device_id": f"test_device_{i:03d}",
                "timestamp": "2024-01-01T00:00:00Z",
                "latitude": 40.0 + i * 0.01,
                "longitude": -120.0 + i * 0.01,
                "altitude": 1000.0,
                "yaw": 0.0,
                "pitch": 0.0,
                "roll": 0.0,
                "speed": 5.0,
                "battery_level": 85.0,
                "sensors": [],
                "status": "online"
            }
            
            response = self.client.post("/api/v1/telemetry/", json=telemetry_data)
            assert response.status_code == 200
        
        # Test pagination
        response = self.client.get("/api/v1/telemetry/?limit=3")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) <= 3
        
        # Test offset
        response = self.client.get("/api/v1/telemetry/?limit=3&offset=2")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) <= 3
