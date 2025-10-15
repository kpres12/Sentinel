'use client'

import React, { useCallback, useRef, useState, useEffect } from 'react'
import Map, { MapRef, ViewState } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { MapLayers } from './MapLayers'
import { MapControls } from './MapControls'
import { MapLegend } from './MapLegend'
import { TacticalMapOverlay } from './TacticalMapOverlay'

export interface WildfireMapProps {
  initialViewState?: Partial<ViewState>
  onViewStateChange?: (viewState: ViewState) => void
  onMapClick?: (event: any) => void
  onMapHover?: (event: any) => void
  className?: string
  children?: React.ReactNode
}

export function WildfireMap({
  initialViewState = {
    longitude: -120.0,
    latitude: 40.0,
    zoom: 8
  },
  onViewStateChange,
  onMapClick,
  onMapHover,
  className = '',
  children
}: WildfireMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState<ViewState>(initialViewState as ViewState)
  const [selectedFeatures, setSelectedFeatures] = useState<any[]>([])
  const [showTacticalOverlay, setShowTacticalOverlay] = useState(true)
  const [showCoverage, setShowCoverage] = useState(true)
  const [showIsochrones, setShowIsochrones] = useState(true)
  const [showDroneIso, setShowDroneIso] = useState(true)
  const [showUgvIso, setShowUgvIso] = useState(true)
  const [hover, setHover] = useState<{ x: number; y: number; props: any | null }>({ x: 0, y: 0, props: null })

  const handleViewStateChange = useCallback((evt: any) => {
    const newViewState = evt.viewState
    setViewState(newViewState)
    onViewStateChange?.(newViewState)
  }, [onViewStateChange])

  const handleMapClick = useCallback((event: any) => {
    setSelectedFeatures(event.features || [])
    onMapClick?.(event)
  }, [onMapClick])

  const handleMapHover = useCallback((event: any) => {
    onMapHover?.(event)
    const features = event.features || []
    const cov = features.find((f: any) => f.layer && String(f.layer.id).startsWith('coverage'))
    if (cov) {
      setHover({ x: event.point.x, y: event.point.y, props: cov.properties || {} })
    } else {
      setHover((prev) => ({ ...prev, props: null }))
    }
  }, [onMapHover])

  useEffect(() => {
    const handler = (e: any) => {
      const { lat, lon, zoom = 12 } = (e as CustomEvent).detail || {}
      const m = mapRef.current
      if (m && typeof lat === 'number' && typeof lon === 'number') {
        m.flyTo({ center: [lon, lat], zoom })
      }
    }
    window.addEventListener('zoom-to', handler as EventListener)
    return () => window.removeEventListener('zoom-to', handler as EventListener)
  }, [])

  return (
    <div className={`relative w-full h-full bg-dark-950 ${className}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleViewStateChange}
        onClick={handleMapClick}
        onMouseMove={handleMapHover}
        interactiveLayerIds={["coverage-fill","coverage-outline"]}
        mapStyle={{
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256
            }
          },
          layers: [
            {
              id: 'background',
              type: 'raster',
              source: 'raster-tiles',
              paint: {
                'raster-opacity': 0.8
              }
            }
          ]
        }}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <MapLayers showCoverage={showCoverage} showIsochrones={showIsochrones} showDroneIsochrones={showDroneIso} showUgvIsochrones={showUgvIso} />
        <MapControls onLayerToggle={(layer, visible) => {
          if (layer === 'coverage') setShowCoverage(visible)
          if (layer === 'eta-drones') setShowDroneIso(visible)
          if (layer === 'eta-ugvs') setShowUgvIso(visible)
          if (layer === 'eta') { setShowDroneIso(visible); setShowUgvIso(visible); setShowIsochrones(visible) }
        }} />
        <MapLegend />
        {children}
        {/* Hover tooltip for coverage */}
        {hover.props && (
          <div
            className="absolute bg-dark-900/90 border border-dark-700 rounded px-2 py-1 text-xs font-mono pointer-events-none"
            style={{ left: hover.x + 10, top: hover.y + 10 }}
          >
            <div className="text-tactical-300">{hover.props.id || hover.props.name || 'Tower'}</div>
            {hover.props.dem_version && (
              <div className="text-tactical-muted">DEM: {hover.props.dem_version}</div>
            )}
            {hover.props.updated_at && (
              <div className="text-tactical-muted">Updated: {hover.props.updated_at}</div>
            )}
          </div>
        )}
      </Map>
      
      {/* Tactical Map Overlay */}
      {showTacticalOverlay && (
        <TacticalMapOverlay 
          onToggle={() => setShowTacticalOverlay(!showTacticalOverlay)}
        />
      )}
    </div>
  )
}
