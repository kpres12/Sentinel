/**
 * Telemetry data generator for edge agent.
 */

import { Logger } from './Logger'
import { Config } from './Config'

export interface TelemetryData {
  device_id: string
  timestamp: string
  latitude: number
  longitude: number
  altitude: number
  yaw: number
  pitch: number
  roll: number
  speed: number
  battery_level: number
  sensors: SensorReading[]
  status: string
  comms_rssi: number
  temperature: number
}

export interface SensorReading {
  name: string
  unit: string
  value: number
  timestamp: string
}

export class TelemetryGenerator {
  private logger: Logger
  private config: Config
  private currentPosition: { lat: number; lon: number }
  private currentHeading: number
  private currentSpeed: number
  private batteryLevel: number
  private missionStartTime: number

  constructor(config: Config) {
    this.config = config
    this.logger = new Logger('TelemetryGenerator')
    
    // Initialize starting position and state
    this.currentPosition = {
      lat: config.initialLatitude,
      lon: config.initialLongitude
    }
    this.currentHeading = config.initialHeading
    this.currentSpeed = 0
    this.batteryLevel = 100
    this.missionStartTime = Date.now()
  }

  generate(): TelemetryData {
    // Update position based on current speed and heading
    this.updatePosition()
    
    // Update battery level (slowly drain over time)
    this.updateBatteryLevel()
    
    // Generate sensor readings
    const sensors = this.generateSensorReadings()
    
    // Determine device status
    const status = this.determineStatus()
    
    const telemetry: TelemetryData = {
      device_id: this.config.deviceId,
      timestamp: new Date().toISOString(),
      latitude: this.currentPosition.lat,
      longitude: this.currentPosition.lon,
      altitude: this.config.initialAltitude + this.getRandomVariation(10),
      yaw: this.currentHeading,
      pitch: this.getRandomVariation(5),
      roll: this.getRandomVariation(5),
      speed: this.currentSpeed,
      battery_level: this.batteryLevel,
      sensors: sensors,
      status: status,
      comms_rssi: this.generateRSSI(),
      temperature: this.generateTemperature()
    }

    return telemetry
  }

  private updatePosition(): void {
    // Simple movement simulation
    const timeElapsed = (Date.now() - this.missionStartTime) / 1000 // seconds
    const movementPattern = this.getMovementPattern(timeElapsed)
    
    this.currentSpeed = movementPattern.speed
    this.currentHeading = movementPattern.heading
    
    // Update position based on speed and heading
    if (this.currentSpeed > 0) {
      const distance = (this.currentSpeed * 1000) / 3600 // Convert km/h to m/s
      const latOffset = (distance * Math.cos(this.currentHeading * Math.PI / 180)) / 111320 // Rough conversion to degrees
      const lonOffset = (distance * Math.sin(this.currentHeading * Math.PI / 180)) / (111320 * Math.cos(this.currentPosition.lat * Math.PI / 180))
      
      this.currentPosition.lat += latOffset
      this.currentPosition.lon += lonOffset
    }
  }

  private getMovementPattern(timeElapsed: number): { speed: number; heading: number } {
    // Simulate different movement patterns based on time
    const pattern = Math.floor(timeElapsed / 60) % 4 // Change pattern every minute
    
    switch (pattern) {
      case 0: // Stationary
        return { speed: 0, heading: this.currentHeading }
      
      case 1: // Slow patrol
        return { 
          speed: 5 + this.getRandomVariation(2), 
          heading: this.currentHeading + this.getRandomVariation(10)
        }
      
      case 2: // Fast patrol
        return { 
          speed: 15 + this.getRandomVariation(5), 
          heading: this.currentHeading + this.getRandomVariation(20)
        }
      
      case 3: // Return to base
        const baseHeading = this.calculateBearingToBase()
        return { 
          speed: 10 + this.getRandomVariation(3), 
          heading: baseHeading + this.getRandomVariation(5)
        }
      
      default:
        return { speed: 0, heading: this.currentHeading }
    }
  }

