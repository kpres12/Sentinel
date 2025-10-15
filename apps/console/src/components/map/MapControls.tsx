'use client'

import React, { useState } from 'react'
import { NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
import { RotateCcw, Layers } from 'lucide-react'

export interface MapControlsProps {
  onLayerToggle?: (layer: string, visible: boolean) => void
  onResetView?: () => void
}

export function MapControls({ onLayerToggle, onResetView }: MapControlsProps) {
  const [coverage, setCoverage] = useState(true)
  const [etaDrones, setEtaDrones] = useState(true)
  const [etaUgvs, setEtaUgvs] = useState(true)
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
      
      <div className="bg-white rounded-lg shadow-lg p-3 space-y-2 min-w-[200px]">
        <div className="flex items-center gap-2 text-sm">
          <Layers className="w-4 h-4" />
          <span className="font-semibold">Layers</span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={coverage} onChange={(e) => { setCoverage(e.target.checked); onLayerToggle?.('coverage', e.target.checked) }} />
          <span>Tower coverage</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={etaDrones} onChange={(e) => { setEtaDrones(e.target.checked); onLayerToggle?.('eta-drones', e.target.checked) }} />
          <span>Drone ETA (5/10/15)</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={etaUgvs} onChange={(e) => { setEtaUgvs(e.target.checked); onLayerToggle?.('eta-ugvs', e.target.checked) }} />
          <span>UGV ETA (5/10/15)</span>
        </label>
      </div>
    </div>
  )
}
