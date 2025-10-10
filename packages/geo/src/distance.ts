/**
 * Distance and area calculations.
 */

export interface Point {
  latitude: number;
  longitude: number;
  altitude?: number;
}

/**
 * Calculate distance between two points using Haversine formula.
 */
export function haversineDistance(from: Point, to: Point): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate distance between two points using Vincenty's formula (more accurate).
 */
export function vincentyDistance(from: Point, to: Point): number {
  const a = 6378137; // WGS84 semi-major axis
  const f = 1 / 298.257223563; // WGS84 flattening
  const b = (1 - f) * a; // Semi-minor axis
  
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  
  const U1 = Math.atan((1 - f) * Math.tan(lat1));
  const U2 = Math.atan((1 - f) * Math.tan(lat2));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);
  
  let lambda = deltaLon;
  let lambdaP = 2 * Math.PI;
  let iterLimit = 100;
  
  let cosSqAlpha, sinSigma, cos2SigmaM, cosSigma, sigma;
  
  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) + 
      (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
    
    if (sinSigma === 0) return 0; // Co-incident points
    
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
    
    if (isNaN(cos2SigmaM)) cos2SigmaM = 0; // Equatorial line
    
    const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda = deltaLon + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  }
  
  if (iterLimit === 0) return NaN; // Formula failed to converge
  
  const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
  const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
  
  const s = b * A * (sigma - deltaSigma);
  
  return s;
}

/**
 * Calculate area of a polygon using shoelace formula.
 */
export function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].longitude * points[j].latitude;
    area -= points[j].longitude * points[i].latitude;
  }
  
  area = Math.abs(area) / 2;
  
  // Convert to square meters (approximate)
  const lat = points[0].latitude * Math.PI / 180;
  const latScale = Math.cos(lat);
  const lonScale = 111320 * latScale; // meters per degree longitude
  const latScaleM = 110540; // meters per degree latitude
  
  return area * lonScale * latScaleM;
}

/**
 * Calculate perimeter of a polygon.
 */
export function polygonPerimeter(points: Point[]): number {
  if (points.length < 2) return 0;
  
  let perimeter = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += haversineDistance(points[i], points[j]);
  }
  
  return perimeter;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    if (((polygon[i].latitude > point.latitude) !== (polygon[j].latitude > point.latitude)) &&
        (point.longitude < (polygon[j].longitude - polygon[i].longitude) * (point.latitude - polygon[i].latitude) / (polygon[j].latitude - polygon[i].latitude) + polygon[i].longitude)) {
      inside = !inside;
    }
  }
  
  return inside;
}
