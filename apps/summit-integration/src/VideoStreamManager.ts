/**
 * Video Stream Manager for FireLine Application
 * Handles RTSP/WebRTC video streaming from sentry towers and drones
 */

import { EventEmitter } from 'events';
import * as ffmpeg from 'fluent-ffmpeg';
import * as sharp from 'sharp';
import { SummitClient, VideoStream } from './SummitClient';

export interface StreamConfig {
  deviceId: string;
  streamUrl: string;
  type: 'thermal' | 'visual' | 'multispectral';
  resolution: string;
  fps: number;
  quality: 'low' | 'medium' | 'high';
  compression: 'h264' | 'h265' | 'vp8' | 'vp9';
}

export interface StreamStats {
  deviceId: string;
  bitrate: number;
  fps: number;
  resolution: string;
  droppedFrames: number;
  latency: number;
  status: 'active' | 'inactive' | 'error';
}

export class VideoStreamManager extends EventEmitter {
  private summitClient: SummitClient;
  private activeStreams: Map<string, ffmpeg.FfmpegCommand> = new Map();
  private streamStats: Map<string, StreamStats> = new Map();
  private isRecording: boolean = false;
  private recordingPath: string = './recordings';

  constructor(summitClient: SummitClient) {
    super();
    this.summitClient = summitClient;
    this.setupEventHandlers();
  }

  /**
   * Start video stream from device
   */
  async startStream(config: StreamConfig): Promise<VideoStream> {
    try {
      // Check if stream already exists
      if (this.activeStreams.has(config.deviceId)) {
        throw new Error(`Stream already active for device ${config.deviceId}`);
      }

      // Create FFmpeg command for stream processing
      const ffmpegCommand = this.createFFmpegCommand(config);
      
      // Start the stream
      ffmpegCommand.run();
      
      // Store the command
      this.activeStreams.set(config.deviceId, ffmpegCommand);
      
      // Initialize stats
      this.streamStats.set(config.deviceId, {
        deviceId: config.deviceId,
        bitrate: 0,
        fps: config.fps,
        resolution: config.resolution,
        droppedFrames: 0,
        latency: 0,
        status: 'active'
      });

      // Register with Summit.OS
      const videoStream = await this.summitClient.startVideoStream(
        config.deviceId,
        config.type
      );

      this.emit('streamStarted', { deviceId: config.deviceId, stream: videoStream });
      
      return videoStream;
    } catch (error) {
      console.error(`Failed to start stream for device ${config.deviceId}:`, error);
      this.emit('streamError', { deviceId: config.deviceId, error });
      throw error;
    }
  }

  /**
   * Stop video stream from device
   */
  async stopStream(deviceId: string): Promise<void> {
    try {
      const ffmpegCommand = this.activeStreams.get(deviceId);
      if (ffmpegCommand) {
        ffmpegCommand.kill('SIGTERM');
        this.activeStreams.delete(deviceId);
      }

      // Update stats
      const stats = this.streamStats.get(deviceId);
      if (stats) {
        stats.status = 'inactive';
        this.streamStats.set(deviceId, stats);
      }

      // Unregister from Summit.OS
      await this.summitClient.stopVideoStream(deviceId);

      this.emit('streamStopped', { deviceId });
    } catch (error) {
      console.error(`Failed to stop stream for device ${deviceId}:`, error);
      this.emit('streamError', { deviceId, error });
      throw error;
    }
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): VideoStream[] {
    const streams: VideoStream[] = [];
    
    for (const [deviceId, stats] of this.streamStats) {
      if (stats.status === 'active') {
        streams.push({
          deviceId,
          streamUrl: `rtsp://localhost:8554/${deviceId}`,
          type: 'thermal', // Default, would be determined by device
          resolution: stats.resolution,
          fps: stats.fps,
          status: stats.status
        });
      }
    }
    
    return streams;
  }

  /**
   * Get stream statistics
   */
  getStreamStats(deviceId: string): StreamStats | undefined {
    return this.streamStats.get(deviceId);
  }

  /**
   * Get all stream statistics
   */
  getAllStreamStats(): StreamStats[] {
    return Array.from(this.streamStats.values());
  }

  /**
   * Start recording all streams
   */
  async startRecording(): Promise<void> {
    this.isRecording = true;
    this.emit('recordingStarted');
  }

