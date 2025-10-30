'use client'

import React, { useEffect, useState } from 'react'
import { WifiOff, Wifi, SlidersHorizontal, ShieldCheck } from 'lucide-react'

export function ChaosPanel() {
  const [deviceId, setDeviceId] = useState('edge-device-001')
  const [dropPct, setDropPct] = useState(0)
  const [latencyMs, setLatencyMs] = useState(0)
  const [bufferMax, setBufferMax] = useState(200)
  const [requireConfirm, setRequireConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${api}/api/v1/admin/settings`)
        if (res.ok) {
          const data = await res.json()
          setRequireConfirm(!!data.require_confirm)
        }
      } catch {}
    }
    load()
  }, [])

  const applyToDevice = async () => {
    setLoading(true)
    try {
      // Publish control message via MQTT
      const { summitClient } = await import('../../lib/summitClient')
      const ok = summitClient.publish(
        `devices/${deviceId}/control`,
        { faultDropPct: dropPct, faultLatencyMs: latencyMs, offlineBufferMax: bufferMax },
        1
      )
      if (!ok) console.warn('MQTT publish failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleRequireConfirm = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${api}/api/v1/admin/require_confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: !requireConfirm })
      })
      if (res.ok) {
        const data = await res.json()
        setRequireConfirm(!!data.require_confirm)
      }
    } catch (e) {
      console.error('Failed to toggle require_confirm', e)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-dark-700">
        <h2 className="text-lg font-bold text-tactical-400 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" /> CHAOS / RELIABILITY LAB
        </h2>
        <p className="text-xs text-tactical-muted font-mono">Fault injection, buffering, and mission approval</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* MQTT Control */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-2">EDGE FAULT INJECTION</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-mono text-tactical-muted">DEVICE ID
              <input value={deviceId} onChange={(e)=>setDeviceId(e.target.value)} className="mt-1 w-full bg-dark-800 border border-dark-700 rounded px-2 py-1 text-sm font-mono" />
            </label>
            <label className="text-xs font-mono text-tactical-muted">DROP PCT (0-1)
              <input type="number" step="0.05" min={0} max={1} value={dropPct} onChange={(e)=>setDropPct(parseFloat(e.target.value)||0)} className="mt-1 w-full bg-dark-800 border border-dark-700 rounded px-2 py-1 text-sm font-mono" />
            </label>
            <label className="text-xs font-mono text-tactical-muted">LATENCY (ms)
              <input type="number" min={0} value={latencyMs} onChange={(e)=>setLatencyMs(parseInt(e.target.value)||0)} className="mt-1 w-full bg-dark-800 border border-dark-700 rounded px-2 py-1 text-sm font-mono" />
            </label>
            <label className="text-xs font-mono text-tactical-muted">OFFLINE BUFFER MAX
              <input type="number" min={0} value={bufferMax} onChange={(e)=>setBufferMax(parseInt(e.target.value)||0)} className="mt-1 w-full bg-dark-800 border border-dark-700 rounded px-2 py-1 text-sm font-mono" />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button disabled={loading} onClick={applyToDevice} className="px-3 py-1 rounded text-xs font-mono bg-tactical-500/20 border border-tactical-500/30 text-tactical-400 hover:bg-tactical-500/30 disabled:opacity-50">APPLY TO DEVICE</button>
            <span className="text-xs text-tactical-muted">Publishes MQTT control to devices/{'{deviceId}'}/control</span>
          </div>
        </div>

        {/* Mission Approval Gate */}
        <div className="tactical-panel p-4 rounded-lg">
          <h3 className="tactical-subtitle mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> MISSION APPROVAL</h3>
          <div className="flex items-center gap-3">
            <button onClick={toggleRequireConfirm} className={`px-3 py-1 rounded text-xs font-mono border ${requireConfirm ? 'bg-warning-500/20 border-warning-500/30 text-warning-400' : 'bg-tacticalGreen-500/20 border-tacticalGreen-500/30 text-tacticalGreen-400'}`}>
              {requireConfirm ? 'REQUIRE APPROVAL: ON' : 'REQUIRE APPROVAL: OFF'}
            </button>
            <span className="text-xs text-tactical-muted">Controls initial mission status (proposed vs pending)</span>
          </div>
        </div>

        {/* Connectivity Note */}
        <div className="bg-dark-800 p-3 rounded-lg border border-dark-700">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-tacticalGreen-400" />
            <WifiOff className="w-4 h-4 text-fire-400" />
            <span className="text-xs font-mono text-tactical-muted">Use this panel to simulate drops/latency and confirm buffering + recovery.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
