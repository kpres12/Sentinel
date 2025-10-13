export interface DispatchContext {
  target: { lat: number; lon: number };
  confidence?: number;
  minConfidence: number;
  environment?: {
    windSpeedMps?: number;
    visibilityKm?: number;
  };
  assets: { id: string; batteryPct?: number; linkOk?: boolean }[];
}

export interface PolicyDecision {
  allow: boolean;
  reasons?: string[];
  priority?: 'low' | 'medium' | 'high';
  constraints?: Record<string, any>;
}

export function evaluatePolicy(ctx: DispatchContext): PolicyDecision {
  const reasons: string[] = [];

  // Env-configurable gates
  const envMaxWind = process.env.WX_MAX_WIND_MPS ? Number(process.env.WX_MAX_WIND_MPS) : undefined;
  const envMinVis = process.env.WX_MIN_VIS_KM ? Number(process.env.WX_MIN_VIS_KM) : undefined;
  const geofence = process.env.GEOFENCE_BBOX
    ? process.env.GEOFENCE_BBOX.split(',').map(Number) as [number, number, number, number]
    : undefined; // [minLon,minLat,maxLon,maxLat]

  if (ctx.confidence !== undefined && ctx.confidence < ctx.minConfidence) {
    reasons.push(`confidence ${ctx.confidence.toFixed(2)} below min ${ctx.minConfidence}`);
  }

  // Geofence check (if provided)
  if (geofence) {
    const [minLon, minLat, maxLon, maxLat] = geofence;
    const inside = ctx.target.lon >= minLon && ctx.target.lon <= maxLon && ctx.target.lat >= minLat && ctx.target.lat <= maxLat;
    if (!inside) reasons.push('target outside geofence');
  }

  // Battery/link sanity (if provided)
  const badAssets = ctx.assets.filter(a => (a.batteryPct !== undefined && a.batteryPct < 25) || a.linkOk === false);
  if (badAssets.length === ctx.assets.length && ctx.assets.length > 0) {
    reasons.push('no assets available (battery/link)');
  }

  // Weather gates: prefer env limits if provided, else defaults
  const windLimit = envMaxWind ?? 12; // m/s
  const visLimit = envMinVis ?? 1;    // km

  if (ctx.environment?.windSpeedMps !== undefined && ctx.environment.windSpeedMps > windLimit) {
    reasons.push(`wind ${ctx.environment.windSpeedMps} m/s exceeds limit ${windLimit}`);
  }
  if (ctx.environment?.visibilityKm !== undefined && ctx.environment.visibilityKm < visLimit) {
    reasons.push(`visibility ${ctx.environment.visibilityKm} km below limit ${visLimit}`);
  }

  const allow = reasons.length === 0;
  return {
    allow,
    reasons: allow ? ['policy ok'] : reasons,
    priority: allow ? (ctx.confidence && ctx.confidence > 0.9 ? 'high' : 'medium') : undefined,
    constraints: { geofence: geofence ?? null, windLimit, visLimit }
  };
}
