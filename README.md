# Wildfire Operations Platform

A production-ready monorepo for a wildfire operations platform that coordinates mobile FireLine robots + drones, fuses multi-modal data, triangulates smoke, predicts spread, and plugs into firefighter workflows.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- Python 3.11+ (for local development)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd BigMT
   pnpm install
   ```

2. **Start the development environment:**
   ```bash
   make dev
   # or
   docker-compose -f infra/docker/docker-compose.dev.yml up
   ```

3. **Access the applications:**
   - **Ops Console**: http://localhost:3000
   - **API Gateway**: http://localhost:8000
   - **API Docs**: http://localhost:8000/docs
   - **MQTT Dashboard**: http://localhost:18083 (admin/admin123)

### Environment Configuration

Copy the example environment file and configure:
```bash
cp env.example .env
```

## 🏗️ Architecture

### Monorepo Structure

```
/apps
  /console        # Next.js ops console
  /apigw          # FastAPI REST/gRPC gateway
  /ingest         # data connectors: weather, lightning, satellites, soil APIs
  /fusion         # sensor fusion & risk scoring service
  /triangulate    # smoke bearing fusion -> lat/lon with confidence
  /predict        # spread modeling & what-if engine (Rothermel + ML calibrator)
  /edge-agent     # on-robot/edge: MQTT, RTSP, ONNX inference, local alarms
  /integrations   # ArcGIS writer, CAD webhooks, email/SMS, PDF reports
  /sim            # scenario runner; synthetic sensor streams
/packages
  /proto          # .proto files (telemetry, detections, tasks)
  /schemas        # Pydantic/Marshmallow schemas; OpenAPI; JSONSchema
  /ui             # shared React components, map layers, legends
  /geo            # shared geoutils (DEM, slope, aspect, reprojection)
  /algorithms     # core algorithms (triangulation, fusion, spread modeling)
/infra
  /docker         # dev docker-compose
  /k8s            # manifests (cloud + edge profiles)
  /terraform      # cloud IaC stubs
/tests
```

### Core Components

#### 1. **Robotics + Mobile Sensor Platforms**
- **Protocol**: ROS 2 on-vehicle; MQTT/gRPC to cloud; optional RTSP/WebRTC for video
- **Data**: Telemetry, video, IR, gas/smoke, GNSS, IMU
- **Edge Processing**: ONNX Runtime for smoke/flame detection

#### 2. **Sensor Fusion**
- **Inputs**: Live weather (NWS/NOAA), lightning strikes, RH/temp/wind, satellite hotspots, soil moisture, fuel dryness indices
- **Output**: Per-cell risk score with confidence metrics
- **Algorithms**: Logistic regression + calibrated isotonic regression

#### 3. **Smoke Localization/Triangulation**
- **Method**: Multi-camera bearing-only + terrain-aware triangulation
- **Features**: RANSAC outlier rejection, confidence scoring, geofence alerts
- **Output**: Lat/lon with uncertainty bounds

#### 4. **Prediction & "What-if" Modeling**
- **Base Model**: Rothermel ROS adjusted by wind and slope
- **Enhancements**: ML calibration, Monte Carlo parameter sweeps
- **Outputs**: Arrival time rasters, scenario comparisons

#### 5. **Agency Workflow Integration**
- **Standards**: ICS/NIMS-friendly outputs
- **Integrations**: CAD/dispatch webhooks, ArcGIS Feature Service writer
- **Exports**: GeoJSON, shapefile, KML, PDF situation reports

## 🛠️ Technology Stack

### Backend
- **API Gateway**: FastAPI (Python) + gRPC for internal microservices + REST for external
- **Data/Compute**: Python 3.11, Ray for parallel sims, NumPy/Pandas, PyTorch, ONNX Runtime
- **Streaming/IoT**: MQTT (EMQX), video via RTSP/WebRTC
- **Database**: Postgres + PostGIS, TimescaleDB extension for telemetry
- **Messaging/Jobs**: Redis + Celery

### Frontend
- **Framework**: Next.js 14 + TypeScript
- **Mapping**: MapLibre GL
- **State Management**: React Query
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS

### Infrastructure
- **Development**: Docker Compose
- **Production**: Kubernetes (k3s edge, EKS/GKE cloud)
- **IaC**: Terraform
- **Auth**: OIDC (Keycloak) with RBAC
- **Monitoring**: Prometheus + Grafana

## 📊 Data Models

### PostGIS Schema

```sql
-- Telemetry from robots/drones
telemetry: device_id, ts, geom(point), speed, heading, batt, comms_rssi, temp

-- Environmental grid cells
env_cell: h3_index/raster, fuel_model, slope, aspect, canopy, soil_moisture, fwi, erc

-- Detections from edge/cloud
detections: id, ts, source(edge|cloud), type(smoke|flame|heat), bearing, geom(point|null), confidence, media_ref

-- Alerts and notifications
alerts: id, ts, geom, type, severity, ack_by, status

-- Fire lines and barriers
lines: id, geom(line), type(fireline|dozer), width_m, created_by, status

-- What-if scenarios
scenarios: id, params(jsonb), results_ref, created_by

