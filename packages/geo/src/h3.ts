/**
 * H3 hexagon utilities for spatial indexing.
 */

import { cellToLatLng, getHexagonAreaAvg, getResolution, latLngToCell } from 'h3-js';

export interface H3Cell {
  index: string;
  resolution: number;
  center: {
    latitude: number;
    longitude: number;
  };
  areaKm2: number;
}

/**
 * Convert lat/lon to H3 cell at specified resolution.
 */
export function latLonToH3(
  latitude: number,
  longitude: number,
  resolution: number
): string {
  return latLngToCell(latitude, longitude, resolution);
}

/**
 * Convert H3 cell to center lat/lon.
 */
export function h3ToLatLon(h3Index: string): { latitude: number; longitude: number } {
  const [lat, lon] = cellToLatLng(h3Index);
  return { latitude: lat, longitude: lon };
}

/**
 * Get H3 cell information.
 */
export function getH3CellInfo(h3Index: string): H3Cell {
  const resolution = getResolution(h3Index);
  const center = h3ToLatLon(h3Index);
  const areaKm2 = getHexagonAreaAvg(resolution, 'km2');
  
  return {
    index: h3Index,
    resolution,
    center,
    areaKm2
  };
}

/**
 * Get H3 cells within bounding box.
 */
export function getH3CellsInBounds(
  north: number,
  south: number,
  east: number,
  west: number,
  resolution: number
): string[] {
  // Simple implementation - in production, use h3-polygonToCells
  const cells: string[] = [];
  const step = 0.01; // Approximate step size
  
  for (let lat = south; lat <= north; lat += step) {
    for (let lon = west; lon <= east; lon += step) {
      try {
        const cell = latLngToCell(lat, lon, resolution);
        if (!cells.includes(cell)) {
          cells.push(cell);
        }
      } catch (error) {
        // Skip invalid coordinates
        continue;
      }
    }
  }
  
  return cells;
}

/**
 * Get H3 cells within radius of a point.
 */
export function getH3CellsInRadius(
  latitude: number,
  longitude: number,
  radiusKm: number,
  resolution: number
): string[] {
  // Simple implementation - in production, use h3-k-ring
  const cells: string[] = [];
  const step = 0.01; // Approximate step size
  
  for (let lat = latitude - (radiusKm / 111); lat <= latitude + (radiusKm / 111); lat += step) {
    for (let lon = longitude - (radiusKm / (111 * Math.cos(latitude * Math.PI / 180))); 
         lon <= longitude + (radiusKm / (111 * Math.cos(latitude * Math.PI / 180))); lon += step) {
      try {
        const cell = latLngToCell(lat, lon, resolution);
        if (!cells.includes(cell)) {
          cells.push(cell);
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return cells;
}
