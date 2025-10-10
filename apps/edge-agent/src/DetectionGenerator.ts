/**
 * Detection data generator for edge agent.
 */

import { Logger } from './Logger'
import { Config } from './Config'

export interface DetectionData {
  device_id: string
  timestamp: string
  type: 'smoke' | 'flame' | 'heat'
  latitude: number
  longitude: number
  bearing: number
  confidence: number
  media_ref: string
  source: string
  metadata: Record<string, any>
}

export class DetectionGenerator {
  private logger: Logger
  private config: Config
  private lastDetectionTime: number = 0
  private detectionProbability: number = 0.1 // 10% chance per generation cycle
  private detectionTypes: ('smoke' | 'flame' | 'heat')[] = ['smoke', 'flame', 'heat']
  private detectionTypeWeights: number[] = [0.7, 0.2, 0.1] // Smoke most common, heat least common

  constructor(config: Config) {
    this.config = config
    this.logger = new Logger('DetectionGenerator')
  }

  generate(): DetectionData | null {
    // Check if we should generate a detection
    if (!this.shouldGenerateDetection()) {
      return null
    }

    const detectionType = this.selectDetectionType()
    const confidence = this.generateConfidence(detectionType)
    
    // Only generate high-confidence detections
    if (confidence < 0.6) {
      return null
    }

    const detection: DetectionData = {
      device_id: this.config.deviceId,
      timestamp: new Date().toISOString(),
      type: detectionType,
      latitude: this.config.initialLatitude + this.getRandomVariation(0.01),
      longitude: this.config.initialLongitude + this.getRandomVariation(0.01),
      bearing: this.generateBearing(),
      confidence: confidence,
      media_ref: this.generateMediaRef(),
      source: 'edge',
      metadata: this.generateMetadata(detectionType)
    }

    this.lastDetectionTime = Date.now()
    this.logger.info(`Generated ${detectionType} detection with confidence ${confidence.toFixed(2)}`)

    return detection
  }

  private shouldGenerateDetection(): boolean {
    const timeSinceLastDetection = Date.now() - this.lastDetectionTime
    const minInterval = 30000 // 30 seconds minimum between detections
    
    if (timeSinceLastDetection < minInterval) {
      return false
    }

    // Adjust probability based on environmental factors
    const adjustedProbability = this.adjustProbabilityForConditions()
    
    return Math.random() < adjustedProbability
  }

  private adjustProbabilityForConditions(): number {
    const hour = new Date().getHours()
    let adjustedProbability = this.detectionProbability

    // Higher probability during daylight hours (6 AM to 8 PM)
    if (hour >= 6 && hour <= 20) {
      adjustedProbability *= 1.5
    }

    // Higher probability during hot, dry conditions (simulated)
    const temperature = this.getSimulatedTemperature()
    if (temperature > 30) {
      adjustedProbability *= 1.3
    }

    // Higher probability during windy conditions (simulated)
    const windSpeed = this.getSimulatedWindSpeed()
    if (windSpeed > 10) {
      adjustedProbability *= 1.2
    }

    return Math.min(adjustedProbability, 0.5) // Cap at 50%
  }

  private selectDetectionType(): 'smoke' | 'flame' | 'heat' {
    const random = Math.random()
    let cumulativeWeight = 0

    for (let i = 0; i < this.detectionTypes.length; i++) {
      cumulativeWeight += this.detectionTypeWeights[i]
      if (random <= cumulativeWeight) {
        return this.detectionTypes[i]
      }
    }

    return this.detectionTypes[0] // Default to smoke
  }

