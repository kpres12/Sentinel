'use client'

import React from 'react'
import { NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
import { ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react'

export interface MapControlsProps {
  onLayerToggle?: (layer: string, visible: boolean) => void
  onResetView?: () => void
}

export function MapControls({ onLayerToggle, onResetView }: MapControlsProps) {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      <NavigationControl />
      <ScaleControl />
      
      <div className="bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={onResetView}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-2">
        <button
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Layer Controls"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
