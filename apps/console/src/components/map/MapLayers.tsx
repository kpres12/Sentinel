'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import { useSummitTelemetry } from '../../hooks/useSummit'
import { assetStore } from '../../store/assetStore'
import { buildIsochrones } from '../../lib/isochrones'

export interface MapLayersProps {
  showTelemetry?: boolean
  showDetections?: boolean
  showRiskHeatmap?: boolean
  showFireLines?: boolean
  showIsochrones?: boolean
  showCameraFOV?: boolean
  showCoverage?: boolean
  showDroneIsochrones?: boolean
  showUgvIsochrones?: boolean
}

export function MapLayers({
  showTelemetry = true,
  showDetections = true,
  showRiskHeatmap = true,
  showFireLines = true,
  showIsochrones = true,
  showCameraFOV = true,
  showCoverage = true,
  showDroneIsochrones = true,
  showUgvIsochrones = true
}: MapLayersProps) {
  const { telemetry } = useSummitTelemetry()
  const [coverage, setCoverage] = useState<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] })

  useEffect(() => {
    assetStore.connectWS()
    assetStore.startTimers()
    const unsub = assetStore.subscribe((s) => {
      if (s.coverage) setCoverage(s.coverage)
    })
    return () => { unsub(); assetStore.stopTimers() }
  }, [])

  const telemetryPoints = useMemo(() => {
    return telemetry.map(t => ({
      type: 'Feature',
      properties: { id: t.deviceId, type: t.deviceId.toLowerCase().includes('kofa') ? 'robot' : (t.deviceId.toLowerCase().includes('drone') || t.deviceId.toLowerCase().includes('firefly') ? 'drone' : 'unknown'), status: t.status, battery: t.battery, lastSeen: t.timestamp },
      geometry: { type: 'Point', coordinates: [t.location.lng, t.location.lat] }
    }))
  }, [telemetry])

  const droneIso = useMemo(() => {
    if (!showIsochrones || !showDroneIsochrones) return { type: 'FeatureCollection', features: [] } as any
    const points = telemetry.filter(t => !t.deviceId.toLowerCase().includes('kofa')).map(t => ({ id: t.deviceId, lon: t.location.lng, lat: t.location.lat, kind: 'drone' as const }))
    return buildIsochrones({ points, minutes: [5, 10, 15] })
  }, [telemetry, showIsochrones, showDroneIsochrones])

  const ugvIso = useMemo(() => {
    if (!showIsochrones || !showUgvIsochrones) return { type: 'FeatureCollection', features: [] } as any
    const points = telemetry.filter(t => t.deviceId.toLowerCase().includes('kofa')).map(t => ({ id: t.deviceId, lon: t.location.lng, lat: t.location.lat, kind: 'ugv' as const }))
    return buildIsochrones({ points, minutes: [5, 10, 15] })
  }, [telemetry, showIsochrones, showUgvIsochrones])

  return (
    <>
      {/* Tower detection coverage */}
      {showCoverage && coverage.features.length > 0 && (
        <Source id="coverage" type="geojson" data={coverage}>
          <Layer id="coverage-fill" type="fill" paint={{ 'fill-color': '#22c55e', 'fill-opacity': 0.25 }} />
          <Layer id="coverage-outline" type="line" paint={{ 'line-color': '#16a34a', 'line-width': 1.5, 'line-opacity': 0.8 }} />
          <Layer id="coverage-label" type="symbol" layout={{ 'text-field': ['coalesce', ['get', 'id'], ['get', 'name']], 'text-size': 12 }} paint={{ 'text-color': '#166534', 'text-halo-color': '#ffffff', 'text-halo-width': 1 }} />
        </Source>
      )}

      {/* Telemetry points (dynamic) */}
      {showTelemetry && (
        <Source id="telemetry" type="geojson" data={{ type: 'FeatureCollection', features: telemetryPoints as any }}>
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

      {/* Isochrones - Drones */}
      {showIsochrones && showDroneIsochrones && (
        <Source id="isochrones-drones" type="geojson" data={droneIso}>
          <Layer id="isochrones-drones-fill" type="fill" paint={{ 'fill-color': '#22c55e', 'fill-opacity': 0.15 }} />
          <Layer id="isochrones-drones-line" type="line" paint={{ 'line-color': '#16a34a', 'line-width': 1.5, 'line-opacity': 0.8 }} />
        </Source>
      )}

      {/* Isochrones - UGVs */}
      {showIsochrones && showUgvIsochrones && (
        <Source id="isochrones-ugvs" type="geojson" data={ugvIso}>
          <Layer id="isochrones-ugvs-fill" type="fill" paint={{ 'fill-color': '#60a5fa', 'fill-opacity': 0.12 }} />
          <Layer id="isochrones-ugvs-line" type="line" paint={{ 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.8 }} />
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
