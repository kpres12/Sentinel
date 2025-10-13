# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project type and tooling
- Monorepo managed by pnpm workspaces and Turborepo (see turbo.json, pnpm-workspace.yaml).
- Primary language is TypeScript/Node.js across apps/* and packages/*; one Python FastAPI service at apps/apigw.
- Makefile exposes common workflows that wrap pnpm and Docker Compose.

Common commands
- Install dependencies
  ```bash path=null start=null
  pnpm install
  ```
- Start all dev services (Node workspaces)
  ```bash path=null start=null
  make dev
  # or
  pnpm dev
  ```
- Build everything (Turbo runs package-level build scripts with dependency ordering)
  ```bash path=null start=null
  pnpm build
  ```
- Lint all (only packages with a lint script will run)
  ```bash path=null start=null
  pnpm lint
  ```
- Type-check all
  ```bash path=null start=null
  pnpm type-check
  ```
- Run all tests across workspaces
  ```bash path=null start=null
  pnpm test
  ```
- Clean workspace build artifacts
  ```bash path=null start=null
  pnpm clean
  ```
- Docker-based dev environment
  ```bash path=null start=null
  make docker-dev    # up -d via infra/docker/docker-compose.dev.yml
  make docker-down   # stop
  ```
- Database (FastAPI service migrations and seed via Alembic + scripts)
  ```bash path=null start=null
  make db-migrate
  make db-seed
  ```

Package/app-specific commands (frequently used)
- Web Console (Next.js)
  ```bash path=null start=null
  pnpm --filter @bigmt/console dev
  pnpm --filter @bigmt/console build
  pnpm --filter @bigmt/console start
  pnpm --filter @bigmt/console lint
  ```
- Edge Agent (Node/TS)
  ```bash path=null start=null
  pnpm --filter @bigmt/edge-agent dev
  pnpm --filter @bigmt/edge-agent build && pnpm --filter @bigmt/edge-agent start
  ```
- Sentry Tower, FireLine Bot, Summit Integration (Node/TS libs/services)
  ```bash path=null start=null
  pnpm --filter @bigmt/sentry-tower dev
  pnpm --filter @bigmt/sentry-tower test

  pnpm --filter @bigmt/fireline-bot dev
  pnpm --filter @bigmt/fireline-bot test

  pnpm --filter @bigmt/summit-integration dev
  pnpm --filter @bigmt/summit-integration test
  ```
- Shared libraries
  ```bash path=null start=null
  pnpm --filter @bigmt/algorithms test
  pnpm --filter @bigmt/geo test
  pnpm --filter @bigmt/ui lint
  ```
- Protocol Buffers (requires protoc and plugins available on PATH)
  ```bash path=null start=null
  pnpm --filter @bigmt/proto build
  ```
- API Gateway (FastAPI, Python)
  ```bash path=null start=null
  # local run (requires Python 3.11+ and requirements installed in apps/apigw)
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```

Running a single test (examples)
- Run tests for one package
  ```bash path=null start=null
  pnpm --filter @bigmt/algorithms test
  ```
- Run a specific test file (Jest)
  ```bash path=null start=null
  pnpm --filter @bigmt/algorithms test -- tests/triangulation.spec.ts
  ```
- Run a specific test name (Jest -t)
  ```bash path=null start=null
  pnpm --filter @bigmt/algorithms test -- -t "computes MAP estimate"
  ```

Dev environment and ports (from README)
- Ops Console: http://localhost:3000
- API Gateway: http://localhost:8000 (docs at /docs)
- MQTT Dashboard: http://localhost:18083

Notes on environment variables
- Next.js console reads API and MQTT URLs from env (see apps/console/next.config.js):
  - NEXT_PUBLIC_API_URL (default http://localhost:8000)
  - NEXT_PUBLIC_MQTT_WS_URL (default ws://localhost:8083/mqtt)

How this monorepo is wired (big picture)
- Orchestration: Turborepo pipeline ensures task ordering across workspaces (build, lint, test, type-check). Outputs for builds live under dist/** for libraries and .next/** for the Next.js console.
- Apps (present in repo):
  - console: Next.js 14 + TypeScript web UI
  - apigw: FastAPI API gateway (Python) surfacing REST, with gRPC planned for service-to-service
  - edge-agent, sentry-tower, fireline-bot, summit-integration: Node/TS runtime services for edge connectivity, integrations, and device/stream handling
- Shared packages:
  - algorithms, geo: core compute and geospatial utilities
  - proto: protobuf sources and JS/TS codegen
  - schemas: shared TS schemas/models
  - ui: shared React components
- System architecture (condensed from docs/ARCHITECTURE.md):
  - Data originates at edge devices (robots/drones/cameras) → MQTT/RTSP/WebRTC
  - API Gateway (FastAPI) fronts external REST, fans in real-time data, and coordinates internal services (gRPC and WebSocket planned/used as appropriate)
  - Microservices layer encapsulates: sensor fusion (risk scoring), triangulation (bearing-only with terrain), prediction (Rothermel + Monte Carlo), and external data ingest
  - Data layer: PostgreSQL + PostGIS (+ Timescale), Redis cache, EMQX MQTT broker
  - Web Console (Next.js) consumes REST/WebSocket for real-time visualization and workflows

Makefile shortcuts
- make install, make dev, make build, make test, make lint, make type-check, make docker-dev/docker-down, make db-migrate/db-seed, make reset, make health

New services and workflows
- Mission Dispatcher (auto-dispatch swarm on alerts)
  ```bash path=null start=null
  pnpm --filter @bigmt/mission-dispatcher dev
  # build & run
  pnpm --filter @bigmt/mission-dispatcher build && pnpm --filter @bigmt/mission-dispatcher start
  ```
- Simulate a fire alert (publishes to MQTT)
  ```bash path=null start=null
  node scripts/simulate_fire_alert.mjs
  # or set coords/confidence
  SIM_LAT=40.005 SIM_LON=-119.995 SIM_CONF=0.93 node scripts/simulate_fire_alert.mjs
  ```
- Env setup
  ```bash path=null start=null
  cp env.example .env
  ```

Read before changing pipelines
- turbo.json defines task dependencies and caching; lint/type-check/test depend on upstream package builds (^build). Prefer running workspace-wide commands (pnpm <task>) and use pnpm --filter when working on a single package to keep builds targeted.
