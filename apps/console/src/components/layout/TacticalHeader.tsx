'use client'

import React from 'react'
import { 
  Menu, 
  X, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow, 
  Signal, 
  Clock,
  MapPin,
  Layers,
  Settings,
  User,
  Bell,
  AlertTriangle,
  Activity
} from 'lucide-react'

export interface TacticalHeaderProps {
  onMenuClick: () => void
  onOverlayToggle: () => void
  sidebarOpen: boolean
}

export function TacticalHeader({ 
  onMenuClick, 
  onOverlayToggle, 
  sidebarOpen 
}: TacticalHeaderProps) {
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [connectionStatus, setConnectionStatus] = React.useState<'online' | 'offline'>('online')
  const [batteryLevel, setBatteryLevel] = React.useState(87)
  const [signalStrength, setSignalStrength] = React.useState(4)
  const [alertCount, setAlertCount] = React.useState(3)

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="tactical-header border-b border-dark-700 bg-gradient-to-r from-dark-800 to-dark-900">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section - Menu & Branding */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md hover:bg-dark-700 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-tactical-400" /> : <Menu className="w-5 h-5 text-tactical-400" />}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-tactical-600 rounded-md flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="tactical-title text-lg">WILDFIRE OPS</h1>
              <p className="text-xs text-tactical-muted font-mono">TACTICAL COMMAND</p>
            </div>
          </div>
        </div>

        {/* Center Section - Status Indicators */}
        <div className="flex items-center gap-6">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connectionStatus === 'online' ? (
              <Wifi className="w-4 h-4 text-tacticalGreen-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-fire-400" />
            )}
            <span className="text-sm font-mono text-tactical-300">
              {connectionStatus.toUpperCase()}
            </span>
          </div>

          {/* Signal Strength */}
          <div className="flex items-center gap-2">
            <Signal className="w-4 h-4 text-tacticalGreen-400" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 rounded-sm ${
                    i < signalStrength ? 'bg-tacticalGreen-400' : 'bg-dark-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Battery Level */}
          <div className="flex items-center gap-2">
            {batteryLevel < 20 ? (
              <BatteryLow className="w-4 h-4 text-fire-400" />
            ) : (
              <Battery className="w-4 h-4 text-tacticalGreen-400" />
            )}
            <span className="text-sm font-mono text-tactical-300">
              {batteryLevel}%
            </span>
          </div>

          {/* Current Location */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tactical-400" />
            <span className="text-sm font-mono text-tactical-300">
              40.000°N, 120.000°W
            </span>
          </div>
        </div>

        {/* Right Section - Time, Alerts & Controls */}
        <div className="flex items-center gap-4">
          {/* Time Display */}
          <div className="text-right">
            <div className="tactical-subtitle text-lg font-mono">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-tactical-muted font-mono">
              {formatDate(currentTime)}
            </div>
          </div>

          {/* Alert Counter */}
          <button className="relative p-2 rounded-md hover:bg-dark-700 transition-colors">
            <Bell className="w-5 h-5 text-warning-400" />
            {alertCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-fire-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{alertCount}</span>
              </div>
            )}
          </button>

          {/* Critical Alert Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-fire-600/20 border border-fire-500/30">
            <AlertTriangle className="w-4 h-4 text-fire-400 animate-pulse" />
            <span className="text-sm font-mono text-fire-300">ALERT</span>
          </div>

          {/* Overlay Toggle */}
          <button
            onClick={onOverlayToggle}
            className="p-2 rounded-md hover:bg-dark-700 transition-colors"
            title="Tactical Overlay"
          >
            <Layers className="w-5 h-5 text-tactical-400" />
          </button>

          {/* Settings */}
          <button className="p-2 rounded-md hover:bg-dark-700 transition-colors">
            <Settings className="w-5 h-5 text-tactical-400" />
          </button>

          {/* User Profile */}
          <button className="p-2 rounded-md hover:bg-dark-700 transition-colors">
            <User className="w-5 h-5 text-tactical-400" />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-dark-900/50 border-t border-dark-700">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-6">
            <span className="text-tacticalGreen-400">SYSTEM: OPERATIONAL</span>
            <span className="text-tactical-400">GPS: LOCKED</span>
            <span className="text-tactical-400">SATELLITES: 12</span>
            <span className="text-tactical-400">ACCURACY: ±2m</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-tactical-400">MODE: TACTICAL</span>
            <span className="text-tactical-400">FREQ: 123.45 MHz</span>
            <span className="text-tactical-400">SQUAD: ALPHA-1</span>
          </div>
        </div>
      </div>
    </div>
  )
}
