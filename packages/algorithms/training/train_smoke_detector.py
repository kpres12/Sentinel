#!/usr/bin/env python3
"""
Train a YOLOv8-nano smoke/fire detection model and export to ONNX.

Usage:
    python train_smoke_detector.py --data /path/to/dataset.yaml --epochs 100
    python train_smoke_detector.py --pretrained  # use a smoke-fire dataset from HuggingFace

Prerequisites:
    pip install ultralytics onnx onnxruntime

Output:
    apps/sentry-tower/models/smoke_detection.onnx
"""

import argparse
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = PROJECT_ROOT / "apps" / "sentry-tower" / "models"


def create_dataset_yaml(data_dir: Path) -> Path:
    """Create a YOLO dataset config if using a standard directory structure."""
    yaml_path = data_dir / "dataset.yaml"
    if yaml_path.exists():
        return yaml_path

    # Expect structure: data_dir/{train,val}/{images,labels}/
    content = f"""
path: {data_dir}
train: train/images
val: val/images

names:
  0: smoke
  1: fire
  2: flame
"""
    yaml_path.write_text(content.strip())
    logger.info(f"Created dataset config at {yaml_path}")
    return yaml_path


def train(data_yaml: str, epochs: int, imgsz: int, batch: int, device: str):
    """Train YOLOv8-nano model."""
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("ultralytics not installed. Run: pip install ultralytics")
        sys.exit(1)

    logger.info(f"Training YOLOv8n on {data_yaml} for {epochs} epochs")

    model = YOLO("yolov8n.pt")  # Start from pretrained COCO weights

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        name="smoke_fire_detector",
        project=str(OUTPUT_DIR / "runs"),
        exist_ok=True,
        patience=20,
        save=True,
        save_period=10,
        verbose=True,
    )

    logger.info(f"Training complete. Best mAP50: {results.results_dict.get('metrics/mAP50(B)', 'N/A')}")

    # Export to ONNX
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    onnx_path = OUTPUT_DIR / "smoke_detection.onnx"

    best_model_path = OUTPUT_DIR / "runs" / "smoke_fire_detector" / "weights" / "best.pt"
    if best_model_path.exists():
        best_model = YOLO(str(best_model_path))
        best_model.export(format="onnx", imgsz=imgsz, simplify=True)
        exported = best_model_path.with_suffix(".onnx")
        if exported.exists():
            exported.rename(onnx_path)
            logger.info(f"ONNX model exported to {onnx_path}")
    else:
        logger.warning(f"Best model not found at {best_model_path}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Train smoke/fire detection model")
    parser.add_argument("--data", type=str, help="Path to dataset YAML or directory")
    parser.add_argument("--epochs", type=int, default=100, help="Training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--device", type=str, default="", help="Device ('' for auto, 'cpu', '0', etc)")
    args = parser.parse_args()

    if not args.data:
        logger.error("--data is required. Provide path to dataset YAML or directory.")
        logger.info("Expected dataset structure:")
        logger.info("  dataset/")
        logger.info("    train/images/  train/labels/")
        logger.info("    val/images/    val/labels/")
        logger.info("Labels: YOLO format (class x_center y_center width height)")
        logger.info("Classes: 0=smoke, 1=fire, 2=flame")
        sys.exit(1)

    data_path = Path(args.data)
    if data_path.is_dir():
        data_yaml = str(create_dataset_yaml(data_path))
    else:
        data_yaml = str(data_path)

    train(data_yaml, args.epochs, args.imgsz, args.batch, args.device)


if __name__ == "__main__":
    main()
