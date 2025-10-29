# Sentinel Operations Platform

A monorepo for a wildfire operations platform prototype. It coordinates edge agents (KOFA robots + FireFly drones), provides an API gateway, a web console, and placeholder services for triangulation and prediction. Static data paths are wired so you can demo flows without production dependencies.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- Python 3.11+ (for API Gateway)

### Development Setup

1. Clone and install dependencies:
   ```bash
   git clone <repository-url>
   cd Sentinel
   pnpm install
   ```

2. Start the development environment:
   ```bash
   make dev
   # or
   docker compose -f infra/docker/docker-compose.dev.yml up -d
   ```

3. Access the applications:
   - Ops Console: http://localhost:3000
   - API Gateway: http://localhost:8000 (docs at /docs)
   - MQTT Dashboard: http://localhost:18083 (admin/admin123) — dev only

### Environment Configuration

```bash
cp env.example .env
```

## 🏗️ Structure (what exists today)

```
/apps
  /console             # Next.js ops console (UI wired to fake + local APIs)
  /apigw               # FastAPI REST gateway (metrics + websockets enabled)
  /edge-agent          # MQTT simulator publishing telemetry/detections
  /sentry-tower        # Edge placeholder (models not required for demo)
  /mission-dispatcher  # MQTT-driven mission events (stub)
  /summit-integration  # External integration stubs
  /triangulate         # NEW: stub service returning triangulation results
  /predict             # NEW: stub service returning prediction results
/packages
  /proto               # protobuf sources (JS/TS codegen placeholder)
  /schemas             # shared TS schemas
  /ui                  # shared React components
  /geo                 # geospatial utilities (TS)
  /algorithms          # algorithms (Python experimental)
  /policy              # policy helpers
/infra
  /docker              # docker compose (dev + prod)
```

Notes:
- The README reflects the current repo. Advanced services (ingest, fusion) are not yet implemented; stubs exist for triangulation and prediction to keep the UI/API workflows unblocked.
- Secrets and credentials should be provided via .env; dev compose reads it. Default passwords in examples are for local only.

## 🎯 Features (scaffolded for demo)

- API Gateway
  - REST endpoints for telemetry and missions
  - WebSocket stream at `/ws/events` broadcasting heartbeats + sample mission updates
  - Prometheus metrics at `/metrics`
- Ops Console
  - Map, panels, and controls wired to local API and MQTT (mocked)
- Edge Agent
  - MQTT client with exponential backoff, periodic telemetry/detections
- Triangulation Service (stub)
  - `/triangulate` accepts bearings and returns a static triangulated point with confidence
- Prediction Service (stub)
  - `/predict` accepts ignition + weather and returns static isochrones and perimeter

## 🛠️ Development

```bash
pnpm dev         # Start dev processes via Turborepo
pnpm build       # Build all workspaces
pnpm lint        # Lint (basic rules; non-zero on error)
pnpm type-check  # Type-check TypeScript workspaces
make db-migrate  # Apply API DB migrations (optional for demo)
```

## 📈 Observability (dev)

- Metrics: API Gateway exposes Prometheus metrics at `/metrics`
- Logs: Structured logs to stdout

## 🔐 Auth

- OIDC placeholders are present in config; not required for local demo

## 🚢 Deployment

```bash
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

## 🗺️ Roadmap

- Replace stub services with real triangulation/prediction engines
- Add ingest and fusion services
- End-to-end OIDC and RBAC
- CI for Python + Node with tests and coverage

---

Built by BigMt.AI
