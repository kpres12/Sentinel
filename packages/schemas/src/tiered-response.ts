/**
 * Tiered Response System Schemas
 * Defines types for autonomous fire suppression workflow
 */

export enum TierLevel {
  TIER_1 = 1,  // Initial verification (FireFly)
  TIER_2 = 2,  // Direct suppression (EmberWing) 
  TIER_3 = 3,  // Multi-drone containment ring
  TIER_4 = 4   // Full emergency response coordination
}

export enum ResponseStatus {
  PENDING = 'pending',
  DISPATCHED = 'dispatched', 
  EN_ROUTE = 'en_route',
  ON_SCENE = 'on_scene',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ESCALATED = 'escalated',
  CANCELLED = 'cancelled'
}

export enum ThreatLevel {
  LOW = 'low',           // 0-30% confidence or small area
  MEDIUM = 'medium',     // 30-70% confidence or moderate area
  HIGH = 'high',         // 70-90% confidence or large area 
  CRITICAL = 'critical'  // >90% confidence or spreading rapidly
}

export interface FireDetectionEvent {
  id: string;
  deviceId: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
    altitude?: number;
  };
  confidence: number;
  threatLevel: ThreatLevel;
  detectionType: 'smoke' | 'flame' | 'heat' | 'thermal';
  source: 'thermal' | 'visual' | 'multispectral';
  mediaUrl?: string;
  estimatedArea: number; // square meters
  weatherConditions?: {
    windSpeed: number;
    windDirection: number;
    humidity: number;
    temperature: number;
  };
}

export interface TieredResponseMission {
  id: string;
  fireEventId: string;
  tier: TierLevel;
  status: ResponseStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Mission details
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  completedAt?: string;
  
  // Target information
  targetLocation: {
    lat: number;
    lng: number;
    altitude?: number;
  };
  searchRadius: number; // meters
  
  // Assets assigned
  assignedAssets: string[]; // device IDs
  primaryAsset?: string;    // lead asset ID
  
  // Mission parameters
  missionParams: {
    maxFlightTime: number;     // minutes
    returnToBase: boolean;
    emergencyProtocol: boolean;
    suppressantType?: 'water' | 'retardant' | 'foam';
    suppressantAmount?: number; // liters
  };
  
  // Response times (in seconds)
  targetResponseTime: number;
  actualResponseTime?: number;
  
  // Results
  outcome?: {
    fireContained: boolean;
    suppressantUsed?: number;
    damageAssessment?: string;
    recommendEscalation: boolean;
    escalationReason?: string;
  };
  
  // Next tier trigger conditions
  escalationTriggers: {
    timeThreshold: number;     // seconds - auto escalate if not contained
    sizeThreshold: number;     // square meters - escalate if fire grows
    confidenceThreshold: number; // escalate if verification confidence drops
    weatherThreshold?: {
      maxWindSpeed: number;
      minHumidity: number;
    };
  };
  
  // Child missions (for escalation)
  childMissions?: string[];
  parentMission?: string;
}

export interface VerificationData {
  missionId: string;
  deviceId: string;
  timestamp: string;
  
  // Fire confirmation
  fireConfirmed: boolean;
  confidence: number;
  
  // Fire characteristics
  fireSize: {
    estimatedArea: number;    // square meters
    perimeter: number;        // meters
    intensity: 'low' | 'medium' | 'high' | 'extreme';
  };
  
  // Location refinement  
  refinedLocation: {
    lat: number;
    lng: number;
    accuracy: number; // meters
  };
  
  // Environmental data
  environmentalData: {
    windSpeed: number;
    windDirection: number;
    temperature: number;
    humidity: number;
    visibility: number;
  };
  
  // Visual data
  mediaUrls: string[];
  thermalImageUrl?: string;
  
  // Threat assessment
  threatAssessment: {
    currentThreatLevel: ThreatLevel;
    predictedSpread: {
      direction: number;      // degrees
      rateMetersPerMin: number;
      timeToContainment: number; // minutes if acted upon immediately
    };
    assetsAtRisk: string[];   // nearby infrastructure/vegetation
    suppressionStrategy: 'direct_attack' | 'indirect_attack' | 'containment';
  };
  
  // Recommendations
  recommendedAction: 'escalate' | 'continue_current' | 'stand_down';
  recommendedTier?: TierLevel;
}

export interface TieredResponseConfig {
  // Detection thresholds for auto-dispatch
  tier1Thresholds: {
    minConfidence: number;
    maxResponseTime: number; // seconds
  };
  
  tier2Thresholds: {
    minFireSize: number;     // square meters
    minConfidence: number;
    maxResponseTime: number; // seconds
  };
  
  tier3Thresholds: {
    minFireSize: number;     // square meters
    maxWindSpeed: number;    // m/s
    maxResponseTime: number; // seconds
  };
  
  // Asset assignments per tier
  assetProfiles: {
    [TierLevel.TIER_1]: {
      primaryAssetType: 'drone';
      requiredCapabilities: string[];
      maxAssets: number;
    };
    [TierLevel.TIER_2]: {
      primaryAssetType: 'drone';
      requiredCapabilities: string[];
      maxAssets: number;
    };
    [TierLevel.TIER_3]: {
      primaryAssetType: 'drone';
      requiredCapabilities: string[];
      maxAssets: number;
    };
  };
  
  // Operational parameters
  operationalLimits: {
    maxConcurrentMissions: number;
    maxTier3Missions: number;
    emergencyOverride: boolean;
  };
  
  // Success metrics
  performanceTargets: {
    tier1ResponseTime: number; // seconds
    tier2ResponseTime: number; // seconds  
    tier3ResponseTime: number; // seconds
    containmentSuccessRate: number; // percentage
  };
}

export interface TieredResponseStatus {
  systemStatus: 'operational' | 'degraded' | 'offline';
  activeMissions: TieredResponseMission[];
  availableAssets: {
    total: number;
    tier1Capable: number;
    tier2Capable: number;
    tier3Capable: number;
  };
  recentPerformance: {
    averageResponseTime: number;
    successRate: number;
    escalationRate: number;
  };
}

export interface EscalationEvent {
  id: string;
  parentMissionId: string;
  childMissionId: string;
  fromTier: TierLevel;
  toTier: TierLevel;
  timestamp: string;
  reason: string;
  triggerType: 'automatic' | 'operator' | 'system';
  triggerData: any;
}