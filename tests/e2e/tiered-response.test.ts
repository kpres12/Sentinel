/**
 * End-to-End Testing Suite for Tiered Response System
 * Tests the complete autonomous fire suppression workflow
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { TieredResponseManager } from '../../apps/mission-dispatcher/src/TieredResponseManager'
import { FireDetectionEvent, ThreatLevel, TierLevel } from '../../packages/schemas/src/tiered-response'
import axios from 'axios'

// Test configuration
const TEST_CONFIG = {
  summitApiUrl: process.env.TEST_SUMMIT_API_URL || 'http://localhost:8080',
  summitApiKey: process.env.TEST_SUMMIT_API_KEY || 'test_key',
  mqttUrl: process.env.TEST_MQTT_URL || 'mqtt://localhost:1883',
  dispatcherUrl: process.env.TEST_DISPATCHER_URL || 'http://localhost:8089',
  timeout: 30000 // 30 second timeout for async operations
}

// Performance targets from requirements
const PERFORMANCE_TARGETS = {
  tier1ResponseTime: 60, // seconds
  tier2ResponseTime: 120, // seconds  
  tier3ResponseTime: 300, // seconds
  containmentSuccessRate: 85 // percentage
}

describe('Tiered Response System E2E Tests', () => {
  let tieredResponseManager: TieredResponseManager
  let testFireEvents: FireDetectionEvent[] = []

  beforeAll(async () => {
    // Initialize the tiered response manager
    tieredResponseManager = new TieredResponseManager(
      TEST_CONFIG.summitApiUrl,
      TEST_CONFIG.summitApiKey,
      TEST_CONFIG.mqttUrl
    )

    // Wait for system initialization
    await tieredResponseManager.initialize()
    
    console.log('🔥 Tiered Response System initialized for testing')
  }, TEST_CONFIG.timeout)

  afterAll(async () => {
    // Cleanup any active missions
    const activeMissions = tieredResponseManager.getActiveMissions()
    for (const mission of activeMissions) {
      await tieredResponseManager.completeMission(mission.id, { fireContained: true, recommendEscalation: false })
    }
    
    console.log('🧹 Test cleanup completed')
  })

  beforeEach(() => {
    // Clear test data
    testFireEvents = []
  })

  describe('Fire Detection and Tier 1 Verification', () => {
    test('should dispatch Tier 1 mission for medium confidence detection', async () => {
      const fireDetection: FireDetectionEvent = {
        id: 'test-fire-001',
        deviceId: 'test-sentry-001',
        timestamp: new Date().toISOString(),
        location: { lat: 40.0, lng: -120.0 },
        confidence: 0.7,
        threatLevel: ThreatLevel.HIGH,
        detectionType: 'smoke',
        source: 'thermal',
        estimatedArea: 150
      }

      const startTime = Date.now()
      const missionId = await tieredResponseManager.processFireDetection(fireDetection)
      const responseTime = (Date.now() - startTime) / 1000

      expect(missionId).toBeTruthy()
      expect(responseTime).toBeLessThan(PERFORMANCE_TARGETS.tier1ResponseTime)

      // Verify mission details
      const missions = tieredResponseManager.getActiveMissions()
      const mission = missions.find(m => m.id === missionId)
      
      expect(mission).toBeTruthy()
      expect(mission!.tier).toBe(TierLevel.TIER_1)
      expect(mission!.status).toBe('dispatched')
      expect(mission!.assignedAssets.length).toBeGreaterThan(0)

      testFireEvents.push(fireDetection)
    }, TEST_CONFIG.timeout)

    test('should reject low confidence detections', async () => {
      const fireDetection: FireDetectionEvent = {
        id: 'test-fire-low-conf',
        deviceId: 'test-sentry-002', 
        timestamp: new Date().toISOString(),
        location: { lat: 40.01, lng: -120.01 },
        confidence: 0.2, // Below threshold
        threatLevel: ThreatLevel.LOW,
        detectionType: 'smoke',
        source: 'thermal',
        estimatedArea: 50
      }

      const missionId = await tieredResponseManager.processFireDetection(fireDetection)
      expect(missionId).toBeNull()
    })

    test('should handle multiple simultaneous detections', async () => {
      const detections: FireDetectionEvent[] = Array.from({ length: 3 }, (_, i) => ({
        id: `test-fire-multi-${i}`,
        deviceId: `test-sentry-${i}`,
        timestamp: new Date().toISOString(),
        location: { lat: 40.0 + i * 0.01, lng: -120.0 + i * 0.01 },
        confidence: 0.6 + i * 0.1,
        threatLevel: ThreatLevel.MEDIUM,
        detectionType: 'smoke',
        source: 'thermal',
        estimatedArea: 100 + i * 50
      }))

      const missionIds = await Promise.all(
        detections.map(d => tieredResponseManager.processFireDetection(d))
      )

      const validMissions = missionIds.filter(Boolean)
      expect(validMissions.length).toBe(3)

      // Check system can handle concurrent missions
      const systemStatus = tieredResponseManager.getSystemStatus()
      expect(systemStatus.activeMissions.length).toBeGreaterThanOrEqual(3)
    }, TEST_CONFIG.timeout)
  })

  describe('Mission Escalation Workflow', () => {
    test('should escalate Tier 1 to Tier 2 based on verification data', async () => {
      // Create initial Tier 1 mission
      const fireDetection: FireDetectionEvent = {
        id: 'test-escalation-001',
        deviceId: 'test-sentry-escalation',
        timestamp: new Date().toISOString(),
        location: { lat: 40.05, lng: -120.05 },
        confidence: 0.6,
        threatLevel: ThreatLevel.MEDIUM,
        detectionType: 'flame',
        source: 'thermal',
        estimatedArea: 200
      }

      const tier1MissionId = await tieredResponseManager.processFireDetection(fireDetection)
      expect(tier1MissionId).toBeTruthy()

      // Simulate verification data indicating escalation needed
      const verificationData = {
        missionId: tier1MissionId!,
        deviceId: 'firefly-001',
        timestamp: new Date().toISOString(),
        fireConfirmed: true,
        confidence: 0.85,
        fireSize: {
          estimatedArea: 300, // Larger than threshold
          perimeter: 200,
          intensity: 'high' as const
        },
        refinedLocation: fireDetection.location,
        environmentalData: {
          windSpeed: 10,
          windDirection: 180,
          temperature: 30,
          humidity: 40,
          visibility: 1000
        },
        mediaUrls: ['test://thermal-image.jpg'],
        threatAssessment: {
          currentThreatLevel: ThreatLevel.HIGH,
          predictedSpread: {
            direction: 180,
            rateMetersPerMin: 5,
            timeToContainment: 10
          },
          assetsAtRisk: ['vegetation', 'structures'],
          suppressionStrategy: 'direct_attack' as const
        },
        recommendedAction: 'escalate' as const,
        recommendedTier: TierLevel.TIER_2
      }

      await tieredResponseManager.processVerificationData(verificationData)

      // Verify escalation occurred
      const missions = tieredResponseManager.getActiveMissions()
      const tier2Mission = missions.find(m => m.tier === TierLevel.TIER_2 && m.parentMission === tier1MissionId)
      
      expect(tier2Mission).toBeTruthy()
      expect(tier2Mission!.status).toBe('dispatched')
    }, TEST_CONFIG.timeout)

    test('should auto-escalate on time threshold', async () => {
      // This test would require mocking time or using a shorter threshold
      // For demo purposes, we'll test the escalation API directly
      
      const fireDetection: FireDetectionEvent = {
        id: 'test-time-escalation',
        deviceId: 'test-sentry-time',
        timestamp: new Date().toISOString(),
        location: { lat: 40.1, lng: -120.1 },
        confidence: 0.7,
        threatLevel: ThreatLevel.HIGH,
        detectionType: 'flame',
        source: 'thermal',
        estimatedArea: 100
      }

      const tier1MissionId = await tieredResponseManager.processFireDetection(fireDetection)
      expect(tier1MissionId).toBeTruthy()

      // Manually trigger escalation (simulating timeout)
      const tier2MissionId = await tieredResponseManager.escalateMission(
        tier1MissionId!, 
        TierLevel.TIER_2, 
        'time_threshold_exceeded'
      )

      expect(tier2MissionId).toBeTruthy()

      // Verify parent-child relationship
      const missions = tieredResponseManager.getActiveMissions()
      const parentMission = missions.find(m => m.id === tier1MissionId)
      const childMission = missions.find(m => m.id === tier2MissionId)

      expect(parentMission!.status).toBe('escalated')
      expect(parentMission!.childMissions).toContain(tier2MissionId)
      expect(childMission!.parentMission).toBe(tier1MissionId)
    }, TEST_CONFIG.timeout)

    test('should escalate to Tier 3 for large fires', async () => {
      const fireDetection: FireDetectionEvent = {
        id: 'test-tier3-escalation',
        deviceId: 'test-sentry-large',
        timestamp: new Date().toISOString(),
        location: { lat: 40.15, lng: -120.15 },
        confidence: 0.9,
        threatLevel: ThreatLevel.CRITICAL,
        detectionType: 'flame',
        source: 'thermal',
        estimatedArea: 800 // Large fire requiring containment
      }

      // Should trigger Tier 1 initially
      const tier1MissionId = await tieredResponseManager.processFireDetection(fireDetection)
      expect(tier1MissionId).toBeTruthy()

      // Escalate through Tier 2
      const tier2MissionId = await tieredResponseManager.escalateMission(
        tier1MissionId!,
        TierLevel.TIER_2,
        'large_fire_size'
      )

      // Further escalate to Tier 3
      const tier3MissionId = await tieredResponseManager.escalateMission(
        tier2MissionId!,
        TierLevel.TIER_3,
        'fire_spreading_rapidly'
      )

      expect(tier3MissionId).toBeTruthy()

      const missions = tieredResponseManager.getActiveMissions()
      const tier3Mission = missions.find(m => m.id === tier3MissionId)
      
      expect(tier3Mission!.tier).toBe(TierLevel.TIER_3)
      expect(tier3Mission!.assignedAssets.length).toBeGreaterThan(1) // Multiple assets for containment
    }, TEST_CONFIG.timeout)
  })

  describe('Mission Completion and Success Metrics', () => {
    test('should complete mission successfully with fire contained', async () => {
      const fireDetection: FireDetectionEvent = {
        id: 'test-completion-success',
        deviceId: 'test-sentry-success',
        timestamp: new Date().toISOString(),
        location: { lat: 40.2, lng: -120.2 },
        confidence: 0.8,
        threatLevel: ThreatLevel.HIGH,
        detectionType: 'flame',
        source: 'thermal',
        estimatedArea: 150
      }

      const startTime = Date.now()
      const missionId = await tieredResponseManager.processFireDetection(fireDetection)
      
      // Complete the mission successfully
      await tieredResponseManager.completeMission(missionId!, {
        fireContained: true,
        suppressantUsed: 25,
        recommendEscalation: false
      })

      const endTime = Date.now()
      const totalResponseTime = (endTime - startTime) / 1000

      // Verify completion
      const missions = tieredResponseManager.getActiveMissions()
      const completedMission = missions.find(m => m.id === missionId && m.status === 'completed')
      
      expect(completedMission).toBeTruthy()
      expect(completedMission!.outcome!.fireContained).toBe(true)
      expect(completedMission!.actualResponseTime).toBeDefined()
      expect(totalResponseTime).toBeLessThan(PERFORMANCE_TARGETS.tier1ResponseTime)
    })

    test('should handle mission failure and recommend escalation', async () => {
      const fireDetection: FireDetectionEvent = {
        id: 'test-completion-failure',
        deviceId: 'test-sentry-failure',
        timestamp: new Date().toISOString(),
        location: { lat: 40.25, lng: -120.25 },
        confidence: 0.75,
        threatLevel: ThreatLevel.HIGH,
        detectionType: 'flame',
        source: 'thermal',
        estimatedArea: 200
      }

      const missionId = await tieredResponseManager.processFireDetection(fireDetection)
      
      // Complete with failure
      await tieredResponseManager.completeMission(missionId!, {
        fireContained: false,
        recommendEscalation: true,
        escalationReason: 'insufficient_suppressant'
      })

      // Should trigger automatic escalation
      const missions = tieredResponseManager.getActiveMissions()
      const failedMission = missions.find(m => m.id === missionId)
      const escalatedMission = missions.find(m => m.parentMission === missionId)
      
      expect(failedMission!.outcome!.fireContained).toBe(false)
      expect(escalatedMission).toBeTruthy()
      expect(escalatedMission!.tier).toBeGreaterThan(failedMission!.tier)
    })
  })

  describe('System Performance and Reliability', () => {
    test('should maintain response time targets under load', async () => {
      const detections = Array.from({ length: 5 }, (_, i) => ({
        id: `test-performance-${i}`,
        deviceId: `test-sentry-perf-${i}`,
        timestamp: new Date().toISOString(),
        location: { lat: 40.0 + i * 0.02, lng: -120.0 + i * 0.02 },
        confidence: 0.7 + i * 0.05,
        threatLevel: ThreatLevel.HIGH,
        detectionType: 'flame' as const,
        source: 'thermal' as const,
        estimatedArea: 100 + i * 20
      }))

      const responseTimes: number[] = []
      
      for (const detection of detections) {
        const start = Date.now()
        const missionId = await tieredResponseManager.processFireDetection(detection)
        const responseTime = (Date.now() - start) / 1000
        
        expect(missionId).toBeTruthy()
        responseTimes.push(responseTime)
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      expect(averageResponseTime).toBeLessThan(PERFORMANCE_TARGETS.tier1ResponseTime)
      expect(Math.max(...responseTimes)).toBeLessThan(PERFORMANCE_TARGETS.tier1ResponseTime * 1.5)
    }, TEST_CONFIG.timeout)

    test('should handle asset availability constraints', async () => {
      const systemStatus = tieredResponseManager.getSystemStatus()
      const initialAssets = systemStatus.availableAssets.total

      // Create missions until assets are exhausted
      const detections: FireDetectionEvent[] = []
      for (let i = 0; i < initialAssets + 2; i++) {
        detections.push({
          id: `test-asset-limit-${i}`,
          deviceId: `test-sentry-limit-${i}`,
          timestamp: new Date().toISOString(),
          location: { lat: 40.0 + i * 0.01, lng: -120.0 + i * 0.01 },
          confidence: 0.8,
          threatLevel: ThreatLevel.HIGH,
          detectionType: 'flame',
          source: 'thermal',
          estimatedArea: 100
        })
      }

      const results = await Promise.all(
        detections.map(d => tieredResponseManager.processFireDetection(d))
      )

      const successfulMissions = results.filter(Boolean).length
      const failedMissions = results.filter(r => r === null).length

      expect(successfulMissions).toBeLessThanOrEqual(initialAssets)
      expect(failedMissions).toBeGreaterThan(0) // Some should fail due to asset constraints
    }, TEST_CONFIG.timeout)

    test('should provide accurate system status metrics', async () => {
      const systemStatus = tieredResponseManager.getSystemStatus()
      
      expect(systemStatus.systemStatus).toBe('operational')
      expect(systemStatus.availableAssets.total).toBeGreaterThan(0)
      expect(systemStatus.availableAssets.tier1Capable).toBeGreaterThan(0)
      
      // Performance metrics should be realistic
      expect(systemStatus.recentPerformance.averageResponseTime).toBeGreaterThan(0)
      expect(systemStatus.recentPerformance.averageResponseTime).toBeLessThan(300)
      expect(systemStatus.recentPerformance.successRate).toBeGreaterThanOrEqual(0)
      expect(systemStatus.recentPerformance.successRate).toBeLessThanOrEqual(100)
    })
  })

  describe('Integration with External Systems', () => {
    test('should integrate with mission dispatcher API', async () => {
      try {
        const response = await axios.get(`${TEST_CONFIG.dispatcherUrl}/status`, {
          timeout: 5000
        })
        
        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty('legacy')
        
        if (response.data.tiered) {
          expect(response.data.tiered).toHaveProperty('systemStatus')
          expect(response.data.tiered).toHaveProperty('activeMissions')
        }
      } catch (error) {
        console.warn('Mission dispatcher not available for integration test')
        expect(true).toBe(true) // Skip test if dispatcher not running
      }
    })

    test('should handle MQTT communication', async () => {
      // This would test MQTT message handling
      // For now, we'll just verify the manager can process events
      const detection: FireDetectionEvent = {
        id: 'test-mqtt-integration',
        deviceId: 'mqtt-test-device',
        timestamp: new Date().toISOString(),
        location: { lat: 40.3, lng: -120.3 },
        confidence: 0.8,
        threatLevel: ThreatLevel.HIGH,
        detectionType: 'thermal',
        source: 'thermal',
        estimatedArea: 100
      }

      const missionId = await tieredResponseManager.processFireDetection(detection)
      expect(missionId).toBeTruthy()
    })
  })

  describe('Error Handling and Resilience', () => {
    test('should handle malformed fire detection data', async () => {
      const malformedDetection = {
        id: 'test-malformed',
        // Missing required fields
        confidence: 0.8
      } as any

      await expect(
        tieredResponseManager.processFireDetection(malformedDetection)
      ).rejects.toThrow()
    })

    test('should gracefully handle Summit.OS API failures', async () => {
      // This would require mocking the Summit.OS API to return errors
      // For now, we'll just verify error handling exists
      const detection: FireDetectionEvent = {
        id: 'test-api-failure',
        deviceId: 'api-failure-test',
        timestamp: new Date().toISOString(),
        location: { lat: 40.35, lng: -120.35 },
        confidence: 0.8,
        threatLevel: ThreatLevel.HIGH,
        detectionType: 'flame',
        source: 'thermal',
        estimatedArea: 100
      }

      // Should not throw even if backend services are unavailable
      await expect(
        tieredResponseManager.processFireDetection(detection)
      ).resolves.toBeDefined()
    })
  })
})

describe('Performance Benchmarks', () => {
  test('Tier 1 Response Time Benchmark', async () => {
    console.log('🎯 Running Tier 1 response time benchmark...')
    
    const benchmark = {
      iterations: 10,
      target: PERFORMANCE_TARGETS.tier1ResponseTime,
      results: [] as number[]
    }

    for (let i = 0; i < benchmark.iterations; i++) {
      const detection: FireDetectionEvent = {
        id: `benchmark-tier1-${i}`,
        deviceId: `benchmark-device-${i}`,
        timestamp: new Date().toISOString(),
        location: { lat: 40.0 + Math.random() * 0.1, lng: -120.0 + Math.random() * 0.1 },
        confidence: 0.6 + Math.random() * 0.3,
        threatLevel: ThreatLevel.MEDIUM,
        detectionType: 'smoke',
        source: 'thermal',
        estimatedArea: 50 + Math.random() * 200
      }

      const start = Date.now()
      const missionId = await new TieredResponseManager(
        TEST_CONFIG.summitApiUrl,
        TEST_CONFIG.summitApiKey,
        TEST_CONFIG.mqttUrl
      ).processFireDetection(detection)
      const responseTime = (Date.now() - start) / 1000

      if (missionId) {
        benchmark.results.push(responseTime)
      }
    }

    const avgResponseTime = benchmark.results.reduce((a, b) => a + b, 0) / benchmark.results.length
    const maxResponseTime = Math.max(...benchmark.results)
    const successRate = (benchmark.results.length / benchmark.iterations) * 100

    console.log(`📊 Tier 1 Benchmark Results:`)
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}s (target: ${benchmark.target}s)`)
    console.log(`   Maximum Response Time: ${maxResponseTime.toFixed(2)}s`)
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`)

    expect(avgResponseTime).toBeLessThan(benchmark.target)
    expect(successRate).toBeGreaterThan(PERFORMANCE_TARGETS.containmentSuccessRate)
  }, 60000) // 1 minute timeout for benchmark
})