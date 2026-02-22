#!/usr/bin/env python3
"""
Train the fire risk scoring model using historical environmental data.

Usage:
    python train_risk_model.py --db-url postgresql://... --output models/risk_model.pkl
    python train_risk_model.py --csv data/training.csv --output models/risk_model.pkl

Prerequisites:
    pip install scikit-learn numpy sqlalchemy psycopg2-binary

Output:
    packages/algorithms/models/risk_model.pkl
"""

import argparse
import logging
import pickle
import sys
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT_ROOT / "packages" / "algorithms"))

from src.fusion import SensorFusionEngine, EnvironmentalData  # noqa: E402

OUTPUT_DIR = PROJECT_ROOT / "packages" / "algorithms" / "models"


def load_from_database(db_url: str):
    """Load training data from the env_cells table with historical fire ignitions."""
    from sqlalchemy import create_engine, text

    engine_db = create_engine(db_url)
    with engine_db.connect() as conn:
        # Load env cells with known risk outcomes (join with nearby detections)
        result = conn.execute(text("""
            SELECT
                ec.h3_index, ec.timestamp, ec.fuel_model, ec.slope_deg, ec.aspect_deg,
                ec.canopy_cover, ec.soil_moisture, ec.fuel_moisture,
                ec.temperature_c, ec.relative_humidity, ec.wind_speed_mps,
                ec.wind_direction_deg, ec.elevation_m,
                CASE WHEN d.id IS NOT NULL THEN 1.0 ELSE 0.0 END as fire_occurred
            FROM env_cells ec
            LEFT JOIN detections d ON (
                d.type IN ('fire', 'hotspot', 'smoke')
                AND d.confidence >= 0.7
                AND ABS(ec.timestamp::date - d.timestamp::date) <= 1
            )
            ORDER BY ec.timestamp
            LIMIT 50000
        """))
        rows = result.fetchall()

    if len(rows) < 10:
        logger.error(f"Only {len(rows)} training samples found. Need at least 10.")
        return []

    training_data = []
    for row in rows:
        env = EnvironmentalData(
            latitude=0.0,
            longitude=0.0,
            timestamp=str(row.timestamp),
            fuel_model=row.fuel_model or 1,
            slope_deg=row.slope_deg or 0,
            aspect_deg=row.aspect_deg or 0,
            canopy_cover=row.canopy_cover or 0,
            soil_moisture=row.soil_moisture or 0.5,
            fuel_moisture=row.fuel_moisture or 0.3,
            temperature_c=row.temperature_c or 20,
            relative_humidity=row.relative_humidity or 50,
            wind_speed_mps=row.wind_speed_mps or 5,
            wind_direction_deg=row.wind_direction_deg or 0,
            elevation_m=row.elevation_m or 500,
        )
        training_data.append((env, row.fire_occurred))

    return training_data


def load_from_csv(csv_path: str):
    """Load training data from a CSV file."""
    import csv

    training_data = []
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            env = EnvironmentalData(
                latitude=float(row.get("latitude", 0)),
                longitude=float(row.get("longitude", 0)),
                timestamp=row.get("timestamp", "2024-01-01"),
                fuel_model=int(row.get("fuel_model", 1)),
                slope_deg=float(row.get("slope_deg", 0)),
                aspect_deg=float(row.get("aspect_deg", 0)),
                canopy_cover=float(row.get("canopy_cover", 0)),
                soil_moisture=float(row.get("soil_moisture", 0.5)),
                fuel_moisture=float(row.get("fuel_moisture", 0.3)),
                temperature_c=float(row.get("temperature_c", 20)),
                relative_humidity=float(row.get("relative_humidity", 50)),
                wind_speed_mps=float(row.get("wind_speed_mps", 5)),
                wind_direction_deg=float(row.get("wind_direction_deg", 0)),
                elevation_m=float(row.get("elevation_m", 500)),
            )
            risk = float(row.get("fire_occurred", row.get("risk_score", 0)))
            training_data.append((env, risk))

    return training_data


def generate_synthetic_data(n_samples: int = 1000):
    """Generate synthetic training data for bootstrapping the model."""
    logger.info(f"Generating {n_samples} synthetic training samples...")
    training_data = []
    rng = np.random.default_rng(42)

    for _ in range(n_samples):
        temp = rng.uniform(5, 45)
        humidity = rng.uniform(10, 90)
        wind = rng.uniform(0, 20)
        fuel_moisture = rng.uniform(0.05, 0.8)
        slope = rng.uniform(0, 45)
        fuel_model = rng.integers(1, 14)

        # Simple fire occurrence rule (for synthetic training)
        risk = 0.0
        if temp > 30 and humidity < 30 and wind > 8 and fuel_moisture < 0.2:
            risk = rng.uniform(0.7, 1.0)
        elif temp > 25 and humidity < 50 and wind > 5:
            risk = rng.uniform(0.3, 0.7)
        else:
            risk = rng.uniform(0.0, 0.3)

        fire_occurred = 1.0 if risk > 0.5 else 0.0

        env = EnvironmentalData(
            latitude=rng.uniform(38, 42),
            longitude=rng.uniform(-124, -119),
            timestamp="2024-06-15",
            fuel_model=int(fuel_model),
            slope_deg=slope,
            aspect_deg=rng.uniform(0, 360),
            canopy_cover=rng.uniform(0, 1),
            soil_moisture=rng.uniform(0.1, 0.9),
            fuel_moisture=fuel_moisture,
            temperature_c=temp,
            relative_humidity=humidity,
            wind_speed_mps=wind,
            wind_direction_deg=rng.uniform(0, 360),
            elevation_m=rng.uniform(100, 3000),
        )
        training_data.append((env, fire_occurred))

    return training_data


def train_model(training_data, output_path: Path):
    """Train the fusion engine and serialize it."""
    logger.info(f"Training risk model on {len(training_data)} samples...")

    engine = SensorFusionEngine()
    engine.train_risk_model(training_data)

    # Validate
    test_env = training_data[0][0]
    test_result = engine.calculate_risk_score(test_env)
    logger.info(f"Validation: risk_score={test_result.risk_score:.3f}, confidence={test_result.confidence:.3f}")

    # Feature importance
    logger.info("Feature importance (top 10):")
    sorted_features = sorted(engine.feature_importance.items(), key=lambda x: abs(x[1]), reverse=True)
    for name, importance in sorted_features[:10]:
        logger.info(f"  {name}: {importance:.4f}")

    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        pickle.dump(engine, f)
    logger.info(f"Model saved to {output_path}")

    return engine


def main():
    parser = argparse.ArgumentParser(description="Train fire risk scoring model")
    parser.add_argument("--db-url", type=str, help="Database URL to load training data from")
    parser.add_argument("--csv", type=str, help="CSV file with training data")
    parser.add_argument("--synthetic", action="store_true", help="Use synthetic training data")
    parser.add_argument("--samples", type=int, default=1000, help="Number of synthetic samples")
    parser.add_argument("--output", type=str, default=str(OUTPUT_DIR / "risk_model.pkl"), help="Output model path")
    args = parser.parse_args()

    if args.db_url:
        training_data = load_from_database(args.db_url)
    elif args.csv:
        training_data = load_from_csv(args.csv)
    elif args.synthetic:
        training_data = generate_synthetic_data(args.samples)
    else:
        logger.info("No data source specified. Using synthetic data for bootstrapping.")
        training_data = generate_synthetic_data(args.samples)

    if len(training_data) < 10:
        logger.error("Not enough training data. Need at least 10 samples.")
        sys.exit(1)

    train_model(training_data, Path(args.output))


if __name__ == "__main__":
    main()
