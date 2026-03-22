"""
Database configuration and session management.
"""

import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Database URL from environment - fail fast if missing in production
def _get_database_url() -> str:
    is_dev = os.getenv("NODE_ENV", "development") == "development"
    url = os.getenv("DATABASE_URL")
    
    if url is None:
        if is_dev:
            print("WARNING: Using dev DATABASE_URL. Set this in production!", file=__import__('sys').stderr)
            return "postgresql://wildfire:wildfire123@localhost:5432/wildfire_ops"
        raise RuntimeError("DATABASE_URL environment variable is required in production")
    
    return url

DATABASE_URL = _get_database_url()

# Convert to async URL
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Create engines
engine = create_engine(DATABASE_URL)
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)

# Session makers
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

# Base class for models
class Base(DeclarativeBase):
    pass


# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Async dependency to get database session
async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
