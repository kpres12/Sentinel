/**
 * Summit.OS Integration for FireLine Application
 * Main entry point for Summit.OS integration layer
 */

export { SummitClient } from './SummitClient';
export { VideoStreamManager } from './VideoStreamManager';
export { FireLineBotController } from './FireLineBotController';
export { SentryTowerAgent } from './SentryTowerAgent';
export { OfflineManager } from './OfflineManager';

// Re-export types for convenience
export type {
  SummitConfig,
  DroneStatus,
  BotStatus,
  Mission,
  VideoStream,
  FireDetection
} from './SummitClient';

export type {
  StreamConfig,
  StreamStats
} from './VideoStreamManager';

export type {
  BotMission,
  VegetationClearingParams,
  FireSuppressionParams,
  BuildLineParams,
  BotCapabilities,
  TerrainAnalysis
} from './FireLineBotController';

export type {
  TowerConfig,
  ThermalCameraConfig,
  AcousticArrayConfig,
  FireDetectionResult,
  MultiSensorFusion
} from './SentryTowerAgent';

export type {
  OfflineConfig,
  OfflineData,
  OfflineStatus
} from './OfflineManager';
