'use client'

import React from 'react'
import { 
  Activity, 
  AlertTriangle, 
  Plane, 
  Map, 
  BarChart3, 
  Settings, 
  Users, 
  Radio,
  Camera,
  Flame,
  Wind,
  Thermometer,
  Gauge,
  Target,
  Zap,
  Shield,
  Eye,
  Layers,
  Navigation
} from 'lucide-react'

export interface TacticalSidebarProps {
  activePanel: string
  onPanelChange: (panel: string) => void
  open: boolean
}

export function TacticalSidebar({ activePanel, onPanelChange, open }: TacticalSidebarProps) {
  const menuItems = [
    {
      id: 'status',
      label: 'STATUS',
      icon: Activity,
      color: 'text-tacticalGreen-400',
      bgColor: 'bg-tacticalGreen-500/20',
      borderColor: 'border-tacticalGreen-500/30'
    },
    {
      id: 'alerts',
      label: 'ALERTS',
      icon: AlertTriangle,
      color: 'text-fire-400',
      bgColor: 'bg-fire-500/20',
      borderColor: 'border-fire-500/30',
      badge: 3
    },
    {
      id: 'devices',
      label: 'DEVICES',
      icon: Plane,
      color: 'text-tactical-400',
      bgColor: 'bg-tactical-500/20',
      borderColor: 'border-tactical-500/30'
    },
    {
      id: 'map',
      label: 'MAP',
      icon: Map,
      color: 'text-tactical-400',
      bgColor: 'bg-tactical-500/20',
      borderColor: 'border-tactical-500/30'
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      icon: BarChart3,
      color: 'text-tactical-400',
      bgColor: 'bg-tactical-500/20',
      borderColor: 'border-tactical-500/30'
    },
    {
      id: 'communications',
      label: 'COMMS',
      icon: Radio,
      color: 'text-tactical-400',
      bgColor: 'bg-tactical-500/20',
      borderColor: 'border-tactical-500/30'
    }
  ]

  const quickActions = [
    {
      id: 'triangulate',
      label: 'TRIANGULATE',
      icon: Target,
      color: 'text-warning-400',
      bgColor: 'bg-warning-500/20',
      borderColor: 'border-warning-500/30'
    },
    {
      id: 'simulate',
      label: 'SIMULATE',
      icon: Wind,
      color: 'text-tactical-400',
      bgColor: 'bg-tactical-500/20',
      borderColor: 'border-tactical-500/30'
    },
    {
      id: 'camera',
      label: 'CAMERA',
      icon: Camera,
      color: 'text-tactical-400',
      bgColor: 'bg-tactical-500/20',
      borderColor: 'border-tactical-500/30'
    },
    {
      id: 'layers',
      label: 'LAYERS',
      icon: Layers,
      color: 'text-tactical-400',
      bgColor: 'bg-tactical-500/20',
      borderColor: 'border-tactical-500/30'
    }
  ]

  const sensorData = [
    { label: 'TEMP', value: '32°C', icon: Thermometer, color: 'text-fire-400' },
    { label: 'WIND', value: '12 kts', icon: Wind, color: 'text-tactical-400' },
    { label: 'HUMIDITY', value: '45%', icon: Gauge, color: 'text-tactical-400' },
    { label: 'PRESSURE', value: '1013 hPa', icon: Gauge, color: 'text-tactical-400' }
  ]

  if (!open) {
    return (
      <div className="w-16 bg-dark-900 border-r border-dark-700 flex flex-col items-center py-4">
        {menuItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => onPanelChange(item.id)}
            className={`w-12 h-12 rounded-lg mb-3 flex items-center justify-center transition-all ${
              activePanel === item.id
                ? `${item.bgColor} ${item.borderColor} border shadow-glow`
                : 'hover:bg-dark-800'
            }`}
          >
            <item.icon className={`w-5 h-5 ${activePanel === item.id ? item.color : 'text-dark-400'}`} />
            {item.badge && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-fire-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{item.badge}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="w-80 bg-dark-900 border-r border-dark-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-700">
        <h2 className="tactical-title text-lg">TACTICAL MENU</h2>
        <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-4 space-y-2">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPanelChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all relative ${
                activePanel === item.id
                  ? `${item.bgColor} ${item.borderColor} border shadow-glow`
                  : 'hover:bg-dark-800'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activePanel === item.id ? item.color : 'text-dark-400'}`} />
              <span className={`text-sm font-mono ${activePanel === item.id ? item.color : 'text-dark-300'}`}>
                {item.label}
              </span>
              {item.badge && (
                <div className="ml-auto w-5 h-5 bg-fire-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{item.badge}</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-dark-700">
          <h3 className="text-xs font-mono text-tactical-muted mb-3">QUICK ACTIONS</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:bg-dark-800 ${action.bgColor} ${action.borderColor} border`}
              >
                <action.icon className={`w-4 h-4 ${action.color}`} />
                <span className={`text-xs font-mono ${action.color}`}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sensor Data */}
        <div className="pt-4 border-t border-dark-700">
          <h3 className="text-xs font-mono text-tactical-muted mb-3">SENSOR DATA</h3>
          <div className="space-y-2">
            {sensorData.map((sensor, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded bg-dark-800/50">
                <div className="flex items-center gap-2">
                  <sensor.icon className={`w-4 h-4 ${sensor.color}`} />
                  <span className="text-xs font-mono text-dark-300">{sensor.label}</span>
                </div>
                <span className={`text-xs font-mono ${sensor.color}`}>{sensor.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="pt-4 border-t border-dark-700">
          <h3 className="text-xs font-mono text-tactical-muted mb-3">SYSTEM STATUS</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-tacticalGreen-500/10 border border-tacticalGreen-500/20">
              <span className="text-xs font-mono text-tacticalGreen-400">GPS</span>
              <span className="text-xs font-mono text-tacticalGreen-400">LOCKED</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-tacticalGreen-500/10 border border-tacticalGreen-500/20">
              <span className="text-xs font-mono text-tacticalGreen-400">COMMS</span>
              <span className="text-xs font-mono text-tacticalGreen-400">ONLINE</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-warning-500/10 border border-warning-500/20">
              <span className="text-xs font-mono text-warning-400">BATTERY</span>
              <span className="text-xs font-mono text-warning-400">87%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-tactical-400" />
          <span className="text-xs font-mono text-tactical-400">SECURE CONNECTION</span>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-tactical-400" />
          <span className="text-xs font-mono text-tactical-muted">CLASSIFIED - EYES ONLY</span>
        </div>
      </div>
    </div>
  )
}
