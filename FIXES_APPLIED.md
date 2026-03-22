# Security & Reliability Fixes Applied

**Date:** 2025-11-13  
**Status:** ✅ All 10 critical fixes completed

---

## Summary

This document outlines the launch-blocking security and reliability issues that were identified and fixed in the Sentinel codebase.

## Fixes Applied

### ✅ Fix 1: Removed `.env` from Git & Created Secure Templates

**Problem:** `.env` file containing secrets was committed to git. Default passwords (`wildfire123`, `admin123`) exposed in repo history.

**Fixed:**
- Removed `.env` from git tracking
- Created `.env.production.template` with generation instructions
- Updated `.gitignore` to block all `.env*` files
- Created `SECURITY_CLEANUP.md` with instructions to purge git history

**Action Required:**
- [ ] Run git history cleanup (see `SECURITY_CLEANUP.md`)
- [ ] Rotate all compromised secrets
- [ ] Create `.env.production` from template with real secrets

**Files:**
- `.env.production.template` (new)
- `.gitignore` (updated)
- `SECURITY_CLEANUP.md` (new)

---

### ✅ Fix 2 & 3: Fixed Hardcoded Secrets & CORS Wildcards

**Problem:** 
- Config files had hardcoded default passwords
- `ALLOWED_HOSTS = ["*"]` permitted any host
- `SECRET_KEY` default was `"your-secret-key-here"`

**Fixed:**
- `config.py`: Added `_get_required_env()` that fails fast in production if secrets missing
- `database.py`: Removed hardcoded DB URL, fails if not set in production
- CORS `ALLOWED_ORIGINS` and `ALLOWED_HOSTS` now env-driven, strict by default
- Production mode requires `NODE_ENV=production` + all secrets set

**Files Changed:**
- `apps/apigw/app/config.py`
- `apps/apigw/app/database.py`
- `infra/docker/docker-compose.prod.yml`

**Production Behavior:**
- Missing `SECRET_KEY`, `DATABASE_URL`, or other required vars → app exits with error
- `ALLOWED_HOSTS` with wildcard `*` → deployment script rejects it
- Development mode still allows defaults (with warnings)

---

### ✅ Fix 4, 5, 6: Added Auth, Rate Limiting, and Real Health Checks

**Problem:**
- No authentication on any endpoint (admin, missions, detections all public)
- No rate limiting (DoS/brute-force vulnerable)
- Health check always returned "healthy" with static timestamp

**Fixed:**

**Authentication:**
- Created `apps/apigw/app/auth.py` with JWT middleware
- Dev mode: allows unauthenticated access (with warning header)
- Production mode: requires `Bearer <token>` for all endpoints except `/health`, `/readiness`, `/metrics`, `/docs`
- Added `get_current_user()` and `require_permission()` dependencies for route-level auth

**Rate Limiting:**
- In-memory rate limiter (100 req/60s per IP by default)
- Returns `429 Too Many Requests` with `Retry-After` header
- Adds `X-RateLimit-*` headers to responses

**Health Checks:**
- `/health` → Liveness (is process alive?)
- `/readiness` → Readiness (can serve traffic? checks DB, Redis, MQTT)
- Returns `503` if dependencies unhealthy
- Real timestamp (not hardcoded)

**Files Changed:**
- `apps/apigw/app/auth.py` (new)
- `apps/apigw/app/main.py` (integrated middleware + health checks)
- `apps/apigw/requirements.txt` (added `PyJWT`, `redis[async]`)

**Usage:**
```python
# Protect a route
from app.auth import get_current_user, require_permission
from fastapi import Depends

@app.post("/missions")
async def create_mission(
    user: dict = Depends(require_permission(["mission:create"]))
):
    ...
```

---

### ✅ Fix 7: Fixed Next.js Console Dockerfile

**Problem:**
- Dockerfile ran `npm install --only=production` before build
- Next.js needs devDependencies to build
- Single-stage build bundled unnecessary dependencies in final image

**Fixed:**
- Multi-stage build:
  1. **deps:** Install all deps
  2. **builder:** Build app
  3. **runner:** Copy only production artifacts
- Enabled `output: 'standalone'` in `next.config.js`
- Final image: ~50% smaller, no devDependencies

**Files Changed:**
- `apps/console/Dockerfile`
- `apps/console/next.config.js`

---

### ✅ Fix 8: Added Python CI with Tests

**Problem:**
- CI only tested Node/TypeScript
- FastAPI changes never tested
- Integration tests existed but weren't run

**Fixed:**
- Added `python` job to `.github/workflows/ci.yml`
- Spins up Postgres + Redis services
- Runs:
  - `ruff` (linting)
  - `mypy` (type checking)
  - `pytest` with coverage
- Uploads coverage to Codecov

**Files Changed:**
- `.github/workflows/ci.yml`

---

### ✅ Fix 9 & 10: Fixed Database Migrations & Deployment Script

**Problem (Migrations):**
- `Base.metadata.create_all()` ran on every API startup
- In Kubernetes with multiple replicas → race conditions, schema corruption

**Fixed:**
- Removed auto-migration from `main.py` startup
- Added comment: run `alembic upgrade head` separately before deploy

**Problem (Deployment Script):**
- Expected env vars but no validation
- S3 backup, DB dump, AWS ECR assumed credentials existed
- Rollback logic broke on first deployment (no previous revision)
- `.env.production` loaded twice

**Fixed:**
- `validate_environment()`:
  - Loads `.env.production` or exits
  - Checks all required vars
  - Rejects insecure passwords (`wildfire123`, `admin123`)
  - Rejects wildcard in `ALLOWED_HOSTS`
