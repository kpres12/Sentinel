/**
 * Safety Monitor for FireLine Bot Controller
 * Monitors bot safety conditions and triggers emergency procedures
 */

import { Logger } from './Logger';

export interface BotConfig {
  botId: string;
  botName: string;
  maxSpeed: number;
  maxSlope: number;
  clearingWidth: number;
  waterCapacity: number;
  fuelCapacity: number;
  operatingTime: number;
  safetyEnabled: boolean;
  emergencyStopEnabled: boolean;
}

export interface SafetyStatus {
  botId: string;
  isSafe: boolean;
  warnings: string[];
  criticalAlerts: string[];
  lastCheck: string;
}

export class SafetyMonitor {
  private config: BotConfig;
  private logger: Logger;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private safetyStatus: SafetyStatus;

  constructor(config: BotConfig) {
    this.config = config;
    this.logger = new Logger('SafetyMonitor');
    this.safetyStatus = {
      botId: config.botId,
      isSafe: true,
      warnings: [],
      criticalAlerts: [],
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Start safety monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.logger.info('Starting safety monitoring');
    this.isMonitoring = true;

    // Check safety conditions every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkSafetyConditions();
    }, 5000);
  }

  /**
   * Stop safety monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.info('Stopping safety monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Handle emergency stop
   */
  handleEmergencyStop(botId: string): void {
    this.logger.warn(`Emergency stop triggered for bot ${botId}`);
    
    // Update safety status
    this.safetyStatus.isSafe = false;
    this.safetyStatus.criticalAlerts.push('Emergency stop triggered');
    this.safetyStatus.lastCheck = new Date().toISOString();
  }

  /**
   * Handle emergency return to base
   */
  handleEmergencyReturnToBase(botId: string): void {
    this.logger.warn(`Emergency return to base triggered for bot ${botId}`);
    
    // Update safety status
    this.safetyStatus.isSafe = false;
    this.safetyStatus.criticalAlerts.push('Emergency return to base triggered');
    this.safetyStatus.lastCheck = new Date().toISOString();
  }

  /**
   * Get current safety status
   */
  getSafetyStatus(): SafetyStatus {
    return { ...this.safetyStatus };
  }

  /**
   * Check safety conditions
   */
  private checkSafetyConditions(): void {
    try {
      const warnings: string[] = [];
      const criticalAlerts: string[] = [];

      // Check battery level
      const batteryLevel = this.getBatteryLevel();
      if (batteryLevel < 20) {
        criticalAlerts.push('Critical battery level');
      } else if (batteryLevel < 30) {
        warnings.push('Low battery level');
      }

      // Check fuel level
      const fuelLevel = this.getFuelLevel();
      if (fuelLevel < 10) {
        criticalAlerts.push('Critical fuel level');
      } else if (fuelLevel < 20) {
        warnings.push('Low fuel level');
      }

      // Check water level (for fire suppression)
      const waterLevel = this.getWaterLevel();
      if (waterLevel < 10) {
        warnings.push('Low water level');
      }

      // Check temperature
      const temperature = this.getTemperature();
      if (temperature > 80) {
        criticalAlerts.push('High temperature detected');
      } else if (temperature > 60) {
        warnings.push('Elevated temperature');
      }

      // Check for obstacles
      const obstacles = this.detectObstacles();
      if (obstacles.length > 0) {
        warnings.push(`Obstacles detected: ${obstacles.join(', ')}`);
      }

      // Check for fire proximity
      const fireProximity = this.checkFireProximity();
      if (fireProximity < 50) {
        criticalAlerts.push('Too close to fire');
      } else if (fireProximity < 100) {
        warnings.push('Close to fire');
      }

      // Update safety status
      this.safetyStatus.warnings = warnings;
      this.safetyStatus.criticalAlerts = criticalAlerts;
      this.safetyStatus.isSafe = criticalAlerts.length === 0;
      this.safetyStatus.lastCheck = new Date().toISOString();

      // Log warnings and alerts
      if (warnings.length > 0) {
        this.logger.warn(`Safety warnings: ${warnings.join(', ')}`);
      }

      if (criticalAlerts.length > 0) {
        this.logger.error(`Critical safety alerts: ${criticalAlerts.join(', ')}`);
      }

    } catch (error) {
      this.logger.error('Error checking safety conditions:', error);
    }
  }

  /**
   * Get battery level (simulated)
   */
  private getBatteryLevel(): number {
    // Simulate battery level decreasing over time
    return Math.max(0, 100 - (Date.now() / 1000 / 60 / 60) * 5); // 5% per hour
  }

  /**
   * Get fuel level (simulated)
   */
  private getFuelLevel(): number {
    // Simulate fuel level decreasing over time
    return Math.max(0, 100 - (Date.now() / 1000 / 60 / 60) * 3); // 3% per hour
  }

  /**
   * Get water level (simulated)
   */
  private getWaterLevel(): number {
    // Simulate water level decreasing over time
    return Math.max(0, 100 - (Date.now() / 1000 / 60 / 60) * 2); // 2% per hour
  }

  /**
   * Get temperature (simulated)
   */
  private getTemperature(): number {
    // Simulate temperature with some variation
    return 25 + Math.random() * 20; // 25-45°C
  }

  /**
   * Detect obstacles (simulated)
   */
  private detectObstacles(): string[] {
    const obstacles: string[] = [];
    
    // Simulate obstacle detection
    if (Math.random() < 0.1) {
      obstacles.push('Rock');
    }
    if (Math.random() < 0.05) {
      obstacles.push('Tree');
    }
    if (Math.random() < 0.02) {
      obstacles.push('Cliff');
    }
    
    return obstacles;
  }

  /**
   * Check fire proximity (simulated)
   */
  private checkFireProximity(): number {
    // Simulate fire proximity detection
    return Math.random() * 200; // 0-200 meters
  }
}
