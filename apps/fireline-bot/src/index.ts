/**
 * KOFA Bot Controller for FireLine Application
 * Main entry point for KOFA bot operations
 */

import { FireLineBotController, BotMission, VegetationClearingParams, FireSuppressionParams, BuildLineParams } from '@bigmt/summit-integration';
import { Logger } from './Logger';
import { Config } from './Config';
import { BotMissionExecutor } from './BotMissionExecutor';
import { SafetyMonitor } from './SafetyMonitor';

const logger = new Logger('KOFA');
const config = new Config();

async function main() {
  try {
    logger.info('Starting KOFA Bot Controller...');
    
    // Load configuration
    const botConfig = {
      botId: config.get('BOT_ID', 'fireline-bot-001'),
      botName: config.get('BOT_NAME', 'KOFA Alpha'),
      summitApiUrl: config.get('SUMMIT_API_URL', 'https://api.summit-os.bigmt.ai'),
      summitApiKey: config.get('SUMMIT_API_KEY', ''),
      maxSpeed: config.getNumber('BOT_MAX_SPEED', 5.0),
      maxSlope: config.getNumber('BOT_MAX_SLOPE', 30.0),
      clearingWidth: config.getNumber('BOT_CLEARING_WIDTH', 3.0),
      waterCapacity: config.getNumber('BOT_WATER_CAPACITY', 500),
      fuelCapacity: config.getNumber('BOT_FUEL_CAPACITY', 50),
      operatingTime: config.getNumber('BOT_OPERATING_TIME', 8),
      safetyEnabled: config.getBoolean('BOT_SAFETY_ENABLED', true),
      emergencyStopEnabled: config.getBoolean('BOT_EMERGENCY_STOP_ENABLED', true)
    };

    // Create KOFA bot controller
    const botController = new FireLineBotController({
      apiUrl: botConfig.summitApiUrl,
      apiKey: botConfig.summitApiKey,
      videoStreaming: false,
      offlineMode: true,
      reconnectInterval: 5000
    });

    // Create mission executor
    const missionExecutor = new BotMissionExecutor(botController, botConfig);
    
    // Create safety monitor
    const safetyMonitor = new SafetyMonitor(botConfig);

    // Setup event handlers
    botController.on('missionCreated', (mission) => {
      logger.info(`Mission created: ${mission.id} (${mission.type})`);
    });

    botController.on('missionStarted', (mission) => {
      logger.info(`Mission started: ${mission.id}`);
      missionExecutor.executeMission(mission);
    });

    botController.on('missionCompleted', (mission) => {
      logger.info(`Mission completed: ${mission.id}`);
    });

    botController.on('missionFailed', (data) => {
      logger.error(`Mission failed: ${data.mission.id} - ${data.error}`);
    });

    botController.on('emergencyStop', (data) => {
      logger.warn(`Emergency stop triggered for bot: ${data.botId}`);
      safetyMonitor.handleEmergencyStop(data.botId);
    });

    botController.on('emergencyReturnToBase', (data) => {
      logger.warn(`Emergency return to base triggered for bot: ${data.botId}`);
      safetyMonitor.handleEmergencyReturnToBase(data.botId);
    });

    // Connect to Summit.OS
    await botController.connect();

    // Initialize bot capabilities
    await botController.initializeBotCapabilities(botConfig.botId);

    // Start safety monitoring
    if (botConfig.safetyEnabled) {
      safetyMonitor.start();
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      await botController.disconnect();
      safetyMonitor.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      await botController.disconnect();
      safetyMonitor.stop();
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

    logger.info('KOFA Bot Controller started successfully');

  } catch (error) {
    logger.error('Failed to start KOFA Bot Controller:', error);
    process.exit(1);
  }
}

main();
