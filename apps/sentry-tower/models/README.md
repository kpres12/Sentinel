# Sentry Tower Models

This directory is where you can drop ONNX models and related config for the sentry-tower service.

Quick start
- Place your model at models/smoke_detection.onnx
- Set thresholds via .env (examples below)

Recommended .env keys
- SENTRY_MODEL_PATH=apps/sentry-tower/models/smoke_detection.onnx
- SENTRY_CONF_THRESHOLD=0.80
- SENTRY_NMS_THRESHOLD=0.45
- SENTRY_FRAME_STRIDE=3  # run inference every N frames

Notes
- You can version models by filename (e.g., smoke_detection_v1.onnx) and update SENTRY_MODEL_PATH accordingly.
- Keep a small README.txt alongside the model with its training details and expected input size.
