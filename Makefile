# Wildfire Operations Platform Makefile

.PHONY: help install dev build test clean docker-dev docker-down db-migrate db-seed

# Default target
help:
	@echo "Wildfire Operations Platform"
	@echo "=========================="
	@echo ""
	@echo "Available targets:"
	@echo "  install     Install all dependencies"
	@echo "  dev         Start development environment"
	@echo "  build       Build all packages"
	@echo "  test        Run all tests"
	@echo "  clean       Clean build artifacts"
	@echo "  docker-dev  Start Docker development environment"
	@echo "  docker-down Stop Docker development environment"
	@echo "  db-migrate  Run database migrations"
	@echo "  db-seed     Seed database with sample data"
	@echo ""

# Install dependencies
install:
	@echo "Installing dependencies..."
	pnpm install

# Start development environment
dev:
	@echo "Starting development environment..."
	pnpm dev

# Build all packages
build:
	@echo "Building all packages..."
	pnpm build

# Run tests
test:
	@echo "Running tests..."
	pnpm test

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	pnpm clean

# Start Docker development environment
docker-dev:
	@echo "Starting Docker development environment..."
	docker-compose -f infra/docker/docker-compose.dev.yml up -d

# Stop Docker development environment
docker-down:
	@echo "Stopping Docker development environment..."
	docker-compose -f infra/docker/docker-compose.dev.yml down

# Tail logs for key services
logs-dispatcher:
	@echo "Tailing mission-dispatcher logs..."
	docker-compose -f infra/docker/docker-compose.dev.yml logs -f mission-dispatcher

logs-console:
	@echo "Tailing console logs..."
	docker-compose -f infra/docker/docker-compose.dev.yml logs -f console

# Run database migrations
db-migrate:
	@echo "Running database migrations..."
	cd apps/apigw && alembic upgrade head

# Seed database with sample data
db-seed:
	@echo "Seeding database with sample data..."
	cd apps/apigw && python scripts/seed_data.py

# Full development setup
setup: install docker-dev
	@echo "Waiting for services to start..."
	sleep 30
	@echo "Running database migrations..."
	$(MAKE) db-migrate
	@echo "Seeding database..."
	$(MAKE) db-seed
	@echo "Development environment ready!"
	@echo "Console: http://localhost:3000"
	@echo "API: http://localhost:8000"
	@echo "MQTT Dashboard: http://localhost:18083"

# Production build
prod-build:
	@echo "Building for production..."
	pnpm build
	docker-compose -f infra/docker/docker-compose.prod.yml build

# Production deploy
prod-deploy:
	@echo "Deploying to production..."
	docker-compose -f infra/docker/docker-compose.prod.yml up -d

# Check system health
health:
	@echo "Checking system health..."
	@curl -f http://localhost:8000/health || echo "API Gateway not responding"
	@curl -f http://localhost:3000 || echo "Console not responding"
	@curl -f http://localhost:18083 || echo "MQTT Dashboard not responding"

# Generate documentation
docs:
	@echo "Generating documentation..."
	cd apps/apigw && python -m mkdocs serve

# Lint all code
lint:
	@echo "Linting all code..."
	pnpm lint

# Type check all TypeScript
type-check:
	@echo "Type checking all TypeScript..."
	pnpm type-check

# Run security audit
audit:
	@echo "Running security audit..."
	pnpm audit
	npm audit --audit-level moderate

# Update dependencies
update:
	@echo "Updating dependencies..."
	pnpm update
	pnpm audit fix

# Reset development environment
reset: docker-down
	@echo "Resetting development environment..."
	docker volume prune -f
	docker-compose -f infra/docker/docker-compose.dev.yml up -d
	sleep 30
	$(MAKE) db-migrate
	$(MAKE) db-seed
