"use client"

import React, { useEffect, useState } from 'react'

export function TracksPanel() {
  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  const [tracks, setTracks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${api}/api/v1/twin/tracks`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTracks(data)
      setError(null)
    } catch (e: any) {
      setError(e.message || 'Failed to load tracks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <div className="p-4 text-sm font-mono text-tactical-muted">Loading tracks...</div>
  if (error) return <div className="p-4 text-sm font-mono text-fire-400">{error}</div>

  return (
    <div className="p-4 space-y-2">
      <div className="text-sm font-mono text-tactical-300">Tracks: {tracks.length}</div>
      {tracks.map((t) => {
        const last = (t.positions && t.positions.length) ? t.positions[t.positions.length - 1] : null
        return (
          <div key={t.track_id} className="rounded border border-dark-700 p-3">
            <div className="text-xs font-mono text-tactical-300">{t.classification || 'unknown'} • conf {t.confidence || 0}</div>
            {last && (
              <div className="text-xs font-mono text-tactical-muted">{last.lat.toFixed(4)}, {last.lon.toFixed(4)} at {new Date(last.timestamp).toLocaleTimeString()}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
