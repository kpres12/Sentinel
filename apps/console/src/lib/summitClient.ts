/**
 * Summit.OS Integration Client
 * Handles REST API and MQTT connections to Summit.OS backend
 */

import { Client, Message } from 'paho-mqtt'

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
  status: 'proposed' | 'pending' | 'active' | 'completed' | 'failed'
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
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    this.mqttUrl = process.env.NEXT_PUBLIC_MQTT_WS_URL || 'ws://localhost:8083/mqtt'
    this.apiKey = process.env.NEXT_PUBLIC_SUMMIT_API_KEY || 'dev_key_placeholder'
  }

  // REST API Methods
  async createMission(input: { type?: string; priority?: string; location: { lat: number; lng: number; radius?: number }; waypoints?: any[]; assets?: string[]; description?: string }): Promise<SummitMission | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/missions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: input.type || 'surveillance',
          priority: input.priority || 'medium',
          location: input.location,
          waypoints: input.waypoints,
          assets: input.assets,
          description: input.description || 'APPROVED: RECON DISPATCH'
        })
      })
      if (!response.ok) return null
      return await response.json()
    } catch (e) {
      console.error('Error creating mission:', e)
      return null
    }
  }
  async getAlerts(): Promise<SummitAlert[]> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/intelligence/alerts`, {
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
      const response = await fetch(`${this.apiUrl}/api/v1/alerts/${alertId}/ack`, {
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

  async getPrediction(input: { lat: number; lng: number; hours?: number; windSpeedMps?: number; windDirDeg?: number }): Promise<any> {
    try {
      const body = {
        ignition_points: [{ latitude: input.lat, longitude: input.lng }],
        conditions: {
          wind_speed_mps: input.windSpeedMps ?? 5,
          wind_direction_deg: input.windDirDeg ?? 180,
          temperature_c: 25,
          relative_humidity: 40,
          fuel_moisture: 0.08,
          fuel_model: 'grass'
        },
        simulation_hours: input.hours ?? 1,
        time_step_minutes: 15,
        monte_carlo_runs: 100
      }
      const response = await fetch(`${this.apiUrl}/api/v1/prediction/simulate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
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
      const response = await fetch(`${this.apiUrl}/api/v1/task/assign`, {
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
      const response = await fetch(`${this.apiUrl}/api/v1/tasks/active`, {
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
      const response = await fetch(`${this.apiUrl}/api/v1/system/health`, {
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

  // Asset APIs
  async registerNode(input: {
    id: string
    type: 'TOWER' | 'DRONE' | 'UGV' | string
    pubkey: string
    fw_version: string
    location: { lat: number; lon: number; elev_m?: number }
    capabilities?: string[]
    comm?: string[]
  }): Promise<any> {
    const res = await fetch(`${this.apiUrl}/api/v1/nodes/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error(`Register failed: ${res.status}`)
    return res.json()
  }

  async retireNode(id: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/api/v1/nodes/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error(`Retire failed: ${res.status}`)
  }

  async getNode(id: string): Promise<any> {
    const res = await fetch(`${this.apiUrl}/api/v1/nodes/${encodeURIComponent(id)}`)
    if (!res.ok) throw new Error(`Get node failed: ${res.status}`)
    return res.json()
  }

  async getCoverage(): Promise<{ features: any[] }> {
    const res = await fetch(`${this.apiUrl}/api/v1/coverage`)
    if (!res.ok) throw new Error(`Coverage fetch failed: ${res.status}`)
    return res.json()
  }

  // MQTT Connection Methods
  async connectMQTT(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const url = new URL(this.mqttUrl)
        const host = url.hostname
        const port = Number(url.port) || (url.protocol === 'wss:' ? 443 : 80)
        const path = url.pathname && url.pathname.length > 0 ? url.pathname : '/mqtt'
        this.mqttClient = new Client(host, port, path, 'fireline-console')
        
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

  async updateMission(id: string, patch: Partial<Pick<SummitMission, 'status' | 'progress' | 'description' | 'estimatedDuration'>>): Promise<SummitMission | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/missions/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
      })
      if (!response.ok) return null
      return await response.json()
    } catch (e) {
      console.error('Error updating mission:', e)
      return null
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

  publish(topic: string, payload: any, qos: 0|1|2 = 0) {
    if (!this.mqttClient || !this.isConnected) {
      console.warn('MQTT not connected; cannot publish')
      return false
    }
    try {
      const msg = new Message(typeof payload === 'string' ? payload : JSON.stringify(payload))
      msg.destinationName = topic
      msg.qos = qos
      this.mqttClient.send(msg)
      return true
    } catch (e) {
      console.error('Publish failed', e)
      return false
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
