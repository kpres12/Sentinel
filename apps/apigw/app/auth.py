"""
Authentication and authorization middleware for FastAPI.
"""

import os
from typing import Optional, List
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
import jwt


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to verify JWT tokens on protected routes.
    Skips auth for health/metrics/docs endpoints.
    """
    
    # Routes that don't require authentication
    PUBLIC_PATHS = {"/", "/health", "/readiness", "/metrics", "/docs", "/redoc", "/openapi.json"}
    
    def __init__(self, app, jwt_secret: Optional[str] = None):
        super().__init__(app)
        self.jwt_secret = jwt_secret or os.getenv("SECRET_KEY", "dev-secret-key-CHANGE-IN-PROD")
        self.is_dev = os.getenv("NODE_ENV", "development") == "development"
        
        if self.is_dev and not jwt_secret:
            print("WARNING: Using default JWT secret in development mode")
    
    async def dispatch(self, request: Request, call_next):
        # Skip auth for public paths
        if request.url.path in self.PUBLIC_PATHS or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
            return await call_next(request)
        
        # In development, allow unauthenticated access with warning
        if self.is_dev:
            auth_header = request.headers.get("authorization")
            if not auth_header:
                # Allow request but add warning header
                response = await call_next(request)
                response.headers["X-Auth-Warning"] = "No authentication in dev mode"
                return response
        
        # Production: require authentication
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = auth_header.split(" ")[1]
        
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            request.state.user = payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiter.
    In production, use Redis-backed rate limiting.
    """
    
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = {}
    
    async def dispatch(self, request: Request, call_next):
        import time
        
        # Skip rate limiting for health checks
        if request.url.path in {"/health", "/readiness", "/metrics"}:
            return await call_next(request)
        
        # Use client IP as identifier
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean old requests
        if client_ip in self.requests:
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if now - req_time < self.window_seconds
            ]
        else:
            self.requests[client_ip] = []
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {self.max_requests} requests per {self.window_seconds}s",
                headers={
                    "Retry-After": str(self.window_seconds),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(now + self.window_seconds))
                }
            )
        
        # Add current request
        self.requests[client_ip].append(now)
        
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = self.max_requests - len(self.requests[client_ip])
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(now + self.window_seconds))
        
        return response


# Dependency for route-level auth
security = HTTPBearer(auto_error=False)

# Keycloak OIDC config (RS256 tokens)
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "wildfire-ops")
KEYCLOAK_JWKS_URL = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"

_jwks_cache: dict = {}


def _get_keycloak_public_key(token: str) -> Optional[str]:
    """Fetch the signing key from Keycloak JWKS endpoint."""
    import json
    try:
        from jose import jwk
        from jose.utils import base64url_decode
        import urllib.request

        # Cache JWKS keys
        if not _jwks_cache.get("keys"):
            with urllib.request.urlopen(KEYCLOAK_JWKS_URL, timeout=5) as resp:
                _jwks_cache["keys"] = json.loads(resp.read())

        # Decode header to find kid
        header = json.loads(
            base64url_decode(token.split(".")[0].encode() + b"==")
        )
        kid = header.get("kid")
        if not kid:
            return None

        for key_data in _jwks_cache["keys"].get("keys", []):
            if key_data.get("kid") == kid:
                return jwk.construct(key_data).to_pem().decode()
    except Exception:
        pass
    return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Dependency to get current authenticated user from JWT token.
    Supports both Keycloak RS256 OIDC tokens and local HS256 tokens.

    @app.get("/protected")
    async def protected_route(user: dict = Depends(get_current_user)):
        return {"user": user}
    """
    is_dev = os.getenv("NODE_ENV", "development") == "development"

    # In dev, allow requests without auth
    if is_dev and credentials is None:
        return {"sub": "dev-user", "role": "admin", "permissions": ["*"]}

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    jwt_secret = os.getenv("SECRET_KEY", "dev-secret-key-CHANGE-IN-PROD")

    # Try Keycloak RS256 first (OIDC tokens)
    pem = _get_keycloak_public_key(token)
    if pem:
        try:
            payload = jwt.decode(token, pem, algorithms=["RS256"], options={"verify_aud": False})
            # Flatten Keycloak realm_access roles into a top-level "role" for convenience
            roles = payload.get("realm_access", {}).get("roles", [])
            for r in ["admin", "ops", "analyst", "observer"]:
                if r in roles:
                    payload["role"] = r
                    break
            return payload
        except Exception:
            pass  # Fall through to HS256

    # Fallback: local HS256 token
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_permission(required_permissions: List[str]):
    """
    Dependency factory to check user permissions.
    
    @app.post("/missions")
    async def create_mission(user: dict = Depends(require_permission(["mission:create"]))):
        ...
    """
    async def permission_checker(user: dict = None) -> dict:
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        user_permissions = user.get("permissions", [])
        
        # Admin has all permissions
        if "admin" in user.get("role", "").lower() or "*" in user_permissions:
            return user
        
        # Check if user has required permission
        has_permission = any(perm in user_permissions for perm in required_permissions)
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permissions: {required_permissions}"
            )
        
        return user
    
    return permission_checker
