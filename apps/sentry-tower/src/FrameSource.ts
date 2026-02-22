/**
 * Frame source abstraction for sentry tower inference.
 * Provides frames from RTSP streams or simulated sources.
 */

export interface Frame {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
  timestamp: number;
}

export interface FrameSource {
  start(): Promise<void>;
  stop(): Promise<void>;
  nextFrame(): Promise<Frame | null>;
  isRunning(): boolean;
}

/**
 * Simulated frame source — generates synthetic frames for testing.
 */
export class SimulatedFrameSource implements FrameSource {
  private running = false;
  private width: number;
  private height: number;
  private frameInterval: number;
  private lastFrame = 0;

  constructor(width = 640, height = 512, fps = 10) {
    this.width = width;
    this.height = height;
    this.frameInterval = 1000 / fps;
  }

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  async nextFrame(): Promise<Frame | null> {
    if (!this.running) return null;

    const now = Date.now();
    const elapsed = now - this.lastFrame;
    if (elapsed < this.frameInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.frameInterval - elapsed));
    }
    this.lastFrame = Date.now();

    // Generate a synthetic grayscale frame
    const data = Buffer.alloc(this.width * this.height * 3);
    for (let i = 0; i < data.length; i += 3) {
      const val = Math.floor(Math.random() * 128) + 64; // Gray noise
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }

    return {
      data,
      width: this.width,
      height: this.height,
      channels: 3,
      timestamp: this.lastFrame,
    };
  }
}

/**
 * RTSP frame source — connects to an RTSP camera stream.
 * Requires ffmpeg or a native RTSP library.
 * Placeholder: in production, use fluent-ffmpeg or node-rtsp-stream.
 */
export class RtspFrameSource implements FrameSource {
  private running = false;
  private rtspUrl: string;
  private width: number;
  private height: number;

  constructor(rtspUrl: string, width = 640, height = 512) {
    this.rtspUrl = rtspUrl;
    this.width = width;
    this.height = height;
  }

  async start(): Promise<void> {
    // In production: spawn ffmpeg child process to decode RTSP to raw frames
    // ffmpeg -i <rtspUrl> -f rawvideo -pix_fmt rgb24 -s 640x512 pipe:1
    console.log(`[RtspFrameSource] Would connect to ${this.rtspUrl}`);
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  async nextFrame(): Promise<Frame | null> {
    if (!this.running) return null;
    // Placeholder: return null until real RTSP decode is wired
    await new Promise((resolve) => setTimeout(resolve, 100));
    return null;
  }
}
