/**
 * Bearing and angle calculations for triangulation.
 */

export interface Point {
  latitude: number;
  longitude: number;
  altitude?: number;
}

/**
 * Calculate bearing between two points.
 */
export function calculateBearing(from: Point, to: Point): number {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  if (bearing < 0) bearing += 360;
  
  return bearing;
}

/**
 * Calculate distance between two points using Haversine formula.
 */
export function calculateDistance(from: Point, to: Point): number {
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
 * Calculate point at given bearing and distance from origin.
 */
export function calculateDestination(
  origin: Point,
  bearing: number,
  distance: number
): Point {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lon1 = (origin.longitude * Math.PI) / 180;
  const bearingRad = (bearing * Math.PI) / 180;
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / R) +
    Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad)
  );
  
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
    Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
    altitude: origin.altitude
  };
}

/**
 * Calculate intersection of two bearing rays.
 */
export function calculateRayIntersection(
  point1: Point,
  bearing1: number,
  point2: Point,
  bearing2: number
): Point | null {
  // Convert to radians
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lon1 = (point1.longitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const lon2 = (point2.longitude * Math.PI) / 180;
  const brg1 = (bearing1 * Math.PI) / 180;
  const brg2 = (bearing2 * Math.PI) / 180;
  
  // Calculate direction vectors
  const dx1 = Math.sin(brg1);
  const dy1 = Math.cos(brg1);
  const dx2 = Math.sin(brg2);
  const dy2 = Math.cos(brg2);
  
  // Check if rays are parallel
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-10) {
    return null; // Rays are parallel
  }
  
  // Calculate intersection point
  const t = ((lon2 - lon1) * dy2 - (lat2 - lat1) * dx2) / det;
  
  const intersectionLat = lat1 + t * dy1;
  const intersectionLon = lon1 + t * dx1;
  
  return {
    latitude: (intersectionLat * 180) / Math.PI,
    longitude: (intersectionLon * 180) / Math.PI
  };
}

/**
 * Calculate angular spread between multiple bearings.
 */
export function calculateAngularSpread(bearings: number[]): number {
  if (bearings.length < 2) return 0;
  
  // Sort bearings
  const sorted = [...bearings].sort((a, b) => a - b);
  
  // Calculate gaps between consecutive bearings
  const gaps: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const next = (i + 1) % sorted.length;
    let gap = sorted[next] - sorted[i];
    if (gap < 0) gap += 360;
    gaps.push(gap);
  }
  
  // Return the maximum gap
  return Math.max(...gaps);
}

/**
 * Normalize bearing to 0-360 range.
 */
export function normalizeBearing(bearing: number): number {
  while (bearing < 0) bearing += 360;
  while (bearing >= 360) bearing -= 360;
  return bearing;
}
