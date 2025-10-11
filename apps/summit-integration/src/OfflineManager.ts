/**
 * Offline Manager for FireLine Application
 * Handles offline operation mode for edge devices when network is unavailable
 */

import { EventEmitter } from 'events';
import { SummitClient } from './SummitClient';
import * as fs from 'fs';
import * as path from 'path';

export interface OfflineConfig {
  deviceId: string;
  storagePath: string;
  maxStorageSize: number; // MB
  syncInterval: number; // milliseconds
  maxRetries: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface OfflineData {
  id: string;
  type: 'telemetry' | 'detection' | 'video' | 'mission' | 'alert';
  timestamp: string;
  data: any;
  priority: number;
  size: number; // bytes
  compressed: boolean;
  encrypted: boolean;
}

export interface OfflineStatus {
  deviceId: string;
  isOffline: boolean;
  lastSync: string;
  pendingData: number;
  storageUsed: number; // MB
  storageAvailable: number; // MB
  oldestData: string;
  newestData: string;
}

export class OfflineManager extends EventEmitter {
  private config: OfflineConfig;
  private summitClient: SummitClient;
  private isOffline: boolean = false;
  private offlineData: OfflineData[] = [];
  private syncTimer?: NodeJS.Timeout;
  private storagePath: string;

  constructor(config: OfflineConfig, summitClient: SummitClient) {
    super();
    this.config = config;
    this.summitClient = summitClient;
    this.storagePath = path.join(config.storagePath, config.deviceId);
    
    this.initializeStorage();
    this.setupEventHandlers();
  }

