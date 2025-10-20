# Sentinel Tiered Response System - Deployment Guide

## 🚁 Autonomous Fire Suppression Integration

This guide covers the deployment and testing of Sentinel's integrated tiered response system for autonomous fire suppression with Summit.OS.

## 🎯 System Overview

The tiered response system provides **true "seconds to action" autonomous suppression capability** through three escalating tiers:

- **Tier 1 (Verification)**: FireFly reconnaissance drones verify fire detection in <60 seconds
- **Tier 2 (Suppression)**: EmberWing deploys suppressant at precise coordinates in <120 seconds  
- **Tier 3 (Containment)**: Multi-drone containment ring for spreading fires in <300 seconds

### Autonomous Flow
```
Detection → Tier 1 (FireFly) → Verification → Auto-Escalation → Tier 2 (EmberWing) → 
Suppression → Tier 3 (Multi-drone) → Containment → Success
```

## 📋 Prerequisites

### System Requirements
- Node.js 18.0.0+ 
- Python 3.11+ (for FastAPI services)
- Docker & Docker Compose
- pnpm 8.0.0+

### Summit.OS Integration
- Summit.OS API endpoint accessible
- Valid Summit API key
- Compatible drone assets (FireFly, EmberWing, Guardian series)

### MQTT Infrastructure  
- MQTT broker (Mosquitto recommended)
- WebSocket support for real-time UI updates

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy tiered response configuration
cp .env.tiered-response .env

# Edit configuration for your environment
nano .env
```

Key configuration variables:
```bash
# Summit.OS Integration
SUMMIT_API_URL=http://localhost:8080
SUMMIT_API_KEY=your_summit_api_key_here

# Tiered Response Settings
ENABLE_TIERED_RESPONSE=true
AUTONOMOUS_THRESHOLD=0.6

# Performance Targets  
TARGET_TIER1_RESPONSE_TIME=60
TARGET_TIER2_RESPONSE_TIME=120
TARGET_TIER3_RESPONSE_TIME=300
```

### 2. Install Dependencies

```bash
# Install all dependencies
pnpm install

# Build packages
pnpm build
```

### 3. Development Deployment

```bash
# Start core services
make docker-dev

# Start tiered response system
docker-compose -f docker-compose.yml -f docker-compose.tiered.yml up -d

# Start enhanced mission dispatcher
pnpm --filter @bigmt/mission-dispatcher dev

# Start console with tiered response UI  
pnpm --filter @bigmt/console dev
```

### 4. Production Deployment

```bash
# Build all services
pnpm build

# Deploy with production configuration
docker-compose -f docker-compose.yml -f docker-compose.tiered.yml -f docker-compose.prod.yml up -d
```

## 🧪 Testing & Validation

### Unit Tests
```bash
# Run all tests
pnpm test

# Test tiered response components
pnpm --filter @bigmt/mission-dispatcher test
pnpm --filter @bigmt/schemas test
```

### End-to-End Testing
```bash
# Run comprehensive E2E test suite
npm run test:e2e:tiered

# Performance benchmarks
npm run test:performance

# Load testing
npm run test:load
```

### Manual Testing

#### Fire Detection Simulation
```bash
# Simulate fire detection
node scripts/simulate_fire_alert.mjs

# With specific parameters
SIM_LAT=40.005 SIM_LNG=-119.995 SIM_CONF=0.93 node scripts/simulate_fire_alert.mjs
```

#### API Testing
```bash
# Check system status
curl http://localhost:8089/status

# Check active missions
curl http://localhost:8089/missions

# Summit.OS health check
curl http://localhost:8080/api/v1/system/health
```

## 📊 Performance Monitoring

### Key Metrics
- **Response Time**: Time from detection to first asset dispatch
- **Success Rate**: Percentage of fires successfully contained  
- **Escalation Rate**: Frequency of tier escalations
- **Asset Utilization**: Efficiency of drone asset usage

### Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards  
- **Loki**: Log aggregation
- **AlertManager**: Critical alert notifications

Access monitoring:
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090

## 🏗️ Architecture

### Components

#### TieredResponseManager
Core orchestration service managing autonomous suppression workflow.

**Key Responsibilities:**
- Process fire detection events
- Dispatch appropriate tier responses  
- Monitor mission progress and escalation triggers
- Coordinate with Summit.OS assets

#### Enhanced Mission Dispatcher  
Extended dispatcher integrating tiered response with existing reconnaissance missions.

**Integration Points:**
- MQTT fire detection events
- Triangulation results
- Operator confirmation workflows
- Legacy mission compatibility

#### Tiered Response Panel (UI)
Real-time dashboard for monitoring autonomous missions.

**Features:**
- Live mission status tracking
- Manual escalation controls
- Performance metrics display
- Asset availability monitoring

### Data Flow
```
Fire Detection → MQTT → Mission Dispatcher → Tiered Response Manager → Summit.OS API → Drone Assets
     ↓              ↓                           ↑                         ↑
   UI Updates ← WebSocket ←─────────────── Mission Status Updates ←── Asset Telemetry
```

## 🔧 Configuration

### Tier Configuration
Each tier has configurable thresholds and parameters:

```bash
# Tier 1 - Verification
TIER1_MIN_CONFIDENCE=0.3
TIER1_MAX_RESPONSE_TIME=60
TIER1_REQUIRED_CAPABILITIES=thermal_camera,visual_camera

# Tier 2 - Suppression  
TIER2_MIN_FIRE_SIZE=100
TIER2_MIN_CONFIDENCE=0.6
TIER2_MAX_RESPONSE_TIME=120
TIER2_SUPPRESSANT_AMOUNT=50

