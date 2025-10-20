/**
 * Tiered Response Manager
 * Orchestrates autonomous fire suppression through tiered drone dispatch
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import mqtt from 'mqtt';
// UUID generation - using timestamp + random for now
const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
import {
  FireDetectionEvent,
  TieredResponseMission,
  TierLevel,
  ResponseStatus,
  ThreatLevel,
  VerificationData,
  TieredResponseConfig,
  EscalationEvent
} from '../../../packages/schemas/src/tiered-response';

export interface SummitAsset {
  id: string;
  type: 'drone' | 'ugv';
  name: string;
  status: 'online' | 'offline' | 'mission' | 'maintenance';
  capabilities: string[];
  location: { lat: number; lng: number; altitude?: number };
  battery: number;
  assignedMission?: string;
}

export class TieredResponseManager extends EventEmitter {
  private summitApiUrl: string;
  private summitApiKey: string;
  private httpClient: AxiosInstance;
  private mqttClient: mqtt.MqttClient;
  private activeMissions = new Map<string, TieredResponseMission>();
  private availableAssets = new Map<string, SummitAsset>();
  private config!: TieredResponseConfig;
  private escalationTimer = new Map<string, NodeJS.Timeout>();

  constructor(summitApiUrl: string, summitApiKey: string, mqttUrl: string) {
    super();
    this.summitApiUrl = summitApiUrl;
    this.summitApiKey = summitApiKey;

    this.httpClient = axios.create({
      baseURL: summitApiUrl,
      headers: {
        'Authorization': `Bearer ${summitApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    this.mqttClient = mqtt.connect(mqttUrl);
    this.setupMQTTHandlers();
    this.loadConfiguration();
  }

  /**
   * Initialize tiered response system
   */
  async initialize(): Promise<void> {
    try {
      // Test Summit.OS connectivity
      await this.httpClient.get('/api/v1/system/health');
      
      // Load available assets
      await this.refreshAssets();
      
      // Subscribe to fire detection events
      this.mqttClient.subscribe('fireline/detections/+');
      this.mqttClient.subscribe('summit/verification/+');
      this.mqttClient.subscribe('summit/missions/+/status');
      
      console.log('Tiered Response Manager initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('Failed to initialize Tiered Response Manager:', error);
      throw error;
    }
  }

  /**
   * Process incoming fire detection and trigger appropriate tier
   */
  async processFireDetection(detection: FireDetectionEvent): Promise<string | null> {
    try {
      console.log(`Processing fire detection ${detection.id} with ${detection.confidence}% confidence`);
      
      // Determine initial tier based on detection characteristics
      const initialTier = this.determineInitialTier(detection);
      if (!initialTier) {
        console.log(`Detection ${detection.id} below threshold for autonomous response`);
        return null;
      }

      // Create tiered response mission
      const mission = await this.createTieredMission(detection, initialTier);
      
      // Dispatch assets for the tier
      const success = await this.dispatchTier(mission);
      if (!success) {
        console.error(`Failed to dispatch Tier ${initialTier} for detection ${detection.id}`);
        mission.status = ResponseStatus.FAILED;
        this.activeMissions.set(mission.id, mission);
        return null;
      }

      // Set up escalation monitoring
      this.setupEscalationMonitoring(mission);
      
      console.log(`Tier ${initialTier} mission ${mission.id} dispatched for fire detection ${detection.id}`);
      this.emit('missionDispatched', mission);
      
      return mission.id;
      
    } catch (error) {
      console.error('Error processing fire detection:', error);
      return null;
    }
  }

  /**
   * Process verification data from Tier 1 missions
   */
  async processVerificationData(verification: VerificationData): Promise<void> {
    try {
      const mission = this.activeMissions.get(verification.missionId);
      if (!mission) {
        console.warn(`Mission ${verification.missionId} not found for verification`);
        return;
      }

      console.log(`Processing verification for mission ${mission.id}: fire confirmed = ${verification.fireConfirmed}`);
      
      if (!verification.fireConfirmed) {
        // False alarm - stand down
        await this.completeMission(mission.id, {
          fireContained: true,
          recommendEscalation: false
        });
        return;
      }

      // Update mission with verified threat level
      mission.updatedAt = new Date().toISOString();
      
      // Check if escalation is needed based on verification data
      const shouldEscalate = this.shouldEscalateBasedOnVerification(mission, verification);
      
      if (shouldEscalate && verification.recommendedTier) {
        await this.escalateMission(mission.id, verification.recommendedTier, 'verification_analysis');
      } else {
        // Continue with current tier
        mission.status = ResponseStatus.ACTIVE;
        this.activeMissions.set(mission.id, mission);
        this.emit('missionUpdated', mission);
      }
      
    } catch (error) {
      console.error('Error processing verification data:', error);
    }
  }

  /**
   * Manually escalate a mission to higher tier
   */
  async escalateMission(missionId: string, toTier: TierLevel, reason: string): Promise<string | null> {
    try {
      const parentMission = this.activeMissions.get(missionId);
      if (!parentMission) {
        throw new Error(`Mission ${missionId} not found`);
      }

      if (toTier <= parentMission.tier) {
        throw new Error(`Cannot escalate to same or lower tier (${toTier})`);
      }

      console.log(`Escalating mission ${missionId} from Tier ${parentMission.tier} to Tier ${toTier}`);

      // Create escalation mission
      const childMission: TieredResponseMission = {
        id: uuidv4(),
        fireEventId: parentMission.fireEventId,
        tier: toTier,
        status: ResponseStatus.PENDING,
        priority: parentMission.priority,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetLocation: parentMission.targetLocation,
        searchRadius: parentMission.searchRadius,
        assignedAssets: [],
        missionParams: {
          ...parentMission.missionParams,
          maxFlightTime: this.getTierFlightTime(toTier),
          suppressantType: toTier >= TierLevel.TIER_2 ? 'water' : undefined,
          suppressantAmount: toTier >= TierLevel.TIER_2 ? this.calculateSuppressantAmount(toTier) : undefined
        },
        targetResponseTime: this.config.performanceTargets[`tier${toTier}ResponseTime` as keyof typeof this.config.performanceTargets],
        escalationTriggers: this.getEscalationTriggers(toTier),
        parentMission: missionId
      };

      // Dispatch new tier
      const success = await this.dispatchTier(childMission);
      if (!success) {
        throw new Error(`Failed to dispatch Tier ${toTier}`);
      }

      // Update parent mission
      parentMission.status = ResponseStatus.ESCALATED;
      parentMission.childMissions = parentMission.childMissions || [];
      parentMission.childMissions.push(childMission.id);
      parentMission.updatedAt = new Date().toISOString();

      // Store both missions
      this.activeMissions.set(parentMission.id, parentMission);
      this.activeMissions.set(childMission.id, childMission);

      // Log escalation event
      const escalationEvent: EscalationEvent = {
        id: uuidv4(),
        parentMissionId: parentMission.id,
        childMissionId: childMission.id,
        fromTier: parentMission.tier,
        toTier: toTier,
        timestamp: new Date().toISOString(),
        reason,
        triggerType: 'automatic',
        triggerData: {}
      };

      // Set up monitoring for new tier
      this.setupEscalationMonitoring(childMission);

      console.log(`Mission escalated: ${parentMission.id} -> ${childMission.id} (Tier ${toTier})`);
      this.emit('missionEscalated', escalationEvent);
      this.emit('missionDispatched', childMission);

      return childMission.id;

    } catch (error) {
      console.error('Error escalating mission:', error);
      return null;
    }
  }

  /**
   * Complete a mission with outcome
   */
  async completeMission(missionId: string, outcome: TieredResponseMission['outcome']): Promise<void> {
    try {
      const mission = this.activeMissions.get(missionId);
      if (!mission) {
        console.warn(`Mission ${missionId} not found`);
        return;
      }

      mission.status = ResponseStatus.COMPLETED;
      mission.completedAt = new Date().toISOString();
      mission.outcome = outcome;
      mission.actualResponseTime = Math.floor(
        (new Date(mission.completedAt).getTime() - new Date(mission.createdAt).getTime()) / 1000
      );

      // Clear escalation timer
      if (this.escalationTimer.has(missionId)) {
        clearTimeout(this.escalationTimer.get(missionId)!);
        this.escalationTimer.delete(missionId);
      }

      // Release assets
      for (const assetId of mission.assignedAssets) {
        const asset = this.availableAssets.get(assetId);
        if (asset) {
          asset.status = 'online';
          asset.assignedMission = undefined;
        }
      }

      this.activeMissions.set(missionId, mission);
      
      console.log(`Mission ${missionId} completed: fire contained = ${outcome?.fireContained}`);
      this.emit('missionCompleted', mission);

      // Check if escalation is recommended
      if (outcome?.recommendEscalation && mission.tier < TierLevel.TIER_3) {
        await this.escalateMission(missionId, mission.tier + 1 as TierLevel, outcome.escalationReason || 'outcome_recommendation');
      }

    } catch (error) {
      console.error('Error completing mission:', error);
    }
  }

  private determineInitialTier(detection: FireDetectionEvent): TierLevel | null {
    // Tier 1: Always dispatch for verification if confidence above minimum
    if (detection.confidence >= this.config.tier1Thresholds.minConfidence) {
      return TierLevel.TIER_1;
    }

    return null;
  }

  private async createTieredMission(detection: FireDetectionEvent, tier: TierLevel): Promise<TieredResponseMission> {
    const mission: TieredResponseMission = {
      id: uuidv4(),
      fireEventId: detection.id,
      tier,
      status: ResponseStatus.PENDING,
      priority: this.mapThreatLevelToPriority(detection.threatLevel),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      targetLocation: detection.location,
      searchRadius: Math.max(100, Math.sqrt(detection.estimatedArea) * 2), // Dynamic search radius
      assignedAssets: [],
      missionParams: {
        maxFlightTime: this.getTierFlightTime(tier),
        returnToBase: true,
        emergencyProtocol: detection.threatLevel === ThreatLevel.CRITICAL,
        suppressantType: tier >= TierLevel.TIER_2 ? 'water' : undefined,
        suppressantAmount: tier >= TierLevel.TIER_2 ? this.calculateSuppressantAmount(tier) : undefined
      },
      targetResponseTime: this.config.performanceTargets[`tier${tier}ResponseTime` as keyof typeof this.config.performanceTargets],
      escalationTriggers: this.getEscalationTriggers(tier)
    };

    this.activeMissions.set(mission.id, mission);
    return mission;
  }

  private async dispatchTier(mission: TieredResponseMission): Promise<boolean> {
    try {
      // Find available assets for this tier
      const requiredAssets = this.findAvailableAssets(mission.tier);
      if (requiredAssets.length === 0) {
        console.error(`No available assets for Tier ${mission.tier}`);
        return false;
      }

      // Assign assets to mission
      mission.assignedAssets = requiredAssets.map(asset => asset.id);
      mission.primaryAsset = requiredAssets[0].id;
      mission.status = ResponseStatus.DISPATCHED;
      mission.dispatchedAt = new Date().toISOString();

      // Mark assets as assigned
      for (const asset of requiredAssets) {
        asset.status = 'mission';
        asset.assignedMission = mission.id;
      }

      // Create mission in Summit.OS
      const summitMissionPayload = this.createSummitMissionPayload(mission);
      await this.httpClient.post('/api/v1/missions', summitMissionPayload);

      console.log(`Dispatched Tier ${mission.tier} with assets: ${mission.assignedAssets.join(', ')}`);
      return true;

    } catch (error) {
      console.error('Error dispatching tier:', error);
      return false;
    }
  }

  private setupEscalationMonitoring(mission: TieredResponseMission): void {
    // Auto-escalation timer
    const timeoutMs = mission.escalationTriggers.timeThreshold * 1000;
    
    const timer = setTimeout(async () => {
      if (mission.status === ResponseStatus.ACTIVE || mission.status === ResponseStatus.ON_SCENE) {
        console.log(`Auto-escalating mission ${mission.id} due to time threshold`);
        await this.escalateMission(mission.id, mission.tier + 1 as TierLevel, 'time_threshold_exceeded');
      }
    }, timeoutMs);

    this.escalationTimer.set(mission.id, timer);
  }

  private setupMQTTHandlers(): void {
    this.mqttClient.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (topic.startsWith('fireline/detections/')) {
          this.processFireDetection(data as FireDetectionEvent);
        } else if (topic.startsWith('summit/verification/')) {
          this.processVerificationData(data as VerificationData);
        } else if (topic.includes('/status')) {
          this.handleMissionStatusUpdate(data);
        }
      } catch (error) {
        console.error('Error processing MQTT message:', error);
      }
    });
  }

  private async refreshAssets(): Promise<void> {
    try {
      const response = await this.httpClient.get('/api/v1/assets');
      const assets = response.data as SummitAsset[];
      
      this.availableAssets.clear();
      for (const asset of assets) {
        this.availableAssets.set(asset.id, asset);
      }
      
      console.log(`Loaded ${assets.length} assets`);
    } catch (error) {
      console.error('Error refreshing assets:', error);
    }
  }

  private findAvailableAssets(tier: TierLevel): SummitAsset[] {
    const profile = this.config.assetProfiles[tier as keyof typeof this.config.assetProfiles];
    if (!profile) return [];
    
    const available = Array.from(this.availableAssets.values())
      .filter(asset => 
        asset.status === 'online' &&
        asset.battery > 30 &&
        profile.requiredCapabilities.every((cap: string) => asset.capabilities.includes(cap))
      );

    return available.slice(0, profile.maxAssets);
  }

  private loadConfiguration(): void {
    // Default configuration - should be loaded from environment/database
    this.config = {
      tier1Thresholds: {
        minConfidence: 0.3,
        maxResponseTime: 60
      },
      tier2Thresholds: {
        minFireSize: 100, // 100 sq meters
        minConfidence: 0.6,
        maxResponseTime: 120
      },
      tier3Thresholds: {
        minFireSize: 500, // 500 sq meters
        maxWindSpeed: 15, // 15 m/s
        maxResponseTime: 300
      },
      assetProfiles: {
        [TierLevel.TIER_1]: {
          primaryAssetType: 'drone',
          requiredCapabilities: ['thermal_camera', 'visual_camera'],
          maxAssets: 1
        },
        [TierLevel.TIER_2]: {
          primaryAssetType: 'drone',
          requiredCapabilities: ['thermal_camera', 'suppressant_system'],
          maxAssets: 1
        },
        [TierLevel.TIER_3]: {
          primaryAssetType: 'drone',
          requiredCapabilities: ['suppressant_system'],
          maxAssets: 3
        }
      },
      operationalLimits: {
        maxConcurrentMissions: 10,
        maxTier3Missions: 2,
        emergencyOverride: true
      },
      performanceTargets: {
        tier1ResponseTime: 60,
        tier2ResponseTime: 120,
        tier3ResponseTime: 300,
        containmentSuccessRate: 85
      }
    };
  }

  // Helper methods
  private mapThreatLevelToPriority(threatLevel: ThreatLevel): 'low' | 'medium' | 'high' | 'critical' {
    switch (threatLevel) {
      case ThreatLevel.LOW: return 'low';
      case ThreatLevel.MEDIUM: return 'medium';
      case ThreatLevel.HIGH: return 'high';
      case ThreatLevel.CRITICAL: return 'critical';
    }
  }

  private getTierFlightTime(tier: TierLevel): number {
    switch (tier) {
      case TierLevel.TIER_1: return 15;
      case TierLevel.TIER_2: return 20;
      case TierLevel.TIER_3: return 30;
      default: return 15;
    }
  }

  private calculateSuppressantAmount(tier: TierLevel): number {
    switch (tier) {
      case TierLevel.TIER_2: return 50; // 50 liters
      case TierLevel.TIER_3: return 100; // 100 liters per drone
      default: return 0;
    }
  }

  private getEscalationTriggers(tier: TierLevel) {
    return {
      timeThreshold: tier === TierLevel.TIER_1 ? 300 : 600, // 5-10 minutes
      sizeThreshold: tier === TierLevel.TIER_1 ? 200 : 1000, // sq meters
      confidenceThreshold: 0.8
    };
  }

  private shouldEscalateBasedOnVerification(mission: TieredResponseMission, verification: VerificationData): boolean {
    return (
      verification.fireSize.estimatedArea > mission.escalationTriggers.sizeThreshold ||
      verification.threatAssessment.currentThreatLevel === ThreatLevel.CRITICAL ||
      verification.recommendedAction === 'escalate'
    );
  }

  private createSummitMissionPayload(mission: TieredResponseMission): any {
    return {
      id: mission.id,
      type: `TIER_${mission.tier}_RESPONSE`,
      priority: mission.priority.toUpperCase(),
      assignedTo: mission.primaryAsset,
      waypoints: [{
        latitude: mission.targetLocation.lat,
        longitude: mission.targetLocation.lng,
        altitude: mission.targetLocation.altitude || 100
      }],
      parameters: {
        searchRadius: mission.searchRadius,
        maxFlightTime: mission.missionParams.maxFlightTime,
        suppressantType: mission.missionParams.suppressantType,
        suppressantAmount: mission.missionParams.suppressantAmount,
        emergencyProtocol: mission.missionParams.emergencyProtocol
      }
    };
  }

  private handleMissionStatusUpdate(statusUpdate: any): void {
    // Handle Summit.OS mission status updates
    const mission = this.activeMissions.get(statusUpdate.missionId);
    if (mission) {
      // Update mission status based on Summit.OS feedback
      this.emit('missionStatusUpdated', statusUpdate);
    }
  }

  // Public getters
  getActiveMissions(): TieredResponseMission[] {
    return Array.from(this.activeMissions.values());
  }

  getAvailableAssets(): SummitAsset[] {
    return Array.from(this.availableAssets.values());
  }

  getSystemStatus() {
    const active = this.getActiveMissions();
    return {
      systemStatus: 'operational' as const,
      activeMissions: active,
      availableAssets: {
        total: this.availableAssets.size,
        tier1Capable: Array.from(this.availableAssets.values()).filter(a => 
          a.capabilities.includes('thermal_camera')).length,
        tier2Capable: Array.from(this.availableAssets.values()).filter(a => 
          a.capabilities.includes('suppressant_system')).length,
        tier3Capable: Array.from(this.availableAssets.values()).filter(a => 
          a.capabilities.includes('suppressant_system')).length
      }
    };
  }
}