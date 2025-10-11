/**
 * Sentry Tower Edge Agent for FireLine Application
 * Main entry point for sentry tower operations
 */

import { SentryTowerAgent, TowerConfig, ThermalCameraConfig, AcousticArrayConfig } from '@bigmt/summit-integration';
import { Logger } from './Logger';
import { Config } from './Config';

const logger = new Logger('SentryTower');
const config = new Config();

async function main() {
  try {
    logger.info('Starting FireWatch Edge Agent...');
    
    // Load configuration
    const towerConfig: TowerConfig = {
      towerId: config.get('TOWER_ID', 'tower-001'),
      name: config.get('TOWER_NAME', 'FireWatch Alpha'),
      position: {
        latitude: parseFloat(config.get('TOWER_LATITUDE', '40.0')),
        longitude: parseFloat(config.get('TOWER_LONGITUDE', '-120.0')),
        altitude: parseFloat(config.get('TOWER_ALTITUDE', '1000.0'))
      },
      thermalCamera: {
        model: config.get('THERMAL_CAMERA_MODEL', 'FLIR_A35'),
        resolution: config.get('THERMAL_CAMERA_RESOLUTION', '640x512'),
        fps: parseInt(config.get('THERMAL_CAMERA_FPS', '30')),
        temperatureRange: {
          min: parseFloat(config.get('THERMAL_TEMP_MIN', '-20')),
          max: parseFloat(config.get('THERMAL_TEMP_MAX', '120'))
        },
        detectionThreshold: parseFloat(config.get('THERMAL_DETECTION_THRESHOLD', '0.7')),
        calibrationData: {}
      },
      acousticArray: {
        enabled: config.get('ACOUSTIC_ARRAY_ENABLED', 'true') === 'true',
        microphones: parseInt(config.get('ACOUSTIC_MICROPHONES', '4')),
        sampleRate: parseInt(config.get('ACOUSTIC_SAMPLE_RATE', '44100')),
        frequencyRange: {
          min: parseFloat(config.get('ACOUSTIC_FREQ_MIN', '100')),
          max: parseFloat(config.get('ACOUSTIC_FREQ_MAX', '20000'))
        },
        detectionThreshold: parseFloat(config.get('ACOUSTIC_DETECTION_THRESHOLD', '0.6')),
        windCompensation: config.get('ACOUSTIC_WIND_COMPENSATION', 'true') === 'true'
      },
      summitIntegration: {
        apiUrl: config.get('SUMMIT_API_URL', 'https://api.summit-os.bigmt.ai'),
        apiKey: config.get('SUMMIT_API_KEY', ''),
        videoStreaming: config.get('SUMMIT_VIDEO_STREAMING', 'true') === 'true',
        offlineMode: config.get('SUMMIT_OFFLINE_MODE', 'false') === 'true'
      }
    };

    // Create and start sentry tower agent
    const sentryTower = new SentryTowerAgent(towerConfig);
    
    // Setup event handlers
    sentryTower.on('started', () => {
      logger.info('FireWatch Agent started successfully');
    });

    sentryTower.on('stopped', () => {
      logger.info('FireWatch Agent stopped');
    });

    sentryTower.on('fireDetection', (detection) => {
      logger.info(`Fire detection: ${detection.type} with confidence ${detection.confidence}`);
    });

    sentryTower.on('offlineDetection', (detection) => {
      logger.info(`Offline fire detection: ${detection.type} with confidence ${detection.confidence}`);
    });

    sentryTower.on('error', (error) => {
      logger.error('FireWatch Agent error:', error);
    });

    // Start the agent
    await sentryTower.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      await sentryTower.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      await sentryTower.stop();
      process.exit(0);
    });

    // Keep the process running
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start FireWatch Edge Agent:', error);
    process.exit(1);
  }
}

main();
