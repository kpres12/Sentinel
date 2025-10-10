'use client'

import React from 'react'
import { 
  Plane, 
  Radio, 
  Battery, 
  Wifi, 
  MapPin, 
  Clock,
  Activity,
  Camera,
  Target,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Eye,
  Shield
} from 'lucide-react'
import { useSummitTelemetry } from '../../hooks/useSummit'
import { format } from 'date-fns'

export function DevicesPanel() {
  const { telemetry, isConnected, deviceCount } = useSummitTelemetry()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-tacticalGreen-400'
      case 'offline': return 'text-fire-400'
      case 'error': return 'text-fire-400'
      case 'mission': return 'text-tactical-400'
      default: return 'text-tactical-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online': return 'bg-tacticalGreen-500/20 border-tacticalGreen-500/30'
      case 'offline': return 'bg-fire-500/20 border-fire-500/30'
      case 'error': return 'bg-fire-500/20 border-fire-500/30'
      case 'mission': return 'bg-tactical-500/20 border-tactical-500/30'
      default: return 'bg-tactical-500/20 border-tactical-500/30'
    }
  }

  const getDeviceIcon = (deviceId: string) => {
    // Determine device type based on ID or other logic
    return deviceId.includes('drone') || deviceId.includes('surveillance') ? Plane : Radio
  }

  // Calculate fleet summary from telemetry data
  const fleetSummary = {
    online: telemetry.filter(t => t.status === 'online').length,
    offline: telemetry.filter(t => t.status === 'offline').length,
    error: telemetry.filter(t => t.status === 'error').length,
    avgBattery: telemetry.length > 0 
      ? Math.round(telemetry.reduce((sum, t) => sum + t.battery, 0) / telemetry.length)
      : 0
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="tactical-header px-4 py-3 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="tactical-title text-lg">DEVICE FLEET</h2>
            <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-tacticalGreen-400' : 'bg-fire-400'}`}></div>
            <span className="text-xs font-mono text-tactical-muted">
              {isConnected ? 'SUMMIT.OS CONNECTED' : 'SUMMIT.OS OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto tactical-scrollbar p-4 space-y-4">
        {/* Fleet Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-tacticalGreen-400" />
              <span className="text-xs font-mono text-tactical-muted">ONLINE</span>
            </div>
            <span className="text-lg font-mono text-tacticalGreen-400">{fleetSummary.online}</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-warning-400" />
              <span className="text-xs font-mono text-tactical-muted">ERROR</span>
            </div>
            <span className="text-lg font-mono text-warning-400">{fleetSummary.error}</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-fire-400" />
              <span className="text-xs font-mono text-tactical-muted">OFFLINE</span>
            </div>
            <span className="text-lg font-mono text-fire-400">{fleetSummary.offline}</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Battery className="w-4 h-4 text-tactical-400" />
              <span className="text-xs font-mono text-tactical-muted">AVG BAT</span>
            </div>
            <span className="text-lg font-mono text-tactical-400">{fleetSummary.avgBattery}%</span>
          </div>
        </div>

        {/* Devices List */}
        <div className="space-y-3">
          {telemetry.length === 0 ? (
            <div className="tactical-panel p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2">
                <Radio className="w-4 h-4 text-tactical-400" />
                <span className="text-sm font-mono text-tactical-muted">NO DEVICES CONNECTED</span>
              </div>
            </div>
          ) : (
            telemetry.map((device) => {
              const DeviceIcon = getDeviceIcon(device.deviceId)
              return (
                <div key={device.deviceId} className={`tactical-panel p-4 rounded-lg border ${getStatusBg(device.status)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <DeviceIcon className={`w-5 h-5 ${getStatusColor(device.status)} mt-0.5`} />
                      <div className="flex-1">
                        <h3 className="font-mono text-sm text-tactical-300 mb-1">{device.deviceId.toUpperCase()}</h3>
                        <p className="text-xs text-tactical-muted font-mono mb-2">
                          {device.mission ? device.mission.type.toUpperCase() : 'STANDBY'}
                        </p>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-tactical-muted">STATUS: {device.status.toUpperCase()}</span>
                          <span className={`${getStatusColor(device.status)}`}>
                            {device.mission ? 'ON MISSION' : 'STANDBY'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(device.timestamp), 'HH:mm:ss')}</span>
                      </div>
                      <span className="text-xs font-mono text-tactical-400">{device.battery}%</span>
                    </div>
                  </div>
                  
                  {/* Device Details */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <MapPin className="w-3 h-3 text-tactical-400" />
                        <span className="text-tactical-muted">LOC:</span>
                        <span className="text-tactical-300">
                          {device.location.lat.toFixed(3)}°N, {device.location.lng.toFixed(3)}°W
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Activity className="w-3 h-3 text-tactical-400" />
                        <span className="text-tactical-muted">SPD:</span>
                        <span className="text-tactical-300">{device.speed || 0} kts</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Target className="w-3 h-3 text-tactical-400" />
                        <span className="text-tactical-muted">HDG:</span>
                        <span className="text-tactical-300">{device.heading || '000'}°</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Wifi className="w-3 h-3 text-tactical-400" />
                        <span className="text-tactical-muted">SIG:</span>
                        <span className="text-tactical-300">5/5</span>
                      </div>
                    </div>
                  </div>

                  {/* Sensor Data */}
                  {device.sensors && (
                    <div className="grid grid-cols-2 gap-4 mb-3 p-2 bg-dark-800/50 rounded">
                      <div className="space-y-1">
                        {device.sensors.temperature && (
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-tactical-muted">TEMP:</span>
                            <span className="text-tactical-300">{device.sensors.temperature}°C</span>
                          </div>
                        )}
                        {device.sensors.humidity && (
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-tactical-muted">HUM:</span>
                            <span className="text-tactical-300">{device.sensors.humidity}%</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        {device.sensors.windSpeed && (
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-tactical-muted">WIND:</span>
                            <span className="text-tactical-300">{device.sensors.windSpeed} mph</span>
                          </div>
                        )}
                        {device.sensors.smoke && (
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-tactical-muted">SMOKE:</span>
                            <span className={`text-xs ${device.sensors.smoke ? 'text-fire-400' : 'text-tacticalGreen-400'}`}>
                              {device.sensors.smoke ? 'DETECTED' : 'CLEAR'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Device Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted">
                      <span>ALT: {device.location.altitude ? `${device.location.altitude}m` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                        <Eye className="w-3 h-3 text-tactical-400" />
                      </button>
                      <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                        <Camera className="w-3 h-3 text-tactical-400" />
                      </button>
                      <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                        <Play className="w-3 h-3 text-tactical-400" />
                      </button>
                      <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                        <Pause className="w-3 h-3 text-tactical-400" />
                      </button>
                      <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                        <Settings className="w-3 h-3 text-tactical-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Fleet Actions */}
        <div className="mt-6">
          <h3 className="tactical-subtitle mb-3">FLEET ACTIONS</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-4 h-4 text-tacticalGreen-400" />
                <span className="text-sm font-mono text-tactical-300">DEPLOY ALL</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">START MISSION</p>
            </button>
            <button className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Pause className="w-4 h-4 text-warning-400" />
                <span className="text-sm font-mono text-tactical-300">HOLD POSITION</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">STOP ALL DEVICES</p>
            </button>
            <button className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-4 h-4 text-tactical-400" />
                <span className="text-sm font-mono text-tactical-300">RETURN BASE</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">RECALL FLEET</p>
            </button>
            <button className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-tactical-400" />
                <span className="text-sm font-mono text-tactical-300">CONFIGURE</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">FLEET SETTINGS</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}