/**
 * FireWatch Agent for FireLine Application
 * Manages thermal cameras, acoustic arrays, and multi-sensor fusion for fire detection
 */

import { EventEmitter } from 'events';
import { SummitClient, FireDetection } from './SummitClient';
import * as sharp from 'sharp';

export interface TowerConfig {
  towerId: string;
  name: string;
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  thermalCamera: ThermalCameraConfig;
  acousticArray: AcousticArrayConfig;
  summitIntegration: {
    apiUrl: string;
    apiKey: string;
    videoStreaming: boolean;
    offlineMode: boolean;
  };
}

export interface ThermalCameraConfig {
  model: string;
  resolution: string;
  fps: number;
  temperatureRange: { min: number; max: number };
  detectionThreshold: number;
  calibrationData: any;
}

export interface AcousticArrayConfig {
  enabled: boolean;
  microphones: number;
  sampleRate: number;
  frequencyRange: { min: number; max: number };
  detectionThreshold: number;
  windCompensation: boolean;
}

export interface FireDetectionResult {
  type: 'smoke' | 'flame' | 'heat';
  confidence: number;
  position?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  bearing?: number;
  temperature?: number;
  acousticSignature?: {
    frequency: number;
    amplitude: number;
    duration: number;
  };
  timestamp: string;
  source: 'thermal' | 'acoustic' | 'fusion';
}

export interface MultiSensorFusion {
  thermalConfidence: number;
  acousticConfidence: number;
  visualConfidence: number;
  environmentalFactors: {
    windSpeed: number;
    windDirection: number;
    humidity: number;
    temperature: number;
  };
  fusedConfidence: number;
  falsePositiveFilter: boolean;
}

export class SentryTowerAgent extends EventEmitter {
  private config: TowerConfig;
  private summitClient: SummitClient;
  private isRunning: boolean = false;
  private detectionHistory: FireDetectionResult[] = [];
  private fusionEngine: MultiSensorFusion;
  private thermalProcessor: ThermalCameraProcessor;
  private acousticProcessor: AcousticArrayProcessor;
  private offlineMode: boolean = false;
  private offlineData: FireDetectionResult[] = [];

  constructor(config: TowerConfig) {
    super();
    this.config = config;
    this.summitClient = new SummitClient(config.summitIntegration);
    this.fusionEngine = new MultiSensorFusion();
    this.thermalProcessor = new ThermalCameraProcessor(config.thermalCamera);
    this.acousticProcessor = new AcousticArrayProcessor(config.acousticArray);
    
    this.setupEventHandlers();
  }

