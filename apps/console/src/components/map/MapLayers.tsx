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
            features: []
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
            features: []
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
          data={{
            type: 'raster',
            tiles: ['/api/risk-tiles/{z}/{x}/{y}'],
            tileSize: 256
          }}
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
            features: []
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
            features: []
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
