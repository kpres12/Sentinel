'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Users, 
  ArrowUp,
  CheckCircle,
  XCircle,
  Activity,
  Zap
} from 'lucide-react'
import { summitClient } from '@/lib/summitClient'

interface TieredResponseMission {
  id: string
  fireEventId: string
  tier: number
  status: 'pending' | 'dispatched' | 'en_route' | 'on_scene' | 'active' | 'completed' | 'failed' | 'escalated'
  priority: 'low' | 'medium' | 'high' | 'critical'
  targetLocation: { lat: number; lng: number; altitude?: number }
  assignedAssets: string[]
  createdAt: string
  dispatchedAt?: string
  completedAt?: string
  actualResponseTime?: number
  targetResponseTime: number
  outcome?: {
    fireContained: boolean
    suppressantUsed?: number
    recommendEscalation: boolean
    escalationReason?: string
  }
  parentMission?: string
  childMissions?: string[]
}

interface TieredResponseStatus {
  systemStatus: 'operational' | 'degraded' | 'offline'
  activeMissions: TieredResponseMission[]
  availableAssets: {
    total: number
    tier1Capable: number
    tier2Capable: number
    tier3Capable: number
  }
  recentPerformance: {
    averageResponseTime: number
    successRate: number
    escalationRate: number
  }
}

const TierBadge = ({ tier }: { tier: number }) => {
  const colors = {
    1: 'bg-blue-100 text-blue-800',
    2: 'bg-orange-100 text-orange-800', 
    3: 'bg-red-100 text-red-800'
  }
  
  const labels = {
    1: 'Verification',
    2: 'Suppression',
    3: 'Containment'
  }
  
  return (
    <Badge className={colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
      Tier {tier}: {labels[tier as keyof typeof labels] || 'Unknown'}
    </Badge>
  )
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'dispatched': return 'bg-blue-100 text-blue-800'
      case 'en_route': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'escalated': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <Badge className={getStatusColor(status)}>
      {status.toUpperCase()}
    </Badge>
  )
}

