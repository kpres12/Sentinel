/**
 * Enhanced Mission Dispatcher with Tiered Response Integration
 * Combines existing dispatch logic with autonomous fire suppression tiers
 */

import 'dotenv/config';
import mqtt, { MqttClient } from 'mqtt';
import axios from 'axios';
import { TieredResponseManager } from './TieredResponseManager';
import { FireDetectionEvent, ThreatLevel } from '../../../packages/schemas/src/tiered-response';
// @ts-ignore - policy types not available
import { evaluatePolicy } from '../../../packages/policy';
type DispatchContext = any;
type PolicyDecision = any;

// Existing env config
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined;
const ALERTS_TOPIC = process.env.ALERTS_TOPIC || 'wildfire/alerts';
const TRIANGULATION_TOPIC = process.env.TRIANGULATION_TOPIC || 'wildfire/triangulations';
const MISSIONS_TOPIC = process.env.DISPATCHER_MISSIONS_TOPIC || 'missions/updates';

// Summit.OS integration
const SUMMIT_API_URL = process.env.SUMMIT_API_URL || 'http://localhost:8080';
const SUMMIT_API_KEY = process.env.SUMMIT_API_KEY || 'dev_key';

// Tiered response config
const ENABLE_TIERED_RESPONSE = String(process.env.ENABLE_TIERED_RESPONSE || 'true').toLowerCase() === 'true';
const AUTONOMOUS_THRESHOLD = Number(process.env.AUTONOMOUS_THRESHOLD || 0.6);

// Legacy config
const MIN_CONFIDENCE = Number(process.env.DISPATCHER_MIN_CONFIDENCE || 0.8);
const REQUIRE_CONFIRM = String(process.env.DISPATCHER_REQUIRE_CONFIRM || 'false').toLowerCase() === 'true';
const DRONE_ASSETS = (process.env.DISPATCHER_ASSETS || 'drone-001,drone-002').split(',').map(s => s.trim()).filter(Boolean);
const LOITER_RADIUS_M = Number(process.env.DISPATCHER_LOITER_RADIUS_M || 200);
const DEFAULT_ALT_M = Number(process.env.DISPATCHER_ALT_M || 120);

interface AlertPayload {
  type: 'smoke' | 'fire' | string;
  confidence?: number;
  latitude?: number;
  longitude?: number;
  location?: { latitude: number; longitude: number };
  metadata?: Record<string, any>;
}

interface TriangulationResult {
  latitude: number;
  longitude: number;
  uncertainty_meters?: number;
  confidence?: number;
}

class EnhancedMissionDispatcher {
  private mqttClient: MqttClient;
  private tieredResponseManager?: TieredResponseManager;
  private dispatchedAlerts = new Set<string>(); // Prevent duplicate dispatches

  constructor() {
    this.mqttClient = mqtt.connect(MQTT_URL, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      reconnectPeriod: 2000,
    });

    if (ENABLE_TIERED_RESPONSE) {
      this.tieredResponseManager = new TieredResponseManager(
        SUMMIT_API_URL,
        SUMMIT_API_KEY,
        MQTT_URL
      );
      this.setupTieredResponseHandlers();
    }

