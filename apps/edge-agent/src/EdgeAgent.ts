/**
 * Main edge agent class.
 */

import { MQTTClient } from './MQTTClient'
import { TelemetryGenerator } from './TelemetryGenerator'
import { DetectionGenerator } from './DetectionGenerator'
import { Logger } from './Logger'
import { Config } from './Config'
import * as cron from 'node-cron'

export class EdgeAgent {
  private mqttClient: MQTTClient
  private telemetryGenerator: TelemetryGenerator
  private detectionGenerator: DetectionGenerator
  private logger: Logger
  private config: Config
  private isRunning: boolean = false
  private telemetryJob?: cron.ScheduledTask
  private detectionJob?: cron.ScheduledTask

  constructor(config: Config) {
    this.config = config
    this.logger = new Logger('EdgeAgent')
    this.mqttClient = new MQTTClient(config)
    this.telemetryGenerator = new TelemetryGenerator(config)
    this.detectionGenerator = new DetectionGenerator(config)
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting edge agent...')
      
      // Connect to MQTT broker
      await this.mqttClient.connect()
      
      // Start telemetry generation (every 5 seconds)
      this.telemetryJob = cron.schedule('*/5 * * * * *', async () => {
        await this.publishTelemetry()
      })
      
      // Start detection generation (every 30 seconds)
      this.detectionJob = cron.schedule('*/30 * * * * *', async () => {
        await this.publishDetection()
      })
      
      this.isRunning = true
      this.logger.info('Edge agent started successfully')
      
    } catch (error) {
      this.logger.error('Failed to start edge agent:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping edge agent...')
      
      this.isRunning = false
      
      // Stop cron jobs
      if (this.telemetryJob) {
        this.telemetryJob.stop()
      }
      if (this.detectionJob) {
        this.detectionJob.stop()
      }
      
      // Disconnect from MQTT
      await this.mqttClient.disconnect()
      
      this.logger.info('Edge agent stopped')
      
    } catch (error) {
      this.logger.error('Error stopping edge agent:', error)
    }
  }

  private async publishTelemetry(): Promise<void> {
    try {
      const telemetry = this.telemetryGenerator.generate()
      const topic = `devices/${this.config.deviceId}/telemetry`
      
      await this.mqttClient.publish(topic, JSON.stringify(telemetry))
      
      this.logger.debug('Published telemetry:', telemetry)
      
    } catch (error) {
      this.logger.error('Failed to publish telemetry:', error)
    }
  }

  private async publishDetection(): Promise<void> {
    try {
      const detection = this.detectionGenerator.generate()
      if (detection) {
        const topic = `devices/${this.config.deviceId}/detections`
        
        await this.mqttClient.publish(topic, JSON.stringify(detection), 1)
        
        this.logger.debug('Published detection:', detection)
      }
      
    } catch (error) {
      this.logger.error('Failed to publish detection:', error)
    }
  }
}
