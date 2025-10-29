/**
 * Summit.OS Client for FireLine Application
 * Provides integration with Summit.OS core services for drone/bot management
 */

import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface SummitConfig {
  apiUrl: string;
  apiKey: string;
  videoStreaming: boolean;
  offlineMode: boolean;
  reconnectInterval?: number;
}

export interface DroneStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'mission' | 'emergency';
  battery: number;
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  heading: number;
  speed: number;
  lastSeen: string;
}

export interface BotStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'mission' | 'emergency';
  battery: number;
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  heading: number;
  speed: number;
  lastSeen: string;
  missionProgress: number;
}

export interface Mission {
  id: string;
  type: 'SURVEY_SMOKE' | 'BUILD_LINE' | 'CLEAR_VEGETATION' | 'FIRE_SUPPRESSION' | 'EMERGENCY_RESPONSE';
  priority: number;
  waypoints: Array<{
    latitude: number;
    longitude: number;
    altitude: number;
  }>;
  parameters: Record<string, any>;
  assignedTo: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface VideoStream {
  deviceId: string;
  streamUrl: string;
  type: 'thermal' | 'visual' | 'multispectral';
  resolution: string;
  fps: number;
  status: 'active' | 'inactive' | 'error';
}

export interface FireDetection {
  id: string;
  deviceId: string;
  timestamp: string;
  type: 'smoke' | 'flame' | 'heat';
  confidence: number;
  position?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  bearing?: number;
  mediaRef: string;
  source: 'edge' | 'cloud';
}

export class SummitClient extends EventEmitter {
  private config: SummitConfig;
  private httpClient: AxiosInstance;
  private wsConnection?: WebSocket;
  private isConnected: boolean = false;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config: SummitConfig) {
    super();
    this.config = config;
    
    this.httpClient = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    this.setupHttpInterceptors();

    // Apply defaults
    if (!this.config.reconnectInterval || this.config.reconnectInterval <= 0) {
      this.config.reconnectInterval = 5000;
    }
  }

