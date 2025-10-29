'use client'

import React, { useState } from 'react'
import { 
  Target, 
  Clock, 
  MapPin, 
  Plane, 
  Radio,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Activity,
  Zap,
  Shield,
  Eye,
  Settings
} from 'lucide-react'
import { useSummitMissions } from '../../hooks/useSummit'
import { format } from 'date-fns'

export function MissionsPanel() {
  const { missions, isLoading, isConnected, dispatchRobot, isDispatching, approveMission, isApproving, updateMission, isUpdating } = useSummitMissions()
  const [selectedMission, setSelectedMission] = useState<string | null>(null)

  const getMissionIcon = (type: string) => {
    switch (type) {
      case 'surveillance': return Eye
      case 'firefighting': return Zap
      case 'rescue': return Shield
      case 'patrol': return Activity
      default: return Target
    }
  }

  const getMissionColor = (type: string) => {
    switch (type) {
      case 'surveillance': return 'text-tactical-400'
      case 'firefighting': return 'text-fire-400'
      case 'rescue': return 'text-tacticalGreen-400'
      case 'patrol': return 'text-warning-400'
      default: return 'text-tactical-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-tacticalGreen-400'
      case 'proposed': return 'text-warning-400'
      case 'pending': return 'text-warning-400'
      case 'completed': return 'text-tactical-400'
      case 'failed': return 'text-fire-400'
      default: return 'text-tactical-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return 'bg-tacticalGreen-500/20 border-tacticalGreen-500/30'
      case 'proposed': return 'bg-warning-500/20 border-warning-500/30'
      case 'pending': return 'bg-warning-500/20 border-warning-500/30'
      case 'completed': return 'bg-tactical-500/20 border-tactical-500/30'
      case 'failed': return 'bg-fire-500/20 border-fire-500/30'
      default: return 'bg-tactical-500/20 border-tactical-500/30'
    }
  }

  const handleDispatch = (missionType: 'surveillance' | 'firefighting' | 'rescue' | 'patrol') => {
    const newMission = {
      type: missionType,
      priority: 'medium' as 'medium',
      location: {
        lat: 40.0,
        lng: 120.0,
        radius: 1000
      },
      description: `New ${missionType} mission`
    }
    dispatchRobot(newMission)
  }

  // Calculate mission summary
  const missionSummary = {
    active: missions.filter(m => m.status === 'active').length,
    pending: missions.filter(m => m.status === 'pending').length,
    completed: missions.filter(m => m.status === 'completed').length,
    failed: missions.filter(m => m.status === 'failed').length
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="tactical-header px-4 py-3 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="tactical-title text-lg">MISSION CONTROL</h2>
            <p className="text-xs text-tactical-muted font-mono">WILDFIRE OPS COMMAND</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
                try {
                  const res = await fetch(`${api}/api/v1/reports/situation.pdf`)
                  if (!res.ok) throw new Error('Failed to fetch PDF')
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `situation-report-${Date.now()}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e) {
                  console.error('Failed to generate PDF, falling back to JSON', e)
                  try {
                    const res = await fetch(`${api}/api/v1/reports/situation`, { method: 'POST' })
                    const data = await res.json()
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `situation-report-${Date.now()}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch (err) {
                    console.error('Failed to generate report', err)
                  }
                }
              }}
              className="px-2 py-1 rounded bg-tactical-600/30 hover:bg-tactical-600/40 text-xs font-mono"
            >
              GENERATE REPORT
            </button>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-tacticalGreen-400' : 'bg-fire-400'}`}></div>
            <span className="text-xs font-mono text-tactical-muted">
              {isConnected ? 'SUMMIT.OS CONNECTED' : 'SUMMIT.OS OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto tactical-scrollbar p-4 space-y-4">
        {/* Mission Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-tacticalGreen-400" />
              <span className="text-xs font-mono text-tactical-muted">ACTIVE</span>
            </div>
            <span className="text-lg font-mono text-tacticalGreen-400">{missionSummary.active}</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-warning-400" />
              <span className="text-xs font-mono text-tactical-muted">PENDING</span>
            </div>
            <span className="text-lg font-mono text-warning-400">{missionSummary.pending}</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-tactical-400" />
              <span className="text-xs font-mono text-tactical-muted">COMPLETED</span>
            </div>
            <span className="text-lg font-mono text-tactical-400">{missionSummary.completed}</span>
          </div>
          <div className="tactical-panel p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-fire-400" />
              <span className="text-xs font-mono text-tactical-muted">FAILED</span>
            </div>
            <span className="text-lg font-mono text-fire-400">{missionSummary.failed}</span>
          </div>
        </div>

        {/* Missions List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="tactical-panel p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2">
                <Activity className="w-4 h-4 text-tactical-400 animate-pulse" />
                <span className="text-sm font-mono text-tactical-muted">LOADING MISSIONS...</span>
              </div>
            </div>
          ) : missions.length === 0 ? (
            <div className="tactical-panel p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2">
                <Target className="w-4 h-4 text-tactical-400" />
                <span className="text-sm font-mono text-tactical-muted">NO ACTIVE MISSIONS</span>
              </div>
            </div>
          ) : (
            missions.map((mission) => {
              const MissionIcon = getMissionIcon(mission.type)
              return (
                <div key={mission.id} className={`tactical-panel p-4 rounded-lg border ${getStatusBg(mission.status)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <MissionIcon className={`w-5 h-5 ${getMissionColor(mission.type)} mt-0.5`} />
                      <div className="flex-1">
                        <h3 className="font-mono text-sm text-tactical-300 mb-1">
                          {mission.type.toUpperCase()} MISSION
                        </h3>
                        <p className="text-xs text-tactical-muted font-mono mb-2">{mission.description}</p>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-tactical-muted">PRIORITY: {mission.priority.toUpperCase()}</span>
                          <span className={`${getStatusColor(mission.status)}`}>{mission.status.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(mission.createdAt), 'HH:mm:ss')}</span>
                      </div>
                      <span className="text-xs font-mono text-tactical-400">{mission.progress}%</span>
                    </div>
                  </div>
                  
                  {/* Mission Details */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <MapPin className="w-3 h-3 text-tactical-400" />
                        <span className="text-tactical-muted">LOC:</span>
                        <span className="text-tactical-300">
                          {mission.location.lat.toFixed(3)}°N, {mission.location.lng.toFixed(3)}°W
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Target className="w-3 h-3 text-tactical-400" />
                        <span className="text-tactical-muted">RADIUS:</span>
                        <span className="text-tactical-300">{mission.location.radius}m</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Radio className="w-3 h-3 text-tactical-400" />
                        <span className="text-tactical-muted">DEVICE:</span>
                        <span className="text-tactical-300">{mission.assignedDevice || 'UNASSIGNED'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Clock className="w-3 h-3 text-tactical-400" />
                        <span className="text-tactical-muted">ETA:</span>
                        <span className="text-tactical-300">{mission.estimatedDuration || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs font-mono text-tactical-muted mb-1">
                      <span>PROGRESS</span>
                      <span>{mission.progress}%</span>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-2">
                      <div 
                        className="bg-tactical-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${mission.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Mission Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-tactical-muted">
                      <span>UPDATED: {format(new Date(mission.updatedAt), 'HH:mm:ss')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {mission.status === 'proposed' && (
                        <button
                          onClick={() => approveMission(mission)}
                          disabled={isApproving}
                          className="px-2 py-1 rounded bg-warning-600/30 hover:bg-warning-600/40 text-xs font-mono"
                        >
                          APPROVE
                        </button>
                      )}
                      {(mission.status === 'pending' || mission.status === 'active') && (
                        <button
                          onClick={() => updateMission({ id: mission.id, patch: { status: 'completed', progress: 100 } })}
                          disabled={isUpdating}
                          className="px-2 py-1 rounded bg-tacticalGreen-600/30 hover:bg-tacticalGreen-600/40 text-xs font-mono"
                        >
                          MARK COMPLETED
                        </button>
                      )}
                      <button className="p-1 rounded hover:bg-dark-700 transition-colors">
                        <Eye className="w-3 h-3 text-tactical-400" />
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
            })
          )}
        </div>

        {/* Quick Dispatch */}
        <div className="mt-6">
          <h3 className="tactical-subtitle mb-3">QUICK DISPATCH</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleDispatch('surveillance')}
              disabled={isDispatching}
              className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-tactical-400" />
                <span className="text-sm font-mono text-tactical-300">SURVEILLANCE</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">AERIAL RECON</p>
            </button>
            <button 
              onClick={() => handleDispatch('firefighting')}
              disabled={isDispatching}
              className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-fire-400" />
                <span className="text-sm font-mono text-tactical-300">FIREFIGHTING</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">COMBAT FIRE</p>
            </button>
            <button 
              onClick={() => handleDispatch('rescue')}
              disabled={isDispatching}
              className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-tacticalGreen-400" />
                <span className="text-sm font-mono text-tactical-300">RESCUE</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">PERSONNEL RESCUE</p>
            </button>
            <button 
              onClick={() => handleDispatch('patrol')}
              disabled={isDispatching}
              className="tactical-panel p-3 rounded-lg hover:bg-dark-700 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-warning-400" />
                <span className="text-sm font-mono text-tactical-300">PATROL</span>
              </div>
              <p className="text-xs text-tactical-muted font-mono">AREA PATROL</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
