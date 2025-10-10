/**
 * Summit.OS Integration Client
 * Handles REST API and MQTT connections to Summit.OS backend
 */

import { Client } from 'paho-mqtt'

// Types for Summit.OS API responses
export interface SummitAlert {
  id: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'fire_detection' | 'spread_prediction' | 'equipment_failure' | 'weather_alert'
  title: string
  description: string
  location: {
    lat: number
    lng: number
    radius: number
  }
  confidence: number
  acknowledged: boolean
  metadata?: Record<string, any>
}

export interface SummitTelemetry {
  deviceId: string
  timestamp: string
  location: {
    lat: number
    lng: number
    altitude?: number
  }
  status: 'online' | 'offline' | 'error' | 'mission'
  battery: number
  speed?: number
  heading?: number
  sensors: {
    temperature?: number
    humidity?: number
    windSpeed?: number
    windDirection?: number
    smoke?: boolean
    co2?: number
  }
  mission?: {
    id: string
    type: string
    progress: number
    eta?: string
  }
}

export interface SummitMission {
  id: string
  type: 'surveillance' | 'firefighting' | 'rescue' | 'patrol'
  status: 'pending' | 'active' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedDevice?: string
  location: {
    lat: number
    lng: number
    radius: number
  }
  description: string
  createdAt: string
  updatedAt: string
  progress: number
  estimatedDuration?: number
}

export interface SummitSystemStatus {
  status: 'healthy' | 'degraded' | 'offline'
  uptime: number
  services: {
    api: boolean
    mqtt: boolean
    fusion: boolean
    prediction: boolean
  }
  metrics: {
    activeDevices: number
    activeMissions: number
    alertsCount: number
  }
}

class SummitClient {
  private apiUrl: string
  private mqttUrl: string
  private apiKey: string
  private mqttClient: Client | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_SUMMIT_API_URL || 'http://localhost:8000/api'
    this.mqttUrl = process.env.NEXT_PUBLIC_SUMMIT_MQTT_URL || 'ws://localhost:1883'
    this.apiKey = process.env.NEXT_PUBLIC_SUMMIT_API_KEY || 'dev_key_placeholder'
  }

  // REST API Methods
  async getAlerts(): Promise<SummitAlert[]> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/intelligence/alerts`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching alerts:', error)
      return []
    }
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/alerts/${alertId}/ack`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      return response.ok
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      return false
    }
  }

  async getPrediction(scenario: any): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/predict/scenario`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scenario)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get prediction: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error getting prediction:', error)
      return null
    }
  }

  async dispatchRobot(mission: Partial<SummitMission>): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/task/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mission)
      })
      
      return response.ok
    } catch (error) {
      console.error('Error dispatching robot:', error)
      return false
    }
  }

  async getActiveMissions(): Promise<SummitMission[]> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/tasks/active`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch missions: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching missions:', error)
      return []
    }
  }

  async getSystemStatus(): Promise<SummitSystemStatus | null> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/system/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch system status: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching system status:', error)
      return null
    }
  }

  // MQTT Connection Methods
  async connectMQTT(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.mqttClient = new Client(this.mqttUrl.replace('ws://', '').replace('wss://', ''), 8083, 'fireline-console')
        
        this.mqttClient.onConnectionLost = (responseObject) => {
          console.log('MQTT connection lost:', responseObject.errorMessage)
          this.isConnected = false
          this.handleReconnect()
        }

        this.mqttClient.onMessageArrived = (message) => {
          this.handleMessage(message.destinationName, message.payloadString)
        }

        this.mqttClient.connect({
          onSuccess: () => {
            console.log('Connected to Summit.OS MQTT')
            this.isConnected = true
            this.reconnectAttempts = 0
            resolve(true)
          },
          onFailure: (error) => {
            console.error('Failed to connect to Summit.OS MQTT:', error)
            this.isConnected = false
            resolve(false)
          },
          useSSL: this.mqttUrl.startsWith('wss://')
        })
      } catch (error) {
        console.error('Error connecting to MQTT:', error)
        resolve(false)
      }
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect to MQTT (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connectMQTT()
      }, 5000 * this.reconnectAttempts)
    }
  }

  private handleMessage(topic: string, payload: string) {
    try {
      const data = JSON.parse(payload)
      
      // Emit custom events for different topics
      const event = new CustomEvent('summit-message', {
        detail: { topic, data }
      })
      
      window.dispatchEvent(event)
    } catch (error) {
      console.error('Error parsing MQTT message:', error)
    }
  }

  subscribe(topic: string, callback: (data: any) => void) {
    if (!this.mqttClient || !this.isConnected) {
      console.warn('MQTT not connected, cannot subscribe to topic:', topic)
      return
    }

    this.mqttClient.subscribe(topic)
    
    // Listen for messages on this topic
    const messageHandler = (event: CustomEvent) => {
      const { topic: messageTopic, data } = event.detail
      if (messageTopic === topic) {
        callback(data)
      }
    }
    
    window.addEventListener('summit-message', messageHandler as EventListener)
    
    // Return unsubscribe function
    return () => {
      window.removeEventListener('summit-message', messageHandler as EventListener)
      if (this.mqttClient && this.isConnected) {
        this.mqttClient.unsubscribe(topic)
      }
    }
  }

  disconnect() {
    if (this.mqttClient && this.isConnected) {
      this.mqttClient.disconnect()
      this.isConnected = false
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// Export singleton instance
export const summitClient = new SummitClient()
