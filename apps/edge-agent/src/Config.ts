/**
 * Configuration for edge agent.
 */

export class Config {
  // Device configuration
  public readonly deviceId: string
  public readonly deviceType: string
  
  // MQTT configuration
  public readonly mqttBroker: string
  public readonly mqttPort: number
  public readonly mqttUsername?: string
  public readonly mqttPassword?: string
  public readonly mqttUseSSL: boolean
  
  // Initial position and orientation
  public readonly initialLatitude: number
  public readonly initialLongitude: number
  public readonly initialAltitude: number
  public readonly initialHeading: number
  
  // Detection configuration
  public readonly detectionEnabled: boolean
  public readonly detectionIntervalMs: number
  
  // Telemetry configuration
  public readonly telemetryIntervalMs: number
  
  // Mission configuration
  public readonly missionDurationHours: number
  public readonly patrolRadiusKm: number

  constructor() {
    // Device configuration
    this.deviceId = process.env.DEVICE_ID || 'edge-device-001'
    this.deviceType = process.env.DEVICE_TYPE || 'ugv'
    
    // MQTT configuration
    this.mqttBroker = process.env.MQTT_BROKER || 'localhost'
    this.mqttPort = parseInt(process.env.MQTT_PORT || '1883')
    this.mqttUsername = process.env.MQTT_USERNAME
    this.mqttPassword = process.env.MQTT_PASSWORD
    this.mqttUseSSL = process.env.MQTT_USE_SSL === 'true'
    
    // Initial position (default to a location in California)
    this.initialLatitude = parseFloat(process.env.INITIAL_LATITUDE || '40.0')
    this.initialLongitude = parseFloat(process.env.INITIAL_LONGITUDE || '-120.0')
    this.initialAltitude = parseFloat(process.env.INITIAL_ALTITUDE || '1000.0')
    this.initialHeading = parseFloat(process.env.INITIAL_HEADING || '0.0')
    
    // Detection configuration
    this.detectionEnabled = process.env.DETECTION_ENABLED !== 'false'
    this.detectionIntervalMs = parseInt(process.env.DETECTION_INTERVAL_MS || '30000')
    
    // Telemetry configuration
    this.telemetryIntervalMs = parseInt(process.env.TELEMETRY_INTERVAL_MS || '5000')
    
    // Mission configuration
    this.missionDurationHours = parseInt(process.env.MISSION_DURATION_HOURS || '8')
    this.patrolRadiusKm = parseFloat(process.env.PATROL_RADIUS_KM || '10.0')
  }

  validate(): void {
    const errors: string[] = []

    // Validate device ID
    if (!this.deviceId || this.deviceId.trim().length === 0) {
      errors.push('DEVICE_ID is required')
    }

    // Validate MQTT configuration
    if (!this.mqttBroker || this.mqttBroker.trim().length === 0) {
      errors.push('MQTT_BROKER is required')
    }

    if (this.mqttPort < 1 || this.mqttPort > 65535) {
      errors.push('MQTT_PORT must be between 1 and 65535')
    }

    // Validate coordinates
    if (this.initialLatitude < -90 || this.initialLatitude > 90) {
      errors.push('INITIAL_LATITUDE must be between -90 and 90')
    }

    if (this.initialLongitude < -180 || this.initialLongitude > 180) {
      errors.push('INITIAL_LONGITUDE must be between -180 and 180')
    }

    if (this.initialAltitude < 0) {
      errors.push('INITIAL_ALTITUDE must be non-negative')
    }

    if (this.initialHeading < 0 || this.initialHeading >= 360) {
      errors.push('INITIAL_HEADING must be between 0 and 360')
    }

    // Validate intervals
    if (this.detectionIntervalMs < 1000) {
      errors.push('DETECTION_INTERVAL_MS must be at least 1000ms')
    }

    if (this.telemetryIntervalMs < 1000) {
      errors.push('TELEMETRY_INTERVAL_MS must be at least 1000ms')
    }

    // Validate mission parameters
    if (this.missionDurationHours < 1) {
      errors.push('MISSION_DURATION_HOURS must be at least 1')
    }

    if (this.patrolRadiusKm <= 0) {
      errors.push('PATROL_RADIUS_KM must be positive')
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`)
    }
  }

  toJSON(): Record<string, any> {
    return {
      deviceId: this.deviceId,
      deviceType: this.deviceType,
      mqttBroker: this.mqttBroker,
      mqttPort: this.mqttPort,
      mqttUsername: this.mqttUsername,
      mqttUseSSL: this.mqttUseSSL,
      initialLatitude: this.initialLatitude,
      initialLongitude: this.initialLongitude,
      initialAltitude: this.initialAltitude,
      initialHeading: this.initialHeading,
      detectionEnabled: this.detectionEnabled,
      detectionIntervalMs: this.detectionIntervalMs,
      telemetryIntervalMs: this.telemetryIntervalMs,
      missionDurationHours: this.missionDurationHours,
      patrolRadiusKm: this.patrolRadiusKm
    }
  }
}
