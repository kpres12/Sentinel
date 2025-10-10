/**
 * Digital Elevation Model (DEM) utilities.
 */

export interface DEMPoint {
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface DEMData {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  resolution: number; // meters per pixel
  data: number[][]; // elevation data
}

/**
 * Calculate slope and aspect from DEM data.
 */
export function calculateSlopeAspect(
  dem: DEMData,
  lat: number,
  lon: number
): { slope: number; aspect: number } {
  const { bounds, resolution, data } = dem;
  
  // Convert lat/lon to pixel coordinates
  const row = Math.floor((bounds.north - lat) / resolution);
  const col = Math.floor((lon - bounds.west) / resolution);
  
  if (row < 1 || row >= data.length - 1 || col < 1 || col >= data[0].length - 1) {
    return { slope: 0, aspect: 0 };
  }
  
  // Get elevation values for 3x3 window
  const z11 = data[row - 1][col - 1];
  const z12 = data[row - 1][col];
  const z13 = data[row - 1][col + 1];
  const z21 = data[row][col - 1];
  const z23 = data[row][col + 1];
  const z31 = data[row + 1][col - 1];
  const z32 = data[row + 1][col];
  const z33 = data[row + 1][col + 1];
  
  // Calculate gradients using Horn's method
  const dzdx = ((z13 + 2 * z23 + z33) - (z11 + 2 * z21 + z31)) / (8 * resolution);
  const dzdy = ((z31 + 2 * z32 + z33) - (z11 + 2 * z12 + z13)) / (8 * resolution);
  
  // Calculate slope in degrees
  const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);
  
  // Calculate aspect in degrees (0-360, 0 = north)
  let aspect = Math.atan2(-dzdx, dzdy) * (180 / Math.PI);
  if (aspect < 0) aspect += 360;
  
  return { slope, aspect };
}

/**
 * Get elevation at a specific point using bilinear interpolation.
 */
export function getElevation(dem: DEMData, lat: number, lon: number): number {
  const { bounds, resolution, data } = dem;
  
  const row = (bounds.north - lat) / resolution;
  const col = (lon - bounds.west) / resolution;
  
  if (row < 0 || row >= data.length - 1 || col < 0 || col >= data[0].length - 1) {
    return 0;
  }
  
  const row1 = Math.floor(row);
  const row2 = row1 + 1;
  const col1 = Math.floor(col);
  const col2 = col1 + 1;
  
  const fracRow = row - row1;
  const fracCol = col - col1;
  
  // Bilinear interpolation
  const z11 = data[row1][col1];
  const z12 = data[row1][col2];
  const z21 = data[row2][col1];
  const z22 = data[row2][col2];
  
  const z1 = z11 * (1 - fracCol) + z12 * fracCol;
  const z2 = z21 * (1 - fracCol) + z22 * fracCol;
  
  return z1 * (1 - fracRow) + z2 * fracRow;
}

/**
 * Calculate terrain roughness (standard deviation of elevation in neighborhood).
 */
export function calculateRoughness(
  dem: DEMData,
  lat: number,
  lon: number,
  radius: number = 100
): number {
  const { bounds, resolution, data } = dem;
  
  const centerRow = Math.floor((bounds.north - lat) / resolution);
  const centerCol = Math.floor((lon - bounds.west) / resolution);
  
  const windowSize = Math.ceil(radius / resolution);
  const elevations: number[] = [];
  
  for (let r = Math.max(0, centerRow - windowSize); 
       r <= Math.min(data.length - 1, centerRow + windowSize); r++) {
    for (let c = Math.max(0, centerCol - windowSize); 
         c <= Math.min(data[0].length - 1, centerCol + windowSize); c++) {
      elevations.push(data[r][c]);
    }
  }
  
  if (elevations.length === 0) return 0;
  
  const mean = elevations.reduce((sum, val) => sum + val, 0) / elevations.length;
  const variance = elevations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / elevations.length;
  
  return Math.sqrt(variance);
}
