/**
 * MQTT client for edge agent.
 */

import * as mqtt from 'paho-mqtt'
import { Logger } from './Logger'
import { Config } from './Config'

export class MQTTClient {
  private client: mqtt.Client | null = null
  private logger: Logger
  private config: Config
  private isConnected: boolean = false
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5

  constructor(config: Config) {
    this.config = config
    this.logger = new Logger('MQTTClient')
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.logger.info(`Connecting to MQTT broker at ${this.config.mqttBroker}:${this.config.mqttPort}`)
        
        this.client = new mqtt.Client(
          this.config.mqttBroker,
          this.config.mqttPort,
          `edge_agent_${this.config.deviceId}`
        )

        // Set up connection options
        const options: mqtt.ConnectionOptions = {
          onSuccess: () => {
            this.logger.info('Connected to MQTT broker')
            this.isConnected = true
            this.reconnectAttempts = 0
            resolve()
          },
          onFailure: (error) => {
            this.logger.error('Failed to connect to MQTT broker:', error)
            this.isConnected = false
            reject(error)
          },
          useSSL: this.config.mqttUseSSL,
          userName: this.config.mqttUsername || undefined,
          password: this.config.mqttPassword || undefined,
          keepAliveInterval: 60,
          cleanSession: true
        }

        // Set up message handlers
        this.client.onConnectionLost = (error) => {
          this.logger.warn('MQTT connection lost:', error)
          this.isConnected = false
          this.handleReconnect()
        }

        this.client.onMessageArrived = (message) => {
          this.handleMessage(message)
        }

        // Connect to broker
        this.client.connect(options)

      } catch (error) {
        this.logger.error('Error creating MQTT client:', error)
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client && this.isConnected) {
        this.logger.info('Disconnecting from MQTT broker')
        this.client.disconnect()
        this.isConnected = false
      }
      resolve()
    })
  }

  async publish(topic: string, message: string, qos: number = 0): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected')
    }

    try {
      const mqttMessage = new mqtt.Message(message)
      mqttMessage.destinationName = topic
      mqttMessage.qos = qos
      mqttMessage.retained = false

      this.client.send(mqttMessage)
      this.logger.debug(`Published message to topic ${topic}`)

    } catch (error) {
      this.logger.error(`Failed to publish message to topic ${topic}:`, error)
      throw error
    }
  }

  async subscribe(topic: string, qos: number = 0): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected')
    }

    try {
      this.client.subscribe(topic, { qos })
      this.logger.info(`Subscribed to topic ${topic}`)

    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}:`, error)
      throw error
    }
  }

  private handleMessage(message: mqtt.Message): void {
    try {
      const topic = message.destinationName
      const payload = message.payloadString

      this.logger.debug(`Received message on topic ${topic}: ${payload}`)

      // Handle different message types
      if (topic.includes('/tasks/')) {
        this.handleTaskMessage(topic, payload)
      } else if (topic.includes('/alerts/')) {
        this.handleAlertMessage(topic, payload)
      } else {
        this.logger.debug(`Unhandled message on topic ${topic}`)
      }

    } catch (error) {
      this.logger.error('Error handling MQTT message:', error)
    }
  }

  private handleTaskMessage(topic: string, payload: string): void {
    try {
      const task = JSON.parse(payload)
      this.logger.info(`Received task: ${task.task_id} (${task.kind})`)
      
      // In a real implementation, this would trigger task execution
      // For now, just log the task
      this.logger.info(`Task details:`, task)

    } catch (error) {
      this.logger.error('Error parsing task message:', error)
    }
  }

  private handleAlertMessage(topic: string, payload: string): void {
    try {
      const alert = JSON.parse(payload)
      this.logger.info(`Received alert: ${alert.alert_id} (${alert.type})`)
      
      // In a real implementation, this would trigger alert handling
      // For now, just log the alert
      this.logger.info(`Alert details:`, alert)

    } catch (error) {
      this.logger.error('Error parsing alert message:', error)
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached, giving up')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000) // Exponential backoff, max 30s

    this.logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error('Reconnection failed:', error)
      })
    }, delay)
  }

  isConnectedToBroker(): boolean {
    return this.isConnected
  }
}
