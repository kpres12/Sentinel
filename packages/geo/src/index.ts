/**
 * Shared geospatial utilities for wildfire operations platform.
 */

export * from './dem';
export * from './projection';
export * from './h3';
export * from './distance';

// Avoid re-exporting `Point` from multiple modules (distance.ts + bearing.ts).
export {
  calculateAngularSpread,
  calculateBearing,
  calculateDestination,
  calculateDistance,
  calculateRayIntersection,
  normalizeBearing
} from './bearing';
