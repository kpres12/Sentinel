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

export function DevicesPanel() {
  const devices = [
    { 
      id: 'robot-1', 
      name: 'FIRELINE ALPHA', 
      type: 'robot',
      status: 'online', 
      battery: 87, 
      location: '40.000°N, 120.000°W',
      signal: 4,
      lastSeen: '14:32:15',
      mission: 'PATROL SECTOR 7',
      speed: '12.5 kts',
      heading: '045°',
      altitude: '1,234m'
    },
    { 
      id: 'drone-1', 
      name: 'SURVEILLANCE BRAVO', 
      type: 'drone',
      status: 'online', 
      battery: 92, 
      location: '40.001°N, 120.001°W',
      signal: 5,
      lastSeen: '14:32:12',
      mission: 'AERIAL RECON',
      speed: '25.3 kts',
      heading: '120°',
      altitude: '2,500m'
    },
    { 
      id: 'robot-2', 
      name: 'FIRELINE CHARLIE', 
      type: 'robot',
      status: 'offline', 
      battery: 0, 
      location: '40.002°N, 120.002°W',
      signal: 0,
      lastSeen: '14:28:42',
      mission: 'MAINTENANCE',
      speed: '0 kts',
      heading: '000°',
      altitude: '1,200m'
    },
    { 
      id: 'drone-2', 
      name: 'SURVEILLANCE DELTA', 
      type: 'drone',
      status: 'warning', 
      battery: 23, 
      location: '40.003°N, 120.003°W',
      signal: 2,
      lastSeen: '14:31:58',
      mission: 'RETURN TO BASE',
      speed: '18.7 kts',
      heading: '270°',
      altitude: '1,800m'
    },
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

  const getDeviceIcon = (type: string) => {
    return type === 'drone' ? Plane : Radio
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="tactical-header px-4 py-3 border-b border-dark-700">
        <h2 className="tactical-title text-lg">DEVICE FLEET</h2>
        <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
      </div>

      <div className="flex-1 overflow-y-auto tactical-scrollbar p-4 space-y-4">
        {/* Fleet Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-tacticalGreen-400" />
              <span className="text-xs font-mono text-tactical-muted">ONLINE</span>
            </div>
            <span className="text-lg font-mono text-tacticalGreen-400">2</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-warning-400" />
              <span className="text-xs font-mono text-tactical-muted">WARNING</span>
            </div>
            <span className="text-lg font-mono text-warning-400">1</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-fire-400" />
              <span className="text-xs font-mono text-tactical-muted">OFFLINE</span>
            </div>
            <span className="text-lg font-mono text-fire-400">1</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Battery className="w-4 h-4 text-tactical-400" />
              <span className="text-xs font-mono text-tactical-muted">AVG BAT</span>
            </div>
            <span className="text-lg font-mono text-tactical-400">51%</span>
          </div>
        </div>

        {/* Devices List */}
        <div className="space-y-3">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.type)
            return (
              <div key={device.id} className={`tactical-panel p-4 rounded-lg border ${getStatusBg(device.status)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <DeviceIcon className={`w-5 h-5 ${getStatusColor(device.status)} mt-0.5`} />
                    <div className="flex-1">
                      <h3 className="font-mono text-sm text-tactical-300 mb-1">{device.name}</h3>
                      <p className="text-xs text-tactical-muted font-mono mb-2">{device.mission}</p>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-tactical-muted">TYPE: {device.type.toUpperCase()}</span>
                        <span className={`${getStatusColor(device.status)}`}>{device.status.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{device.lastSeen}</span>
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
                      <span className="text-tactical-300">{device.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <Activity className="w-3 h-3 text-tactical-400" />
                      <span className="text-tactical-muted">SPD:</span>
                      <span className="text-tactical-300">{device.speed}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <Target className="w-3 h-3 text-tactical-400" />
                      <span className="text-tactical-muted">HDG:</span>
                      <span className="text-tactical-300">{device.heading}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <Wifi className="w-3 h-3 text-tactical-400" />
                      <span className="text-tactical-muted">SIG:</span>
                      <span className="text-tactical-300">{device.signal}/5</span>
                    </div>
                  </div>
                </div>

                {/* Device Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted">
                    <span>ALT: {device.altitude}</span>
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
          })}
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
