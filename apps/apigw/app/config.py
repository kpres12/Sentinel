"""
Configuration settings for the API gateway.
"""

import os
import sys
from typing import List
from pydantic_settings import BaseSettings


def _get_required_env(key: str, default_dev: str | None = None) -> str:
    """Get required environment variable, fail fast in production."""
    is_dev = os.getenv("NODE_ENV", "development") == "development"
    value = os.getenv(key)
    
    if value is None:
        if is_dev and default_dev is not None:
            print(f"WARNING: Using dev default for {key}. Set this in production!", file=sys.stderr)
            return default_dev
        print(f"FATAL: Required environment variable {key} is not set", file=sys.stderr)
        sys.exit(1)
    
    return value


def _parse_list_env(key: str, default: List[str]) -> List[str]:
    """Parse comma-separated list from environment variable."""
    value = os.getenv(key)
    if value:
        return [item.strip() for item in value.split(",") if item.strip()]
    return default


class Settings(BaseSettings):
    """Application settings."""
    
    # Environment
    NODE_ENV: str = os.getenv("NODE_ENV", "development")
    
    # Database - REQUIRED
    DATABASE_URL: str = _get_required_env(
        "DATABASE_URL",
        default_dev="postgresql://wildfire:wildfire123@localhost:5432/wildfire_ops"
    )
    
    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    
    # MQTT
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "localhost")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "")
    
    # API Gateway
    API_GATEWAY_HOST: str = os.getenv("API_GATEWAY_HOST", "0.0.0.0")
    API_GATEWAY_PORT: int = int(os.getenv("API_GATEWAY_PORT", "8000"))
    GRPC_PORT: int = int(os.getenv("GRPC_PORT", "50051"))
    
    # CORS - strict by default, override via env
    ALLOWED_ORIGINS: List[str] = _parse_list_env(
        "ALLOWED_ORIGINS",
        ["http://localhost:3000", "http://localhost:3001"] if os.getenv("NODE_ENV", "development") == "development" else []
    )
    ALLOWED_HOSTS: List[str] = _parse_list_env(
        "ALLOWED_HOSTS",
        ["localhost", "127.0.0.1"] if os.getenv("NODE_ENV", "development") == "development" else []
    )
    
    # Auth - REQUIRED in production
    SECRET_KEY: str = _get_required_env("SECRET_KEY", default_dev="dev-secret-key-CHANGE-IN-PROD")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Integrations
    ARCGIS_URL: str = os.getenv("ARCGIS_URL", "")
    ARCGIS_TOKEN: str = os.getenv("ARCGIS_TOKEN", "")
    CAD_WEBHOOK_URL: str = os.getenv("CAD_WEBHOOK_URL", "")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