  /**
   * Enable offline mode
   */
  async enableOfflineMode(): Promise<void> {
    try {
      this.isOffline = true;
      
      // Start periodic sync attempts
      this.startSyncTimer();
      
      this.emit('offlineModeEnabled', { deviceId: this.config.deviceId });
      console.log(`Offline mode enabled for device ${this.config.deviceId}`);
    } catch (error) {
      console.error(`Failed to enable offline mode:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disable offline mode and sync all data
   */
  async disableOfflineMode(): Promise<void> {
    try {
      this.isOffline = false;
      
      // Stop sync timer
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = undefined;
      }
      
      // Sync all pending data
      await this.syncAllData();
      
      this.emit('offlineModeDisabled', { deviceId: this.config.deviceId });
      console.log(`Offline mode disabled for device ${this.config.deviceId}`);
    } catch (error) {
      console.error(`Failed to disable offline mode:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Store data for offline sync
   */
  async storeOfflineData(data: any, type: OfflineData['type'], priority: number = 1): Promise<void> {
    try {
      const offlineData: OfflineData = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        timestamp: new Date().toISOString(),
        data,
        priority,
        size: JSON.stringify(data).length,
        compressed: false,
        encrypted: false
      };

      // Compress if enabled
      if (this.config.compressionEnabled) {
        offlineData.data = await this.compressData(data);
        offlineData.compressed = true;
        offlineData.size = JSON.stringify(offlineData.data).length;
      }

      // Encrypt if enabled
      if (this.config.encryptionEnabled) {
        offlineData.data = await this.encryptData(offlineData.data);
        offlineData.encrypted = true;
      }

      // Add to offline data array
      this.offlineData.push(offlineData);

      // Sort by priority and timestamp
      this.offlineData.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      // Check storage limits
      await this.checkStorageLimits();

      // Save to disk
      await this.saveOfflineData();

      this.emit('dataStored', { deviceId: this.config.deviceId, data: offlineData });
    } catch (error) {
      console.error(`Failed to store offline data:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Sync all offline data
   */
  async syncAllData(): Promise<void> {
    try {
      if (this.offlineData.length === 0) {
        return;
      }

      console.log(`Syncing ${this.offlineData.length} offline data items...`);

      const dataToSync = [...this.offlineData];
      const syncedData: OfflineData[] = [];
      const failedData: OfflineData[] = [];

      for (const data of dataToSync) {
        try {
          // Decrypt if needed
          let dataToSend = data.data;
          if (data.encrypted) {
            dataToSend = await this.decryptData(dataToSend);
          }

          // Decompress if needed
          if (data.compressed) {
            dataToSend = await this.decompressData(dataToSend);
          }

          // Send to Summit.OS
          await this.summitClient.syncOfflineData(this.config.deviceId, [dataToSend]);
          
          syncedData.push(data);
          console.log(`Synced data item ${data.id}`);
        } catch (error) {
          console.error(`Failed to sync data item ${data.id}:`, error);
          failedData.push(data);
        }
      }

      // Remove synced data from offline storage
      this.offlineData = failedData;
      await this.saveOfflineData();

      this.emit('dataSynced', { 
        deviceId: this.config.deviceId, 
        synced: syncedData.length, 
        failed: failedData.length 
      });

      console.log(`Sync completed: ${syncedData.length} synced, ${failedData.length} failed`);
    } catch (error) {
      console.error(`Failed to sync offline data:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get offline status
   */
  getOfflineStatus(): OfflineStatus {
    const storageUsed = this.calculateStorageUsed();
    const storageAvailable = this.config.maxStorageSize - storageUsed;
    
    return {
      deviceId: this.config.deviceId,
      isOffline: this.isOffline,
      lastSync: this.getLastSyncTime(),
      pendingData: this.offlineData.length,
      storageUsed,
      storageAvailable,
      oldestData: this.offlineData.length > 0 ? this.offlineData[0].timestamp : '',
      newestData: this.offlineData.length > 0 ? this.offlineData[this.offlineData.length - 1].timestamp : ''
    };
  }

  /**
   * Get pending offline data
   */
  getPendingData(): OfflineData[] {
    return [...this.offlineData];
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    try {
      this.offlineData = [];
      await this.saveOfflineData();
      
      this.emit('dataCleared', { deviceId: this.config.deviceId });
      console.log(`Cleared all offline data for device ${this.config.deviceId}`);
    } catch (error) {
      console.error(`Failed to clear offline data:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Create storage directory if it doesn't exist
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
      }

      // Load existing offline data
      await this.loadOfflineData();
    } catch (error) {
      console.error(`Failed to initialize storage:`, error);
      throw error;
    }
  }

  private async loadOfflineData(): Promise<void> {
    try {
      const dataFilePath = path.join(this.storagePath, 'offline_data.json');
      
      if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        this.offlineData = JSON.parse(data);
        console.log(`Loaded ${this.offlineData.length} offline data items`);
      }
    } catch (error) {
      console.error(`Failed to load offline data:`, error);
      // Don't throw error, just start with empty array
      this.offlineData = [];
    }
  }

  private async saveOfflineData(): Promise<void> {
    try {
      const dataFilePath = path.join(this.storagePath, 'offline_data.json');
      fs.writeFileSync(dataFilePath, JSON.stringify(this.offlineData, null, 2));
    } catch (error) {
      console.error(`Failed to save offline data:`, error);
      throw error;
    }
  }

  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (!this.isOffline) {
        return;
      }

      try {
        await this.syncAllData();
      } catch (error) {
        console.error(`Periodic sync failed:`, error);
        this.emit('syncError', error);
      }
    }, this.config.syncInterval);
  }

  private async checkStorageLimits(): Promise<void> {
    const storageUsed = this.calculateStorageUsed();
    
    if (storageUsed > this.config.maxStorageSize) {
      // Remove oldest data until under limit
      while (storageUsed > this.config.maxStorageSize && this.offlineData.length > 0) {
        this.offlineData.shift(); // Remove oldest data
      }
      
      await this.saveOfflineData();
      
      this.emit('storageLimitReached', { 
        deviceId: this.config.deviceId, 
        storageUsed, 
        maxStorage: this.config.maxStorageSize 
      });
    }
  }

  private calculateStorageUsed(): number {
    return this.offlineData.reduce((total, data) => total + data.size, 0) / (1024 * 1024); // Convert to MB
  }

  private getLastSyncTime(): string {
    // This would be stored in a separate file or database
    // For now, return current time
    return new Date().toISOString();
  }

  private async compressData(data: any): Promise<any> {
    // Simple compression using JSON stringify (in production, use proper compression)
    return JSON.stringify(data);
  }

  private async decompressData(compressedData: any): Promise<any> {
    // Simple decompression (in production, use proper decompression)
    return JSON.parse(compressedData);
  }

  private async encryptData(data: any): Promise<any> {
    // Simple encryption (in production, use proper encryption)
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private async decryptData(encryptedData: any): Promise<any> {
    // Simple decryption (in production, use proper decryption)
    return JSON.parse(Buffer.from(encryptedData, 'base64').toString());
  }

  private setupEventHandlers(): void {
    // Handle Summit.OS connection events
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

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }
}
