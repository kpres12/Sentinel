'use client'

import React, { useState } from 'react'
import { 
  Radio, 
  MapPin, 
  Square, 
  Shield, 
  Zap,
  Settings,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Gauge,
  Wrench
} from 'lucide-react'

interface KOFAMissionPanelProps {
  selectedBot?: {
    id: string
    name: string
    status: string
    battery: number
    position: { latitude: number; longitude: number; altitude: number }
    capabilities: {
      maxSpeed: number
      maxSlope: number
      clearingWidth: number
      waterCapacity: number
      fuelCapacity: number
      operatingTime: number
    }
  }
  onMissionAssign?: (mission: KOFAMission) => void
  onEmergencyStop?: (botId: string) => void
  onParameterUpdate?: (botId: string, parameters: any) => void
}

interface KOFAMission {
  id: string
  botId: string
  type: 'BUILD_LINE' | 'CLEAR_VEGETATION' | 'FIRE_SUPPRESSION' | 'EMERGENCY_RESPONSE'
  area: {
    type: 'polygon' | 'line'
    coordinates: Array<{latitude: number, longitude: number}>
  }
  parameters: {
    clearingWidth?: number
    clearingDepth?: number
    vegetationType?: 'grass' | 'brush' | 'trees' | 'mixed'
    clearingMethod?: 'mechanical' | 'chemical' | 'burn' | 'hybrid'
    safetyBuffer?: number
    waterCapacity?: number
    suppressionRate?: number
  }
  priority: number
  estimatedDuration: number
}