-- External integrations
integrations: target(ArcGIS|CAD|Webhook), config(jsonb), status
```

### gRPC Interfaces

```protobuf
// Telemetry from devices
message Telemetry {
  string device_id;
  int64 ts;
  double lat, lon;
  float alt, yaw, pitch, roll, speed, batt;
  repeated Sensor sensors;
}

// Detections from edge/cloud
message Detection {
  string device_id;
  int64 ts;
  enum Type { SMOKE, FLAME, HEAT }
  double lat?, lon?;
  float bearing?, confidence;
  string media_ref;
}

// Task assignments
message Tasking {
  string task_id;
  enum Kind { PATROL, HOLD, BUILD_LINE, SURVEY_SMOKE }
  repeated Point waypoints;
  json params;
}
```

## 🧮 Core Algorithms

### 1. Bearing-Only Triangulation
- **Input**: ≥2 bearings with device GNSS + camera heading
- **Process**: Intersect rays on DEM, RANSAC outlier rejection
- **Output**: MAP estimate + covariance, confidence from angular spread + baseline distance

### 2. Sensor Fusion Risk Score
- **Input**: Weather, fuel model, terrain, moisture, lightning, historical ignitions
- **Process**: Logistic regression + calibrated isotonic regression
- **Output**: Risk score ∈ [0,1] with feature importances

### 3. Spread Model + What-if
- **Base**: Rothermel ROS adjusted by wind and slope
- **Enhancement**: Monte Carlo across parameter priors
- **Output**: Arrival time raster, scenario comparisons

### 4. Edge Smoke Model
- **Model**: Lightweight ONNX (MobileNetV3-ish) for smoke vs. clouds/fog
- **Process**: Sliding window on frames, temporal smoothing
- **Output**: N-of-M alarm logic with configurable thresholds

## 🎯 Ops Console Features

### Map Interface
- **Layers**: Telemetry trails, live camera FOV cones, detections, risk heatmap, predicted spread isochrones, fire lines
- **Controls**: Layer toggles, zoom, reset view, legend
- **Interactions**: Click to select, hover for details

### Panel Tabs
- **Live**: Real-time telemetry and detections
- **Triangulations**: Smoke localization results
- **Scenarios**: What-if modeling interface
- **Robots/Drones**: Device management
- **Integrations**: External system status
- **Reports**: PDF generation and exports

### Actions
- **Triangulate**: "Triangulate from selected detections"
- **Scenario**: "Run scenario" with wind/RH/fuel tweaks
- **Tasking**: "Create task → SURVEY_SMOKE / BUILD_LINE"
- **Export**: "Export situation report (PDF)"

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start all services
pnpm build                  # Build all packages
pnpm test                   # Run all tests
pnpm lint                   # Lint all code
pnpm type-check            # Type check all TypeScript

# Database
pnpm db:migrate            # Run database migrations
pnpm db:seed               # Seed database with sample data

# Docker
pnpm docker:dev            # Start development environment
pnpm docker:down           # Stop development environment
```

### Testing

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# Load testing
pnpm test:load
```

### Code Quality

- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Testing**: Jest + Playwright + k6
- **Coverage**: Minimum 80% coverage required

## 🚀 Deployment

### Development
```bash
make dev
```

### Production
```bash
# Build and deploy
make build
make deploy

# Or using Docker
docker-compose -f infra/docker/docker-compose.prod.yml up -d
```

### Kubernetes
```bash
# Apply manifests
kubectl apply -f infra/k8s/

# Check status
kubectl get pods -n wildfire-ops
```

## 📈 Monitoring & Observability

### Metrics
- **Application**: Prometheus metrics for all services
- **Infrastructure**: Node, container, and database metrics
- **Business**: Detection rates, triangulation accuracy, response times

### Logging
- **Format**: Structured JSON logs
- **Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation**: Request IDs for tracing

### Dashboards
- **Grafana**: Pre-built dashboards for all components
- **Alerts**: PagerDuty integration for critical issues

## 🔐 Security

### Authentication
- **Method**: OIDC (Keycloak)
- **Roles**: Admin, Ops, Analyst, Observer
- **Tokens**: JWT with refresh tokens

### Authorization
- **RBAC**: Role-based access control
- **API**: Token-based authentication
- **UI**: Component-level permissions

### Data Protection
- **Encryption**: TLS 1.3 for all communications
- **Storage**: Encrypted at rest
- **PII**: Minimal collection, secure handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- Follow the existing code style
- Add tests for new features
- Update documentation
- Ensure all checks pass

## 📄 License

Apache-2.0 License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@wildfire-ops.com

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core platform infrastructure
- ✅ Basic triangulation and fusion
- ✅ Simple spread modeling
- ✅ Web console interface

### Phase 2 (Next)
- 🔄 Advanced ML models
- 🔄 Real-time video processing
- 🔄 Enhanced integrations
- 🔄 Mobile applications

### Phase 3 (Future)
- 📋 Multi-agency coordination
- 📋 Advanced analytics
- 📋 Predictive maintenance
- 📋 International deployment

---

**Built with ❤️ by BigMt.Ai**
