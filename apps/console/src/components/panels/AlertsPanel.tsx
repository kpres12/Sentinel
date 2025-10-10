'use client'

import React from 'react'
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Flame, 
  Wind, 
  Thermometer,
  Zap,
  Shield,
  Eye,
  Target,
  Radio,
  Activity,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export function AlertsPanel() {
  const alerts = [
    { 
      id: '1', 
      type: 'critical', 
      title: 'HIGH FIRE RISK DETECTED',
      message: 'SECTOR 7 - IMMEDIATE ACTION REQUIRED', 
      time: '14:32:15',
      priority: 'PRIORITY 1',
      location: '40.123°N, 120.456°W',
      severity: 'CRITICAL',
      status: 'active'
    },
    { 
      id: '2', 
      type: 'warning', 
      title: 'ROBOT OFFLINE',
      message: 'FIRELINE CHARLIE - INVESTIGATING', 
      time: '14:28:42',
      priority: 'PRIORITY 2',
      location: '40.002°N, 120.002°W',
      severity: 'HIGH',
      status: 'investigating'
    },
    { 
      id: '3', 
      type: 'info', 
      title: 'WEATHER UPDATE',
      message: 'WIND SPEED INCREASING - MONITOR CLOSELY', 
      time: '14:25:18',
      priority: 'PRIORITY 3',
      location: 'SECTOR 5-8',
      severity: 'MEDIUM',
      status: 'monitoring'
    },
    { 
      id: '4', 
      type: 'success', 
      title: 'TRIANGULATION COMPLETE',
      message: 'SMOKE SOURCE LOCATED - SECTOR 3', 
      time: '14:20:33',
      priority: 'PRIORITY 2',
      location: '40.045°N, 120.123°W',
      severity: 'LOW',
      status: 'resolved'
    },
  ]

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return AlertTriangle
      case 'warning': return AlertCircle
      case 'info': return Activity
      case 'success': return CheckCircle
      default: return AlertTriangle
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'text-fire-400'
      case 'warning': return 'text-warning-400'
      case 'info': return 'text-tactical-400'
      case 'success': return 'text-tacticalGreen-400'
      default: return 'text-tactical-400'
    }
  }

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-fire-500/10 border-fire-500/30'
      case 'warning': return 'bg-warning-500/10 border-warning-500/30'
      case 'info': return 'bg-tactical-500/10 border-tactical-500/30'
      case 'success': return 'bg-tacticalGreen-500/10 border-tacticalGreen-500/30'
      default: return 'bg-tactical-500/10 border-tactical-500/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-fire-400'
      case 'investigating': return 'text-warning-400'
      case 'monitoring': return 'text-tactical-400'
      case 'resolved': return 'text-tacticalGreen-400'
      default: return 'text-tactical-400'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="tactical-header px-4 py-3 border-b border-dark-700">
        <h2 className="tactical-title text-lg">ALERT CENTER</h2>
        <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
      </div>

      <div className="flex-1 overflow-y-auto tactical-scrollbar p-4 space-y-4">
        {/* Alert Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-fire-400" />
              <span className="text-xs font-mono text-tactical-muted">CRITICAL</span>
            </div>
            <span className="text-lg font-mono text-fire-400">1</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-warning-400" />
              <span className="text-xs font-mono text-tactical-muted">WARNING</span>
            </div>
            <span className="text-lg font-mono text-warning-400">1</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-tactical-400" />
              <span className="text-xs font-mono text-tactical-muted">INFO</span>
            </div>
            <span className="text-lg font-mono text-tactical-400">1</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-tacticalGreen-400" />
              <span className="text-xs font-mono text-tactical-muted">RESOLVED</span>
            </div>
            <span className="text-lg font-mono text-tacticalGreen-400">1</span>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {alerts.map((alert) => {
            const AlertIcon = getAlertIcon(alert.type)
            return (
              <div key={alert.id} className={`tactical-panel p-4 rounded-lg border-l-4 ${getAlertBg(alert.type)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <AlertIcon className={`w-5 h-5 ${getAlertColor(alert.type)} mt-0.5`} />
                    <div className="flex-1">
                      <h3 className="font-mono text-sm text-tactical-300 mb-1">{alert.title}</h3>
                      <p className="text-xs text-tactical-muted font-mono mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-tactical-muted">PRIORITY: {alert.priority}</span>
                        <span className={`${getStatusColor(alert.status)}`}>{alert.status.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{alert.time}</span>
                    </div>
                    <span className="text-xs font-mono text-tactical-400">{alert.severity}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted">
                    <MapPin className="w-3 h-3" />
                    <span>{alert.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                      <Eye className="w-3 h-3 text-tactical-400" />
                    </button>
                    <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                      <Target className="w-3 h-3 text-tactical-400" />
                    </button>
                    <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                      <X className="w-3 h-3 text-tactical-400" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="tactical-subtitle mb-3">QUICK ACTIONS</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-fire-400" />
                <span className="text-sm font-mono text-tactical-300">TRIANGULATE</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">LOCATE SMOKE SOURCE</p>
            </button>
            <button className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Wind className="w-4 h-4 text-tactical-400" />
                <span className="text-sm font-mono text-tactical-300">SIMULATE</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">RUN SPREAD MODEL</p>
            </button>
            <button className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-tactical-400" />
                <span className="text-sm font-mono text-tactical-300">BROADCAST</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">SEND ALERT</p>
            </button>
            <button className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-tactical-400" />
                <span className="text-sm font-mono text-tactical-300">ACKNOWLEDGE</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">MARK AS READ</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
