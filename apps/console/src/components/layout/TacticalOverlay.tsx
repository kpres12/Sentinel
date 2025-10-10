'use client'

import React, { useState } from 'react'
import { 
  X, 
  Target, 
  Wind, 
  Flame, 
  MapPin, 
  Radio, 
  Camera, 
  Zap,
  Navigation,
  Compass,
  Ruler,
  Layers,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'

export interface TacticalOverlayProps {
  onClose: () => void
}

export function TacticalOverlay({ onClose }: TacticalOverlayProps) {
  const [activeTool, setActiveTool] = useState<string>('target')
  const [showGrid, setShowGrid] = useState(true)
  const [showCompass, setShowCompass] = useState(true)
  const [showRuler, setShowRuler] = useState(false)

  const tools = [
    { id: 'target', icon: Target, label: 'TARGET', color: 'text-fire-400' },
    { id: 'wind', icon: Wind, label: 'WIND', color: 'text-tactical-400' },
    { id: 'flame', icon: Flame, label: 'FIRE', color: 'text-fire-500' },
    { id: 'radio', icon: Radio, label: 'COMMS', color: 'text-tactical-400' },
    { id: 'camera', icon: Camera, label: 'CAM', color: 'text-tactical-400' },
    { id: 'navigation', icon: Navigation, label: 'NAV', color: 'text-tactical-400' },
    { id: 'compass', icon: Compass, label: 'COMP', color: 'text-tactical-400' },
    { id: 'ruler', icon: Ruler, label: 'RULER', color: 'text-tactical-400' },
  ]

  const tacticalInfo = [
    { label: 'GRID REF', value: '12S 345678 1234567' },
    { label: 'ELEVATION', value: '1,234m MSL' },
    { label: 'HEADING', value: '045° MAG' },
    { label: 'SPEED', value: '12.5 kts' },
    { label: 'ETA', value: '14:32:15' },
    { label: 'RANGE', value: '2.3 km' },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Grid Overlay */}
      {showGrid && (
        <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none" />
      )}

      {/* Compass Rose */}
      {showCompass && (
        <div className="absolute top-4 right-4 w-24 h-24 pointer-events-auto">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 border-2 border-tactical-400 rounded-full">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-tactical-400"></div>
              </div>
              <div className="absolute top-1/2 right-0 transform translate-x-1 -translate-y-1/2">
                <span className="text-xs font-mono text-tactical-400">E</span>
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1">
                <span className="text-xs font-mono text-tactical-400">S</span>
              </div>
              <div className="absolute top-1/2 left-0 transform -translate-x-1 -translate-y-1/2">
                <span className="text-xs font-mono text-tactical-400">W</span>
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="text-xs font-mono text-tactical-400">N</span>
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-fire-400 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Ruler */}
      {showRuler && (
        <div className="absolute bottom-4 left-4 pointer-events-auto">
          <div className="bg-dark-900/90 border border-dark-700 rounded p-2">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-tactical-400" />
              <span className="text-xs font-mono text-tactical-400">SCALE: 1:50,000</span>
            </div>
            <div className="mt-2 w-32 h-1 bg-tactical-400 relative">
              <div className="absolute left-0 top-0 w-full h-full bg-gradient-to-r from-tactical-400 to-transparent"></div>
              <div className="absolute left-0 -top-1 w-1 h-3 bg-tactical-400"></div>
              <div className="absolute right-0 -top-1 w-1 h-3 bg-tactical-400"></div>
              <div className="absolute left-1/2 -top-1 w-1 h-3 bg-tactical-400"></div>
            </div>
            <div className="flex justify-between text-xs font-mono text-tactical-400 mt-1">
              <span>0</span>
              <span>1km</span>
              <span>2km</span>
            </div>
          </div>
        </div>
      )}

      {/* Tactical Tools Panel */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="tactical-panel rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="tactical-subtitle">TACTICAL TOOLS</h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-dark-700 transition-colors"
            >
              <X className="w-4 h-4 text-tactical-400" />
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded transition-all ${
                  activeTool === tool.id
                    ? 'bg-tactical-500/20 border border-tactical-500/30 shadow-glow-blue'
                    : 'hover:bg-dark-800'
                }`}
              >
                <tool.icon className={`w-5 h-5 ${tool.color}`} />
                <span className="text-xs font-mono text-tactical-300">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tactical Information Panel */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="tactical-panel rounded-lg p-4">
          <h3 className="tactical-subtitle mb-3">TACTICAL INFO</h3>
          <div className="grid grid-cols-2 gap-3">
            {tacticalInfo.map((info, index) => (
              <div key={index} className="flex flex-col">
                <span className="text-xs font-mono text-tactical-muted">{info.label}</span>
                <span className="text-sm font-mono text-tactical-300">{info.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layer Controls */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <div className="tactical-panel rounded-lg p-4">
          <h3 className="tactical-subtitle mb-3">LAYERS</h3>
          <div className="space-y-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center gap-2 w-full p-2 rounded transition-all ${
                showGrid ? 'bg-tactical-500/20 border border-tactical-500/30' : 'hover:bg-dark-800'
              }`}
            >
              <Layers className="w-4 h-4 text-tactical-400" />
              <span className="text-sm font-mono text-tactical-300">GRID</span>
              {showGrid ? <Eye className="w-4 h-4 text-tactical-400" /> : <EyeOff className="w-4 h-4 text-dark-400" />}
            </button>
            <button
              onClick={() => setShowCompass(!showCompass)}
              className={`flex items-center gap-2 w-full p-2 rounded transition-all ${
                showCompass ? 'bg-tactical-500/20 border border-tactical-500/30' : 'hover:bg-dark-800'
              }`}
            >
              <Compass className="w-4 h-4 text-tactical-400" />
              <span className="text-sm font-mono text-tactical-300">COMPASS</span>
              {showCompass ? <Eye className="w-4 h-4 text-tactical-400" /> : <EyeOff className="w-4 h-4 text-dark-400" />}
            </button>
            <button
              onClick={() => setShowRuler(!showRuler)}
              className={`flex items-center gap-2 w-full p-2 rounded transition-all ${
                showRuler ? 'bg-tactical-500/20 border border-tactical-500/30' : 'hover:bg-dark-800'
              }`}
            >
              <Ruler className="w-4 h-4 text-tactical-400" />
              <span className="text-sm font-mono text-tactical-300">RULER</span>
              {showRuler ? <Eye className="w-4 h-4 text-tactical-400" /> : <EyeOff className="w-4 h-4 text-dark-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Active Tool Indicator */}
      {activeTool && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-dark-900/90 border border-tactical-500 rounded-lg px-4 py-2">
            <span className="text-sm font-mono text-tactical-400">
              {tools.find(t => t.id === activeTool)?.label} MODE ACTIVE
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
