'use client'

import React, { useCallback, useRef, useState, useEffect } from 'react'
import Map, { MapRef, Source, Layer, ViewState } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { MapLayers } from './MapLayers'
import { MapControls } from './MapControls'
import { MapLegend } from './MapLegend'

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
  }, [onMapHover])

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleViewStateChange}
        onClick={handleMapClick}
        onMouseMove={handleMapHover}
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
              source: 'raster-tiles'
            }
          ]
        }}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <MapLayers />
        <MapControls />
        <MapLegend />
        {children}
      </Map>
    </div>
  )
}
