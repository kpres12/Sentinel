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
import { useSummitAlerts } from '../../hooks/useSummit'
import { format } from 'date-fns'

export function AlertsPanel() {
  const { alerts, isLoading, isConnected, acknowledgeAlert, isAcknowledging } = useSummitAlerts()

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertTriangle
      case 'high': return AlertCircle
      case 'medium': return Activity
      case 'low': return CheckCircle
      default: return AlertTriangle
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-fire-400'
      case 'high': return 'text-warning-400'
      case 'medium': return 'text-tactical-400'
      case 'low': return 'text-tacticalGreen-400'
      default: return 'text-tactical-400'
    }
  }

  const getAlertBg = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-fire-500/10 border-fire-500/30'
      case 'high': return 'bg-warning-500/10 border-warning-500/30'
      case 'medium': return 'bg-tactical-500/10 border-tactical-500/30'
      case 'low': return 'bg-tacticalGreen-500/10 border-tacticalGreen-500/30'
      default: return 'bg-tactical-500/10 border-tactical-500/30'
    }
  }

  const getStatusColor = (acknowledged: boolean) => {
    return acknowledged ? 'text-tacticalGreen-400' : 'text-fire-400'
  }

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert(alertId)
  }

  // Calculate alert summary
  const alertSummary = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="tactical-header px-4 py-3 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="tactical-title text-lg">ALERT CENTER</h2>
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
        {/* Alert Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-fire-400" />
              <span className="text-xs font-mono text-tactical-muted">CRITICAL</span>
            </div>
            <span className="text-lg font-mono text-fire-400">{alertSummary.critical}</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-warning-400" />
              <span className="text-xs font-mono text-tactical-muted">HIGH</span>
            </div>
            <span className="text-lg font-mono text-warning-400">{alertSummary.high}</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-tactical-400" />
              <span className="text-xs font-mono text-tactical-muted">MEDIUM</span>
            </div>
            <span className="text-lg font-mono text-tactical-400">{alertSummary.medium}</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-tacticalGreen-400" />
              <span className="text-xs font-mono text-tactical-muted">LOW</span>
            </div>
            <span className="text-lg font-mono text-tacticalGreen-400">{alertSummary.low}</span>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="tactical-panel p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2">
                <Activity className="w-4 h-4 text-tactical-400 animate-pulse" />
                <span className="text-sm font-mono text-tactical-muted">LOADING ALERTS...</span>
              </div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="tactical-panel p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-tacticalGreen-400" />
                <span className="text-sm font-mono text-tactical-muted">NO ACTIVE ALERTS</span>
              </div>
            </div>
          ) : (
            alerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.severity)
              return (
                <div key={alert.id} className={`tactical-panel p-4 rounded-lg border-l-4 ${getAlertBg(alert.severity)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <AlertIcon className={`w-5 h-5 ${getAlertColor(alert.severity)} mt-0.5`} />
                      <div className="flex-1">
                        <h3 className="font-mono text-sm text-tactical-300 mb-1">{alert.title}</h3>
                        <p className="text-xs text-tactical-muted font-mono mb-2">{alert.description}</p>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-tactical-muted">TYPE: {alert.type.toUpperCase()}</span>
                          <span className={`${getStatusColor(alert.acknowledged)}`}>
                            {alert.acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(alert.timestamp), 'HH:mm:ss')}</span>
                      </div>
                      <span className="text-xs font-mono text-tactical-400">{alert.severity.toUpperCase()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted">
                      <MapPin className="w-3 h-3" />
                      <span>{alert.location.lat.toFixed(3)}°N, {alert.location.lng.toFixed(3)}°W</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                        <Eye className="w-3 h-3 text-tactical-400" />
                      </button>
                      <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                        <Target className="w-3 h-3 text-tactical-400" />
                      </button>
                      {!alert.acknowledged && (
                        <button 
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={isAcknowledging}
                          className="p-1 rounded hover:bg-dark-700 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3 text-tacticalGreen-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
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