  /**
   * Start the sentry tower agent
   */
  async start(): Promise<void> {
    try {
      console.log(`Starting Sentry Tower Agent for tower ${this.config.towerId}`);
      
      // Connect to Summit.OS
      await this.summitClient.connect();
      
      // Initialize thermal camera
      await this.thermalProcessor.initialize();
      
      // Initialize acoustic array
      if (this.config.acousticArray.enabled) {
        await this.acousticProcessor.initialize();
      }
      
      // Start detection loop
      this.isRunning = true;
      this.startDetectionLoop();
      
      this.emit('started', { towerId: this.config.towerId });
      console.log(`Sentry Tower Agent started successfully`);
    } catch (error) {
      console.error(`Failed to start Sentry Tower Agent:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the sentry tower agent
   */
  async stop(): Promise<void> {
    try {
      console.log(`Stopping Sentry Tower Agent for tower ${this.config.towerId}`);
      
      this.isRunning = false;
      
      // Stop thermal camera
      await this.thermalProcessor.stop();
      
      // Stop acoustic array
      if (this.config.acousticArray.enabled) {
        await this.acousticProcessor.stop();
      }
      
      // Disconnect from Summit.OS
      await this.summitClient.disconnect();
      
      this.emit('stopped', { towerId: this.config.towerId });
      console.log(`Sentry Tower Agent stopped successfully`);
    } catch (error) {
      console.error(`Failed to stop Sentry Tower Agent:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Enable offline mode
   */
  async enableOfflineMode(): Promise<void> {
    this.offlineMode = true;
    this.emit('offlineModeEnabled', { towerId: this.config.towerId });
    console.log(`Offline mode enabled for tower ${this.config.towerId}`);
  }

  /**
   * Disable offline mode and sync data
   */
  async disableOfflineMode(): Promise<void> {
    try {
      this.offlineMode = false;
      
      // Sync offline data
      if (this.offlineData.length > 0) {
        await this.summitClient.syncOfflineData(this.config.towerId, this.offlineData);
        this.offlineData = [];
      }
      
      this.emit('offlineModeDisabled', { towerId: this.config.towerId });
      console.log(`Offline mode disabled for tower ${this.config.towerId}`);
    } catch (error) {
      console.error(`Failed to sync offline data:`, error);
      this.emit('error', error);
    }
  }

  /**
   * Get detection history
   */
  getDetectionHistory(): FireDetectionResult[] {
    return [...this.detectionHistory];
  }

  /**
   * Get offline data
   */
  getOfflineData(): FireDetectionResult[] {
    return [...this.offlineData];
  }

  /**
   * Get tower status
   */
  getTowerStatus(): {
    towerId: string;
    isRunning: boolean;
    offlineMode: boolean;
    thermalCameraStatus: string;
    acousticArrayStatus: string;
    detectionCount: number;
    lastDetection?: FireDetectionResult;
  } {
    return {
      towerId: this.config.towerId,
      isRunning: this.isRunning,
      offlineMode: this.offlineMode,
      thermalCameraStatus: this.thermalProcessor.getStatus(),
      acousticArrayStatus: this.acousticProcessor.getStatus(),
      detectionCount: this.detectionHistory.length,
      lastDetection: this.detectionHistory[this.detectionHistory.length - 1]
    };
  }

  private async startDetectionLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Process thermal camera data
        const thermalDetection = await this.thermalProcessor.processFrame();
        
        // Process acoustic array data
        let acousticDetection: FireDetectionResult | null = null;
        if (this.config.acousticArray.enabled) {
          acousticDetection = await this.acousticProcessor.processAudio();
        }
        
        // Perform multi-sensor fusion
        const fusedDetection = await this.fusionEngine.fuseDetections(
          thermalDetection,
          acousticDetection,
          this.getEnvironmentalData()
        );
        
        if (fusedDetection && fusedDetection.confidence > this.config.thermalCamera.detectionThreshold) {
          await this.handleFireDetection(fusedDetection);
        }
        
        // Wait before next detection cycle
        await new Promise(resolve => setTimeout(resolve, 1000 / this.config.thermalCamera.fps));
      } catch (error) {
        console.error('Error in detection loop:', error);
        this.emit('error', error);
      }
    }
  }

  private async handleFireDetection(detection: FireDetectionResult): Promise<void> {
    try {
      // Add to detection history
      this.detectionHistory.push(detection);
      
      // Keep only last 1000 detections
      if (this.detectionHistory.length > 1000) {
        this.detectionHistory = this.detectionHistory.slice(-1000);
      }
      
      // Create Summit.OS detection
      const summitDetection: Omit<FireDetection, 'id'> = {
        deviceId: this.config.towerId,
        timestamp: detection.timestamp,
        type: detection.type,
        confidence: detection.confidence,
        position: detection.position,
        bearing: detection.bearing,
        mediaRef: `tower_${this.config.towerId}_${Date.now()}`,
        source: 'edge'
      };
      
      if (this.offlineMode) {
        // Store for later sync
        this.offlineData.push(detection);
        this.emit('offlineDetection', detection);
      } else {
        // Report to Summit.OS immediately
        await this.summitClient.reportFireDetection(summitDetection);
        this.emit('fireDetection', detection);
      }
      
      console.log(`Fire detection reported: ${detection.type} with confidence ${detection.confidence}`);
    } catch (error) {
      console.error('Failed to handle fire detection:', error);
      this.emit('error', error);
    }
  }

  private getEnvironmentalData(): {
    windSpeed: number;
    windDirection: number;
    humidity: number;
    temperature: number;
  } {
    // This would get real environmental data
    // For now, return mock data
    return {
      windSpeed: 10.0,
      windDirection: 270.0,
      humidity: 45.0,
      temperature: 25.0
    };
  }

  private setupEventHandlers(): void {
    // Handle Summit.OS events
    this.summitClient.on('connected', () => {
      this.emit('summitConnected');
    });

    this.summitClient.on('disconnected', () => {
      this.emit('summitDisconnected');
    });

    this.summitClient.on('error', (error) => {
      this.emit('summitError', error);
    });
  }
}

/**
 * Thermal Camera Processor
 */
class ThermalCameraProcessor {
  private config: ThermalCameraConfig;
  private isInitialized: boolean = false;
  private status: string = 'stopped';

  constructor(config: ThermalCameraConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize thermal camera (FLIR SDK integration would go here)
      console.log('Initializing thermal camera...');
      this.isInitialized = true;
      this.status = 'ready';
    } catch (error) {
      console.error('Failed to initialize thermal camera:', error);
      this.status = 'error';
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.status = 'stopped';
  }

