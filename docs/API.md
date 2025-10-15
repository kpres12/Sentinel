# API Documentation

## Overview

The Sentinel Operations Platform provides a comprehensive REST API for managing sentinel operations, including telemetry data, detections, alerts, triangulation, and fire spread prediction.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://api.wildfire-ops.com`

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **Default**: 1000 requests per hour per user
- **Burst**: 100 requests per minute
- **Headers**: Rate limit information is included in response headers

## Error Handling

The API uses standard HTTP status codes and returns errors in the following format:

```json
{
  "error": "Error message",
  "status_code": 400,
  "details": "Additional error details"
}
```

## Endpoints

### Telemetry

#### Create Telemetry Record

```http
POST /api/v1/telemetry/
```

**Request Body:**
```json
{
  "device_id": "robot_001",
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
```

**Response:**
```json
{
  "id": "uuid",
  "device_id": "robot_001",
  "timestamp": "2024-01-01T00:00:00Z",
  "latitude": 40.0,
  "longitude": -120.0,
  "altitude": 1000.0,
  "status": "online",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Get Telemetry Records

```http
GET /api/v1/telemetry/
```

**Query Parameters:**
- `device_id` (optional): Filter by device ID
- `start_time` (optional): Start time filter (ISO 8601)
- `end_time` (optional): End time filter (ISO 8601)
- `limit` (optional): Maximum number of records (default: 100, max: 1000)

**Response:**
```json
[
  {
    "id": "uuid",
    "device_id": "robot_001",
    "timestamp": "2024-01-01T00:00:00Z",
    "latitude": 40.0,
    "longitude": -120.0,
    "altitude": 1000.0,
    "status": "online",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Get Latest Telemetry

```http
GET /api/v1/telemetry/devices/{device_id}/latest
```

**Response:**
```json
{
  "id": "uuid",
  "device_id": "robot_001",
  "timestamp": "2024-01-01T00:00:00Z",
  "latitude": 40.0,
  "longitude": -120.0,
  "altitude": 1000.0,
  "status": "online",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Detections

#### Create Detection

```http
POST /api/v1/detections/
```

**Request Body:**
```json
{
  "device_id": "camera_001",
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
```

**Response:**
```json
{
  "id": "uuid",
  "device_id": "camera_001",
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
  },
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Get Detections

```http
GET /api/v1/detections/
```

**Query Parameters:**
- `device_id` (optional): Filter by device ID
- `type` (optional): Filter by detection type (smoke, flame, heat)
- `confidence_min` (optional): Minimum confidence threshold
- `start_time` (optional): Start time filter
- `end_time` (optional): End time filter
- `limit` (optional): Maximum number of records

### Alerts

#### Create Alert

```http
POST /api/v1/alerts/
```

**Request Body:**
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "type": "smoke_detected",
  "severity": "high",
  "message": "Smoke detected in sector 7",
  "latitude": 40.01,
  "longitude": -119.99,
  "device_id": "camera_001",
  "detection_id": "det_001"
}
```

#### Acknowledge Alert

```http
POST /api/v1/alerts/{alert_id}/acknowledge
```

**Request Body:**
```json
{
  "acknowledged_by": "operator_001"
}
```

### Triangulation

#### Triangulate Smoke Location

```http
POST /api/v1/triangulation/triangulate
```

**Request Body:**
```json
{
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
```

**Response:**
```json
{
  "results": [
    {
      "result_id": "uuid",
      "timestamp": "2024-01-01T00:00:00Z",
      "latitude": 40.005,
      "longitude": -119.995,
      "altitude": 1050.0,
      "confidence": 0.85,
      "uncertainty_meters": 500.0,
      "observation_ids": ["det_001", "det_002"],
      "method": "least_squares",
      "quality_metrics": {
        "angular_spread": 90.0,
        "baseline_distance": 15000.0,
        "residual_error": 0.05
      }
    }
  ],
  "success": true,
  "observation_count": 2,
  "processing_time_ms": 150.0
}
```

### Prediction

#### Simulate Fire Spread

```http
POST /api/v1/prediction/simulate
```

**Request Body:**
```json
{
  "ignition_points": [
    {
      "latitude": 40.0,
      "longitude": -120.0,
      "altitude": 1000.0
    }
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
  "monte_carlo_runs": 100
}
```

**Response:**
```json
{
  "simulation_id": "sim_12345",
  "created_at": "2024-01-01T00:00:00Z",
  "isochrones": [
    {
      "hours_from_start": 6,
      "geometry": [
        {"latitude": 40.0, "longitude": -120.0},
        {"latitude": 40.01, "longitude": -120.0}
      ],
      "area_hectares": 50.0,
      "perimeter_km": 2.5
    }
  ],
  "perimeter": [
    {"latitude": 40.0, "longitude": -120.0}
  ],
  "total_area_hectares": 100.0,
  "max_spread_rate_mph": 5.5,
  "simulation_duration_hours": 12.0,
  "statistics": {
    "mean_area_hectares": 100.0,
    "std_area_hectares": 10.0,
    "mean_spread_rate_mph": 5.5,
    "runs_completed": 100
  },
  "confidence": {
    "overall_confidence": 0.8,
    "weather_confidence": 0.9,
    "fuel_confidence": 0.7,
    "terrain_confidence": 0.8,
    "confidence_factors": "Good weather data, moderate fuel uncertainty"
  }
}
```

#### Run What-If Scenario

```http
POST /api/v1/prediction/whatif
```

**Request Body:**
```json
{
  "base_simulation_id": "sim_12345",
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
  "created_by": "analyst_001"
}
```

### Integrations

#### Push to ArcGIS

```http
POST /api/v1/integrations/arcgis/push
```

**Request Body:**
```json
{
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
```

## WebSocket API

### Real-time Updates

Connect to the WebSocket endpoint for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

**Message Types:**
- `telemetry`: Real-time telemetry updates
- `detection`: New detections
- `alert`: System alerts
- `triangulation`: Triangulation results
- `prediction`: Spread simulation updates

## SDKs and Libraries

### Python SDK

```python
from wildfire_ops import WildfireOpsClient

client = WildfireOpsClient(
    base_url="http://localhost:8000",
    api_key="your-api-key"
)

# Create telemetry
telemetry = client.telemetry.create({
    "device_id": "robot_001",
    "latitude": 40.0,
    "longitude": -120.0,
    # ... other fields
})

# Get detections
detections = client.detections.list(
    device_id="camera_001",
    type="smoke",
    confidence_min=0.8
)
```

### JavaScript SDK

```javascript
import { WildfireOpsClient } from '@wildfire-ops/sdk';

const client = new WildfireOpsClient({
  baseUrl: 'http://localhost:8000',
  apiKey: 'your-api-key'
});

// Create telemetry
const telemetry = await client.telemetry.create({
  device_id: 'robot_001',
  latitude: 40.0,
  longitude: -120.0,
  // ... other fields
});

// Get detections
const detections = await client.detections.list({
  device_id: 'camera_001',
  type: 'smoke',
  confidence_min: 0.8
});
```

## Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Pagination

List endpoints support pagination using query parameters:

- `limit`: Number of items per page (default: 100, max: 1000)
- `offset`: Number of items to skip
- `page`: Page number (alternative to offset)

**Response Headers:**
- `X-Total-Count`: Total number of items
- `X-Page-Count`: Total number of pages
- `X-Current-Page`: Current page number

## Filtering and Sorting

Most list endpoints support filtering and sorting:

**Filtering:**
- Use query parameters to filter results
- Example: `?device_id=robot_001&type=smoke`

**Sorting:**
- Use `sort` parameter with field name and direction
- Example: `?sort=timestamp:desc` or `?sort=confidence:asc`

## Data Formats

### Timestamps
All timestamps are in ISO 8601 format with UTC timezone:
```
2024-01-01T00:00:00Z
```

### Coordinates
- **Latitude**: -90 to 90 degrees
- **Longitude**: -180 to 180 degrees
- **Altitude**: Meters above sea level
- **Bearing**: 0 to 360 degrees (0 = North)

### Confidence Scores
- Range: 0.0 to 1.0
- 0.0 = No confidence
- 1.0 = Complete confidence

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Telemetry | 1000/hour | Per device |
| Detections | 500/hour | Per device |
| Triangulation | 100/hour | Per user |
| Prediction | 50/hour | Per user |
| General API | 1000/hour | Per user |

## Webhooks

Configure webhooks to receive real-time notifications:

```http
POST /api/v1/webhooks/
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["detection.created", "alert.created"],
  "secret": "your-webhook-secret"
}
```

**Supported Events:**
- `telemetry.created`
- `detection.created`
- `alert.created`
- `alert.acknowledged`
- `triangulation.completed`
- `prediction.completed`