  /**
   * Stop recording all streams
   */
  async stopRecording(): Promise<void> {
    this.isRecording = false;
    this.emit('recordingStopped');
  }

  /**
   * Capture frame from stream
   */
  async captureFrame(deviceId: string): Promise<Buffer> {
    try {
      const stats = this.streamStats.get(deviceId);
      if (!stats || stats.status !== 'active') {
        throw new Error(`No active stream for device ${deviceId}`);
      }

      // This would capture a frame from the stream
      // In a real implementation, this would use FFmpeg to capture a frame
      const frameBuffer = await this.captureFrameFromStream(deviceId);
      return frameBuffer;
    } catch (error) {
      console.error(`Failed to capture frame from device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process frame for AI inference
   */
  async processFrameForAI(frameBuffer: Buffer, deviceId: string): Promise<{
    detections: Array<{
      type: 'smoke' | 'flame' | 'heat';
      confidence: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }>;
    processedFrame: Buffer;
  }> {
    try {
      // Resize frame for AI processing
      const processedFrame = await sharp(frameBuffer)
        .resize(640, 480)
        .jpeg({ quality: 80 })
        .toBuffer();

      // Run AI inference (this would use ONNX Runtime in production)
      const detections = await this.runAIInference(processedFrame, deviceId);

      return {
        detections,
        processedFrame
      };
    } catch (error) {
      console.error(`Failed to process frame for AI:`, error);
      throw error;
    }
  }

  private createFFmpegCommand(config: StreamConfig): ffmpeg.FfmpegCommand {
    const command = ffmpeg(config.streamUrl)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-buffer_size', '1024k',
        '-max_delay', '500000'
      ])
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-crf', '23',
        '-maxrate', '2M',
        '-bufsize', '4M',
        '-g', '30',
        '-keyint_min', '30',
        '-sc_threshold', '0',
        '-f', 'rtsp'
      ])
      .output(`rtsp://localhost:8554/${config.deviceId}`)
      .on('start', (commandLine) => {
        console.log(`FFmpeg started for device ${config.deviceId}: ${commandLine}`);
      })
      .on('progress', (progress) => {
        this.updateStreamStats(config.deviceId, progress);
      })
      .on('error', (error) => {
        console.error(`FFmpeg error for device ${config.deviceId}:`, error);
        this.emit('streamError', { deviceId: config.deviceId, error });
      })
      .on('end', () => {
        console.log(`FFmpeg ended for device ${config.deviceId}`);
        this.activeStreams.delete(config.deviceId);
      });

    return command;
  }

  private updateStreamStats(deviceId: string, progress: any): void {
    const stats = this.streamStats.get(deviceId);
    if (stats) {
      stats.bitrate = progress.bitrate || 0;
      stats.fps = progress.fps || stats.fps;
      stats.droppedFrames = progress.droppedFrames || 0;
      stats.latency = progress.latency || 0;
      
      this.streamStats.set(deviceId, stats);
      this.emit('streamStats', { deviceId, stats });
    }
  }

  private async captureFrameFromStream(deviceId: string): Promise<Buffer> {
    // This would use FFmpeg to capture a frame from the stream
    // For now, return a placeholder
    return Buffer.from('placeholder_frame_data');
  }

  private async runAIInference(frameBuffer: Buffer, deviceId: string): Promise<Array<{
    type: 'smoke' | 'flame' | 'heat';
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>> {
    // This would use ONNX Runtime to run AI inference
    // For now, return mock detections
    return [
      {
        type: 'smoke',
        confidence: 0.85,
        boundingBox: { x: 100, y: 100, width: 200, height: 150 }
      }
    ];
  }

  private setupEventHandlers(): void {
    // Handle Summit.OS events
    this.summitClient.on('detection', (detection) => {
      this.emit('fireDetection', detection);
    });

    this.summitClient.on('alert', (alert) => {
      this.emit('alert', alert);
    });
  }

  /**
   * Cleanup all streams
   */
  async cleanup(): Promise<void> {
    const deviceIds = Array.from(this.activeStreams.keys());
    
    for (const deviceId of deviceIds) {
      await this.stopStream(deviceId);
    }
    
    this.activeStreams.clear();
    this.streamStats.clear();
  }
}
