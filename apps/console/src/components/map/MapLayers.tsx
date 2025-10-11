'use client'

import React from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'

export interface MapLayersProps {
  showTelemetry?: boolean
  showDetections?: boolean
  showRiskHeatmap?: boolean
  showFireLines?: boolean
  showIsochrones?: boolean
  showCameraFOV?: boolean
}

export function MapLayers({
  showTelemetry = true,
  showDetections = true,
  showRiskHeatmap = true,
  showFireLines = true,
  showIsochrones = true,
  showCameraFOV = true
}: MapLayersProps) {
  return (
    <>
      {/* Telemetry trails */}
      {showTelemetry && (
        <Source
          id="telemetry"
          type="geojson"
          data={{
            type: 'FeatureCollection',
            features: [
              // FireWatch Towers (Fixed positions)
              {
                type: 'Feature',
                properties: {
                  id: 'firewatch-alpha',
                  name: 'FireWatch Alpha',
                  type: 'tower',
                  status: 'online',
                  battery: 95,
                  lastSeen: '14:32:15'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.0, 40.0]
                }
              },
              {
                type: 'Feature',
                properties: {
                  id: 'firewatch-bravo',
                  name: 'FireWatch Bravo',
                  type: 'tower',
                  status: 'online',
                  battery: 88,
                  lastSeen: '14:32:10'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-119.95, 40.05]
                }
              },
              {
                type: 'Feature',
                properties: {
                  id: 'firewatch-charlie',
                  name: 'FireWatch Charlie',
                  type: 'tower',
                  status: 'online',
                  battery: 92,
                  lastSeen: '14:32:08'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.05, 39.95]
                }
              },
              // FireFly Drones (Mobile positions)
              {
                type: 'Feature',
                properties: {
                  id: 'firefly-alpha',
                  name: 'FireFly Alpha',
                  type: 'drone',
                  status: 'online',
                  battery: 87,
                  altitude: 1200,
                  lastSeen: '14:32:12'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.01, 40.01]
                }
              },
              {
                type: 'Feature',
                properties: {
                  id: 'firefly-bravo',
                  name: 'FireFly Bravo',
                  type: 'drone',
                  status: 'online',
                  battery: 92,
                  altitude: 1500,
                  lastSeen: '14:32:14'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-119.98, 40.03]
                }
              },
              {
                type: 'Feature',
                properties: {
                  id: 'firefly-charlie',
                  name: 'FireFly Charlie',
                  type: 'drone',
                  status: 'mission',
                  battery: 78,
                  altitude: 800,
                  lastSeen: '14:32:16'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.02, 39.98]
                }
              },
              // KOFA Bots (Ground positions)
              {
                type: 'Feature',
                properties: {
                  id: 'kofa-alpha',
                  name: 'KOFA Alpha',
                  type: 'robot',
                  status: 'online',
                  battery: 87,
                  speed: 12,
                  lastSeen: '14:32:15'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.005, 40.005]
                }
              },
              {
                type: 'Feature',
                properties: {
                  id: 'kofa-bravo',
                  name: 'KOFA Bravo',
                  type: 'robot',
                  status: 'mission',
                  battery: 65,
                  speed: 8,
                  lastSeen: '14:32:13'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-119.99, 40.02]
                }
              },
              {
                type: 'Feature',
                properties: {
                  id: 'kofa-charlie',
                  name: 'KOFA Charlie',
                  type: 'robot',
                  status: 'offline',
                  battery: 0,
                  speed: 0,
                  lastSeen: '14:28:42'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.03, 39.97]
                }
              }
            ]
          }}
        >
          <Layer
            id="telemetry-trails"
            type="line"
            paint={{
              'line-color': '#3b82f6',
              'line-width': 2,
              'line-opacity': 0.8
            }}
          />
          <Layer
            id="telemetry-points"
            type="circle"
            paint={{
              'circle-color': '#3b82f6',
              'circle-radius': 6,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2
            }}
          />
        </Source>
      )}

      {/* Detections */}
      {showDetections && (
        <Source
          id="detections"
          type="geojson"
          data={{
            type: 'FeatureCollection',
            features: [
              // Smoke detections
              {
                type: 'Feature',
                properties: {
                  id: 'smoke-001',
                  type: 'smoke',
                  confidence: 0.85,
                  timestamp: '14:32:15',
                  source: 'firewatch-alpha'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.02, 40.01]
                }
              },
              {
                type: 'Feature',
                properties: {
                  id: 'smoke-002',
                  type: 'smoke',
                  confidence: 0.72,
                  timestamp: '14:31:45',
                  source: 'firefly-bravo'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-119.99, 40.025]
                }
              },
              // Flame detections
              {
                type: 'Feature',
                properties: {
                  id: 'flame-001',
                  type: 'flame',
                  confidence: 0.95,
                  timestamp: '14:32:10',
                  source: 'firewatch-bravo'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.015, 40.008]
                }
              },
              {
                type: 'Feature',
                properties: {
                  id: 'flame-002',
                  type: 'flame',
                  confidence: 0.88,
                  timestamp: '14:31:55',
                  source: 'firefly-charlie'
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.025, 39.99]
                }
              }
            ]
          }}
        >
          <Layer
            id="smoke-detections"
            type="circle"
            filter={['==', ['get', 'type'], 'smoke']}
            paint={{
              'circle-color': '#f59e0b',
              'circle-radius': 8,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-opacity': ['get', 'confidence']
            }}
          />
          <Layer
            id="flame-detections"
            type="circle"
            filter={['==', ['get', 'type'], 'flame']}
            paint={{
              'circle-color': '#ef4444',
              'circle-radius': 10,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-opacity': ['get', 'confidence']
            }}
          />
        </Source>
      )}

      {/* Risk heatmap */}
      {showRiskHeatmap && (
        <Source
          id="risk-heatmap"
          type="raster"
          tiles={['/api/risk-tiles/{z}/{x}/{y}']}
          tileSize={256}
        >
          <Layer
            id="risk-heatmap-layer"
            type="raster"
            paint={{
              'raster-opacity': 0.6
            }}
          />
        </Source>
      )}

      {/* Fire lines */}
      {showFireLines && (
        <Source
          id="fire-lines"
          type="geojson"
          data={{
            type: 'FeatureCollection',
            features: [
              // Fire line created by KOFA Alpha
              {
                type: 'Feature',
                properties: {
                  id: 'fireline-001',
                  name: 'Fire Line Alpha',
                  created_by: 'kofa-alpha',
                  status: 'completed',
                  width: 3.0,
                  created_at: '14:30:00'
                },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [-120.01, 40.01],
                    [-120.005, 40.005],
                    [-120.0, 40.0],
                    [-119.995, 39.995]
                  ]
                }
              },
              // Fire line being created by KOFA Bravo
              {
                type: 'Feature',
                properties: {
                  id: 'fireline-002',
                  name: 'Fire Line Bravo',
                  created_by: 'kofa-bravo',
                  status: 'in_progress',
                  width: 3.0,
                  created_at: '14:31:00'
                },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [-119.99, 40.02],
                    [-119.985, 40.015],
                    [-119.98, 40.01]
                  ]
                }
              }
            ]
          }}
        >
          <Layer
            id="fire-lines-line"
            type="line"
            paint={{
              'line-color': '#dc2626',
              'line-width': 4,
              'line-opacity': 0.8
            }}
          />
          <Layer
            id="fire-lines-symbols"
            type="symbol"
            layout={{
              'text-field': 'FIRE LINE',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12,
              'text-offset': [0, 1.5]
            }}
            paint={{
              'text-color': '#dc2626',
              'text-halo-color': '#ffffff',
              'text-halo-width': 2
            }}
          />
        </Source>
      )}

      {/* Isochrones */}
      {showIsochrones && (
        <Source
          id="isochrones"
          type="geojson"
          data={{
            type: 'FeatureCollection',
            features: []
          }}
        >
          <Layer
            id="isochrones-fill"
            type="fill"
            paint={{
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'hours'],
                0, '#ffff00',
                6, '#ff8800',
                12, '#ff4400',
                24, '#cc0000'
              ],
              'fill-opacity': 0.3
            }}
          />
          <Layer
            id="isochrones-line"
            type="line"
            paint={{
              'line-color': [
                'interpolate',
                ['linear'],
                ['get', 'hours'],
                0, '#ffff00',
                6, '#ff8800',
                12, '#ff4400',
                24, '#cc0000'
              ],
              'line-width': 2,
              'line-opacity': 0.8
            }}
          />
        </Source>
      )}

      {/* Camera FOV cones */}
      {showCameraFOV && (
        <Source
          id="camera-fov"
          type="geojson"
          data={{
            type: 'FeatureCollection',
            features: [
              // FireWatch Alpha camera FOV
              {
                type: 'Feature',
                properties: {
                  id: 'fov-firewatch-alpha',
                  name: 'FireWatch Alpha FOV',
                  range: 5000, // 5km range
                  bearing: 45
                },
                geometry: {
                  type: 'Polygon',
                  coordinates: [[
                    [-120.0, 40.0], // Tower position
                    [-119.96, 40.04], // NE corner
                    [-119.92, 40.0],  // E corner
                    [-119.96, 39.96], // SE corner
                    [-120.0, 40.0]   // Back to tower
                  ]]
                }
              },
              // FireWatch Bravo camera FOV
              {
                type: 'Feature',
                properties: {
                  id: 'fov-firewatch-bravo',
                  name: 'FireWatch Bravo FOV',
                  range: 5000,
                  bearing: 135
                },
                geometry: {
                  type: 'Polygon',
                  coordinates: [[
                    [-119.95, 40.05], // Tower position
                    [-119.91, 40.09], // NE corner
                    [-119.95, 40.13], // N corner
                    [-119.99, 40.09], // NW corner
                    [-119.95, 40.05]  // Back to tower
                  ]]
                }
              },
              // FireWatch Charlie camera FOV
              {
                type: 'Feature',
                properties: {
                  id: 'fov-firewatch-charlie',
                  name: 'FireWatch Charlie FOV',
                  range: 5000,
                  bearing: 225
                },
                geometry: {
                  type: 'Polygon',
                  coordinates: [[
                    [-120.05, 39.95], // Tower position
                    [-120.01, 39.99], // NE corner
                    [-120.05, 40.03], // N corner
                    [-120.09, 39.99], // NW corner
                    [-120.05, 39.95]  // Back to tower
                  ]]
                }
              }
            ]
          }}
        >
          <Layer
            id="camera-fov-fill"
            type="fill"
            paint={{
              'fill-color': '#3b82f6',
              'fill-opacity': 0.1
            }}
          />
          <Layer
            id="camera-fov-line"
            type="line"
            paint={{
              'line-color': '#3b82f6',
              'line-width': 2,
              'line-opacity': 0.6
            }}
          />
        </Source>
      )}
    </>
  )
}
