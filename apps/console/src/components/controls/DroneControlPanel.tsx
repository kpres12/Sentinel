'use client'

import React, { useState } from 'react'
import { 
  Plane, 
  MapPin, 
  Square, 
  Route, 
  Play, 
  Pause, 
  RotateCcw,
  Target,
  Eye,
  Camera,
  Zap
} from 'lucide-react'

interface DroneControlPanelProps {
  selectedDrone?: {
    id: string
    name: string
    status: string
    battery: number
    position: { latitude: number; longitude: number; altitude: number }
  }
  onMissionCreate?: (mission: DroneMission) => void
  onEmergencyReturn?: (droneId: string) => void
}

interface DroneMission {
  id: string
  droneId: string
  type: 'SURVEY_SMOKE' | 'PATROL' | 'HOLD' | 'EMERGENCY_RETURN'
  waypoints: Array<{
    latitude: number
    longitude: number
    altitude: number
  }>
  parameters: {
    surveyPattern?: 'GRID' | 'SPIRAL' | 'LINEAR'
    altitude?: number
    speed?: number
    duration?: number
  }
  priority: number
}

export function DroneControlPanel({ 
  selectedDrone, 
  onMissionCreate, 
  onEmergencyReturn 
}: DroneControlPanelProps) {
  const [controlMode, setControlMode] = useState<'manual' | 'area' | 'route'>('manual')
  const [missionType, setMissionType] = useState<'SURVEY_SMOKE' | 'PATROL' | 'HOLD'>('SURVEY_SMOKE')
  const [isDrawing, setIsDrawing] = useState(false)
  const [waypoints, setWaypoints] = useState<Array<{lat: number, lng: number}>>([])

  const handleCreateMission = () => {
    if (!selectedDrone || waypoints.length === 0) return

    const mission: DroneMission = {
      id: `mission-${Date.now()}`,
      droneId: selectedDrone.id,
      type: missionType,
      waypoints: waypoints.map(wp => ({
        latitude: wp.lat,
        longitude: wp.lng,
        altitude: 1200 // Default altitude
      })),
      parameters: {
        surveyPattern: 'GRID',
        altitude: 1200,
        speed: 15,
        duration: 30
      },
      priority: 1
    }

    onMissionCreate?.(mission)
    setWaypoints([])
  }

  const handleEmergencyReturn = () => {
    if (selectedDrone) {
      onEmergencyReturn?.(selectedDrone.id)
    }
  }

  const clearWaypoints = () => {
    setWaypoints([])
    setIsDrawing(false)
  }

  if (!selectedDrone) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Plane className="w-12 h-12 text-tactical-400 mx-auto mb-4" />
          <p className="text-tactical-muted font-mono">SELECT A FIREFLY DRONE</p>
          <p className="text-xs text-tactical-muted mt-2">Click on a drone to control it</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="tactical-header px-4 py-3 border-b border-dark-700">
        <h2 className="tactical-title text-lg">FIREFLY CONTROL</h2>
        <p className="text-xs text-tactical-muted font-mono">{selectedDrone.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto tactical-scrollbar p-4 space-y-6">
        {/* Drone Status */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-3 flex items-center gap-2">
            <Plane className="w-4 h-4 text-tactical-400" />
            STATUS
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm font-mono">
            <div>
              <span className="text-tactical-muted">BATTERY:</span>
              <span className={`ml-2 ${selectedDrone.battery > 20 ? 'text-tacticalGreen-400' : 'text-fire-400'}`}>
                {selectedDrone.battery}%
              </span>
            </div>
            <div>
              <span className="text-tactical-muted">STATUS:</span>
              <span className="ml-2 text-tactical-300">{selectedDrone.status.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-tactical-muted">ALTITUDE:</span>
              <span className="ml-2 text-tactical-300">{selectedDrone.position.altitude}m</span>
            </div>
            <div>
              <span className="text-tactical-muted">POSITION:</span>
              <span className="ml-2 text-tactical-300">
                {selectedDrone.position.latitude.toFixed(4)}°N
              </span>
            </div>
          </div>
        </div>

        {/* Control Mode Selection */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-tactical-400" />
            CONTROL MODE
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setControlMode('manual')}
              className={`p-2 rounded text-xs font-mono transition-colors ${
                controlMode === 'manual' 
                  ? 'bg-tactical-500 text-tactical-100' 
                  : 'bg-dark-700 text-tactical-muted hover:bg-dark-600'
              }`}
            >
              <MapPin className="w-4 h-4 mx-auto mb-1" />
              CLICK-TO-FLY
            </button>
            <button
              onClick={() => setControlMode('area')}
              className={`p-2 rounded text-xs font-mono transition-colors ${
                controlMode === 'area' 
                  ? 'bg-tactical-500 text-tactical-100' 
                  : 'bg-dark-700 text-tactical-muted hover:bg-dark-600'
              }`}
            >
              <Square className="w-4 h-4 mx-auto mb-1" />
              AREA SURVEY
            </button>
            <button
              onClick={() => setControlMode('route')}
              className={`p-2 rounded text-xs font-mono transition-colors ${
                controlMode === 'route' 
                  ? 'bg-tactical-500 text-tactical-100' 
                  : 'bg-dark-700 text-tactical-muted hover:bg-dark-600'
              }`}
            >
              <Route className="w-4 h-4 mx-auto mb-1" />
              PATROL ROUTE
            </button>
          </div>
        </div>

        {/* Mission Type */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-tactical-400" />
            MISSION TYPE
          </h3>
          <div className="space-y-2">
            {[
              { type: 'SURVEY_SMOKE', label: 'SMOKE SURVEY', icon: Eye },
              { type: 'PATROL', label: 'PATROL ROUTE', icon: Route },
              { type: 'HOLD', label: 'HOLD POSITION', icon: MapPin }
            ].map(({ type, label, icon: Icon }) => (
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
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Waypoints */}
        {controlMode !== 'manual' && (
          <div className="tactical-panel p-4 rounded-lg">
            <h3 className="tactical-subtitle mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-tactical-400" />
              WAYPOINTS ({waypoints.length})
            </h3>
            {waypoints.length > 0 ? (
              <div className="space-y-2">
                {waypoints.map((wp, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-dark-700 rounded text-xs font-mono">
                    <span className="text-tactical-300">
                      {index + 1}. {wp.lat.toFixed(4)}°N, {wp.lng.toFixed(4)}°W
                    </span>
                    <button
                      onClick={() => setWaypoints(prev => prev.filter((_, i) => i !== index))}
                      className="text-fire-400 hover:text-fire-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={clearWaypoints}
                  className="w-full p-2 bg-dark-700 rounded text-xs font-mono text-tactical-muted hover:bg-dark-600"
                >
                  CLEAR ALL
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-tactical-muted text-sm font-mono">
                  {controlMode === 'area' 
                    ? 'Draw area on map to create waypoints' 
                    : 'Click on map to add waypoints'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mission Parameters */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-tactical-400" />
            PARAMETERS
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-tactical-muted">ALTITUDE (m)</label>
              <input
                type="number"
                defaultValue={1200}
                className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-tactical-muted">SPEED (m/s)</label>
              <input
                type="number"
                defaultValue={15}
                className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-tactical-muted">DURATION (min)</label>
              <input
                type="number"
                defaultValue={30}
                className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCreateMission}
            disabled={waypoints.length === 0}
            className="w-full p-3 bg-tactical-500 hover:bg-tactical-600 disabled:bg-dark-700 disabled:text-tactical-muted rounded text-sm font-mono transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            CREATE MISSION
          </button>
          
          <button
            onClick={handleEmergencyReturn}
            className="w-full p-3 bg-fire-500 hover:bg-fire-600 rounded text-sm font-mono transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            EMERGENCY RETURN
          </button>
        </div>
      </div>
    </div>
  )
}
