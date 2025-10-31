'use client'

import * as React from 'react'
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
  Layers,
  Camera,
  Settings
} from 'lucide-react'
import { Sliders } from 'lucide-react'
import { AlertsPanel } from '../components/panels/AlertsPanel'
import { TracksPanel as DevicesPanel } from '../components/panels/TracksPanel'
import { ApiMissionsPanel as MissionsPanel } from '../components/panels/ApiMissionsPanel'
import { DroneControlPanel } from '../components/controls/DroneControlPanel'
import { KOFAMissionPanel } from '../components/controls/KOFAMissionPanel'
import { VideoFeedPanel } from '../components/panels/VideoFeedPanel'
import { SettingsPanel } from '../components/panels/SettingsPanel'
import { ToastProvider } from '../components/ui/Toast'
import { useBackendConnectivity } from '../hooks/useSummit'
import { useFeature } from '../flags/FeatureFlags'

const queryClient = new QueryClient()

function HomePageContent() {
  const [activePanel, setActivePanel] = useState<string>('status')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [terrainVisible, setTerrainVisible] = useState(true)
  const [mapPoppedOut, setMapPoppedOut] = useState(false)
  const [popupWindow, setPopupWindow] = useState<Window | null>(null)
  const { mqttConnected, wsConnected } = useBackendConnectivity()

  // Feature gates
  const showRisk = useFeature('ui.widgets.fireProgress', true)
  const showDeployment = useFeature('mission.templates.emberDamp', true)
  const showControl = useFeature('mission.templates.emberDamp', true)
  const showChaos = useFeature('ui.widgets.chaosLab', true)

  const openPopupWindow = () => {
    const popup = window.open('', 'mapPopup', 'width=1200,height=800,resizable=yes,scrollbars=yes,status=yes')
    if (popup) {
      setPopupWindow(popup)
      setMapPoppedOut(true)
      
      // Write the popup content
      popup.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sentinel Operations Map</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; padding: 0; background: #0f0f0f; color: #e5e5e5; font-family: 'JetBrains Mono', monospace; }
            .tactical-header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-bottom: 1px solid #404040; }
            .tactical-400 { color: #60a5fa; }
            .tactical-300 { color: #94a3b8; }
            .tactical-muted { color: #6b7280; }
            .fire-400 { color: #f87171; }
            .tacticalGreen-400 { color: #4ade80; }
            .warning-400 { color: #fbbf24; }
            .dark-800 { background-color: #1f2937; }
            .dark-900 { background-color: #111827; }
            .dark-700 { border-color: #374151; }
            .border-fire-500 { border-color: #ef4444; }
            .border-tacticalGreen-500 { border-color: #22c55e; }
            .border-warning-500 { border-color: #f59e0b; }
            .bg-fire-500 { background-color: #ef4444; }
            .bg-tacticalGreen-500 { background-color: #22c55e; }
            .bg-warning-500 { background-color: #f59e0b; }
            .shadow-glow { box-shadow: 0 0 20px rgba(96, 165, 250, 0.3); }
            .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
          </style>
        </head>
        <body>
          <div class="h-screen flex flex-col bg-dark-950 text-dark-100">
            <!-- Header -->
            <div class="tactical-header border-b border-dark-700 bg-gradient-to-r from-dark-800 to-dark-900">
              <div class="flex items-center justify-between px-4 py-3">
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-fire-500 rounded-lg flex items-center justify-center">
                      <span class="text-white text-lg">🔥</span>
                    </div>
                    <div>
                      <h1 class="text-xl font-bold text-tactical-400">BIGMT.AI SENTINEL</h1>
                      <p class="text-sm text-tactical-muted">INTELLIGENCE PLATFORM</p>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button onclick="window.close()" class="px-4 py-2 bg-fire-500/20 border border-fire-500/30 rounded text-sm font-mono text-fire-400 hover:bg-fire-500/30 transition-all">
                    CLOSE
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Map Content -->
            <div class="flex-1 relative bg-dark-900">
              <div class="absolute inset-0 bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 z-10">
                <!-- Terrain simulation -->
                <div class="absolute inset-0 opacity-40">
                  <div class="absolute top-1/4 left-1/4 w-48 h-48 bg-green-600/50 rounded-full blur-lg"></div>
                  <div class="absolute top-1/3 right-1/3 w-36 h-36 bg-green-500/40 rounded-full blur-lg"></div>
                  <div class="absolute bottom-1/3 left-1/3 w-60 h-60 bg-yellow-600/40 rounded-full blur-lg"></div>
                  <div class="absolute bottom-1/4 right-1/4 w-42 h-42 bg-orange-600/50 rounded-full blur-lg"></div>
                </div>
                
                <!-- Fire Perimeter Simulation -->
                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div class="w-40 h-40 border-4 border-red-500 rounded-full animate-pulse bg-red-500/30 shadow-lg shadow-red-500/50"></div>
                  <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-4 border-red-400 rounded-full bg-red-400/40 shadow-lg shadow-red-400/50"></div>
                  <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/70"></div>
                </div>
                
                <!-- Sensor Network Simulation -->
                <div class="absolute top-1/4 left-1/4 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <div class="absolute top-1/3 right-1/3 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <div class="absolute bottom-1/3 left-1/3 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <div class="absolute bottom-1/4 right-1/4 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <div class="absolute top-1/2 left-1/6 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <div class="absolute top-1/6 right-1/6 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                
                <!-- Device Locations -->
                <div class="absolute top-1/5 left-1/5 w-6 h-6 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                <div class="absolute top-2/5 right-1/5 w-6 h-6 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                <div class="absolute bottom-1/5 left-2/5 w-6 h-6 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                <div class="absolute bottom-2/5 right-2/5 w-6 h-6 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                
                <!-- Risk Zones -->
                <div class="absolute top-1/3 left-1/6 w-24 h-24 border-4 border-red-500/80 rounded-full bg-red-500/20 animate-pulse shadow-lg shadow-red-500/30"></div>
                <div class="absolute bottom-1/3 right-1/6 w-20 h-20 border-4 border-orange-500/80 rounded-full bg-orange-500/20 animate-pulse shadow-lg shadow-orange-500/30"></div>
                <div class="absolute top-2/3 left-2/3 w-16 h-16 border-4 border-yellow-500/80 rounded-full bg-yellow-500/20 animate-pulse shadow-lg shadow-yellow-500/30"></div>
                
                <!-- Wind Direction Indicator -->
                <div class="absolute top-4 left-4 z-20">
                  <div class="flex items-center gap-2 bg-dark-800/80 backdrop-blur-sm rounded-lg p-2 border border-dark-700">
                    <span class="text-xs font-mono text-tactical-300">🌪️ 22 mph NW</span>
                  </div>
                </div>
                
                <!-- Fire Status Indicator -->
                <div class="absolute bottom-4 left-4">
                  <div class="flex items-center gap-2 bg-dark-800/80 backdrop-blur-sm rounded-lg p-2 border border-fire-500/50">
                    <div class="w-2 h-2 bg-fire-400 rounded-full animate-pulse"></div>
                    <span class="text-xs font-mono text-fire-400">ACTIVE FIRE</span>
                  </div>
                </div>
                
                <!-- Scale Indicator -->
                <div class="absolute bottom-4 right-4">
                  <div class="bg-dark-800/80 backdrop-blur-sm rounded-lg p-2 border border-dark-700">
                    <div class="w-16 h-1 bg-tactical-400 mb-1"></div>
                    <span class="text-xs font-mono text-tactical-muted">1 mile</span>
                  </div>
                </div>
                
                <!-- Map Title -->
                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div class="text-center">
                    <h2 class="text-2xl font-bold text-white/80 mb-2 drop-shadow-lg">WILDFIRE OPERATIONS MAP</h2>
                    <p class="text-sm text-white/60 font-mono">SECTOR 7 - ACTIVE FIRE DETECTED</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `)
      
      popup.document.close()
    }
  }

  const closePopupWindow = () => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close()
    }
    setPopupWindow(null)
    setMapPoppedOut(false)
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <div className="min-h-screen bg-dark-950 text-dark-100">
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
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-tactical-400">SENTINEL OPS</h1>
                  </div>
                </div>
            </div>

            {/* Center Section - Status Indicators */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Wifi className={`w-4 h-4 ${mqttConnected ? 'text-tacticalGreen-400' : 'text-fire-400'}`} />
                <span className="text-sm font-mono text-tactical-300">
                  {mqttConnected ? 'MQTT ONLINE' : 'MQTT OFFLINE'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className={`w-4 h-4 ${wsConnected ? 'text-tacticalGreen-400' : 'text-fire-400'}`} />
                <span className="text-sm font-mono text-tactical-300">
                  {wsConnected ? 'WS ONLINE' : 'WS OFFLINE'}
                </span>
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
                  <span suppressHydrationWarning>
                    {new Date().toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
                <div className="text-xs text-tactical-muted font-mono">
                  <span suppressHydrationWarning>
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </span>
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
                  <button
                    onClick={async () => {
                      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
                      const lat = 40.0 + (Math.random() - 0.5) * 0.01
                      const lon = -120.0 + (Math.random() - 0.5) * 0.01
                      const payload = {
                        type: 'fire',
                        confidence: 0.9,
                        lat,
                        lon,
                        timestamp: new Date().toISOString(),
                        source_id: 'console-sim'
                      }
                      try {
                        await fetch(`${api}/api/v1/detections/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                      } catch (e) { console.error('simulate detection failed', e) }
                    }}
                    className="p-2 rounded-md hover:bg-dark-700 transition-colors"
                    title="Simulate detection"
                  >
                    <Flame className="w-5 h-5 text-fire-400" />
                  </button>
                  <button
                    onClick={openPopupWindow}
                    className="p-2 rounded-md hover:bg-dark-700 transition-colors"
                    title="Pop out map"
                  >
                    <MapPin className="w-5 h-5 text-tactical-400" />
                  </button>
            </div>
          </div>
        </div>
        
        <div className="flex relative">
          {/* Tactical Sidebar */}
          {sidebarOpen && (
            <div className="w-80 bg-dark-900 border-r border-dark-700 flex flex-col">
              <div className="p-4 border-b border-dark-700">
                <h2 className="text-lg font-bold text-tactical-400">MENU</h2>
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
                {showRisk && (
                  <button
                    onClick={() => setActivePanel('risk')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      activePanel === 'risk' ? 'bg-warning-500/20 border border-warning-500/30 shadow-glow' : 'hover:bg-dark-800'
                    }`}
                  >
                    <Flame className="w-5 h-5 text-warning-400" />
                    <span className="text-sm font-mono text-tactical-300">RISK MODEL</span>
                  </button>
                )}
                <button
                  onClick={() => setActivePanel('weather')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'weather' ? 'bg-tactical-500/20 border border-tactical-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <Wind className="w-5 h-5 text-tactical-400" />
                  <span className="text-sm font-mono text-tactical-300">WEATHER</span>
                </button>
                <button
                  onClick={() => setActivePanel('sensors')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'sensors' ? 'bg-tacticalGreen-500/20 border border-tacticalGreen-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <Eye className="w-5 h-5 text-tacticalGreen-400" />
                  <span className="text-sm font-mono text-tactical-300">SENSORS</span>
                </button>
                <button
                  onClick={() => setActivePanel('prediction')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'prediction' ? 'bg-fire-500/20 border border-fire-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <Target className="w-5 h-5 text-fire-400" />
                  <span className="text-sm font-mono text-tactical-300">SPREAD MODEL</span>
                </button>
                {showDeployment && (
                  <button
                    onClick={() => setActivePanel('deployment')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      activePanel === 'deployment' ? 'bg-tacticalGreen-500/20 border border-tacticalGreen-500/30 shadow-glow' : 'hover:bg-dark-800'
                    }`}
                  >
                    <Zap className="w-5 h-5 text-tacticalGreen-400" />
                    <span className="text-sm font-mono text-tactical-300">DEPLOY</span>
                  </button>
                )}
                <button
                  onClick={() => setActivePanel('missions')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'missions' ? 'bg-tactical-500/20 border border-tactical-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <Radio className="w-5 h-5 text-tactical-400" />
                  <span className="text-sm font-mono text-tactical-300">MISSIONS</span>
                </button>
                <button
                  onClick={() => setActivePanel('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'settings' ? 'bg-tactical-500/20 border border-tactical-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <Settings className="w-5 h-5 text-tactical-400" />
                  <span className="text-sm font-mono text-tactical-300">SETTINGS</span>
                </button>
                {showControl && (
                  <button
                    onClick={() => setActivePanel('control')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      activePanel === 'control' ? 'bg-tactical-500/20 border border-tactical-500/30 shadow-glow' : 'hover:bg-dark-800'
                    }`}
                  >
                    <Zap className="w-5 h-5 text-tactical-400" />
                    <span className="text-sm font-mono text-tactical-300">CONTROL</span>
                  </button>
                )}
                <button
                  onClick={() => setActivePanel('video')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'video' ? 'bg-tactical-500/20 border border-tactical-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <Camera className="w-5 h-5 text-tactical-400" />
                  <span className="text-sm font-mono text-tactical-300">VIDEO FEEDS</span>
                </button>
                <button
                  onClick={() => setActivePanel('intelligence')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activePanel === 'intelligence' ? 'bg-warning-500/20 border border-warning-500/30 shadow-glow' : 'hover:bg-dark-800'
                  }`}
                >
                  <Shield className="w-5 h-5 text-warning-400" />
                  <span className="text-sm font-mono text-tactical-300">INTELLIGENCE</span>
                </button>
                {showChaos && (
                  <button
                    onClick={() => setActivePanel('chaos')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      activePanel === 'chaos' ? 'bg-tactical-500/20 border border-tactical-500/30 shadow-glow' : 'hover:bg-dark-800'
                    }`}
                  >
                    <Sliders className="w-5 h-5 text-tactical-400" />
                    <span className="text-sm font-mono text-tactical-300">CHAOS LAB</span>
                  </button>
                )}
              </div>
            </div>
          )}
          
          <div className="flex-1 flex flex-col relative">
            {/* Main Map Area */}
                <div className="flex-1 relative bg-dark-900 min-h-[600px]">
                  {/* Simulated Map Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 z-10">
                    {/* Terrain simulation - toggleable */}
                    {terrainVisible && (
                      <div className="absolute inset-0 opacity-40">
                        <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-green-600/50 rounded-full blur-lg"></div>
                        <div className="absolute top-1/3 right-1/3 w-36 h-36 bg-green-500/40 rounded-full blur-lg"></div>
                        <div className="absolute bottom-1/3 left-1/3 w-60 h-60 bg-yellow-600/40 rounded-full blur-lg"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-42 h-42 bg-orange-600/50 rounded-full blur-lg"></div>
                      </div>
                    )}
                    
                    {/* Fire Perimeter Simulation - much more visible */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-40 h-40 border-4 border-red-500 rounded-full animate-pulse bg-red-500/30 shadow-lg shadow-red-500/50"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-4 border-red-400 rounded-full bg-red-400/40 shadow-lg shadow-red-400/50"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/70"></div>
                    </div>
                    
                    {/* Sensor Network Simulation - larger and more visible */}
                    <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <div className="absolute top-1/2 left-1/6 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <div className="absolute top-1/6 right-1/6 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    
                    {/* Device Locations - larger and more visible */}
                    {/* FireWatch Towers (Fixed positions) */}
                    <div className="absolute top-1/5 left-1/5 w-6 h-6 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                    <div className="absolute top-1/5 left-1/5 -mt-8 -ml-2">
                      <span className="text-xs font-mono text-blue-400 bg-dark-800/80 px-1 rounded">FireWatch Alpha</span>
                    </div>
                    
                    <div className="absolute top-2/5 right-1/5 w-6 h-6 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                    <div className="absolute top-2/5 right-1/5 -mt-8 -ml-2">
                      <span className="text-xs font-mono text-blue-400 bg-dark-800/80 px-1 rounded">FireWatch Bravo</span>
                    </div>
                    
                    {/* KOFA Bots (Ground positions) */}
                    <div className="absolute bottom-1/5 left-2/5 w-6 h-6 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <div className="absolute bottom-1/5 left-2/5 -mt-8 -ml-2">
                      <span className="text-xs font-mono text-green-400 bg-dark-800/80 px-1 rounded">KOFA Alpha</span>
                    </div>
                    
                    <div className="absolute bottom-2/5 right-2/5 w-6 h-6 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <div className="absolute bottom-2/5 right-2/5 -mt-8 -ml-2">
                      <span className="text-xs font-mono text-green-400 bg-dark-800/80 px-1 rounded">KOFA Bravo</span>
                    </div>
                    
                    {/* FireFly Drones (Air positions) */}
                    <div className="absolute top-1/3 left-1/3 w-5 h-5 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50"></div>
                    <div className="absolute top-1/3 left-1/3 -mt-8 -ml-2">
                      <span className="text-xs font-mono text-yellow-400 bg-dark-800/80 px-1 rounded">FireFly Alpha</span>
                    </div>
                    
                    <div className="absolute top-1/2 right-1/3 w-5 h-5 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50"></div>
                    <div className="absolute top-1/2 right-1/3 -mt-8 -ml-2">
                      <span className="text-xs font-mono text-yellow-400 bg-dark-800/80 px-1 rounded">FireFly Bravo</span>
                    </div>
                    
                    {/* Risk Zones - much more visible */}
                    <div className="absolute top-1/3 left-1/6 w-24 h-24 border-4 border-red-500/80 rounded-full bg-red-500/20 animate-pulse shadow-lg shadow-red-500/30"></div>
                    <div className="absolute bottom-1/3 right-1/6 w-20 h-20 border-4 border-orange-500/80 rounded-full bg-orange-500/20 animate-pulse shadow-lg shadow-orange-500/30"></div>
                    <div className="absolute top-2/3 left-2/3 w-16 h-16 border-4 border-yellow-500/80 rounded-full bg-yellow-500/20 animate-pulse shadow-lg shadow-yellow-500/30"></div>
                    
                    {/* Wind Direction Indicator */}
                    <div className="absolute top-4 left-4 z-20">
                      <div className="flex items-center gap-2 bg-dark-800/80 backdrop-blur-sm rounded-lg p-2 border border-dark-700">
                        <Wind className="w-4 h-4 text-tactical-400" />
                        <span className="text-xs font-mono text-tactical-300">22 mph NW</span>
                      </div>
                    </div>
                    
                    {/* Fire Status Indicator */}
                    <div className="absolute top-16 left-4 z-20">
                      <div className="flex items-center gap-2 bg-dark-800/80 backdrop-blur-sm rounded-lg p-2 border border-fire-500/50">
                        <div className="w-2 h-2 bg-fire-400 rounded-full animate-pulse"></div>
                        <span className="text-xs font-mono text-fire-400">ACTIVE FIRE</span>
                      </div>
                    </div>
                    
                    {/* Scale Indicator */}
                    <div className="absolute bottom-4 left-4">
                      <div className="bg-dark-800/80 backdrop-blur-sm rounded-lg p-2 border border-dark-700">
                        <div className="w-16 h-1 bg-tactical-400 mb-1"></div>
                        <span className="text-xs font-mono text-tactical-muted">1 mile</span>
                      </div>
                    </div>
                    
                    {/* Device Legend */}
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-dark-800/80 backdrop-blur-sm rounded-lg p-3 border border-dark-700">
                        <h4 className="text-xs font-mono text-tactical-300 mb-2">DEVICE LEGEND</h4>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                            <span className="text-xs font-mono text-tactical-muted">FireWatch Towers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span className="text-xs font-mono text-tactical-muted">KOFA Bots</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                            <span className="text-xs font-mono text-tactical-muted">FireFly Drones</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs font-mono text-tactical-muted">Sensor Network</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Map Title */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-white/80 mb-2 drop-shadow-lg">SENTINEL OPERATIONS MAP</h2>
                        <p className="text-sm text-white/60 font-mono">SECTOR 7 - ACTIVE FIRE DETECTED</p>
                      </div>
                    </div>
                  </div>
              
                  {/* Map Overlay */}
                  {overlayVisible && (
                    <div className="absolute top-4 left-4 bg-dark-800 rounded-lg p-4 border border-dark-700">
                      <h3 className="text-sm font-bold text-tactical-400 mb-3">MAP TOOLS</h3>
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
                  
                  {/* Terrain Toggle */}
                  <div className="absolute top-4 right-4 bg-dark-800 rounded-lg p-3 border border-dark-700 z-30">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTerrainVisible(!terrainVisible)}
                        className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                          terrainVisible 
                            ? 'bg-tacticalGreen-500/20 border border-tacticalGreen-500/30 text-tacticalGreen-400' 
                            : 'bg-dark-700 border border-dark-600 text-tactical-muted'
                        }`}
                      >
                        TERRAIN
                      </button>
                      <button
                        onClick={openPopupWindow}
                        className="px-3 py-1 rounded text-xs font-mono bg-tactical-500/20 border border-tactical-500/30 text-tactical-400 hover:bg-tactical-500/30 transition-all"
                      >
                        POP OUT
                      </button>
                    </div>
                  </div>
            </div>
            
            {/* Bottom Panel */}
            <div className="min-h-[400px] border-t border-dark-700 bg-dark-900/95 backdrop-blur-sm">
                  {activePanel === 'status' && (
                    <div className="h-full flex flex-col">
                      <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-bold text-tactical-400">SYSTEM STATUS</h2>
                      </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-dark-800 p-3 rounded-lg border border-dark-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Plane className="w-4 h-4 text-tacticalGreen-400" />
                          <span className="text-xs font-mono text-tactical-300">KOFA ALPHA</span>
                        </div>
                        <div className="text-sm font-mono text-tacticalGreen-400">ONLINE</div>
                        <div className="text-xs text-tactical-muted">Battery: 87% | Speed: 12 mph</div>
                        <div className="text-xs text-tactical-muted">Location: 40.123°N, 120.456°W</div>
                      </div>
                      <div className="bg-dark-800 p-3 rounded-lg border border-dark-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Plane className="w-4 h-4 text-tacticalGreen-400" />
                          <span className="text-xs font-mono text-tactical-300">FIREFLY BRAVO</span>
                        </div>
                        <div className="text-sm font-mono text-tacticalGreen-400">ONLINE</div>
                        <div className="text-xs text-tactical-muted">Battery: 92% | Altitude: 1,200 ft</div>
                        <div className="text-xs text-tactical-muted">Location: 40.089°N, 120.234°W</div>
                      </div>
                      <div className="bg-dark-800 p-3 rounded-lg border border-dark-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Plane className="w-4 h-4 text-tacticalGreen-400" />
                          <span className="text-xs font-mono text-tactical-300">KOFA CHARLIE</span>
                        </div>
                        <div className="text-sm font-mono text-tacticalGreen-400">ONLINE</div>
                        <div className="text-xs text-tactical-muted">Battery: 78% | Speed: 8 mph</div>
                        <div className="text-xs text-tactical-muted">Location: 40.156°N, 120.345°W</div>
                      </div>
                      <div className="bg-dark-800 p-3 rounded-lg border border-dark-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Plane className="w-4 h-4 text-tacticalGreen-400" />
                          <span className="text-xs font-mono text-tactical-300">RESCUE DELTA</span>
                        </div>
                        <div className="text-sm font-mono text-tacticalGreen-400">ONLINE</div>
                        <div className="text-xs text-tactical-muted">Battery: 95% | Altitude: 800 ft</div>
                        <div className="text-xs text-tactical-muted">Location: 40.067°N, 120.178°W</div>
                      </div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg border border-dark-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-tactical-400" />
                        <span className="text-sm font-mono text-tactical-300">SYSTEM METRICS</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">TOTAL DEVICES</p>
                          <p className="text-lg font-mono text-tacticalGreen-400">12</p>
                        </div>
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">ONLINE</p>
                          <p className="text-lg font-mono text-tacticalGreen-400">11</p>
                        </div>
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">COVERAGE</p>
                          <p className="text-lg font-mono text-tactical-400">94%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
                  {activePanel === 'alerts' && <AlertsPanel />}
              
                  {activePanel === 'devices' && <DevicesPanel />}
                  
                  {activePanel === 'settings' && (
                    <SettingsPanel />
                  )}
                  
                  {showRisk && activePanel === 'risk' && (
                    <div className="h-full flex flex-col">
                      <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-bold text-tactical-400">RISK MODELING</h2>
                      </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="bg-dark-800 p-4 rounded-lg border border-fire-500/30 bg-fire-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-4 h-4 text-fire-400" />
                        <span className="text-sm font-mono text-tactical-300">EXTREME RISK ZONE</span>
                      </div>
                      <div className="text-sm font-mono text-fire-400">SECTOR 7 - 98% RISK</div>
                      <div className="text-xs text-tactical-muted">Fuel moisture: 6% | Wind: 22 mph NW | Temp: 94°F</div>
                      <div className="text-xs text-tactical-muted">Vegetation: Dense chaparral | Slope: 15°</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg border border-warning-500/30 bg-warning-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-4 h-4 text-warning-400" />
                        <span className="text-sm font-mono text-tactical-300">HIGH RISK ZONE</span>
                      </div>
                      <div className="text-sm font-mono text-warning-400">SECTOR 3 - 87% RISK</div>
                      <div className="text-xs text-tactical-muted">Fuel moisture: 9% | Wind: 18 mph | Temp: 89°F</div>
                      <div className="text-xs text-tactical-muted">Vegetation: Mixed conifer | Slope: 8°</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg border border-tactical-500/30 bg-tactical-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Thermometer className="w-4 h-4 text-tactical-400" />
                        <span className="text-sm font-mono text-tactical-300">MODERATE RISK</span>
                      </div>
                      <div className="text-sm font-mono text-tactical-400">SECTOR 1 - 45% RISK</div>
                      <div className="text-xs text-tactical-muted">Fuel moisture: 15% | Wind: 6 mph | Temp: 78°F</div>
                      <div className="text-xs text-tactical-muted">Vegetation: Oak woodland | Slope: 3°</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg border border-tacticalGreen-500/30 bg-tacticalGreen-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-tacticalGreen-400" />
                        <span className="text-sm font-mono text-tactical-300">LOW RISK ZONE</span>
                      </div>
                      <div className="text-sm font-mono text-tacticalGreen-400">SECTOR 5 - 12% RISK</div>
                      <div className="text-xs text-tactical-muted">Fuel moisture: 28% | Wind: 3 mph | Temp: 72°F</div>
                      <div className="text-xs text-tactical-muted">Vegetation: Riparian | Slope: 1°</div>
                    </div>
                  </div>
                    </div>
                  )}
                  
                  {activePanel === 'weather' && (
                    <div className="h-full flex flex-col">
                      <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-bold text-tactical-400">WEATHER STATION</h2>
                      </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="bg-dark-800 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Wind className="w-4 h-4 text-tactical-400" />
                        <span className="text-sm font-mono text-tactical-300">CURRENT CONDITIONS</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">WIND SPEED</p>
                          <p className="text-lg font-mono text-tactical-400">22 mph</p>
                          <p className="text-xs text-tactical-muted">Gusts: 28 mph</p>
                        </div>
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">DIRECTION</p>
                          <p className="text-lg font-mono text-tactical-400">NW</p>
                          <p className="text-xs text-tactical-muted">315°</p>
                        </div>
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">HUMIDITY</p>
                          <p className="text-lg font-mono text-tactical-400">18%</p>
                          <p className="text-xs text-tactical-muted">Dew point: 32°F</p>
                        </div>
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">TEMP</p>
                          <p className="text-lg font-mono text-tactical-400">94°F</p>
                          <p className="text-xs text-tactical-muted">Heat index: 98°F</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Thermometer className="w-4 h-4 text-tactical-400" />
                        <span className="text-sm font-mono text-tactical-300">FORECAST</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-tactical-muted">6 HOURS</span>
                          <span className="text-sm font-mono text-tactical-400">Wind: 25 mph NW | Temp: 96°F</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-tactical-muted">12 HOURS</span>
                          <span className="text-sm font-mono text-tactical-400">Wind: 18 mph NW | Temp: 88°F</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-tactical-muted">24 HOURS</span>
                          <span className="text-sm font-mono text-tactical-400">Wind: 12 mph W | Temp: 82°F</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Gauge className="w-4 h-4 text-tactical-400" />
                        <span className="text-sm font-mono text-tactical-300">FIRE WEATHER</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">FIRE DANGER</p>
                          <p className="text-lg font-mono text-fire-400">EXTREME</p>
                        </div>
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">Haines Index</p>
                          <p className="text-lg font-mono text-warning-400">6</p>
                        </div>
                      </div>
                    </div>
                  </div>
                    </div>
                  )}
                  
                  {activePanel === 'sensors' && (
                    <div className="h-full flex flex-col">
                      <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-bold text-tactical-400">SENSOR NETWORK</h2>
                      </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="bg-dark-800 p-4 rounded-lg border border-fire-500/30 bg-fire-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-4 h-4 text-fire-400" />
                        <span className="text-sm font-mono text-tactical-300">HEAT SENSOR #23</span>
                      </div>
                      <div className="text-sm font-mono text-fire-400">ALERT - ELEVATED TEMP</div>
                      <div className="text-xs text-tactical-muted">Temperature: 145°F | Location: 40.123°N, 120.456°W</div>
                      <div className="text-xs text-tactical-muted">Last update: 1 min ago | Battery: 89%</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg border border-tacticalGreen-500/30 bg-tacticalGreen-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-tacticalGreen-400" />
                        <span className="text-sm font-mono text-tactical-300">SMOKE DETECTOR #47</span>
                      </div>
                      <div className="text-sm font-mono text-tacticalGreen-400">ONLINE - NO SMOKE</div>
                      <div className="text-xs text-tactical-muted">PM2.5: 12 μg/m³ | Location: 40.089°N, 120.234°W</div>
                      <div className="text-xs text-tactical-muted">Last update: 30 sec ago | Battery: 94%</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg border border-tacticalGreen-500/30 bg-tacticalGreen-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-tacticalGreen-400" />
                        <span className="text-sm font-mono text-tactical-300">SMOKE DETECTOR #12</span>
                      </div>
                      <div className="text-sm font-mono text-tacticalGreen-400">ONLINE - NO SMOKE</div>
                      <div className="text-xs text-tactical-muted">PM2.5: 8 μg/m³ | Location: 40.156°N, 120.345°W</div>
                      <div className="text-xs text-tactical-muted">Last update: 45 sec ago | Battery: 91%</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg border border-warning-500/30 bg-warning-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Thermometer className="w-4 h-4 text-warning-400" />
                        <span className="text-sm font-mono text-tactical-300">WEATHER STATION #8</span>
                      </div>
                      <div className="text-sm font-mono text-warning-400">ONLINE - HIGH WIND</div>
                      <div className="text-xs text-tactical-muted">Wind: 22 mph NW | Humidity: 18% | Location: 40.067°N, 120.178°W</div>
                      <div className="text-xs text-tactical-muted">Last update: 1 min ago | Battery: 87%</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg border border-tactical-500/30 bg-tactical-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Radio className="w-4 h-4 text-tactical-400" />
                        <span className="text-sm font-mono text-tactical-300">COMMS HUB #5</span>
                      </div>
                      <div className="text-sm font-mono text-tactical-400">ONLINE - RELAY ACTIVE</div>
                      <div className="text-xs text-tactical-muted">Connected devices: 8 | Signal strength: 95%</div>
                      <div className="text-xs text-tactical-muted">Last update: 15 sec ago | Battery: 96%</div>
                    </div>
                  </div>
                    </div>
                  )}
                  
                  {activePanel === 'prediction' && (
                    <div className="h-full flex flex-col">
                      <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-bold text-tactical-400">SPREAD PREDICTION</h2>
                      </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="bg-dark-800 p-4 rounded-lg border border-fire-500/30 bg-fire-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-fire-400" />
                        <span className="text-sm font-mono text-tactical-300">ACTIVE FIRE - SECTOR 7</span>
                      </div>
                      <div className="text-sm font-mono text-fire-400">SPREADING RAPIDLY</div>
                      <div className="text-xs text-tactical-muted">Rate: 0.4 mph | Direction: NE | Size: 2.3 acres</div>
                      <div className="text-xs text-tactical-muted">Started: 14:15 | Fuel: Dense chaparral</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-tactical-400" />
                        <span className="text-sm font-mono text-tactical-300">6-HOUR FORECAST</span>
                      </div>
                      <div className="text-sm font-mono text-tactical-400">Perimeter: 4.7 miles</div>
                      <div className="text-xs text-tactical-muted">Confidence: 87% | Area: 156 acres</div>
                      <div className="text-xs text-tactical-muted">Threat to: Highway 89, 3 structures</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-tactical-400" />
                        <span className="text-sm font-mono text-tactical-300">12-HOUR FORECAST</span>
                      </div>
                      <div className="text-sm font-mono text-tactical-400">Perimeter: 8.2 miles</div>
                      <div className="text-xs text-tactical-muted">Confidence: 72% | Area: 423 acres</div>
                      <div className="text-xs text-tactical-muted">Threat to: Residential area, 12 structures</div>
                    </div>
                    
                    <div className="bg-dark-800 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Wind className="w-4 h-4 text-tactical-400" />
                        <span className="text-sm font-mono text-tactical-300">SPREAD FACTORS</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">WIND IMPACT</p>
                          <p className="text-sm font-mono text-fire-400">HIGH</p>
                        </div>
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">TERRAIN</p>
                          <p className="text-sm font-mono text-warning-400">MODERATE</p>
                        </div>
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">FUEL LOAD</p>
                          <p className="text-sm font-mono text-fire-400">EXTREME</p>
                        </div>
                        <div>
                          <p className="text-xs text-tactical-muted font-mono">MOISTURE</p>
                          <p className="text-sm font-mono text-fire-400">CRITICAL</p>
                        </div>
                      </div>
                    </div>
                  </div>
                    </div>
                  )}
                  
                  {showDeployment && activePanel === 'deployment' && (
                    <div className="h-full flex flex-col">
                      <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-bold text-tactical-400">AUTONOMOUS DEPLOYMENT</h2>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="bg-dark-800 p-4 rounded-lg border border-fire-500/30 bg-fire-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Flame className="w-4 h-4 text-fire-400" />
                            <span className="text-sm font-mono text-tactical-300">ACTIVE FIRE DETECTED</span>
                          </div>
                          <div className="text-sm font-mono text-fire-400">SECTOR 7 - IMMEDIATE DEPLOYMENT REQUIRED</div>
                          <div className="text-xs text-tactical-muted">Size: 2.3 acres | Rate: 0.4 mph | Threat: HIGH</div>
                        </div>
                        
                        <div className="bg-dark-800 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4 text-tacticalGreen-400" />
                            <span className="text-sm font-mono text-tactical-300">AUTONOMOUS RESPONSE</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-tactical-muted">FIRELINE ALPHA</span>
                              <button className="px-3 py-1 bg-tacticalGreen-500/20 border border-tacticalGreen-500/30 rounded text-xs font-mono text-tacticalGreen-400 hover:bg-tacticalGreen-500/30">
                                DEPLOY
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-tactical-muted">SURVEILLANCE BRAVO</span>
                              <button className="px-3 py-1 bg-tacticalGreen-500/20 border border-tacticalGreen-500/30 rounded text-xs font-mono text-tacticalGreen-400 hover:bg-tacticalGreen-500/30">
                                DEPLOY
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-tactical-muted">PATROL CHARLIE</span>
                              <button className="px-3 py-1 bg-tacticalGreen-500/20 border border-tacticalGreen-500/30 rounded text-xs font-mono text-tacticalGreen-400 hover:bg-tacticalGreen-500/30">
                                DEPLOY
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-dark-800 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-tactical-400" />
                            <span className="text-sm font-mono text-tactical-300">MISSION PARAMETERS</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-tactical-muted font-mono">PRIORITY</p>
                              <p className="text-sm font-mono text-fire-400">CRITICAL</p>
                            </div>
                            <div>
                              <p className="text-xs text-tactical-muted font-mono">ETA</p>
                              <p className="text-sm font-mono text-tactical-400">8 min</p>
                            </div>
                            <div>
                              <p className="text-xs text-tactical-muted font-mono">ROUTE</p>
                              <p className="text-sm font-mono text-tactical-400">OPTIMIZED</p>
                            </div>
                            <div>
                              <p className="text-xs text-tactical-muted font-mono">AUTONOMY</p>
                              <p className="text-sm font-mono text-tacticalGreen-400">FULL</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-dark-800 p-4 rounded-lg border border-tacticalGreen-500/30 bg-tacticalGreen-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-tacticalGreen-400" />
                            <span className="text-sm font-mono text-tactical-300">AUTO-DEPLOY ALL</span>
                          </div>
                          <button className="w-full px-4 py-2 bg-tacticalGreen-500/30 border border-tacticalGreen-500/50 rounded text-sm font-mono text-tacticalGreen-400 hover:bg-tacticalGreen-500/40 transition-all">
                            DEPLOY FIRELINE FLEET
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activePanel === 'missions' && <MissionsPanel />}
                  
                  {showControl && activePanel === 'control' && (
                    <div className="h-full flex flex-col">
                      <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-bold text-tactical-400">DEVICE CONTROL</h2>
                        <p className="text-xs text-tactical-muted font-mono">Control FireFly drones and assign KOFA missions</p>
                      </div>
                      <div className="flex-1 flex">
                        <div className="w-1/2 border-r border-dark-700">
                          <DroneControlPanel 
                            selectedDrone={undefined} // Will be set when drone is selected
                            onMissionCreate={(mission) => console.log('Drone mission created:', mission)}
                            onEmergencyReturn={(droneId) => console.log('Emergency return for drone:', droneId)}
                          />
                        </div>
                        <div className="w-1/2">
                          <KOFAMissionPanel 
                            selectedBot={undefined} // Will be set when bot is selected
                            onMissionAssign={(mission) => console.log('KOFA mission assigned:', mission)}
                            onEmergencyStop={(botId) => console.log('Emergency stop for bot:', botId)}
                            onParameterUpdate={(botId, params) => console.log('Parameters updated for bot:', botId, params)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activePanel === 'video' && <VideoFeedPanel />}
                  
                  {showChaos && activePanel === 'chaos' && (
                    <div className="h-full flex flex-col">
                      <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-bold text-tactical-400">CHAOS LAB</h2>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {React.createElement(require('../components/panels/ChaosPanel').ChaosPanel)}
                      </div>
                    </div>
                  )}
                  
                  {activePanel === 'intelligence' && (
                    <div className="h-full flex flex-col">
                      <div className="px-4 py-3 border-b border-dark-700">
                        <h2 className="text-lg font-bold text-tactical-400">OPERATIONAL INTELLIGENCE</h2>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="bg-dark-800 p-4 rounded-lg border border-warning-500/30 bg-warning-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-warning-400" />
                            <span className="text-sm font-mono text-tactical-300">CONTEXTUAL AI ALERT</span>
                          </div>
                          <div className="text-sm font-mono text-warning-400">POTENTIAL IGNITION DETECTED</div>
                          <div className="text-xs text-tactical-muted">Location: 2.1 km from fuel break | Wind: 20 mph → SW</div>
                          <div className="text-xs text-tactical-muted">Vegetation: Dense chaparral | Slope: 15° | Risk: HIGH</div>
                          <div className="text-xs text-tactical-muted">Recommendation: Deploy FireLine Alpha + Surveillance Bravo</div>
                        </div>
                        
                        <div className="bg-dark-800 p-4 rounded-lg border border-fire-500/30 bg-fire-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Flame className="w-4 h-4 text-fire-400" />
                            <span className="text-sm font-mono text-tactical-300">HISTORICAL FIRE ANALYSIS</span>
                          </div>
                          <div className="text-sm font-mono text-fire-400">SIMILAR FIRE PATTERN DETECTED</div>
                          <div className="text-xs text-tactical-muted">2018 Creek Fire: Same terrain, wind pattern, vegetation</div>
                          <div className="text-xs text-tactical-muted">Spread rate: 0.6 mph | Final size: 379,895 acres</div>
                          <div className="text-xs text-tactical-muted">Lessons learned: Early suppression critical, focus on ridgeline</div>
                        </div>
                        
                        <div className="bg-dark-800 p-4 rounded-lg border border-tacticalGreen-500/30 bg-tacticalGreen-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-tacticalGreen-400" />
                            <span className="text-sm font-mono text-tactical-300">AUTO-TASKING LOGIC</span>
                          </div>
                          <div className="text-sm font-mono text-tacticalGreen-400">NEAREST ASSETS DISPATCHED</div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-tactical-muted">FireLine Alpha</span>
                              <span className="text-xs font-mono text-tacticalGreen-400">ETA: 6 min | Route: Optimized</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-tactical-muted">Surveillance Bravo</span>
                              <span className="text-xs font-mono text-tacticalGreen-400">ETA: 4 min | Altitude: 800 ft</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-tactical-muted">Patrol Charlie</span>
                              <span className="text-xs font-mono text-tacticalGreen-400">ETA: 8 min | Standby</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-dark-800 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-tactical-400" />
                            <span className="text-sm font-mono text-tactical-300">TERRAIN INTELLIGENCE</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-tactical-muted font-mono">SLOPE</p>
                              <p className="text-sm font-mono text-warning-400">15° (MODERATE)</p>
                            </div>
                            <div>
                              <p className="text-xs text-tactical-muted font-mono">ASPECT</p>
                              <p className="text-sm font-mono text-tactical-400">SW (LEEWARD)</p>
                            </div>
                            <div>
                              <p className="text-xs text-tactical-muted font-mono">FUEL LOAD</p>
                              <p className="text-sm font-mono text-fire-400">HIGH (8.2 tons/acre)</p>
                            </div>
                            <div>
                              <p className="text-xs text-tactical-muted font-mono">MOISTURE</p>
                              <p className="text-sm font-mono text-fire-400">6% (CRITICAL)</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-dark-800 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Wind className="w-4 h-4 text-tactical-400" />
                            <span className="text-sm font-mono text-tactical-300">WEATHER INTELLIGENCE</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-mono text-tactical-muted">WIND TREND</span>
                              <span className="text-sm font-mono text-warning-400">INCREASING (15→22 mph)</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-mono text-tactical-muted">HUMIDITY TREND</span>
                              <span className="text-sm font-mono text-fire-400">DECREASING (25→18%)</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-mono text-tactical-muted">FIRE WEATHER</span>
                              <span className="text-sm font-mono text-fire-400">RED FLAG CONDITIONS</span>
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
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default function HomePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <HomePageContent />
    </QueryClientProvider>
  )
}
