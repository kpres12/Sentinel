'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
  Gauge,
  Menu,
  X,
  Layers
} from 'lucide-react'

const queryClient = new QueryClient()

export default function HomePage() {
  const [activePanel, setActivePanel] = useState<string>('status')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [overlayVisible, setOverlayVisible] = useState(false)

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col bg-dark-950 text-dark-100 overflow-hidden">
        {/* Tactical Header */}
        <div className="tactical-header border-b border-dark-700 bg-gradient-to-r from-dark-800 to-dark-900">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left Section - Menu & Branding */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
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
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-tacticalGreen-400" />
                <span className="text-sm font-mono text-tactical-300">ONLINE</span>
              </div>
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-tacticalGreen-400" />
                <span className="text-sm font-mono text-tactical-300">87%</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-tactical-400" />
                <span className="text-sm font-mono text-tactical-300">40.000°N, 120.000°W</span>
              </div>
            </div>

            {/* Right Section - Time, Alerts & Controls */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="tactical-subtitle text-lg font-mono">
                  {new Date().toLocaleTimeString('en-US', { hour12: false })}
                </div>
                <div className="text-xs text-tactical-muted font-mono">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                </div>
              </div>
              <button className="relative p-2 rounded-md hover:bg-dark-700 transition-colors">
                <AlertTriangle className="w-5 h-5 text-warning-400" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-fire-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">3</span>
                </div>
              </button>
              <button
                onClick={() => setOverlayVisible(!overlayVisible)}
                className="p-2 rounded-md hover:bg-dark-700 transition-colors"
              >
                <Layers className="w-5 h-5 text-tactical-400" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden relative">
          {/* Tactical Sidebar */}
          {sidebarOpen && (
            <div className="w-80 bg-dark-900 border-r border-dark-700 flex flex-col">
              <div className="p-4 border-b border-dark-700">
                <h2 className="tactical-title text-lg">TACTICAL MENU</h2>
                <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
              </div>

              <div className="flex-1 p-4 space-y-2">
                <button
                  onClick={() => setActivePanel('status')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'status' ? 'bg-tactical-500/20 border border-tactical-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <Activity className="w-5 h-5 text-tacticalGreen-400" />
                  <span className="text-sm font-mono text-tactical-300">STATUS</span>
                </button>
                <button
                  onClick={() => setActivePanel('alerts')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'alerts' ? 'bg-fire-500/20 border border-fire-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 text-fire-400" />
                  <span className="text-sm font-mono text-tactical-300">ALERTS</span>
                  <div className="ml-auto w-5 h-5 bg-fire-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">3</span>
                  </div>
                </button>
                <button
                  onClick={() => setActivePanel('devices')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'devices' ? 'bg-tactical-500/20 border border-tactical-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <Plane className="w-5 h-5 text-tactical-400" />
                  <span className="text-sm font-mono text-tactical-300">DEVICES</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 flex flex-col relative">
            {/* Main Map Area */}
            <div className="flex-1 relative bg-dark-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-tactical-600 rounded-full flex items-center justify-center mb-6 mx-auto animate-pulse">
                    <span className="text-4xl">🗺️</span>
                  </div>
                  <h2 className="tactical-subtitle text-2xl mb-4">TACTICAL MAP</h2>
                  <p className="text-tactical-300 mb-8">MapLibre GL integration ready</p>
                </div>
              </div>
              
              {/* Tactical Overlay */}
              {overlayVisible && (
                <div className="absolute top-4 left-4 tactical-panel rounded-lg p-4">
                  <h3 className="tactical-subtitle mb-3">TACTICAL TOOLS</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="flex flex-col items-center gap-1 p-2 rounded hover:bg-dark-700 transition-all">
                      <Target className="w-4 h-4 text-fire-400" />
                      <span className="text-xs font-mono text-tactical-300">TARGET</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 p-2 rounded hover:bg-dark-700 transition-all">
                      <Wind className="w-4 h-4 text-tactical-400" />
                      <span className="text-xs font-mono text-tactical-300">WIND</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 p-2 rounded hover:bg-dark-700 transition-all">
                      <Flame className="w-4 h-4 text-fire-500" />
                      <span className="text-xs font-mono text-tactical-300">FIRE</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Bottom Panel */}
            <div className="h-80 border-t border-dark-700 bg-dark-900/95 backdrop-blur-sm">
              {activePanel === 'status' && (
                <div className="h-full flex flex-col">
                  <div className="tactical-header px-4 py-3 border-b border-dark-700">
                    <h2 className="tactical-title text-lg">SYSTEM STATUS</h2>
                    <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="tactical-panel p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Plane className="w-4 h-4 text-tacticalGreen-400" />
                          <span className="text-xs font-mono text-tactical-300">FIRELINE ALPHA</span>
                        </div>
                        <div className="text-sm font-mono text-tacticalGreen-400">ONLINE</div>
                        <div className="text-xs text-tactical-muted">Battery: 87%</div>
                      </div>
                      <div className="tactical-panel p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Plane className="w-4 h-4 text-tacticalGreen-400" />
                          <span className="text-xs font-mono text-tactical-300">SURVEILLANCE BRAVO</span>
                        </div>
                        <div className="text-sm font-mono text-tacticalGreen-400">ONLINE</div>
                        <div className="text-xs text-tactical-muted">Battery: 92%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activePanel === 'alerts' && (
                <div className="h-full flex flex-col">
                  <div className="tactical-header px-4 py-3 border-b border-dark-700">
                    <h2 className="tactical-title text-lg">ALERT CENTER</h2>
                    <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="tactical-panel p-4 rounded-lg border-l-4 border-fire-500 bg-fire-500/10">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-mono text-sm text-tactical-300 mb-1">HIGH FIRE RISK DETECTED</h3>
                          <p className="text-xs text-tactical-muted font-mono mb-1">SECTOR 7 - IMMEDIATE ACTION REQUIRED</p>
                          <p className="text-xs font-mono text-tactical-muted">PRIORITY 1</p>
                        </div>
                        <AlertTriangle className="w-4 h-4 text-fire-400 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted">
                        <Clock className="w-3 h-3" />
                        <span>14:32:15</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activePanel === 'devices' && (
                <div className="h-full flex flex-col">
                  <div className="tactical-header px-4 py-3 border-b border-dark-700">
                    <h2 className="tactical-title text-lg">DEVICE FLEET</h2>
                    <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="tactical-panel p-4 rounded-lg border border-tacticalGreen-500/30 bg-tacticalGreen-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-tacticalGreen-400 animate-pulse" />
                          <div>
                            <p className="font-mono text-sm text-tactical-300">FIRELINE ALPHA</p>
                            <p className="text-xs text-tactical-muted font-mono">40.000°N, 120.000°W</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono text-tactical-300">87%</p>
                          <p className="text-xs text-tactical-muted font-mono">ONLINE</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  )
}
