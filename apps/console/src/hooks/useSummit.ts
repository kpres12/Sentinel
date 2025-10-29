/**
 * Summit.OS React Hooks
 * Provides React hooks for Summit.OS data streams and API calls
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { summitClient, SummitAlert, SummitTelemetry, SummitMission, SummitSystemStatus } from '../lib/summitClient'

// Hook for Summit.OS alerts
export function useSummitAlerts() {
  const [alerts, setAlerts] = useState<SummitAlert[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Fetch initial alerts
  const { data: initialAlerts, isLoading, error } = useQuery({
    queryKey: ['summit-alerts'],
    queryFn: () => summitClient.getAlerts(),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Subscribe to real-time alerts via MQTT
  useEffect(() => {
    const connectAndSubscribe = async () => {
      const connected = await summitClient.connectMQTT()
      setIsConnected(connected)
      
      if (connected) {
        // Subscribe to alerts topic
        const unsubscribe = summitClient.subscribe('alerts/#', (data: SummitAlert) => {
          setAlerts(prev => {
            const existingIndex = prev.findIndex(alert => alert.id === data.id)
            if (existingIndex >= 0) {
              // Update existing alert
              const updated = [...prev]
              updated[existingIndex] = data
              return updated
            } else {
              // Add new alert
              return [data, ...prev]
            }
          })
        })
        
        return unsubscribe
      }
    }

    connectAndSubscribe()

    return () => {
      summitClient.disconnect()
    }
  }, [])

  // Update alerts when initial data loads
  useEffect(() => {
    if (initialAlerts) {
      setAlerts(initialAlerts)
    }
  }, [initialAlerts])

  const acknowledgeAlert = useMutation({
    mutationFn: (alertId: string) => summitClient.acknowledgeAlert(alertId),
    onSuccess: (_, alertId) => {
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true }
            : alert
        )
      )
    }
  })

  return {
    alerts,
    isLoading,
    error,
    isConnected,
    acknowledgeAlert: acknowledgeAlert.mutate,
    isAcknowledging: acknowledgeAlert.isPending
  }
}

// Hook for Summit.OS telemetry
export function useSummitTelemetry() {
  const [telemetry, setTelemetry] = useState<Map<string, SummitTelemetry>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const connectAndSubscribe = async () => {
      const connected = await summitClient.connectMQTT()
      setIsConnected(connected)
      
      if (connected) {
        // Subscribe to device telemetry
        const unsubscribe = summitClient.subscribe('devices/+/telemetry', (data: SummitTelemetry) => {
          setTelemetry(prev => {
            const updated = new Map(prev)
            updated.set(data.deviceId, data)
            return updated
          })
        })
        
        return unsubscribe
      }
    }

    connectAndSubscribe()

    return () => {
      summitClient.disconnect()
    }
  }, [])

  const getDeviceTelemetry = useCallback((deviceId: string) => {
    return telemetry.get(deviceId)
  }, [telemetry])

  const getAllTelemetry = useCallback(() => {
    return Array.from(telemetry.values())
  }, [telemetry])

  return {
    telemetry: getAllTelemetry(),
    getDeviceTelemetry,
    isConnected,
    deviceCount: telemetry.size
  }
}

// Hook for Summit.OS missions
export function useSummitMissions() {
  const [missions, setMissions] = useState<SummitMission[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Fetch initial missions
  const { data: initialMissions, isLoading, error } = useQuery({
    queryKey: ['summit-missions'],
    queryFn: () => summitClient.getActiveMissions(),
    refetchInterval: 60000, // Refetch every minute
  })

  // Subscribe to real-time mission updates
  useEffect(() => {
    const connectAndSubscribe = async () => {
      const connected = await summitClient.connectMQTT()
      setIsConnected(connected)
      
      if (connected) {
        // Subscribe to mission updates
        const unsubscribe = summitClient.subscribe('missions/updates', (data: SummitMission) => {
          setMissions(prev => {
            const existingIndex = prev.findIndex(mission => mission.id === data.id)
            if (existingIndex >= 0) {
              // Update existing mission
              const updated = [...prev]
              updated[existingIndex] = data
              return updated
            } else {
              // Add new mission
              return [data, ...prev]
            }
          })
        })
        
        return unsubscribe
      }
    }

    connectAndSubscribe()

    return () => {
      summitClient.disconnect()
    }
  }, [])

  // Update missions when initial data loads
  useEffect(() => {
    if (initialMissions) {
      setMissions(initialMissions)
    }
  }, [initialMissions])

  const approveMission = useMutation({
    mutationFn: (mission: SummitMission) => summitClient.createMission({
      type: mission.type,
      priority: mission.priority,
      location: mission.location,
      description: mission.description
    }),
    onSuccess: (created) => {
      if (created) {
        setMissions(prev => [created, ...prev])
      }
    }
  })

  const updateMission = useMutation({
    mutationFn: (input: { id: string; patch: Partial<Pick<SummitMission, 'status' | 'progress' | 'description' | 'estimatedDuration'>> }) => summitClient.updateMission(input.id, input.patch),
    onSuccess: (updated) => {
      if (updated) {
        setMissions(prev => prev.map(m => m.id === updated.id ? updated : m))
      }
    }
  })

  const dispatchRobot = useMutation({
    mutationFn: (mission: Partial<SummitMission>) => summitClient.dispatchRobot(mission),
    onSuccess: (_, newMission) => {
      setMissions(prev => [newMission as SummitMission, ...prev])
    }
  })

  return {
    missions,
    isLoading,
    error,
    isConnected,
    dispatchRobot: dispatchRobot.mutate,
    updateMission: updateMission.mutate,
    isUpdating: updateMission.isPending,
    approveMission: approveMission.mutate,
    isApproving: approveMission.isPending,
    isDispatching: dispatchRobot.isPending
  }
}

// Hook for Summit.OS system status
export function useSummitSystemStatus() {
  const [systemStatus, setSystemStatus] = useState<SummitSystemStatus | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Fetch system status
  const { data, isLoading, error } = useQuery({
    queryKey: ['summit-system-status'],
    queryFn: () => summitClient.getSystemStatus(),
    refetchInterval: 15000, // Refetch every 15 seconds
  })

  useEffect(() => {
    if (data) {
      setSystemStatus(data)
    }
  }, [data])

  useEffect(() => {
    const connectAndSubscribe = async () => {
      const connected = await summitClient.connectMQTT()
      setIsConnected(connected)
    }

    connectAndSubscribe()

    return () => {
      summitClient.disconnect()
    }
  }, [])

  return {
    systemStatus,
    isLoading,
    error,
    isConnected
  }
}

// Hook for Summit.OS predictions
export function useSummitPrediction() {
  const [prediction, setPrediction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getPrediction = useCallback(async (scenario: any) => {
    setIsLoading(true)
    try {
      const result = await summitClient.getPrediction(scenario)
      setPrediction(result)
      return result
    } catch (error) {
      console.error('Error getting prediction:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    prediction,
    getPrediction,
    isLoading
  }
}

// Hook for Summit.OS connection status (MQTT only)
export function useSummitConnection() {
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    reconnectAttempts: 0
  })

  useEffect(() => {
    const updateStatus = () => {
      const status = summitClient.getConnectionStatus()
      setConnectionStatus(status)
    }

    updateStatus()
    const interval = setInterval(updateStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  return connectionStatus
}

// Hook for backend connectivity (MQTT + API WebSocket)
export function useBackendConnectivity() {
  const [mqttConnected, setMqttConnected] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    // MQTT status poll
    const poll = setInterval(() => {
      setMqttConnected(summitClient.getConnectionStatus().isConnected)
    }, 3000)
    setMqttConnected(summitClient.getConnectionStatus().isConnected)

    // WebSocket to API Gateway /ws/events
    let ws: WebSocket | null = null
    try {
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
      const wsUrl = api.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/events'
      ws = new WebSocket(wsUrl)
      ws.onopen = () => setWsConnected(true)
      ws.onclose = () => setWsConnected(false)
      ws.onerror = () => setWsConnected(false)
    } catch {
      setWsConnected(false)
    }

    return () => {
      clearInterval(poll)
      if (ws) ws.close()
    }
  }, [])

  return { mqttConnected, wsConnected }
}
