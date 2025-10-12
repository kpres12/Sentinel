'use client'

import React, { useState, useCallback, useRef } from 'react'
import { MapRef } from 'react-map-gl/maplibre'

interface MapInteractionHandlerProps {
  mapRef: React.RefObject<MapRef>
  onPointClick?: (lat: number, lng: number) => void
  onAreaDraw?: (coordinates: Array<{lat: number, lng: number}>) => void
  onLineDraw?: (coordinates: Array<{lat: number, lng: number}>) => void
  drawingMode?: 'point' | 'area' | 'line' | 'none'
  isDrawing?: boolean
  onDrawingComplete?: () => void
}

export function MapInteractionHandler({
  mapRef,
  onPointClick,
  onAreaDraw,
  onLineDraw,
  drawingMode = 'none',
  isDrawing = false,
  onDrawingComplete
}: MapInteractionHandlerProps) {
  const [drawingPoints, setDrawingPoints] = useState<Array<{lat: number, lng: number}>>([])
  const [isDrawingActive, setIsDrawingActive] = useState(false)
  const drawingTimeoutRef = useRef<NodeJS.Timeout>()

  const handleMapClick = useCallback((event: any) => {
    const { lat } = event.lngLat
    const { lng } = event.lngLat

    if (drawingMode === 'none') {
      onPointClick?.(lat, lng)
      return
    }

    if (!isDrawing) return

    if (drawingMode === 'point') {
      onPointClick?.(lat, lng)
      return
    }

    if (drawingMode === 'area' || drawingMode === 'line') {
      const newPoints = [...drawingPoints, { lat, lng }]
      setDrawingPoints(newPoints)
      setIsDrawingActive(true)

      // Clear any existing timeout
      if (drawingTimeoutRef.current) {
        clearTimeout(drawingTimeoutRef.current)
      }

      // Set timeout to complete drawing if no more clicks
      drawingTimeoutRef.current = setTimeout(() => {
        if (newPoints.length >= (drawingMode === 'line' ? 2 : 3)) {
          if (drawingMode === 'area') {
            onAreaDraw?.(newPoints)
          } else {
            onLineDraw?.(newPoints)
          }
          setDrawingPoints([])
          setIsDrawingActive(false)
          onDrawingComplete?.()
        }
      }, 2000) // 2 second timeout
    }
  }, [drawingMode, isDrawing, drawingPoints, onPointClick, onAreaDraw, onLineDraw, onDrawingComplete])

  const handleMapDoubleClick = useCallback((event: any) => {
    if (drawingMode === 'area' || drawingMode === 'line') {
      if (drawingPoints.length >= (drawingMode === 'line' ? 2 : 3)) {
        if (drawingMode === 'area') {
          onAreaDraw?.(drawingPoints)
        } else {
          onLineDraw?.(drawingPoints)
        }
        setDrawingPoints([])
        setIsDrawingActive(false)
        onDrawingComplete?.()
      }
    }
  }, [drawingMode, drawingPoints, onAreaDraw, onLineDraw, onDrawingComplete])

  const handleMapMouseMove = useCallback((event: any) => {
    if (isDrawingActive && (drawingMode === 'area' || drawingMode === 'line')) {
      // Update the preview line/polygon
      const { lat, lng } = event.lngLat
      // This would update a preview state that could be rendered
    }
  }, [isDrawingActive, drawingMode])

  // Set up map event handlers
  React.useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    const handleClick = (e: any) => handleMapClick(e)
    const handleDoubleClick = (e: any) => handleMapDoubleClick(e)
    const handleMouseMove = (e: any) => handleMapMouseMove(e)

    map.on('click', handleClick)
    map.on('dblclick', handleDoubleClick)
    map.on('mousemove', handleMouseMove)

    return () => {
      map.off('click', handleClick)
      map.off('dblclick', handleDoubleClick)
      map.off('mousemove', handleMouseMove)
    }
  }, [mapRef, handleMapClick, handleMapDoubleClick, handleMapMouseMove])

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (drawingTimeoutRef.current) {
        clearTimeout(drawingTimeoutRef.current)
      }
    }
  }, [])

  return null // This component doesn't render anything, just handles interactions
}

// Drawing preview component for showing current drawing state
export function DrawingPreview({ 
  points, 
  mode, 
  isActive 
}: { 
  points: Array<{lat: number, lng: number}>, 
  mode: 'area' | 'line', 
  isActive: boolean 
}) {
  if (!isActive || points.length === 0) return null

  const coordinates = points.map(p => [p.lng, p.lat])

  return (
    <>
      {/* Preview points */}
      {points.map((point, index) => (
        <div
          key={index}
          className="absolute w-3 h-3 bg-tactical-400 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 z-20"
          style={{
            left: `${((point.lng + 180) / 360) * 100}%`,
            top: `${((90 - point.lat) / 180) * 100}%`
          }}
        />
      ))}

      {/* Preview line/polygon */}
      {mode === 'line' && points.length > 1 && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <svg className="w-full h-full">
            <polyline
              points={coordinates.map(coord => `${((coord[0] + 180) / 360) * 100}%,${((90 - coord[1]) / 180) * 100}%`).join(' ')}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
          </svg>
        </div>
      )}

      {mode === 'area' && points.length > 2 && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <svg className="w-full h-full">
            <polygon
              points={coordinates.map(coord => `${((coord[0] + 180) / 360) * 100}%,${((90 - coord[1]) / 180) * 100}%`).join(' ')}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="#3b82f6"
              fillOpacity="0.1"
              strokeDasharray="5,5"
            />
          </svg>
        </div>
      )}
    </>
  )
}
