"use client"

import React, { useEffect, useState } from 'react'

export function ApiMissionsPanel() {
  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${api}/api/v1/missions`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMissions(data)
      setError(null)
    } catch (e: any) {
      setError(e.message || 'Failed to load missions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <div className="p-4 text-sm font-mono text-tactical-muted">Loading missions...</div>
  if (error) return <div className="p-4 text-sm font-mono text-fire-400">{error}</div>

  return (
    <div className="p-4 space-y-2">
      {missions.length === 0 && (
        <div className="text-sm font-mono text-tactical-muted">No missions</div>
      )}
      {missions.map((m) => (
        <div key={m.id} className="rounded border border-dark-700 p-3">
          <div className="text-sm font-mono text-tactical-300 flex justify-between">
            <span>{m.type} • {m.status} • {m.priority}</span>
            <span>{m.progress ?? 0}%</span>
          </div>
          <div className="text-xs font-mono text-tactical-muted">
            {m.lat?.toFixed?.(3)}, {m.lng?.toFixed?.(3)} • r={m.radius}
          </div>
        </div>
      ))}
    </div>
  )
}