  private calculateBearingToBase(): number {
    const baseLat = this.config.initialLatitude
    const baseLon = this.config.initialLongitude
    
    const lat1 = this.currentPosition.lat * Math.PI / 180
    const lat2 = baseLat * Math.PI / 180
    const deltaLon = (baseLon - this.currentPosition.lon) * Math.PI / 180
    
    const y = Math.sin(deltaLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI
    if (bearing < 0) bearing += 360
    
    return bearing
  }

  private updateBatteryLevel(): void {
    // Simulate battery drain based on usage
    const timeElapsed = (Date.now() - this.missionStartTime) / 1000 / 3600 // hours
    const baseDrain = 0.5 // % per hour
    const usageDrain = this.currentSpeed * 0.1 // Additional drain based on speed
    
    this.batteryLevel = Math.max(0, 100 - (baseDrain + usageDrain) * timeElapsed)
  }

  private generateSensorReadings(): SensorReading[] {
    const now = new Date().toISOString()
    
    return [
      {
        name: 'temperature',
        unit: 'celsius',
        value: this.generateTemperature(),
        timestamp: now
      },
      {
        name: 'humidity',
        unit: 'percent',
        value: 30 + this.getRandomVariation(20),
        timestamp: now
      },
      {
        name: 'pressure',
        unit: 'hPa',
        value: 1013 + this.getRandomVariation(10),
        timestamp: now
      },
      {
        name: 'wind_speed',
        unit: 'm/s',
        value: Math.abs(this.getRandomVariation(5)),
        timestamp: now
      },
      {
        name: 'wind_direction',
        unit: 'degrees',
        value: this.getRandomVariation(180) + 180,
        timestamp: now
      },
      {
        name: 'air_quality',
        unit: 'AQI',
        value: 50 + this.getRandomVariation(30),
        timestamp: now
      }
    ]
  }

  private generateTemperature(): number {
    // Simulate temperature based on time of day and altitude
    const hour = new Date().getHours()
    const baseTemp = 20 + Math.sin((hour - 6) * Math.PI / 12) * 10 // Daily variation
    const altitudeEffect = (this.config.initialAltitude - 1000) * -0.0065 // Lapse rate
    const variation = this.getRandomVariation(2)
    
    return baseTemp + altitudeEffect + variation
  }

  private generateRSSI(): number {
    // Simulate RSSI based on distance from base and other factors
    const distance = this.calculateDistanceToBase()
    const baseRSSI = -50 // Good signal at close range
    const distanceLoss = distance * 0.1 // Signal loss with distance
    const variation = this.getRandomVariation(5)
    
    return Math.max(-100, baseRSSI - distanceLoss + variation)
  }

  private calculateDistanceToBase(): number {
    const baseLat = this.config.initialLatitude
    const baseLon = this.config.initialLongitude
    
    const R = 6371000 // Earth's radius in meters
    const lat1 = this.currentPosition.lat * Math.PI / 180
    const lat2 = baseLat * Math.PI / 180
    const deltaLat = (baseLat - this.currentPosition.lat) * Math.PI / 180
    const deltaLon = (baseLon - this.currentPosition.lon) * Math.PI / 180
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return R * c / 1000 // Convert to kilometers
  }

  private determineStatus(): string {
    if (this.batteryLevel < 10) {
      return 'low_battery'
    } else if (this.batteryLevel < 5) {
      return 'critical_battery'
    } else if (this.calculateDistanceToBase() > 50) {
      return 'out_of_range'
    } else if (this.currentSpeed > 20) {
      return 'high_speed'
    } else if (this.currentSpeed === 0) {
      return 'stationary'
    } else {
      return 'patrolling'
    }
  }

  private getRandomVariation(maxVariation: number): number {
    return (Math.random() - 0.5) * 2 * maxVariation
  }
}
