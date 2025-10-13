import fs from 'fs';
import path from 'path';
import { Logger } from './Logger';

export interface ModelConfig {
  modelPath: string;
  confThreshold: number;
  nmsThreshold: number;
  frameStride: number;
}

export class ModelLoader {
  private logger = new Logger('ModelLoader');
  public readonly cfg: ModelConfig;

  constructor() {
    const modelPath = process.env.SENTRY_MODEL_PATH || 'apps/sentry-tower/models/smoke_detection.onnx';
    const conf = Number(process.env.SENTRY_CONF_THRESHOLD || 0.8);
    const nms = Number(process.env.SENTRY_NMS_THRESHOLD || 0.45);
    const stride = Number(process.env.SENTRY_FRAME_STRIDE || 3);

    this.cfg = { modelPath, confThreshold: conf, nmsThreshold: nms, frameStride: stride };
  }

  validate(): boolean {
    try {
      const abs = path.resolve(process.cwd(), this.cfg.modelPath);
      const exists = fs.existsSync(abs);
      if (!exists) {
        this.logger.warn(`Model not found at ${abs}. You can drop an ONNX model under apps/sentry-tower/models/ and set SENTRY_MODEL_PATH.`);
        return false;
      }
      this.logger.info(`Model found at ${abs} (conf=${this.cfg.confThreshold}, nms=${this.cfg.nmsThreshold}, stride=${this.cfg.frameStride})`);
      return true;
    } catch (e: any) {
      this.logger.error('Model validation error', e);
      return false;
    }
  }
}