    this.setupMQTTHandlers();
  }

  async initialize(): Promise<void> {
    console.log('[dispatcher] Enhanced Mission Dispatcher starting...');
    
    if (ENABLE_TIERED_RESPONSE && this.tieredResponseManager) {
      try {
        await this.tieredResponseManager.initialize();
        console.log('[dispatcher] 🚁 Tiered Response System activated');
      } catch (error) {
        console.error('[dispatcher] Failed to initialize tiered response:', error);
        console.log('[dispatcher] Falling back to legacy dispatch mode');
      }
    }

    return new Promise((resolve) => {
      this.mqttClient.on('connect', () => {
        console.log('[dispatcher] Connected to MQTT');
        this.mqttClient.subscribe([ALERTS_TOPIC, TRIANGULATION_TOPIC], (err) => {
          if (err) {
            console.error('Subscribe error', err);
          } else {
            console.log(`[dispatcher] Subscribed to ${ALERTS_TOPIC}, ${TRIANGULATION_TOPIC}`);
            if (ENABLE_TIERED_RESPONSE) {
              console.log('[dispatcher] 🔥 Ready for autonomous fire suppression');
            }
            resolve();
          }
        });
      });
    });
  }

  private setupTieredResponseHandlers(): void {
    if (!this.tieredResponseManager) return;

    this.tieredResponseManager.on('missionDispatched', (mission) => {
      console.log(`[tiered] 🚁 Tier ${mission.tier} dispatched: ${mission.id}`);
      
      // Publish to UI
      this.mqttClient.publish(MISSIONS_TOPIC, JSON.stringify({
        id: mission.id,
        type: `tier_${mission.tier}_response`,
        status: 'active',
        priority: mission.priority,
        location: {
          lat: mission.targetLocation.lat,
          lng: mission.targetLocation.lng,
          radius: mission.searchRadius
        },
        description: `Tier ${mission.tier} autonomous fire response`,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt,
        tier: mission.tier,
        assignedAssets: mission.assignedAssets
      }), { qos: 1 });
    });

    this.tieredResponseManager.on('missionEscalated', (escalation) => {
      console.log(`[tiered] ⬆️ Escalated to Tier ${escalation.toTier}: ${escalation.reason}`);
    });

    this.tieredResponseManager.on('missionCompleted', (mission) => {
      const result = mission.outcome?.fireContained ? '✅ CONTAINED' : '⚠️ ESCALATION NEEDED';
      console.log(`[tiered] ${result} Tier ${mission.tier} completed in ${mission.actualResponseTime}s`);
      
      // Update UI
      this.mqttClient.publish(MISSIONS_TOPIC, JSON.stringify({
        id: mission.id,
        status: 'completed',
        outcome: mission.outcome,
        completedAt: mission.completedAt,
        responseTime: mission.actualResponseTime
      }), { qos: 1 });
    });
  }

  private setupMQTTHandlers(): void {
    this.mqttClient.on('message', async (topic, payload) => {
      if (topic === ALERTS_TOPIC) {
        await this.handleAlert(payload.toString());
      } else if (topic === TRIANGULATION_TOPIC) {
        await this.handleTriangulation(payload.toString());
      }
    });

    this.mqttClient.on('error', (err) => console.error('[dispatcher] MQTT error', err));
    this.mqttClient.on('reconnect', () => console.log('[dispatcher] Reconnecting to MQTT...'));
  }

  private async handleAlert(raw: string): Promise<void> {
    try {
      const msg = JSON.parse(raw) as AlertPayload;
      const loc = this.getLatLonFromAlert(msg);
      const confidence = msg.confidence ?? msg.metadata?.confidence ?? 0;
      
      if (!loc) {
        console.warn('[dispatcher] Alert missing coordinates');
        return;
      }

      // Create alert ID to prevent duplicates
      const alertId = `${loc.lat.toFixed(6)}-${loc.lon.toFixed(6)}-${confidence}`;
      if (this.dispatchedAlerts.has(alertId)) {
        console.log('[dispatcher] Duplicate alert ignored');
        return;
      }
      this.dispatchedAlerts.add(alertId);

      console.log(`[dispatcher] 🔥 Fire alert: ${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)} (${confidence}% confidence)`);

      // Try tiered response first for high-confidence detections
      if (ENABLE_TIERED_RESPONSE && this.tieredResponseManager && confidence >= AUTONOMOUS_THRESHOLD) {
        const fireDetection: FireDetectionEvent = {
          id: alertId,
          deviceId: msg.metadata?.deviceId || 'alert-system',
          timestamp: new Date().toISOString(),
          location: { lat: loc.lat, lng: loc.lon },
          confidence,
          threatLevel: this.mapConfidenceToThreatLevel(confidence),
          detectionType: msg.type === 'smoke' ? 'smoke' : 'flame',
          source: 'thermal',
          estimatedArea: msg.metadata?.estimatedArea || 100,
          weatherConditions: {
            windSpeed: msg.metadata?.windSpeed || 5,
            windDirection: msg.metadata?.windDirection || 180,
            humidity: msg.metadata?.humidity || 50,
            temperature: msg.metadata?.temperature || 25
          }
        };

        const missionId = await this.tieredResponseManager.processFireDetection(fireDetection);
        if (missionId) {
          console.log(`[dispatcher] 🚁 Autonomous response activated: ${missionId}`);
          return;
        } else {
          console.log('[dispatcher] Tiered response declined, falling back to legacy dispatch');
        }
      }

      // Fallback to legacy dispatch logic
      await this.handleLegacyDispatch(loc, confidence, msg);

    } catch (error) {
      console.error('[dispatcher] Error handling alert:', error);
    }
  }

  private async handleTriangulation(raw: string): Promise<void> {
    try {
      const msg = JSON.parse(raw) as TriangulationResult;
      const loc = this.getLatLonFromAlert(msg);
      const confidence = msg.confidence ?? 0.7; // Default confidence for triangulation
      
      if (!loc) {
        console.warn('[dispatcher] Triangulation missing coordinates');
        return;
      }

      console.log(`[dispatcher] 📐 Triangulation result: ${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)}`);

      // Handle similar to alert
      const alertId = `tri-${loc.lat.toFixed(6)}-${loc.lon.toFixed(6)}`;
      if (this.dispatchedAlerts.has(alertId)) {
        return;
      }
      this.dispatchedAlerts.add(alertId);

      // Try tiered response for triangulation results
      if (ENABLE_TIERED_RESPONSE && this.tieredResponseManager) {
        const fireDetection: FireDetectionEvent = {
          id: alertId,
          deviceId: 'triangulation-system',
          timestamp: new Date().toISOString(),
          location: { lat: loc.lat, lng: loc.lon },
          confidence,
          threatLevel: this.mapConfidenceToThreatLevel(confidence),
          detectionType: 'smoke',
          source: 'thermal',
          estimatedArea: Math.max(200, (msg.uncertainty_meters || 100) * 2),
        };

        const missionId = await this.tieredResponseManager.processFireDetection(fireDetection);
        if (missionId) {
          console.log(`[dispatcher] 🚁 Triangulation-triggered response: ${missionId}`);
          return;
        }
      }

      // Fallback to legacy dispatch
      await this.handleLegacyDispatch(loc, confidence, msg);

    } catch (error) {
      console.error('[dispatcher] Error handling triangulation:', error);
    }
  }

  private async handleLegacyDispatch(loc: { lat: number; lon: number }, confidence: number, msg: any): Promise<void> {
    const ctx: DispatchContext = {
      target: { lat: loc.lat, lon: loc.lon },
      confidence: confidence,
      minConfidence: MIN_CONFIDENCE,
      environment: {
        windSpeedMps: undefined,
        visibilityKm: undefined,
      },
      assets: DRONE_ASSETS.map(id => ({ id, batteryPct: undefined, linkOk: true }))
    };

    const decision = evaluatePolicy(ctx);
    if (!decision.allow) {
      console.log(`[dispatcher] Policy blocked dispatch: ${decision.reasons?.join('; ')}`);
      return;
    }

    await this.createReconMission({ lat: loc.lat, lon: loc.lon }, decision);
  }

  private async createReconMission(target: { lat: number; lon: number }, decision: PolicyDecision): Promise<void> {
    const waypoints = this.circleWaypoints(target.lat, target.lon, LOITER_RADIUS_M, 3);
    const mission = {
      mission_id: `recon-${Date.now()}`,
      objectives: ['recon', 'observe'],
      priority: decision.priority || 'medium',
      target: { latitude: target.lat, longitude: target.lon },
      waypoints,
      assets: DRONE_ASSETS,
      constraints: decision.constraints || {},
      notes: decision.reasons || []
    };

    // If operator confirmation is required, do NOT create the mission yet; publish a proposal
    const uiMission = {
      id: mission.mission_id,
      type: 'surveillance',
      status: REQUIRE_CONFIRM ? 'proposed' : 'pending',
      priority: mission.priority,
      location: { lat: target.lat, lng: target.lon, radius: LOITER_RADIUS_M },
      description: REQUIRE_CONFIRM ? 'PROPOSED: RECON DISPATCH (awaiting approval)' : 'AUTOMATED RECON DISPATCH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      estimatedDuration: null,
    };

    if (!REQUIRE_CONFIRM) {
      // Create mission immediately in API
      const headers = SUMMIT_API_KEY ? { Authorization: `Bearer ${SUMMIT_API_KEY}` } : {};
      await axios.post(`${SUMMIT_API_URL}/api/v1/missions`, mission, { headers });
    }

    // Publish UI mission update
    this.mqttClient.publish(MISSIONS_TOPIC, JSON.stringify(uiMission), { qos: 0 });

    console.log(`[dispatcher] Legacy recon mission ${mission.mission_id} created for ${target.lat.toFixed(5)},${target.lon.toFixed(5)}`);
  }

  private getLatLonFromAlert(msg: AlertPayload | TriangulationResult): { lat: number; lon: number; confidence?: number } | null {
    if ('location' in msg && msg.location) {
      return { lat: msg.location.latitude, lon: msg.location.longitude, confidence: (msg as any).confidence };
    }
    if ('latitude' in msg && 'longitude' in msg && msg.latitude !== undefined && msg.longitude !== undefined) {
      return { lat: (msg as any).latitude, lon: (msg as any).longitude, confidence: (msg as any).confidence };
    }
    return null;
  }

  private circleWaypoints(lat: number, lon: number, radiusMeters: number, count: number = 3) {
    const R = 6371000; // Earth radius (m)
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;
    const results: { latitude: number; longitude: number; altitude: number }[] = [];
    
    for (let i = 0; i < count; i++) {
      const bearing = (2 * Math.PI * i) / count;
      const lat1 = toRad(lat);
      const lon1 = toRad(lon);
      const lat2 = Math.asin(Math.sin(lat1) * Math.cos(radiusMeters / R) + Math.cos(lat1) * Math.sin(radiusMeters / R) * Math.cos(bearing));
      const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(radiusMeters / R) * Math.cos(lat1), Math.cos(radiusMeters / R) - Math.sin(lat1) * Math.sin(lat2));
      results.push({ latitude: toDeg(lat2), longitude: toDeg(lon2), altitude: DEFAULT_ALT_M });
    }
    return results;
  }

  private mapConfidenceToThreatLevel(confidence: number): ThreatLevel {
    if (confidence >= 0.9) return ThreatLevel.CRITICAL;
    if (confidence >= 0.7) return ThreatLevel.HIGH;
    if (confidence >= 0.4) return ThreatLevel.MEDIUM;
    return ThreatLevel.LOW;
  }

  // Public API methods
  async simulateFireDetection(lat: number, lng: number, confidence: number): Promise<string | null> {
    if (!ENABLE_TIERED_RESPONSE || !this.tieredResponseManager) {
      console.log('[dispatcher] Tiered response not enabled');
      return null;
    }

    const detection: FireDetectionEvent = {
      id: `sim-${Date.now()}`,
      deviceId: 'simulator',
      timestamp: new Date().toISOString(),
      location: { lat, lng },
      confidence,
      threatLevel: this.mapConfidenceToThreatLevel(confidence),
      detectionType: 'thermal',
      source: 'thermal',
      estimatedArea: Math.floor(Math.random() * 200) + 50,
      weatherConditions: {
        windSpeed: Math.random() * 20,
        windDirection: Math.random() * 360,
        humidity: Math.random() * 100,
        temperature: 20 + Math.random() * 25
      }
    };

    console.log(`[dispatcher] 🔥 Simulating fire at ${lat}, ${lng} with ${confidence}% confidence`);
    return await this.tieredResponseManager.processFireDetection(detection);
  }

  getSystemStatus() {
    const status = {
      legacy: {
        alertsProcessed: this.dispatchedAlerts.size,
        mqttConnected: this.mqttClient.connected
      }
    };

    if (ENABLE_TIERED_RESPONSE && this.tieredResponseManager) {
      const tieredStatus = this.tieredResponseManager.getSystemStatus();
      return { ...status, tiered: tieredStatus };
    }

    return status;
  }

  getActiveMissions() {
    if (ENABLE_TIERED_RESPONSE && this.tieredResponseManager) {
      return this.tieredResponseManager.getActiveMissions();
    }
    return [];
  }
}

// Start the enhanced dispatcher
const dispatcher = new EnhancedMissionDispatcher();
dispatcher.initialize().catch(console.error);

// CLI interface for testing
if (process.argv.includes('--simulate')) {
  setTimeout(async () => {
    const lat = parseFloat(process.env.SIM_LAT || '40.0');
    const lng = parseFloat(process.env.SIM_LNG || '-120.0');
    const confidence = parseFloat(process.env.SIM_CONF || '0.7');
    
    await dispatcher.simulateFireDetection(lat, lng, confidence);
  }, 3000);
}

// Health server
import http from 'http';
const HEALTH_PORT = Number(process.env.DISPATCHER_HEALTH_PORT || 8089);
http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dispatcher.getSystemStatus(), null, 2));
  } else if (req.url === '/missions') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dispatcher.getActiveMissions(), null, 2));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(HEALTH_PORT, '0.0.0.0', () => {
  console.log(`[dispatcher] Health server on port ${HEALTH_PORT}`);
  console.log(`  GET /health - Health check`);
  console.log(`  GET /status - System status`);
  console.log(`  GET /missions - Active missions`);
});

export default dispatcher;