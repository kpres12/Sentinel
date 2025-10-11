'use client'

import React, { useState } from 'react'
import { 
  Camera, 
  Thermometer, 
  Eye, 
  Play, 
  Pause, 
  Square,
  Maximize,
  Grid3X3,
  List,
  Settings
} from 'lucide-react'
import { VideoFeedViewer } from '../video/VideoFeedViewer'

interface VideoFeed {
  id: string
  deviceId: string
  deviceName: string
  streamType: 'thermal' | 'visual' | 'multispectral'
  streamUrl: string
  isActive: boolean
  status: 'online' | 'offline' | 'error'
  lastSeen: string
}

export function VideoFeedPanel() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Mock video feeds data
  const videoFeeds: VideoFeed[] = [
    {
      id: 'feed-1',
      deviceId: 'firewatch-alpha',
      deviceName: 'FireWatch Alpha',
      streamType: 'thermal',
      streamUrl: 'rtsp://demo.stream/firewatch-alpha-thermal',
      isActive: true,
      status: 'online',
      lastSeen: '14:32:15'
    },
    {
      id: 'feed-2',
      deviceId: 'firewatch-alpha',
      deviceName: 'FireWatch Alpha',
      streamType: 'visual',
      streamUrl: 'rtsp://demo.stream/firewatch-alpha-visual',
      isActive: false,
      status: 'online',
      lastSeen: '14:32:10'
    },
    {
      id: 'feed-3',
      deviceId: 'firewatch-bravo',
      deviceName: 'FireWatch Bravo',
      streamType: 'thermal',
      streamUrl: 'rtsp://demo.stream/firewatch-bravo-thermal',
      isActive: false,
      status: 'online',
      lastSeen: '14:32:08'
    },
    {
      id: 'feed-4',
      deviceId: 'firefly-alpha',
      deviceName: 'FireFly Alpha',
      streamType: 'visual',
      streamUrl: 'rtsp://demo.stream/firefly-alpha-visual',
      isActive: false,
      status: 'online',
      lastSeen: '14:32:12'
    },
    {
      id: 'feed-5',
      deviceId: 'firefly-bravo',
      deviceName: 'FireFly Bravo',
      streamType: 'multispectral',
      streamUrl: 'rtsp://demo.stream/firefly-bravo-multispectral',
      isActive: false,
      status: 'online',
      lastSeen: '14:32:14'
    },
    {
      id: 'feed-6',
      deviceId: 'kofa-alpha',
      deviceName: 'KOFA Alpha',
      streamType: 'visual',
      streamUrl: 'rtsp://demo.stream/kofa-alpha-visual',
      isActive: false,
      status: 'online',
      lastSeen: '14:32:15'
    }
  ]

  const getStreamIcon = (streamType: string) => {
    switch (streamType) {
      case 'thermal': return Thermometer
      case 'visual': return Camera
      case 'multispectral': return Eye
      default: return Camera
    }
  }

  const getStreamColor = (streamType: string) => {
    switch (streamType) {
      case 'thermal': return 'text-orange-400'
      case 'visual': return 'text-blue-400'
      case 'multispectral': return 'text-green-400'
      default: return 'text-tactical-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-tacticalGreen-400'
      case 'offline': return 'text-fire-400'
      case 'error': return 'text-fire-400'
      default: return 'text-tactical-400'
    }
  }

  const handleFeedSelect = (feedId: string) => {
    setSelectedFeed(selectedFeed === feedId ? null : feedId)
  }

  const handleFeedClose = () => {
    setSelectedFeed(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="tactical-header px-4 py-3 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="tactical-title text-lg">VIDEO FEEDS</h2>
            <p className="text-xs text-tactical-muted font-mono">Live streams from FireWatch towers and FireFly drones</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-tactical-500 text-tactical-100' : 'bg-dark-700 text-tactical-muted hover:bg-dark-600'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-tactical-500 text-tactical-100' : 'bg-dark-700 text-tactical-muted hover:bg-dark-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-dark-700 text-tactical-muted hover:bg-dark-600 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto tactical-scrollbar p-4">
        {selectedFeed ? (
          // Full screen video viewer
          <div className="h-full">
            <VideoFeedViewer
              deviceId={videoFeeds.find(f => f.id === selectedFeed)?.deviceId || ''}
              deviceName={videoFeeds.find(f => f.id === selectedFeed)?.deviceName || ''}
              streamType={videoFeeds.find(f => f.id === selectedFeed)?.streamType || 'visual'}
              streamUrl={videoFeeds.find(f => f.id === selectedFeed)?.streamUrl}
              isActive={true}
              onClose={handleFeedClose}
            />
          </div>
        ) : (
          // Video feed grid/list
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-2 gap-4' 
              : 'space-y-4'
          }>
            {videoFeeds.map((feed) => {
              const StreamIcon = getStreamIcon(feed.streamType)
              const streamColor = getStreamColor(feed.streamType)
              const statusColor = getStatusColor(feed.status)

              return (
                <div
                  key={feed.id}
                  onClick={() => handleFeedSelect(feed.id)}
                  className={`tactical-panel p-4 rounded-lg border cursor-pointer transition-all hover:border-tactical-500/50 ${
                    feed.isActive ? 'border-tactical-500/50 bg-tactical-500/10' : 'border-dark-700'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    // Grid view
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StreamIcon className={`w-4 h-4 ${streamColor}`} />
                          <span className="text-sm font-mono text-tactical-300">{feed.deviceName}</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          feed.status === 'online' ? 'bg-tacticalGreen-400 animate-pulse' : 'bg-fire-400'
                        }`} />
                      </div>
                      
                      <div className="aspect-video bg-dark-950 rounded border border-dark-700 flex items-center justify-center">
                        <div className="text-center">
                          <Camera className="w-8 h-8 text-tactical-muted mx-auto mb-2" />
                          <p className="text-xs font-mono text-tactical-muted">
                            {feed.streamType.toUpperCase()} FEED
                          </p>
                          <p className="text-xs font-mono text-tactical-muted">
                            Click to view
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-tactical-muted">STATUS: <span className={statusColor}>{feed.status.toUpperCase()}</span></span>
                        <span className="text-tactical-muted">LAST: {feed.lastSeen}</span>
                      </div>
                    </div>
                  ) : (
                    // List view
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StreamIcon className={`w-5 h-5 ${streamColor}`} />
                        <div>
                          <p className="font-mono text-sm text-tactical-300">{feed.deviceName}</p>
                          <p className="text-xs font-mono text-tactical-muted">{feed.streamType.toUpperCase()} CAMERA</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-mono text-tactical-muted">STATUS: <span className={statusColor}>{feed.status.toUpperCase()}</span></p>
                          <p className="text-xs font-mono text-tactical-muted">LAST: {feed.lastSeen}</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          feed.status === 'online' ? 'bg-tacticalGreen-400 animate-pulse' : 'bg-fire-400'
                        }`} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
