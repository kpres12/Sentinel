/**
 * Configuration for Sentry Tower Edge Agent
 */

export class Config {
  private config: Map<string, string> = new Map();

  constructor() {
    this.loadFromEnvironment();
  }

  private loadFromEnvironment(): void {
    // Load from environment variables
    const envVars = [
      'TOWER_ID',
      'TOWER_NAME',
      'TOWER_LATITUDE',
      'TOWER_LONGITUDE',
      'TOWER_ALTITUDE',
      'THERMAL_CAMERA_MODEL',
      'THERMAL_CAMERA_RESOLUTION',
      'THERMAL_CAMERA_FPS',
      'THERMAL_TEMP_MIN',
      'THERMAL_TEMP_MAX',
      'THERMAL_DETECTION_THRESHOLD',
      'ACOUSTIC_ARRAY_ENABLED',
      'ACOUSTIC_MICROPHONES',
      'ACOUSTIC_SAMPLE_RATE',
      'ACOUSTIC_FREQ_MIN',
      'ACOUSTIC_FREQ_MAX',
      'ACOUSTIC_DETECTION_THRESHOLD',
      'ACOUSTIC_WIND_COMPENSATION',
      'SUMMIT_API_URL',
      'SUMMIT_API_KEY',
      'SUMMIT_VIDEO_STREAMING',
      'SUMMIT_OFFLINE_MODE',
      'LOG_LEVEL'
    ];

    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.config.set(envVar, value);
      }
    }
  }

  get(key: string, defaultValue?: string): string {
    return this.config.get(key) || defaultValue || '';
  }

  getNumber(key: string, defaultValue: number): number {
    const value = this.config.get(key);
    if (value === undefined) {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.config.get(key);
    if (value === undefined) {
      return defaultValue;
    }
    return value.toLowerCase() === 'true';
  }

  set(key: string, value: string): void {
    this.config.set(key, value);
  }

  has(key: string): boolean {
    return this.config.has(key);
  }
}