export function KOFAMissionPanel({ 
  selectedBot, 
  onMissionAssign, 
  onEmergencyStop,
  onParameterUpdate 
}: KOFAMissionPanelProps) {
  const [missionType, setMissionType] = useState<'BUILD_LINE' | 'CLEAR_VEGETATION' | 'FIRE_SUPPRESSION'>('BUILD_LINE')
  const [parameters, setParameters] = useState({
    clearingWidth: 3.0,
    clearingDepth: 0.5,
    vegetationType: 'mixed' as const,
    clearingMethod: 'mechanical' as const,
    safetyBuffer: 10,
    waterCapacity: 500,
    suppressionRate: 50
  })
  const [isDrawing, setIsDrawing] = useState(false)

  const handleMissionAssign = () => {
    if (!selectedBot) return

    const mission: KOFAMission = {
      id: `kofa-mission-${Date.now()}`,
      botId: selectedBot.id,
      type: missionType,
      area: {
        type: missionType === 'BUILD_LINE' ? 'line' : 'polygon',
        coordinates: [] // Will be populated from map interaction
      },
      parameters,
      priority: 1,
      estimatedDuration: 120 // 2 hours default
    }

    onMissionAssign?.(mission)
  }

  const handleEmergencyStop = () => {
    if (selectedBot) {
      onEmergencyStop?.(selectedBot.id)
    }
  }

  const handleParameterUpdate = (key: string, value: any) => {
    const newParams = { ...parameters, [key]: value }
    setParameters(newParams)
    if (selectedBot) {
      onParameterUpdate?.(selectedBot.id, newParams)
    }
  }

  if (!selectedBot) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-12 h-12 text-tactical-400 mx-auto mb-4" />
          <p className="text-tactical-muted font-mono">SELECT A KOFA BOT</p>
          <p className="text-xs text-tactical-muted mt-2">Click on a KOFA bot to assign missions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="tactical-header px-4 py-3 border-b border-dark-700">
        <h2 className="tactical-title text-lg">KOFA MISSION CONTROL</h2>
        <p className="text-xs text-tactical-muted font-mono">{selectedBot.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto tactical-scrollbar p-4 space-y-6">
        {/* Bot Status */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-3 flex items-center gap-2">
            <Radio className="w-4 h-4 text-tactical-400" />
            BOT STATUS
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm font-mono">
            <div>
              <span className="text-tactical-muted">BATTERY:</span>
              <span className={`ml-2 ${selectedBot.battery > 20 ? 'text-tacticalGreen-400' : 'text-fire-400'}`}>
                {selectedBot.battery}%
              </span>
            </div>
            <div>
              <span className="text-tactical-muted">STATUS:</span>
              <span className="ml-2 text-tactical-300">{selectedBot.status.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-tactical-muted">WATER:</span>
              <span className="ml-2 text-tactical-300">{selectedBot.capabilities.waterCapacity}L</span>
            </div>
            <div>
              <span className="text-tactical-muted">FUEL:</span>
              <span className="ml-2 text-tactical-300">{selectedBot.capabilities.fuelCapacity}L</span>
            </div>
          </div>
        </div>

        {/* Mission Type Selection */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-tactical-400" />
            MISSION TYPE
          </h3>
          <div className="space-y-2">
            {[
              { 
                type: 'BUILD_LINE', 
                label: 'BUILD FIRE LINE', 
                icon: Square,
                description: 'Create fire break barriers'
              },
              { 
                type: 'CLEAR_VEGETATION', 
                label: 'CLEAR VEGETATION', 
                icon: Wrench,
                description: 'Remove fuel sources'
              },
              { 
                type: 'FIRE_SUPPRESSION', 
                label: 'FIRE SUPPRESSION', 
                icon: Zap,
                description: 'Deploy water/retardant'
              }
            ].map(({ type, label, icon: Icon, description }) => (
              <button
                key={type}
                onClick={() => setMissionType(type as any)}
                className={`w-full p-3 rounded flex items-center gap-3 text-sm font-mono transition-colors ${
                  missionType === type 
                    ? 'bg-tactical-500 text-tactical-100' 
                    : 'bg-dark-700 text-tactical-muted hover:bg-dark-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <div className="flex-1 text-left">
                  <div>{label}</div>
                  <div className="text-xs opacity-75">{description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mission Parameters */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-tactical-400" />
            MISSION PARAMETERS
          </h3>
          <div className="space-y-3">
            {missionType === 'BUILD_LINE' && (
              <>
                <div>
                  <label className="text-xs font-mono text-tactical-muted">CLEARING WIDTH (m)</label>
                  <input
                    type="number"
                    value={parameters.clearingWidth}
                    onChange={(e) => handleParameterUpdate('clearingWidth', parseFloat(e.target.value))}
                    min="1"
                    max="10"
                    step="0.5"
                    className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-tactical-muted">CLEARING DEPTH (m)</label>
                  <input
                    type="number"
                    value={parameters.clearingDepth}
                    onChange={(e) => handleParameterUpdate('clearingDepth', parseFloat(e.target.value))}
                    min="0.1"
                    max="2"
                    step="0.1"
                    className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-tactical-muted">CLEARING METHOD</label>
                  <select
                    value={parameters.clearingMethod}
                    onChange={(e) => handleParameterUpdate('clearingMethod', e.target.value)}
                    className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
                  >
                    <option value="mechanical">MECHANICAL</option>
                    <option value="chemical">CHEMICAL</option>
                    <option value="burn">CONTROLLED BURN</option>
                    <option value="hybrid">HYBRID</option>
                  </select>
                </div>
              </>
            )}

            {missionType === 'CLEAR_VEGETATION' && (
              <>
                <div>
                  <label className="text-xs font-mono text-tactical-muted">VEGETATION TYPE</label>
                  <select
                    value={parameters.vegetationType}
                    onChange={(e) => handleParameterUpdate('vegetationType', e.target.value)}
                    className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
                  >
                    <option value="grass">GRASS</option>
                    <option value="brush">BRUSH</option>
                    <option value="trees">TREES</option>
                    <option value="mixed">MIXED</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-tactical-muted">SAFETY BUFFER (m)</label>
                  <input
                    type="number"
                    value={parameters.safetyBuffer}
                    onChange={(e) => handleParameterUpdate('safetyBuffer', parseFloat(e.target.value))}
                    min="5"
                    max="50"
                    step="5"
                    className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
                  />
                </div>
              </>
            )}

            {missionType === 'FIRE_SUPPRESSION' && (
              <>
                <div>
                  <label className="text-xs font-mono text-tactical-muted">WATER CAPACITY (L)</label>
                  <input
                    type="number"
                    value={parameters.waterCapacity}
                    onChange={(e) => handleParameterUpdate('waterCapacity', parseFloat(e.target.value))}
                    min="100"
                    max="1000"
                    step="50"
                    className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-tactical-muted">SUPPRESSION RATE (L/min)</label>
                  <input
                    type="number"
                    value={parameters.suppressionRate}
                    onChange={(e) => handleParameterUpdate('suppressionRate', parseFloat(e.target.value))}
                    min="10"
                    max="100"
                    step="10"
                    className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Area Selection Instructions */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-tactical-400" />
            AREA SELECTION
          </h3>
          <div className="text-sm font-mono text-tactical-muted space-y-2">
            <p>
              {missionType === 'BUILD_LINE' 
                ? 'Draw a line on the map to define the fire line path'
                : 'Draw a polygon on the map to define the work area'
              }
            </p>
            <p className="text-xs">
              • Click to start drawing<br/>
              • Click to add points<br/>
              • Double-click to finish
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleMissionAssign}
            className="w-full p-3 bg-tactical-500 hover:bg-tactical-600 rounded text-sm font-mono transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            ASSIGN MISSION
          </button>
          
          <button
            onClick={handleEmergencyStop}
            className="w-full p-3 bg-fire-500 hover:bg-fire-600 rounded text-sm font-mono transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            EMERGENCY STOP
          </button>
        </div>
      </div>
    </div>
  )
}
