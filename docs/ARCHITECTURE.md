# Architecture Overview

## System Architecture

The Sentinel Operations Platform is designed as a microservices-based system with clear separation of concerns and scalable components.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Edge Devices  │    │   Web Console   │    │  External APIs  │
│                 │    │                 │    │                 │
│ • Robots/Drones │    │ • Next.js App   │    │ • Weather APIs  │
│ • Cameras       │    │ • MapLibre GL   │    │ • Lightning     │
│ • Sensors       │    │ • React Query   │    │ • Satellite     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ MQTT/WebRTC          │ HTTP/gRPC            │ HTTP
          │                      │                      │
┌─────────▼─────────────────────▼──────────────────────▼───────┐
│                    API Gateway (FastAPI)                    │
│  • Authentication & Authorization                          │
│  • Rate Limiting & Caching                                 │
│  • Request Routing & Load Balancing                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Microservices Layer                          │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │   Fusion    │ │Triangulation│ │ Prediction  │ │ Ingest  │ │
│ │   Service   │ │   Service   │ │   Service   │ │ Service │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │ Edge Agent  │ │Integration  │ │ Simulation  │             │
│ │   Service   │ │   Service   │ │   Service   │             │
│ └─────────────┘ └─────────────┘ └─────────────┘             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Data & Storage Layer                         │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ PostgreSQL  │ │    Redis    │ │   MQTT      │ │  Files  │ │
│ │ + PostGIS   │ │   Cache     │ │  Broker     │ │ Storage │ │
│ │ + Timescale │ │             │ │  (EMQX)     │ │         │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Edge Devices

**Purpose**: Collect real-time data from the field

**Components**:
- Mobile robots and drones
- Fixed and mobile cameras
- Environmental sensors (weather, air quality)
- GNSS and IMU systems

**Communication**:
- **Primary**: MQTT over TCP/TLS
- **Video**: RTSP or WebRTC
- **Fallback**: Store-and-forward when disconnected

**Data Types**:
- Telemetry (position, orientation, battery, status)
- Detections (smoke, flame, heat signatures)
- Video streams (RTSP/WebRTC)
- Sensor readings (temperature, humidity, wind, etc.)

### 2. API Gateway

**Technology**: FastAPI (Python)

**Responsibilities**:
- Authentication and authorization
- Rate limiting and request validation
- Load balancing and routing
- API versioning and documentation
- CORS and security headers

**Endpoints**:
- REST API for external clients
- gRPC for internal microservices
- WebSocket for real-time updates
- GraphQL for complex queries (future)

### 3. Microservices

#### Fusion Service
**Purpose**: Sensor fusion and risk scoring

**Inputs**:
- Environmental data (weather, fuel moisture, terrain)
- Historical data (lightning strikes, past fires)
- Real-time sensor data

**Algorithms**:
- Logistic regression for risk scoring
- Isotonic regression for calibration
- Feature importance analysis

**Outputs**:
- Risk heatmaps
- Confidence scores
- Contributing factors

#### Triangulation Service
**Purpose**: Smoke localization from bearing observations

**Inputs**:
- Bearing observations from multiple cameras
- Camera positions and orientations
- Terrain data (DEM)

**Algorithms**:
- Ray intersection on terrain
- RANSAC for outlier rejection
- Least squares optimization
- Confidence calculation

**Outputs**:
- Smoke location (lat/lon/alt)
- Uncertainty bounds
- Quality metrics

#### Prediction Service
**Purpose**: Fire spread modeling and scenario analysis

**Inputs**:
- Ignition points
- Environmental conditions
- Fire line geometries
- Terrain data

**Algorithms**:
- Rothermel fire spread model
- Monte Carlo simulations
- Wind and slope adjustments
- ML calibration

**Outputs**:
- Spread isochrones
- Arrival time rasters
- Scenario comparisons

#### Ingest Service
**Purpose**: External data integration

**Sources**:
- National Weather Service (NWS)
- NOAA lightning data
- Satellite hotspots
- Soil moisture models
- Fuel dryness indices

**Processing**:
- Data validation and cleaning
- Coordinate transformation
- Temporal alignment
- Quality assessment

### 4. Data Storage

#### PostgreSQL + PostGIS
**Purpose**: Primary data store

**Features**:
- Spatial data types and indexing
- TimescaleDB for time-series data
- Full-text search
- JSON/JSONB for flexible schemas

**Tables**:
- `telemetry`: Device position and status data
- `detections`: Smoke/flame detections
- `alerts`: System alerts and notifications
- `env_cells`: Environmental grid data
- `fire_lines`: Fire suppression lines
- `scenarios`: What-if simulation results