  /**
   * Connect to Summit.OS platform
   */
  async connect(): Promise<void> {
    try {
      // Test API connection
      await this.httpClient.get('/api/v1/health');
      
      // Setup WebSocket connection for real-time updates
      if (this.config.videoStreaming) {
        await this.connectWebSocket();
      }
      
      this.isConnected = true;
      this.emit('connected');
      
      console.log('Connected to Summit.OS platform');
    } catch (error) {
      console.error('Failed to connect to Summit.OS:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from Summit.OS platform
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = undefined;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    this.emit('disconnected');
    console.log('Disconnected from Summit.OS platform');
  }

  /**
   * Get all drones
   */
  async getDrones(): Promise<DroneStatus[]> {
    const response = await this.httpClient.get('/api/v1/drones');
    return response.data;
  }

  /**
   * Get specific drone
   */
  async getDrone(droneId: string): Promise<DroneStatus> {
    const response = await this.httpClient.get(`/api/v1/drones/${droneId}`);
    return response.data;
  }

  /**
   * Get all FireLine bots
   */
  async getBots(): Promise<BotStatus[]> {
    const response = await this.httpClient.get('/api/v1/bots');
    return response.data;
  }

  /**
   * Get specific FireLine bot
   */
  async getBot(botId: string): Promise<BotStatus> {
    const response = await this.httpClient.get(`/api/v1/bots/${botId}`);
    return response.data;
  }

  /**
   * Create a new mission
   */
  async createMission(mission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Mission> {
    const response = await this.httpClient.post('/api/v1/missions', mission);
    return response.data;
  }

  /**
   * Get all missions
   */
  async getMissions(): Promise<Mission[]> {
    const response = await this.httpClient.get('/api/v1/missions');
    return response.data;
  }

  /**
   * Update mission status
   */
  async updateMission(missionId: string, updates: Partial<Mission>): Promise<Mission> {
    const response = await this.httpClient.patch(`/api/v1/missions/${missionId}`, updates);
    return response.data;
  }

  /**
   * Assign mission to drone/bot
   */
  async assignMission(missionId: string, deviceId: string, deviceType: 'drone' | 'bot'): Promise<void> {
    await this.httpClient.post(`/api/v1/missions/${missionId}/assign`, {
      deviceId,
      deviceType
    });
  }

  /**
   * Get video streams
   */
  async getVideoStreams(): Promise<VideoStream[]> {
    const response = await this.httpClient.get('/api/v1/video/streams');
    return response.data;
  }

  /**
   * Start video stream
   */
  async startVideoStream(deviceId: string, streamType: 'thermal' | 'visual' | 'multispectral'): Promise<VideoStream> {
    const response = await this.httpClient.post('/api/v1/video/streams', {
      deviceId,
      type: streamType
    });
    return response.data;
  }

  /**
   * Stop video stream
   */
  async stopVideoStream(streamId: string): Promise<void> {
    await this.httpClient.delete(`/api/v1/video/streams/${streamId}`);
  }

  /**
   * Get fire detections
   */
  async getFireDetections(filters?: {
    deviceId?: string;
    type?: string;
    confidenceMin?: number;
    startTime?: string;
    endTime?: string;
  }): Promise<FireDetection[]> {
    const response = await this.httpClient.get('/api/v1/fire/detections', { params: filters });
    return response.data;
  }

  /**
   * Report fire detection
   */
  async reportFireDetection(detection: Omit<FireDetection, 'id'>): Promise<FireDetection> {
    const response = await this.httpClient.post('/api/v1/fire/detections', detection);
    return response.data;
  }

  /**
   * Get offline status for device
   */
  async getOfflineStatus(deviceId: string): Promise<{
    isOffline: boolean;
    lastSync: string;
    pendingData: number;
  }> {
    const response = await this.httpClient.get(`/api/v1/offline/status/${deviceId}`);
    return response.data;
  }

  /**
   * Sync offline data
   */
  async syncOfflineData(deviceId: string, data: any[]): Promise<void> {
    await this.httpClient.post(`/api/v1/offline/sync/${deviceId}`, { data });
  }

  /**
   * Emergency procedures
   */
  async emergencyLand(droneId: string): Promise<void> {
    await this.httpClient.post(`/api/v1/drones/${droneId}/emergency/land`);
  }

  async emergencyReturnToBase(botId: string): Promise<void> {
    await this.httpClient.post(`/api/v1/bots/${botId}/emergency/return`);
  }

  async emergencyStop(deviceId: string, deviceType: 'drone' | 'bot'): Promise<void> {
    await this.httpClient.post(`/api/v1/${deviceType}s/${deviceId}/emergency/stop`);
  }

  private setupHttpInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        console.log(`Making request to ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          this.emit('unauthorized');
        } else if (error.response?.status >= 500) {
          this.emit('serverError', error);
        }
        return Promise.reject(error);
      }
    );
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.apiUrl.replace('http', 'ws') + '/ws';
      this.wsConnection = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      this.wsConnection.on('open', () => {
        console.log('WebSocket connected to Summit.OS');
        resolve();
      });

      this.wsConnection.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.wsConnection.on('close', () => {
        console.log('WebSocket disconnected from Summit.OS');
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.wsConnection.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
    });
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'telemetry':
        this.emit('telemetry', message.data);
        break;
      case 'detection':
        this.emit('detection', message.data);
        break;
      case 'alert':
        this.emit('alert', message.data);
        break;
      case 'mission_update':
        this.emit('missionUpdate', message.data);
        break;
      case 'video_stream':
        this.emit('videoStream', message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      if (!this.isConnected) {
        try {
          await this.connect();
        } catch (error) {
          console.error('Reconnection failed:', error);
          this.scheduleReconnect();
        }
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Check if client is connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}
