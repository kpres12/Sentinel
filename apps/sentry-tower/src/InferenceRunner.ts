/**
 * ONNX inference runner for smoke/fire detection.
 * Loads a YOLOv8-nano ONNX model and runs inference on camera frames.
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import type { FrameSource, Frame } from './FrameSource';

export interface Detection {
  type: 'smoke' | 'fire' | 'flame';
  confidence: float;
  bbox: { x: number; y: number; width: number; height: number };
  timestamp: number;
}

interface InferenceConfig {
  modelPath: string;
  confThreshold: number;
  nmsThreshold: number;
  frameStride: number;   // Process every Nth frame
  classes: string[];
}

type float = number;

export class InferenceRunner extends EventEmitter {
  private config: InferenceConfig;
  private frameSource: FrameSource;
  private running = false;
  private frameCount = 0;
  private session: any = null; // onnxruntime.InferenceSession

  constructor(frameSource: FrameSource, config?: Partial<InferenceConfig>) {
    super();
    this.frameSource = frameSource;
    this.config = {
      modelPath: config?.modelPath || process.env.SENTRY_MODEL_PATH || path.join(__dirname, '..', 'models', 'smoke_detection.onnx'),
      confThreshold: config?.confThreshold || parseFloat(process.env.SENTRY_CONF_THRESHOLD || '0.80'),
      nmsThreshold: config?.nmsThreshold || parseFloat(process.env.SENTRY_NMS_THRESHOLD || '0.45'),
      frameStride: config?.frameStride || parseInt(process.env.SENTRY_FRAME_STRIDE || '3', 10),
      classes: config?.classes || ['smoke', 'fire', 'flame'],
    };
  }

  async start(): Promise<void> {
    // Load ONNX model
    const modelExists = fs.existsSync(this.config.modelPath);
    if (!modelExists) {
      console.warn(`[InferenceRunner] Model not found at ${this.config.modelPath} — running in passthrough mode`);
      console.warn('[InferenceRunner] Train a model with: python packages/algorithms/training/train_smoke_detector.py');
    } else {
      try {
        const ort = await import('onnxruntime-node');
        this.session = await ort.InferenceSession.create(this.config.modelPath);
        console.log(`[InferenceRunner] ONNX model loaded: ${this.config.modelPath}`);
        console.log(`[InferenceRunner] Input: ${this.session.inputNames}, Output: ${this.session.outputNames}`);
      } catch (err) {
        console.error(`[InferenceRunner] Failed to load ONNX model: ${err}`);
        console.warn('[InferenceRunner] Running in passthrough mode');
      }
    }

    await this.frameSource.start();
    this.running = true;
    this.emit('started');

    // Main inference loop
    this._runLoop().catch((err) => {
      console.error(`[InferenceRunner] Loop error: ${err}`);
      this.emit('error', err);
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.frameSource.stop();
    this.emit('stopped');
  }

  private async _runLoop(): Promise<void> {
    while (this.running) {
      const frame = await this.frameSource.nextFrame();
      if (!frame) continue;

      this.frameCount++;

      // Skip frames per stride setting
      if (this.frameCount % this.config.frameStride !== 0) continue;

      try {
        const detections = await this._infer(frame);
        for (const det of detections) {
          this.emit('detection', det);
        }
      } catch (err) {
        console.error(`[InferenceRunner] Inference error: ${err}`);
      }
    }
  }

  private async _infer(frame: Frame): Promise<Detection[]> {
    if (!this.session) {
      // No model loaded — passthrough mode, no detections
      return [];
    }

    try {
      const ort = await import('onnxruntime-node');

      // Preprocess: resize to 640x640, normalize to [0,1], CHW format
      const inputSize = 640;
      const inputData = this._preprocessFrame(frame, inputSize);
      const inputTensor = new ort.Tensor('float32', inputData, [1, 3, inputSize, inputSize]);

      const feeds: Record<string, any> = {};
      feeds[this.session.inputNames[0]] = inputTensor;

      const results = await this.session.run(feeds);
      const output = results[this.session.outputNames[0]];

      return this._postprocess(output.data as Float32Array, output.dims, frame);
    } catch (err) {
      console.error(`[InferenceRunner] Inference failed: ${err}`);
      return [];
    }
  }

  private _preprocessFrame(frame: Frame, targetSize: number): Float32Array {
    // Simple resize + normalize (bilinear interpolation approximation)
    const result = new Float32Array(3 * targetSize * targetSize);
    const scaleX = frame.width / targetSize;
    const scaleY = frame.height / targetSize;

    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const srcX = Math.min(Math.floor(x * scaleX), frame.width - 1);
        const srcY = Math.min(Math.floor(y * scaleY), frame.height - 1);
        const srcIdx = (srcY * frame.width + srcX) * frame.channels;
        const dstIdx = y * targetSize + x;

        // CHW format, normalized to [0,1]
        result[0 * targetSize * targetSize + dstIdx] = frame.data[srcIdx] / 255.0;     // R
        result[1 * targetSize * targetSize + dstIdx] = frame.data[srcIdx + 1] / 255.0; // G
        result[2 * targetSize * targetSize + dstIdx] = frame.data[srcIdx + 2] / 255.0; // B
      }
    }

    return result;
  }

  private _postprocess(outputData: Float32Array, dims: number[], frame: Frame): Detection[] {
    const detections: Detection[] = [];
    const numDetections = dims[1] || 0;
    const numClasses = this.config.classes.length;

    // YOLOv8 output format: [1, num_detections, 4 + num_classes]
    for (let i = 0; i < numDetections; i++) {
      const offset = i * (4 + numClasses);
      const cx = outputData[offset];
      const cy = outputData[offset + 1];
      const w = outputData[offset + 2];
      const h = outputData[offset + 3];

      // Find best class
      let bestClass = 0;
      let bestConf = 0;
      for (let c = 0; c < numClasses; c++) {
        const conf = outputData[offset + 4 + c];
        if (conf > bestConf) {
          bestConf = conf;
          bestClass = c;
        }
      }

      if (bestConf < this.config.confThreshold) continue;

      // Apply NMS (simplified: just confidence threshold for now)
      detections.push({
        type: this.config.classes[bestClass] as Detection['type'],
        confidence: bestConf,
        bbox: {
          x: (cx - w / 2) * frame.width,
          y: (cy - h / 2) * frame.height,
          width: w * frame.width,
          height: h * frame.height,
        },
        timestamp: frame.timestamp,
      });
    }

    return detections;
  }
}
