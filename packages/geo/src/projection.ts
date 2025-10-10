/**
 * Map projection utilities.
 */

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Convert lat/lon to Web Mercator (EPSG:3857).
 */
export function latLonToWebMercator(lat: number, lon: number): { x: number; y: number } {
  const x = lon * 20037508.34 / 180;
  let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return { x, y };
}

/**
 * Convert Web Mercator to lat/lon.
 */
export function webMercatorToLatLon(x: number, y: number): { lat: number; lon: number } {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
  return { lat, lon };
}

/**
 * Convert lat/lon to UTM.
 */
export function latLonToUTM(lat: number, lon: number, zone?: number): { x: number; y: number; zone: number } {
  if (!zone) {
    zone = Math.floor((lon + 180) / 6) + 1;
  }
  
  const a = 6378137; // WGS84 semi-major axis
  const e2 = 0.00669438; // WGS84 first eccentricity squared
  const k0 = 0.9996; // UTM scale factor
  
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  const lon0 = (zone - 1) * 6 - 180 + 3; // Central meridian
  const lon0Rad = lon0 * Math.PI / 180;
  
  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = e2 * Math.cos(latRad) * Math.cos(latRad) / (1 - e2);
  const A = Math.cos(latRad) * (lonRad - lon0Rad);
  
  const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * latRad
    - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * latRad)
    + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * latRad)
    - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * latRad));
  
  const x = k0 * N * (A + (1 - T + C) * A * A * A / 6 + (5 - 18 * T + T * T + 72 * C - 58) * A * A * A * A * A / 120) + 500000;
  const y = k0 * (M + N * Math.tan(latRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24 + (61 - 58 * T + T * T + 600 * C - 330) * A * A * A * A * A * A / 720));
  
  return { x, y, zone };
}

/**
 * Convert UTM to lat/lon.
 */
export function utmToLatLon(x: number, y: number, zone: number, isNorthern: boolean = true): { lat: number; lon: number } {
  const a = 6378137; // WGS84 semi-major axis
  const e2 = 0.00669438; // WGS84 first eccentricity squared
  const k0 = 0.9996; // UTM scale factor
  
  const lon0 = (zone - 1) * 6 - 180 + 3; // Central meridian
  const lon0Rad = lon0 * Math.PI / 180;
  
  const x1 = x - 500000;
  const y1 = isNorthern ? y : y - 10000000;
  
  const M = y1 / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
  
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const lat1Rad = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
  
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(lat1Rad) * Math.sin(lat1Rad));
  const T1 = Math.tan(lat1Rad) * Math.tan(lat1Rad);
  const C1 = e2 * Math.cos(lat1Rad) * Math.cos(lat1Rad) / (1 - e2);
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(lat1Rad) * Math.sin(lat1Rad), 1.5);
  const D = x1 / (N1 * k0);
  
  const lat = lat1Rad - (N1 * Math.tan(lat1Rad) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9) * D * D * D * D / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 - 3 * C1 * C1) * D * D * D * D * D * D / 720);
  const lon = lon0Rad + (D - (1 + 2 * T1 + C1) * D * D * D / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(lat1Rad);
  
  return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI };
}

/**
 * Calculate bounds for a point with radius.
 */
export function calculateBounds(
  centerLat: number,
  centerLon: number,
  radiusKm: number
): Bounds {
  const latDelta = radiusKm / 111; // Approximate degrees per km
  const lonDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
  
  return {
    north: centerLat + latDelta,
    south: centerLat - latDelta,
    east: centerLon + lonDelta,
    west: centerLon - lonDelta
  };
}