const MissionCard = ({ 
  mission, 
  onEscalate, 
  onComplete 
}: { 
  mission: TieredResponseMission
  onEscalate: (missionId: string) => void
  onComplete: (missionId: string, contained: boolean) => void
}) => {
  const elapsedTime = mission.dispatchedAt 
    ? Math.floor((Date.now() - new Date(mission.dispatchedAt).getTime()) / 1000)
    : 0
    
  const progress = mission.targetResponseTime > 0 
    ? Math.min(100, (elapsedTime / mission.targetResponseTime) * 100)
    : 0

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TierBadge tier={mission.tier} />
            <StatusBadge status={mission.status} />
            {mission.priority === 'critical' && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                CRITICAL
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {mission.actualResponseTime ? 
                `${mission.actualResponseTime}s` : 
                `${elapsedTime}s / ${mission.targetResponseTime}s`}
            </span>
          </div>
        </div>
        <CardTitle className="text-lg">Mission {mission.id.slice(-8)}</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm">
              {mission.targetLocation.lat.toFixed(5)}, {mission.targetLocation.lng.toFixed(5)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm">
              {mission.assignedAssets.length} asset{mission.assignedAssets.length !== 1 ? 's' : ''} assigned
            </span>
          </div>
          
          {mission.status === 'active' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Response Progress</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className={progress > 90 ? "bg-red-100" : ""} />
              {progress > 90 && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Mission approaching time limit - consider escalation
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {mission.outcome && (
            <Alert className={mission.outcome.fireContained ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              <div className="flex items-center gap-2">
                {mission.outcome.fireContained ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  Fire {mission.outcome.fireContained ? 'contained successfully' : 'not contained'}
                  {mission.outcome.suppressantUsed && (
                    <span> - {mission.outcome.suppressantUsed}L suppressant used</span>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}
          
          <div className="flex gap-2 pt-2">
            {mission.status === 'active' && mission.tier < 3 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEscalate(mission.id)}
                className="flex items-center gap-1"
              >
                <ArrowUp className="w-3 h-3" />
                Escalate to Tier {mission.tier + 1}
              </Button>
            )}
            
            {mission.status === 'active' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onComplete(mission.id, true)}
                  className="flex items-center gap-1 text-green-600 border-green-300"
                >
                  <CheckCircle className="w-3 h-3" />
                  Mark Contained
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onComplete(mission.id, false)}
                  className="flex items-center gap-1 text-red-600 border-red-300"
                >
                  <XCircle className="w-3 h-3" />
                  Mark Failed
                </Button>
              </>
            )}
          </div>
          
          {mission.childMissions && mission.childMissions.length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600 font-medium">
                Escalated to: {mission.childMissions.length} child mission{mission.childMissions.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          
          {mission.parentMission && (
            <div className="mt-2 p-2 bg-blue-50 rounded">
              <div className="text-xs text-blue-600 font-medium">
                Child of mission {mission.parentMission.slice(-8)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function TieredResponsePanel() {
  const [status, setStatus] = useState<TieredResponseStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      // This would be replaced with actual API call to mission dispatcher
      const response = await fetch('http://localhost:8089/status')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      // Transform data if needed - assuming mission dispatcher returns tiered status
      if (data.tiered) {
        setStatus(data.tiered)
      } else {
        // Mock data for development
        setStatus({
          systemStatus: 'operational',
          activeMissions: [],
          availableAssets: {
            total: 8,
            tier1Capable: 4,
            tier2Capable: 2,
            tier3Capable: 2
          },
          recentPerformance: {
            averageResponseTime: 85,
            successRate: 92,
            escalationRate: 15
          }
        })
      }
      setError(null)
    } catch (err) {
      console.error('Failed to fetch tiered response status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleEscalate = async (missionId: string) => {
    try {
      // Call escalation API
      console.log('Escalating mission:', missionId)
      // await summitClient.escalateMission(missionId, reason)
      await fetchStatus() // Refresh
    } catch (err) {
      console.error('Failed to escalate mission:', err)
    }
  }

  const handleComplete = async (missionId: string, contained: boolean) => {
    try {
      // Call completion API
      console.log('Completing mission:', missionId, 'contained:', contained)
      // await summitClient.completeMission(missionId, contained)
      await fetchStatus() // Refresh
    } catch (err) {
      console.error('Failed to complete mission:', err)
    }
  }

  const simulateFire = async () => {
    try {
      // Simulate fire detection for testing
      const lat = 40.0 + (Math.random() - 0.5) * 0.01
      const lng = -120.0 + (Math.random() - 0.5) * 0.01
      const confidence = 0.6 + Math.random() * 0.4
      
      console.log('Simulating fire detection:', { lat, lng, confidence })
      // This would trigger the mission dispatcher
      
      // Refresh status after a delay
      setTimeout(fetchStatus, 1000)
    } catch (err) {
      console.error('Failed to simulate fire:', err)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tiered Response System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Activity className="w-6 h-6 animate-spin mr-2" />
            Loading autonomous response status...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tiered Response System</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to connect to Tiered Response System: {error}
            </AlertDescription>
          </Alert>
          <Button onClick={fetchStatus} className="mt-4">
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const activeMissions = status.activeMissions.filter(m => 
    !['completed', 'failed', 'escalated'].includes(m.status)
  )
  
  const recentMissions = status.activeMissions
    .filter(m => ['completed', 'failed', 'escalated'].includes(m.status))
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Autonomous Fire Suppression System
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                status.systemStatus === 'operational' ? 'bg-green-500' :
                status.systemStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-sm capitalize">{status.systemStatus}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{activeMissions.length}</div>
              <div className="text-sm text-gray-600">Active Missions</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{status.availableAssets.total}</div>
              <div className="text-sm text-gray-600">Available Assets</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{status.recentPerformance.averageResponseTime}s</div>
              <div className="text-sm text-gray-600">Avg Response Time</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{status.recentPerformance.successRate}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
          
          {/* Asset Breakdown */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Asset Capabilities</div>
            <div className="flex gap-4 text-xs">
              <span>Tier 1: {status.availableAssets.tier1Capable} drones</span>
              <span>Tier 2: {status.availableAssets.tier2Capable} suppression-capable</span>
              <span>Tier 3: {status.availableAssets.tier3Capable} containment-capable</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Missions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Autonomous Missions</CardTitle>
            <Button onClick={simulateFire} variant="outline" size="sm">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Simulate Fire Detection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeMissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              No active autonomous missions
              <div className="text-sm">System is ready to respond to fire detections</div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMissions.map(mission => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onEscalate={handleEscalate}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed Missions */}
      {recentMissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Mission History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMissions.map(mission => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onEscalate={() => {}}
                  onComplete={() => {}}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}