#### Redis
**Purpose**: Caching and session storage

**Use Cases**:
- API response caching
- Session management
- Rate limiting counters
- Real-time data buffering

#### MQTT Broker (EMQX)
**Purpose**: Real-time messaging

**Features**:
- MQTT 5.0 support
- WebSocket bridge
- Message persistence
- QoS levels
- Topic-based routing

### 5. Web Console

**Technology**: Next.js 14 + TypeScript

**Features**:
- Real-time map interface
- Layer management
- Data visualization
- User management
- Report generation

**Components**:
- MapLibre GL for mapping
- React Query for state management
- Radix UI for components
- Tailwind CSS for styling

## Data Flow

### 1. Real-time Data Flow

```
Edge Device → MQTT → API Gateway → Microservices → Database
                ↓
            Web Console ← WebSocket ← API Gateway
```

### 2. Batch Processing Flow

```
External APIs → Ingest Service → Database → Fusion Service → Risk Heatmap
                                                      ↓
                                              Web Console
```

### 3. Analysis Flow

```
User Request → API Gateway → Prediction Service → Database
                    ↓
              Web Console ← WebSocket ← API Gateway
```

## Security Architecture

### Authentication
- **Method**: OIDC (OpenID Connect)
- **Provider**: Keycloak
- **Tokens**: JWT with refresh tokens
- **Expiry**: 30 minutes (access), 7 days (refresh)

### Authorization
- **Model**: Role-Based Access Control (RBAC)
- **Roles**: Admin, Ops, Analyst, Observer
- **Permissions**: Resource-level granularity
- **Enforcement**: API Gateway + service-level

### Data Protection
- **Encryption**: TLS 1.3 for all communications
- **Storage**: AES-256 encryption at rest
- **Keys**: AWS KMS or HashiCorp Vault
- **PII**: Minimal collection, secure handling

### Network Security
- **Firewall**: Network segmentation
- **VPN**: Secure access for operators
- **Monitoring**: Intrusion detection
- **Compliance**: SOC 2 Type II

## Scalability Considerations

### Horizontal Scaling
- **Stateless Services**: All microservices are stateless
- **Load Balancing**: Round-robin with health checks
- **Database**: Read replicas for queries
- **Caching**: Redis cluster for high availability

### Vertical Scaling
- **Resource Monitoring**: CPU, memory, disk usage
- **Auto-scaling**: Kubernetes HPA
- **Performance Tuning**: Database indexes, query optimization
- **Capacity Planning**: Growth projections

### Geographic Distribution
- **Edge Computing**: Local processing for low latency
- **Data Replication**: Multi-region deployment
- **CDN**: Static asset delivery
- **Disaster Recovery**: Backup and restore procedures

## Monitoring and Observability

### Metrics
- **Application**: Custom Prometheus metrics
- **Infrastructure**: Node Exporter, cAdvisor
- **Business**: KPI tracking and alerting
- **SLA**: Uptime and response time monitoring

### Logging
- **Format**: Structured JSON logs
- **Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation**: Request IDs for tracing
- **Retention**: 30 days (hot), 1 year (cold)

### Tracing
- **Tool**: OpenTelemetry
- **Sampling**: 1% for production
- **Storage**: Jaeger or Zipkin
- **Analysis**: Performance bottleneck identification

### Alerting
- **Channels**: Email, SMS, PagerDuty
- **Escalation**: Tiered response procedures
- **Runbooks**: Incident response documentation
- **Testing**: Regular alert validation

## Deployment Architecture

### Development
- **Environment**: Docker Compose
- **Database**: Single PostgreSQL instance
- **Services**: All services in containers
- **Networking**: Bridge network

### Staging
- **Environment**: Kubernetes (k3s)
- **Database**: PostgreSQL cluster
- **Services**: Replicated services
- **Networking**: Service mesh (Istio)

### Production
- **Environment**: Kubernetes (EKS/GKE)
- **Database**: Managed PostgreSQL (RDS/Cloud SQL)
- **Services**: Auto-scaling with HPA
- **Networking**: Load balancer + ingress controller

## Future Considerations

### Technology Evolution
- **Edge Computing**: More processing at the edge
- **AI/ML**: Advanced models for prediction
- **5G**: Low-latency communications
- **IoT**: Expanded sensor networks

### Feature Additions
- **Mobile Apps**: Native iOS/Android apps
- **AR/VR**: Immersive interfaces
- **Blockchain**: Data integrity and provenance
- **Federated Learning**: Privacy-preserving ML

### Integration Expansion
- **Emergency Services**: 911 integration
- **Government**: Federal agency coordination
- **International**: Multi-country deployment
- **Standards**: Open standards adoption
