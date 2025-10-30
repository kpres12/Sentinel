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
  private queue: Array<{ topic: string; message: string; qos: number; retain: boolean }> = []

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

        // Prepare LWT (Last Will and Testament)
        const will = new mqtt.Message(JSON.stringify({ deviceId: this.config.deviceId, status: 'offline' }))
        will.destinationName = `devices/${this.config.deviceId}/status`
        will.qos = 1
        will.retained = true

        // Set up connection options
        const options: mqtt.ConnectionOptions = {
          onSuccess: () => {
            this.logger.info('Connected to MQTT broker')
            this.isConnected = true
            this.reconnectAttempts = 0
            // Publish online retained status
            try {
              const online = new mqtt.Message(JSON.stringify({ deviceId: this.config.deviceId, status: 'online' }))
              online.destinationName = `devices/${this.config.deviceId}/status`
              online.qos = 1
              online.retained = true
              this.client!.send(online)
            } catch (e) {
              this.logger.warn('Failed to publish online status', e as any)
            }
            // Flush offline queue
            this.flushQueue()
            resolve()
          },
          onFailure: (error) => {
            this.logger.error('Failed to connect to MQTT broker:', error)
            this.isConnected = false
            reject(error)
          },
          useSSL: this.config.mqttUseSSL,
          keepAliveInterval: 60,
          cleanSession: true,
          willMessage: will,
        }

        // Add authentication only if credentials are provided
        if (this.config.mqttUsername) {
          options.userName = this.config.mqttUsername
        }
        if (this.config.mqttPassword) {
          options.password = this.config.mqttPassword
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

        // Subscribe to control topic for runtime tuning
        const controlTopic = `devices/${this.config.deviceId}/control`
        // Slight delay after connect to ensure subscribe runs
        setTimeout(() => {
          try {
            this.client?.subscribe(controlTopic, { qos: 1 as mqtt.Qos })
            this.logger.info(`Subscribed to control topic ${controlTopic}`)
          } catch (e) {
            this.logger.warn('Failed to subscribe control topic', e as any)
          }
        }, 250)

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

  async publish(topic: string, message: string, qos: number = 0, retain = false, attempt = 0): Promise<void> {
    // Fault injection: drop
    const dropPct = this.faultDropPct || this.config.faultDropPct
    if (dropPct > 0 && Math.random() < dropPct) {
      this.logger.warn(`Fault injection drop for topic ${topic}`)
      return
    }

    // If not connected, enqueue
    if (!this.client || !this.isConnected) {
      this.enqueue(topic, message, qos, retain)
      return
    }

    try {
      // Fault injection: latency
      const latency = this.faultLatencyMs || this.config.faultLatencyMs
      if (latency > 0) {
        await new Promise((r) => setTimeout(r, latency))
      }
      const mqttMessage = new mqtt.Message(message)
      mqttMessage.destinationName = topic
      mqttMessage.qos = qos as mqtt.Qos
      mqttMessage.retained = retain

      this.client.send(mqttMessage)
      this.logger.debug(`Published message to topic ${topic}`)

    } catch (error) {
      this.logger.error(`Failed to publish message to topic ${topic}:`, error)
      // Retry with jitter up to 3 attempts
      if (attempt < 3) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 5000) + Math.floor(Math.random() * 250)
        setTimeout(() => {
          this.publish(topic, message, qos, retain, attempt + 1).catch((e) => this.logger.error('Retry publish failed', e))
        }, backoff)
      } else {
        throw error
      }
    }
  }

  private enqueue(topic: string, message: string, qos: number, retain: boolean) {
    // bound buffer; drop oldest
    const maxBuf = this.offlineBufferMax || this.config.offlineBufferMax
    if (this.queue.length >= maxBuf) {
      this.queue.shift()
    }
    this.queue.push({ topic, message, qos, retain })
    this.logger.info(`Enqueued message (offline) -> ${topic} [${this.queue.length}/${this.config.offlineBufferMax}]`)
  }

  private async flushQueue() {
    if (!this.client || !this.isConnected) return
    while (this.queue.length > 0) {
      const { topic, message, qos, retain } = this.queue.shift()!
      try {
        await this.publish(topic, message, qos, retain)
      } catch (e) {
        // put back and stop to avoid spin
        this.queue.unshift({ topic, message, qos, retain })
        break
      }
    }
  }

  async subscribe(topic: string, qos: number = 0): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected')
    }

    try {
      this.client.subscribe(topic, { qos: qos as mqtt.Qos })
      this.logger.info(`Subscribed to topic ${topic}`)

    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}:`, error)
      throw error
    }
  }

  private faultDropPct = 0
  private faultLatencyMs = 0
  private offlineBufferMax = 100

  private handleMessage(message: mqtt.Message): void {
    try {
      const topic = message.destinationName
      const payload = message.payloadString

      this.logger.debug(`Received message on topic ${topic}: ${payload}`)

      // Control messages for runtime tuning
      if (topic === `devices/${this.config.deviceId}/control`) {
        try {
          const obj = JSON.parse(payload || '{}')
          if (typeof obj.faultDropPct === 'number') this.faultDropPct = Math.max(0, Math.min(1, obj.faultDropPct))
          if (typeof obj.faultLatencyMs === 'number') this.faultLatencyMs = Math.max(0, obj.faultLatencyMs)
          if (typeof obj.offlineBufferMax === 'number') this.offlineBufferMax = Math.max(0, obj.offlineBufferMax)
          this.logger.info(`Updated runtime tuning: drop=${this.faultDropPct}, latency=${this.faultLatencyMs}ms, buffer=${this.offlineBufferMax}`)
        } catch (e) {
          this.logger.warn('Invalid control payload', e as any)
        }
        return
      }

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