  private generateConfidence(detectionType: 'smoke' | 'flame' | 'heat'): number {
    let baseConfidence: number

    switch (detectionType) {
      case 'smoke':
        baseConfidence = 0.6 + Math.random() * 0.3 // 0.6-0.9
        break
      case 'flame':
        baseConfidence = 0.7 + Math.random() * 0.25 // 0.7-0.95
        break
      case 'heat':
        baseConfidence = 0.5 + Math.random() * 0.4 // 0.5-0.9
        break
      default:
        baseConfidence = 0.6
    }

    // Add some environmental factors
    const temperature = this.getSimulatedTemperature()
    const windSpeed = this.getSimulatedWindSpeed()

    // Higher confidence in hot, calm conditions
    if (temperature > 25 && windSpeed < 5) {
      baseConfidence += 0.1
    }

    // Lower confidence in cold, windy conditions
    if (temperature < 10 || windSpeed > 15) {
      baseConfidence -= 0.1
    }

    return Math.max(0.1, Math.min(1.0, baseConfidence))
  }

  private generateBearing(): number {
    // Generate bearing relative to device heading
    const deviceHeading = this.getSimulatedDeviceHeading()
    const relativeBearing = this.getRandomVariation(60) // ±30 degrees from device heading
    return (deviceHeading + relativeBearing + 360) % 360
  }

  private generateMediaRef(): string {
    const timestamp = Date.now()
    const frameNumber = Math.floor(Math.random() * 1000)
    return `video_${this.config.deviceId}_${timestamp}_frame_${frameNumber}`
  }

  private generateMetadata(detectionType: 'smoke' | 'flame' | 'heat'): Record<string, any> {
    const metadata: Record<string, any> = {
      camera_id: `cam_${this.config.deviceId}`,
      frame_number: Math.floor(Math.random() * 1000),
      detection_algorithm: 'edge_ml_v1.0',
      processing_time_ms: Math.floor(Math.random() * 100) + 50,
      image_quality: 0.7 + Math.random() * 0.3,
      weather_conditions: this.getSimulatedWeatherConditions()
    }

    // Add type-specific metadata
    switch (detectionType) {
      case 'smoke':
        metadata.smoke_density = Math.random()
        metadata.smoke_color = this.getRandomSmokeColor()
        metadata.smoke_direction = this.getRandomVariation(180) + 180
        break
      
      case 'flame':
        metadata.flame_height = Math.random() * 10 // 0-10 meters
        metadata.flame_intensity = Math.random()
        metadata.flame_color = this.getRandomFlameColor()
        break
      
      case 'heat':
        metadata.heat_intensity = Math.random()
        metadata.heat_source_type = this.getRandomHeatSourceType()
        metadata.thermal_signature = this.generateThermalSignature()
        break
    }

    return metadata
  }

  private getSimulatedTemperature(): number {
    const hour = new Date().getHours()
    const baseTemp = 20 + Math.sin((hour - 6) * Math.PI / 12) * 10
    return baseTemp + this.getRandomVariation(5)
  }

  private getSimulatedWindSpeed(): number {
    return Math.abs(this.getRandomVariation(10)) + 2
  }

  private getSimulatedDeviceHeading(): number {
    return Math.random() * 360
  }

  private getSimulatedWeatherConditions(): string {
    const conditions = ['clear', 'partly_cloudy', 'cloudy', 'hazy', 'windy']
    return conditions[Math.floor(Math.random() * conditions.length)]
  }

  private getRandomSmokeColor(): string {
    const colors = ['white', 'gray', 'black', 'brown', 'yellow']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  private getRandomFlameColor(): string {
    const colors = ['orange', 'red', 'yellow', 'blue', 'white']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  private getRandomHeatSourceType(): string {
    const types = ['vegetation', 'structure', 'vehicle', 'debris', 'unknown']
    return types[Math.floor(Math.random() * types.length)]
  }

  private generateThermalSignature(): number[] {
    // Generate a simple thermal signature (temperature profile)
    const signature = []
    for (let i = 0; i < 10; i++) {
      signature.push(20 + Math.random() * 30) // 20-50°C
    }
    return signature
  }

  private getRandomVariation(maxVariation: number): number {
    return (Math.random() - 0.5) * 2 * maxVariation
  }
}
