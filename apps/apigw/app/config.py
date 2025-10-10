"""
Configuration settings for the API gateway.
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://wildfire:wildfire123@localhost:5432/wildfire_ops"
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
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://wildfire-ops.example.com"
    ]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
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
