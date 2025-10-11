'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Settings,
  Camera,
  Thermometer,
  Eye,
  AlertTriangle
} from 'lucide-react'

interface VideoFeedViewerProps {
  deviceId: string
  deviceName: string
  streamType: 'thermal' | 'visual' | 'multispectral'
  streamUrl?: string
  isActive?: boolean
  onClose?: () => void
}

export function VideoFeedViewer({
  deviceId,
  deviceName,
  streamType,
  streamUrl,
  isActive = false,
  onClose
}: VideoFeedViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [streamQuality, setStreamQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [detectionOverlay, setDetectionOverlay] = useState(true)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mock video stream URL for demonstration
  const mockStreamUrl = streamUrl || `rtsp://demo.stream/firewatch-${deviceId}-${streamType}`

  useEffect(() => {
    if (videoRef.current && isActive) {
      // In a real implementation, this would connect to the actual RTSP stream
      // For demo purposes, we'll use a placeholder
      videoRef.current.src = mockStreamUrl
    }
  }, [isActive, mockStreamUrl])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
      setIsFullscreen(!isFullscreen)
    }
  }

  const getStreamIcon = () => {
    switch (streamType) {
      case 'thermal': return Thermometer
      case 'visual': return Camera
      case 'multispectral': return Eye
      default: return Camera
    }
  }

  const getStreamColor = () => {
    switch (streamType) {
      case 'thermal': return 'text-orange-400'
      case 'visual': return 'text-blue-400'
      case 'multispectral': return 'text-green-400'
      default: return 'text-tactical-400'
    }
  }

  const StreamIcon = getStreamIcon()

  return (
    <div 
      ref={containerRef}
      className={`relative bg-dark-900 border border-dark-700 rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-full'
      }`}
    >
      {/* Video Container */}
      <div className="relative w-full h-full bg-dark-950">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted={isMuted}
          playsInline
          controls={false}
        />
        
        {/* Detection Overlay */}
        {detectionOverlay && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Mock fire detection overlay */}
            <div className="absolute top-1/4 left-1/3 w-8 h-8 border-2 border-red-500 rounded-full animate-pulse">
              <div className="absolute inset-0 bg-red-500/20 rounded-full"></div>
            </div>
            <div className="absolute bottom-1/3 right-1/4 w-6 h-6 border-2 border-orange-400 rounded-full animate-pulse">
              <div className="absolute inset-0 bg-orange-400/20 rounded-full"></div>
            </div>
          </div>
        )}

        {/* Stream Info Overlay */}
        <div className="absolute top-2 left-2 bg-dark-800/80 backdrop-blur-sm rounded px-2 py-1">
          <div className="flex items-center gap-2 text-xs font-mono">
            <StreamIcon className={`w-3 h-3 ${getStreamColor()}`} />
            <span className="text-tactical-300">{deviceName}</span>
            <span className="text-tactical-muted">({streamType.toUpperCase()})</span>
          </div>
        </div>

        {/* Detection Alerts */}
        <div className="absolute top-2 right-2 space-y-1">
          <div className="bg-red-500/90 text-white px-2 py-1 rounded text-xs font-mono flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            FIRE DETECTED
          </div>
          <div className="bg-orange-500/90 text-white px-2 py-1 rounded text-xs font-mono">
            HEAT SIGNATURE
          </div>
        </div>

        {/* Quality Indicator */}
        <div className="absolute bottom-2 left-2 bg-dark-800/80 backdrop-blur-sm rounded px-2 py-1">
          <div className="text-xs font-mono text-tactical-300">
            {streamQuality.toUpperCase()} • 30 FPS • 1080p
          </div>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark-900 to-transparent p-4">
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 bg-dark-800/80 hover:bg-dark-700 rounded transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-tactical-400" /> : <Play className="w-4 h-4 text-tactical-400" />}
            </button>
            
            <button
              onClick={toggleMute}
              className="p-2 bg-dark-800/80 hover:bg-dark-700 rounded transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-tactical-400" /> : <Volume2 className="w-4 h-4 text-tactical-400" />}
            </button>

            <button
              onClick={() => setDetectionOverlay(!detectionOverlay)}
              className={`p-2 rounded transition-colors ${
                detectionOverlay ? 'bg-fire-500/80 text-white' : 'bg-dark-800/80 hover:bg-dark-700 text-tactical-400'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-dark-800/80 hover:bg-dark-700 rounded transition-colors"
            >
              <Settings className="w-4 h-4 text-tactical-400" />
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-dark-800/80 hover:bg-dark-700 rounded transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-tactical-400" /> : <Maximize className="w-4 h-4 text-tactical-400" />}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 bg-dark-800/80 hover:bg-dark-700 rounded transition-colors"
              >
                <Square className="w-4 h-4 text-tactical-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-2 right-2 bg-dark-800/95 backdrop-blur-sm rounded-lg p-4 border border-dark-700">
          <h3 className="text-sm font-mono text-tactical-300 mb-3">STREAM SETTINGS</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-tactical-muted">QUALITY</label>
              <select
                value={streamQuality}
                onChange={(e) => setStreamQuality(e.target.value as any)}
                className="w-full p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-tactical-300"
              >
                <option value="low">LOW (480p)</option>
                <option value="medium">MEDIUM (720p)</option>
                <option value="high">HIGH (1080p)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-tactical-muted">DETECTION OVERLAY</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={detectionOverlay}
                  onChange={(e) => setDetectionOverlay(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs font-mono text-tactical-300">Show fire detections</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-tactical-muted">STREAM TYPE</label>
              <div className="text-xs font-mono text-tactical-300 capitalize">
                {streamType} Camera
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
