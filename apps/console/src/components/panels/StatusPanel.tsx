'use client'

import React from 'react'
import { 
  Activity, 
  AlertTriangle, 
  Wifi, 
  Battery, 
  MapPin, 
  Clock,
  Plane,
  Radio,
  Shield,
  Zap,
  Eye,
  Target,
  Wind,
  Flame,
  Thermometer,
  Gauge
} from 'lucide-react'

export function StatusPanel() {
  const devices = [
    { 
      id: 'robot-1', 
      name: 'KOFA ALPHA', 
      type: 'robot',
      status: 'online', 
      battery: 87, 
      location: '40.000°N, 120.000°W',
      signal: 4,
      lastSeen: '14:32:15'
    },
    { 
      id: 'drone-1', 
      name: 'FIREFLY BRAVO', 
      type: 'drone',
      status: 'online', 
      battery: 92, 
      location: '40.001°N, 120.001°W',
      signal: 5,
      lastSeen: '14:32:12'
    },
    { 
      id: 'robot-2', 
      name: 'KOFA CHARLIE', 
      type: 'robot',
      status: 'offline', 
      battery: 0, 
      location: '40.002°N, 120.002°W',
      signal: 0,
      lastSeen: '14:28:42'
    },
  ]

  const alerts = [
    { 
      id: '1', 
      type: 'critical', 
      message: 'HIGH FIRE RISK DETECTED IN SECTOR 7', 
      time: '14:32:15',
      priority: 'PRIORITY 1'
    },
    { 
      id: '2', 
      type: 'warning', 
      message: 'KOFA CHARLIE OFFLINE - INVESTIGATING', 
      time: '14:28:42',
      priority: 'PRIORITY 2'
    },
    { 
      id: '3', 
      type: 'info', 
      message: 'WEATHER UPDATE: WIND SPEED INCREASING', 
      time: '14:25:18',
      priority: 'PRIORITY 3'
    },
  ]

  const sensorData = [
    { label: 'TEMP', value: '32°C', icon: Thermometer, color: 'text-fire-400', status: 'normal' },
    { label: 'WIND', value: '12 kts', icon: Wind, color: 'text-tactical-400', status: 'normal' },
    { label: 'HUMIDITY', value: '45%', icon: Gauge, color: 'text-tactical-400', status: 'normal' },
    { label: 'PRESSURE', value: '1013 hPa', icon: Gauge, color: 'text-tactical-400', status: 'normal' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-tacticalGreen-400'
      case 'offline': return 'text-fire-400'
      case 'warning': return 'text-warning-400'
      default: return 'text-tactical-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online': return 'bg-tacticalGreen-500/20 border-tacticalGreen-500/30'
      case 'offline': return 'bg-fire-500/20 border-fire-500/30'
      case 'warning': return 'bg-warning-500/20 border-warning-500/30'
      default: return 'bg-tactical-500/20 border-tactical-500/30'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="tactical-header px-4 py-3 border-b border-dark-700">
        <h2 className="tactical-title text-lg">SYSTEM STATUS</h2>
        <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
      </div>

      <div className="flex-1 overflow-y-auto tactical-scrollbar p-4 space-y-6">
        {/* Device Status */}
        <div>
          <h3 className="tactical-subtitle mb-4 flex items-center gap-2">
            <Plane className="w-4 h-4 text-tactical-400" />
            DEVICES
          </h3>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className={`tactical-panel p-4 rounded-lg border ${getStatusBg(device.status)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      device.status === 'online' ? 'bg-tacticalGreen-400 animate-pulse' : 'bg-fire-400'
                    }`} />
                    <div>
                      <p className="font-mono text-sm text-tactical-300">{device.name}</p>
                      <p className="text-xs text-tactical-muted font-mono">{device.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-tactical-300">{device.battery}%</p>
                    <p className="text-xs text-tactical-muted font-mono">{device.status.toUpperCase()}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-3 h-3 text-tactical-400" />
                    <span className="text-tactical-300">SIGNAL: {device.signal}/5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-tactical-400" />
                    <span className="text-tactical-300">LAST: {device.lastSeen}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Data */}
        <div>
          <h3 className="tactical-subtitle mb-4 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-tactical-400" />
            SENSOR DATA
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {sensorData.map((sensor, index) => (
              <div key={index} className="tactical-panel p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <sensor.icon className={`w-4 h-4 ${sensor.color}`} />
                    <span className="text-xs font-mono text-tactical-muted">{sensor.label}</span>
                  </div>
                  <span className={`text-sm font-mono ${sensor.color}`}>{sensor.value}</span>
                </div>
                <div className="mt-1">
                  <span className="text-xs font-mono text-tacticalGreen-400">NORMAL</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div>
          <h3 className="tactical-subtitle mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-fire-400" />
            ALERTS
          </h3>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`tactical-panel p-4 rounded-lg border-l-4 ${
                alert.type === 'critical' ? 'border-fire-500 bg-fire-500/10' :
                alert.type === 'warning' ? 'border-warning-500 bg-warning-500/10' :
                'border-tactical-500 bg-tactical-500/10'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-mono text-sm text-tactical-300 mb-1">{alert.message}</p>
                    <p className="text-xs font-mono text-tactical-muted">{alert.priority}</p>
                  </div>
                  <AlertTriangle className={`w-4 h-4 ${
                    alert.type === 'critical' ? 'text-fire-400 animate-pulse' :
                    alert.type === 'warning' ? 'text-warning-400' :
                    'text-tactical-400'
                  }`} />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted">
                  <Clock className="w-3 h-3" />
                  <span>{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div>
          <h3 className="tactical-subtitle mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-tactical-400" />
            SYSTEM STATUS
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="tactical-panel p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-tacticalGreen-400" />
                <span className="text-xs font-mono text-tactical-300">GPS</span>
              </div>
              <span className="text-sm font-mono text-tacticalGreen-400">LOCKED</span>
            </div>
            <div className="tactical-panel p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-tacticalGreen-400" />
                <span className="text-xs font-mono text-tactical-300">COMMS</span>
              </div>
              <span className="text-sm font-mono text-tacticalGreen-400">ONLINE</span>
            </div>
            <div className="tactical-panel p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-warning-400" />
                <span className="text-xs font-mono text-tactical-300">BATTERY</span>
              </div>
              <span className="text-sm font-mono text-warning-400">87%</span>
            </div>
            <div className="tactical-panel p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-tactical-400" />
                <span className="text-xs font-mono text-tactical-300">SURVEILLANCE</span>
              </div>
              <span className="text-sm font-mono text-tactical-400">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