# Tier 3 - Containment
TIER3_MIN_FIRE_SIZE=500
TIER3_MAX_ASSETS=3
TIER3_SUPPRESSANT_AMOUNT=100
```

### Escalation Triggers
- **Time-based**: Auto-escalate if mission exceeds time threshold
- **Size-based**: Escalate if fire grows beyond size threshold  
- **Confidence-based**: Escalate if verification confidence drops
- **Weather-based**: Consider wind speed, humidity for escalation decisions

### Asset Management
```bash
AVAILABLE_ASSETS=firefly-001,firefly-002,emberwing-001,emberwing-002,guardian-001,guardian-002,guardian-003,guardian-004
```

Assets must have appropriate capabilities:
- **FireFly**: `thermal_camera,visual_camera` (Tier 1)
- **EmberWing**: `thermal_camera,suppressant_system` (Tier 2)
- **Guardian**: `suppressant_system` (Tier 3)

## 🛡️ Safety & Operational Limits

### Geofencing
```bash
GEOFENCE_ENABLED=true
GEOFENCE_RADIUS_KM=50
MAX_FLIGHT_ALTITUDE_M=400
```

### Resource Limits
```bash
MAX_CONCURRENT_MISSIONS=10
MAX_TIER3_MISSIONS=2
BATTERY_RESERVE_PERCENT=20
```

### Emergency Procedures
- **Emergency Override**: Bypass normal escalation limits
- **Return to Base**: Automatic RTB when battery low
- **Weather Limits**: Suspend operations in severe weather
- **Operator Override**: Manual mission control capability

## 🌐 API Endpoints

### Tiered Response API
```
GET    /status                    # System status and metrics
GET    /missions                  # Active missions
POST   /missions/{id}/escalate    # Manual escalation
POST   /missions/{id}/complete    # Complete mission
POST   /simulate                  # Simulate fire detection
```

### Summit.OS Integration
```
GET    /api/v1/system/health     # Summit.OS health
GET    /api/v1/assets            # Available assets
POST   /api/v1/missions          # Create mission
GET    /api/v1/missions/{id}     # Mission status
```

## 📈 Performance Targets

Based on operational requirements for autonomous fire suppression:

| Metric | Target | Critical Threshold |
|--------|--------|--------------------|
| Tier 1 Response Time | <60s | <90s |
| Tier 2 Response Time | <120s | <180s |  
| Tier 3 Response Time | <300s | <450s |
| Containment Success Rate | >85% | >70% |
| False Positive Rate | <15% | <25% |
| Asset Availability | >80% | >60% |

## 🔍 Troubleshooting

### Common Issues

#### High Response Times
- Check Summit.OS API latency
- Verify MQTT broker connectivity  
- Review asset availability
- Monitor system resource usage

#### Failed Escalations
- Verify tier capability configuration
- Check asset assignment logic
- Review escalation trigger thresholds
- Validate Summit.OS mission creation

#### Integration Failures
- Test Summit.OS API connectivity
- Verify authentication credentials
- Check MQTT topic subscriptions
- Review error logs in dispatcher

### Logs & Debugging
```bash
# View tiered response logs
docker logs mission-dispatcher-tiered

# Monitor MQTT messages
mosquitto_sub -h localhost -t 'fireline/+/+'

# Check Summit.OS integration
curl -H "Authorization: Bearer $SUMMIT_API_KEY" http://localhost:8080/api/v1/system/health
```

### Health Checks
```bash
# System health
curl http://localhost:8089/health

# Component status
docker-compose ps

# Service logs
docker-compose logs -f mission-dispatcher-tiered
```

## 📚 Additional Resources

### Documentation
- [Summit.OS Integration Guide](./docs/summit-integration.md)
- [MQTT Message Schemas](./docs/mqtt-schemas.md)  
- [Asset Management](./docs/asset-management.md)
- [Escalation Logic](./docs/escalation-logic.md)

### Development
- [Contributing Guide](./CONTRIBUTING.md)
- [API Reference](./docs/api-reference.md)
- [Testing Guide](./docs/testing.md)

### Operations  
- [Deployment Checklist](./ops/deployment-checklist.md)
- [Monitoring Runbook](./ops/monitoring-runbook.md)
- [Incident Response](./ops/incident-response.md)

## 🆘 Support

For technical support or operational issues:

1. Check system health endpoints
2. Review logs and metrics in Grafana
3. Consult troubleshooting guide
4. Contact operations team

**Emergency Contacts:**
- Operations: ops@example.com
- Technical: tech-support@example.com
- On-call: +1-XXX-XXX-XXXX

---

## 🎯 Success Criteria

The tiered response system is considered successfully deployed when:

✅ **Response Time Targets Met**
- Tier 1: <60 seconds from detection to dispatch
- Tier 2: <120 seconds from escalation trigger  
- Tier 3: <300 seconds for containment deployment

✅ **Autonomous Operation Verified**
- Fire detections trigger appropriate tier responses
- Escalation logic functions correctly
- Asset assignment and coordination works

✅ **Integration Points Validated**  
- Summit.OS API communication established
- MQTT message flow operational
- UI displays real-time mission status

✅ **Performance Benchmarks Achieved**
- >85% containment success rate
- <15% false positive escalations  
- >80% asset availability maintained

✅ **Monitoring & Observability**
- All metrics collected and dashboards operational
- Alert notifications configured
- Log aggregation and search functional

---

**🔥 Ready for autonomous fire suppression - from detection to containment in seconds, not hours!**