  async processFrame(): Promise<FireDetectionResult | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      // Simulate thermal camera processing
      // In production, this would use FLIR SDK to capture and process thermal images
      const temperature = Math.random() * 100 + 20; // Mock temperature
      const confidence = Math.random();
      
      if (confidence > this.config.detectionThreshold) {
        return {
          type: 'heat',
          confidence,
          temperature,
          timestamp: new Date().toISOString(),
          source: 'thermal'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error processing thermal frame:', error);
      return null;
    }
  }

  getStatus(): string {
    return this.status;
  }
}

/**
 * Acoustic Array Processor
 */
class AcousticArrayProcessor {
  private config: AcousticArrayConfig;
  private isInitialized: boolean = false;
  private status: string = 'stopped';

  constructor(config: AcousticArrayConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize acoustic array
      console.log('Initializing acoustic array...');
      this.isInitialized = true;
      this.status = 'ready';
    } catch (error) {
      console.error('Failed to initialize acoustic array:', error);
      this.status = 'error';
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.status = 'stopped';
  }

  async processAudio(): Promise<FireDetectionResult | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      // Simulate acoustic processing
      // In production, this would analyze audio for fire signatures
      const confidence = Math.random();
      
      if (confidence > this.config.detectionThreshold) {
        return {
          type: 'smoke',
          confidence,
          acousticSignature: {
            frequency: 1000 + Math.random() * 500,
            amplitude: Math.random() * 100,
            duration: Math.random() * 5
          },
          timestamp: new Date().toISOString(),
          source: 'acoustic'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error processing acoustic data:', error);
      return null;
    }
  }

  getStatus(): string {
    return this.status;
  }
}

/**
 * Multi-Sensor Fusion Engine
 */
class MultiSensorFusion {
  async fuseDetections(
    thermalDetection: FireDetectionResult | null,
    acousticDetection: FireDetectionResult | null,
    environmentalData: {
      windSpeed: number;
      windDirection: number;
      humidity: number;
      temperature: number;
    }
  ): Promise<FireDetectionResult | null> {
    try {
      // If no detections, return null
      if (!thermalDetection && !acousticDetection) {
        return null;
      }

      // If only one detection, return it
      if (!thermalDetection) {
        return acousticDetection;
      }
      if (!acousticDetection) {
        return thermalDetection;
      }

      // Fuse multiple detections
      const fusedConfidence = this.calculateFusedConfidence(
        thermalDetection.confidence,
        acousticDetection.confidence,
        environmentalData
      );

      // Apply false positive filter
      const filteredConfidence = this.applyFalsePositiveFilter(
        fusedConfidence,
        environmentalData
      );

      if (filteredConfidence > 0.5) {
        return {
          type: 'smoke', // Default to smoke for fused detection
          confidence: filteredConfidence,
          position: thermalDetection.position,
          bearing: thermalDetection.bearing,
          timestamp: new Date().toISOString(),
          source: 'fusion'
        };
      }

      return null;
    } catch (error) {
      console.error('Error fusing detections:', error);
      return null;
    }
  }

  private calculateFusedConfidence(
    thermalConfidence: number,
    acousticConfidence: number,
    environmentalData: any
  ): number {
    // Weighted average with environmental adjustments
    const thermalWeight = 0.6;
    const acousticWeight = 0.4;
    
    const baseConfidence = (thermalConfidence * thermalWeight) + (acousticConfidence * acousticWeight);
    
    // Adjust for environmental conditions
    let environmentalFactor = 1.0;
    
    // High wind reduces acoustic confidence
    if (environmentalData.windSpeed > 15) {
      environmentalFactor *= 0.8;
    }
    
    // High humidity increases fire detection confidence
    if (environmentalData.humidity < 30) {
      environmentalFactor *= 1.2;
    }
    
    return Math.min(1.0, baseConfidence * environmentalFactor);
  }

  private applyFalsePositiveFilter(
    confidence: number,
    environmentalData: any
  ): number {
    // Reduce confidence for conditions that might cause false positives
    let filterFactor = 1.0;
    
    // High wind can cause false positives
    if (environmentalData.windSpeed > 20) {
      filterFactor *= 0.9;
    }
    
    // Very low humidity might indicate sensor issues
    if (environmentalData.humidity < 10) {
      filterFactor *= 0.8;
    }
    
    return confidence * filterFactor;
  }
}
