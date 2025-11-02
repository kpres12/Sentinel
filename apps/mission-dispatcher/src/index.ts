import 'dotenv/config';
import mqtt, { MqttClient } from 'mqtt';
import axios from 'axios';
// @ts-ignore - policy types not available
import { evaluatePolicy } from '../../../packages/policy';
type DispatchContext = any;
type PolicyDecision = any;

// Env/config
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined;
const ALERTS_TOPIC = process.env.ALERTS_TOPIC || 'wildfire/alerts';
const TRIANGULATION_TOPIC = process.env.TRIANGULATION_TOPIC || 'wildfire/triangulations';
const MISSIONS_TOPIC = process.env.DISPATCHER_MISSIONS_TOPIC || 'missions/updates';

const SUMMIT_API_URL = process.env.SUMMIT_API_URL || 'http://localhost:8000';
const SUMMIT_API_KEY = process.env.SUMMIT_API_KEY || '';
const ENABLE_ML_SCORING = String(process.env.DISPATCHER_ENABLE_ML_SCORING || 'false').toLowerCase() === 'true';

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

function getLatLonFromAlert(msg: AlertPayload | TriangulationResult): { lat: number; lon: number; confidence?: number } | null {
  if ('location' in msg && msg.location) {
    return { lat: msg.location.latitude, lon: msg.location.longitude, confidence: (msg as any).confidence };
  }
  if ('latitude' in msg && 'longitude' in msg && msg.latitude !== undefined && msg.longitude !== undefined) {
    return { lat: (msg as any).latitude, lon: (msg as any).longitude, confidence: (msg as any).confidence };
  }
  return null;
}

async function fetchPredictionConfidence(lat: number, lon: number): Promise<number | null> {
  try {
    const headers: any = { 'Content-Type': 'application/json' };
    if (SUMMIT_API_KEY) headers['Authorization'] = `Bearer ${SUMMIT_API_KEY}`;
    const body = {
      ignition_points: [{ latitude: lat, longitude: lon }],
      conditions: {
        wind_speed_mps: 5,
        wind_direction_deg: 180,
        temperature_c: 25,
        relative_humidity: 40,
        fuel_moisture: 0.08,
        fuel_model: 'grass'
      },
      simulation_hours: 1,
      time_step_minutes: 15,
      monte_carlo_runs: 100
    };
    const res = await axios.post(`${SUMMIT_API_URL}/api/v1/prediction/simulate`, body, { headers });
    const conf = res.data?.confidence?.overall_confidence;
    if (typeof conf === 'number' && !Number.isNaN(conf)) return conf;
    return null;
  } catch (e) {
    return null;
  }
}

function circleWaypoints(lat: number, lon: number, radiusMeters: number, count: number = 3) {
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

async function createReconMission(target: { lat: number; lon: number }, decision: PolicyDecision, mqttClient: MqttClient) {
  const waypoints = circleWaypoints(target.lat, target.lon, LOITER_RADIUS_M, 3);
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

  // Publish a UI-friendly mission update over MQTT so the console updates immediately
  mqttClient.publish(MISSIONS_TOPIC, JSON.stringify(uiMission), { qos: 0 });

  console.log(`[dispatcher] Created mission ${mission.mission_id} for target ${target.lat.toFixed(5)},${target.lon.toFixed(5)} with assets ${DRONE_ASSETS.join(', ')}`);
}

async function handleMessage(raw: string, source: 'alert' | 'triangulation', mqttClient: MqttClient) {
  try {
    const msg = JSON.parse(raw);
    const loc = getLatLonFromAlert(msg);
    const confidence = (msg.confidence ?? msg.metadata?.confidence ?? undefined) as number | undefined;
    if (!loc) {
      console.warn(`[dispatcher] ${source}: missing coordinates`);
      return;
    }

    // Optional ML scoring to refine confidence
    let effectiveConfidence = confidence;
    if (ENABLE_ML_SCORING) {
      const mlConf = await fetchPredictionConfidence(loc.lat, loc.lon);
      if (typeof mlConf === 'number') {
        // Combine: take max to avoid downgrading, clamp [0,1]
        effectiveConfidence = Math.max(effectiveConfidence ?? 0, Math.max(0, Math.min(1, mlConf)));
      }
    }

    const ctx: DispatchContext = {
      target: { lat: loc.lat, lon: loc.lon },
      confidence: effectiveConfidence,
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

    await createReconMission({ lat: loc.lat, lon: loc.lon }, decision, mqttClient);
  } catch (err: any) {
    console.error('[dispatcher] Error handling message:', err?.message || err);
  }
}

function start() {
  const client = mqtt.connect(MQTT_URL, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 2000,
  });

  client.on('connect', () => {
    console.log('[dispatcher] Connected to MQTT');
    client.subscribe([ALERTS_TOPIC, TRIANGULATION_TOPIC], (err) => {
      if (err) console.error('Subscribe error', err);
      else console.log(`[dispatcher] Subscribed to ${ALERTS_TOPIC}, ${TRIANGULATION_TOPIC}`);
    });
  });

  client.on('message', (topic, payload) => {
    if (topic === ALERTS_TOPIC) handleMessage(payload.toString(), 'alert', client);
    else if (topic === TRIANGULATION_TOPIC) handleMessage(payload.toString(), 'triangulation', client);
  });

  client.on('error', (err) => console.error('[dispatcher] MQTT error', err));
  client.on('reconnect', () => console.log('[dispatcher] Reconnecting to MQTT...'));
}

// Lightweight HTTP health server
import http from 'http';
const HEALTH_PORT = Number(process.env.DISPATCHER_HEALTH_PORT || 8089);
http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(HEALTH_PORT, '0.0.0.0', () => {
  console.log(`[dispatcher] Health server listening on ${HEALTH_PORT}`);
});

start();
