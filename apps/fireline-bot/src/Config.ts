/**
 * Configuration for FireLine Bot Controller
 */

export class Config {
  private config: Map<string, string> = new Map();

  constructor() {
    this.loadFromEnvironment();
  }

  private loadFromEnvironment(): void {
    // Load from environment variables
    const envVars = [
      'BOT_ID',
      'BOT_NAME',
      'SUMMIT_API_URL',
      'SUMMIT_API_KEY',
      'BOT_MAX_SPEED',
      'BOT_MAX_SLOPE',
      'BOT_CLEARING_WIDTH',
      'BOT_WATER_CAPACITY',
      'BOT_FUEL_CAPACITY',
      'BOT_OPERATING_TIME',
      'BOT_SAFETY_ENABLED',
      'BOT_EMERGENCY_STOP_ENABLED',
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