- `build_and_push_images()`:
  - Validates `AWS_ACCOUNT_ID` is set
  - Checks ECR login success
- `rollback_deployment()`:
  - Checks deployment exists before rollback
  - Handles first deployment gracefully
  - Returns error code if rollback fails

**Files Changed:**
- `apps/apigw/app/main.py`
- `scripts/deploy-production.sh`

---

## Production Deployment Checklist

Before deploying to production:

### 1. Secrets
- [ ] Copy `.env.production.template` to `.env.production`
- [ ] Generate all secrets: `openssl rand -hex 32`
- [ ] Set `ALLOWED_ORIGINS` to real domains (no wildcards)
- [ ] Set `ALLOWED_HOSTS` to real hostnames (no `*`)
- [ ] Set `NODE_ENV=production`

### 2. Git History
- [ ] Follow `SECURITY_CLEANUP.md` to purge `.env` from history
- [ ] Rotate any secrets that were in git

### 3. Dependencies
- [ ] Run `pnpm install` (Node packages)
- [ ] Run `pip install -r apps/apigw/requirements.txt` (Python packages)

### 4. Database
- [ ] Run migrations separately: `cd apps/apigw && alembic upgrade head`
- [ ] Do NOT rely on auto-migration at startup

### 5. Infrastructure
- [ ] Configure K8s secrets for `postgresql-credentials`, `redis-credentials`, `jwt-secrets`, etc.
- [ ] Set up AWS Secrets Manager or Vault (recommended)
- [ ] Update load balancer health checks to use `/readiness`

### 6. CI/CD
- [ ] Ensure all tests pass: `pnpm test` and `pytest`
- [ ] Enable branch protection rules
- [ ] Enable secret scanning (GitHub Advanced Security)

### 7. Deployment Script
- [ ] Set `AWS_ACCOUNT_ID` in environment
- [ ] Verify AWS credentials: `aws sts get-caller-identity`
- [ ] Run: `./scripts/deploy-production.sh`

---

## Testing the Fixes

### Local Development

1. **Start services:**
   ```bash
   make docker-dev
   ```

2. **API should start with warnings** (dev mode allows defaults):
   ```
   WARNING: Using dev default for DATABASE_URL. Set this in production!
   WARNING: Using default JWT secret in development mode
   ```

3. **Health checks:**
   ```bash
   curl http://localhost:8000/health       # Always returns 200
   curl http://localhost:8000/readiness    # Returns 503 if DB/Redis down
   ```

4. **Auth in dev mode:**
   ```bash
   # Works without token (dev mode)
   curl http://localhost:8000/api/v1/telemetry
   
   # Response includes warning header:
   # X-Auth-Warning: No authentication in dev mode
   ```

5. **Rate limiting:**
   ```bash
   # Send 101 requests rapidly
   for i in {1..101}; do curl http://localhost:8000/api/v1/telemetry; done
   
   # 101st request:
   # HTTP 429 Too Many Requests
   # Retry-After: 60
   ```

### Production Mode

1. **Set environment:**
   ```bash
   export NODE_ENV=production
   export DATABASE_URL=postgresql://...
   export SECRET_KEY=$(openssl rand -hex 32)
   export ALLOWED_ORIGINS=https://console.example.com
   export ALLOWED_HOSTS=api.example.com
   ```

2. **API should fail if secrets missing:**
   ```bash
   unset SECRET_KEY
   uvicorn app.main:app
   
   # Output:
   # FATAL: Required environment variable SECRET_KEY is not set
   # exit code 1
   ```

3. **Auth required:**
   ```bash
   # Without token → 401
   curl http://localhost:8000/api/v1/missions
   
   # With token → 200
   curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/missions
   ```

---

## Monitoring Post-Deploy

### Key Metrics to Watch

1. **Health checks:** `/readiness` returning 200
2. **Error rate:** Should not spike after deploy
3. **Auth failures:** Monitor 401/403 responses (should be low after migration)
4. **Rate limit hits:** Monitor 429 responses

### Alerts to Configure

1. **Critical:**
   - `/readiness` failing for >2 minutes
   - Error rate >1%
   - Database connection failures

2. **Warning:**
   - Rate limit hit rate >10 req/min
   - Auth failure rate >5%

---

## Rollback Plan

If deployment fails:

1. **Automatic:** Script will attempt rollback if `ROLLBACK_ON_FAILURE=true`
2. **Manual:**
   ```bash
   kubectl rollout undo deployment/wildfire-api-gateway -n wildfire-ops
   kubectl rollout undo deployment/wildfire-console -n wildfire-ops
   ```

3. **If first deployment fails:** No previous revision exists
   - Delete failed resources manually
   - Fix issues
   - Re-deploy

---

## Next Steps (Optional Hardening)

While all critical issues are fixed, consider these additional improvements:

1. **Replace in-memory rate limiter with Redis-backed** (for multi-instance deployments)
2. **Add request signing** for service-to-service calls
3. **Enable API request/response logging** for audit trails
4. **Add OpenTelemetry distributed tracing**
5. **Set up Secrets Manager rotation** (AWS Secrets Manager, Vault)
6. **Enable mTLS** between services
7. **Add input validation** to all API endpoints (Pydantic models)
8. **Set up WAF** (Web Application Firewall) rules

---

## Questions?

If you encounter issues:

1. Check logs: `kubectl logs -f deployment/wildfire-api-gateway`
2. Verify secrets: `kubectl get secrets -n wildfire-ops`
3. Test health: `curl https://api.yourdomain.com/readiness`
4. Review this document's checklists

For development issues, ensure `NODE_ENV=development` is set (allows defaults with warnings).
