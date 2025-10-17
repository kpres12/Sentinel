'use client'

import React, { useEffect, useState } from 'react'
import { settingsStore, type Settings } from '../../store/settingsStore'

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>(settingsStore.get())

  useEffect(() => {
    const unsub = settingsStore.subscribe(setSettings)
    return () => { unsub() }
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-dark-700">
        <h2 className="text-lg font-bold text-tactical-400">SETTINGS</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* DEM version */}
        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
          <h3 className="text-sm font-mono text-tactical-300 mb-2">DEM VERSION</h3>
          <select
            className="bg-dark-900 border border-dark-700 rounded p-2 text-sm font-mono"
            value={settings.demVersion}
            onChange={(e) => settingsStore.set({ demVersion: e.target.value })}
          >
            <option value="SRTM-1">SRTM-1</option>
            <option value="SRTM-3">SRTM-3</option>
            <option value="USGS-10M">USGS 10m</option>
            <option value="COPERNICUS-30M">Copernicus 30m</option>
          </select>
        </section>

        {/* Sensor FOV preset */}
        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
          <h3 className="text-sm font-mono text-tactical-300 mb-2">TOWER SENSOR FOV</h3>
          <div className="flex gap-2">
            {(['wide','medium','narrow'] as const).map(p => (
              <button
                key={p}
                onClick={() => settingsStore.set({ towerFovPreset: p })}
                className={`px-3 py-2 rounded text-xs font-mono border ${settings.towerFovPreset===p ? 'bg-tactical-500/20 border-tactical-500/30 text-tactical-400' : 'bg-dark-900 border-dark-700 text-tactical-muted'}`}
              >{p.toUpperCase()}</button>
            ))}
          </div>
        </section>

        {/* Bitrate cap */}
        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
          <h3 className="text-sm font-mono text-tactical-300 mb-2">BITRATE CAP (kbps)</h3>
          <input
            type="number"
            min={128}
            step={128}
            value={settings.bitrateCapKbps}
            onChange={(e) => settingsStore.set({ bitrateCapKbps: Number(e.target.value) })}
            className="bg-dark-900 border border-dark-700 rounded p-2 text-sm font-mono w-40"
          />
        </section>

        {/* Geofence */}
        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
          <h3 className="text-sm font-mono text-tactical-300 mb-2">GEOFENCE</h3>
          <select
            className="bg-dark-900 border border-dark-700 rounded p-2 text-sm font-mono"
            value={settings.geofence || ''}
            onChange={(e) => settingsStore.set({ geofence: e.target.value || null })}
          >
            <option value="">None</option>
            <option value="SECTOR-7">SECTOR 7</option>
            <option value="RANGER-DISTRICT-A">RANGER DIST A</option>
            <option value="CUSTOM">CUSTOM…</option>
          </select>
        </section>

        {/* Risk gate behavior */}
        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
          <h3 className="text-sm font-mono text-tactical-300 mb-2">RISK GATE FOR MISSIONS</h3>
          <div className="flex gap-2">
            {(['auto','confirm','manual'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => settingsStore.set({ riskGate: mode })}
                className={`px-3 py-2 rounded text-xs font-mono border ${settings.riskGate===mode ? 'bg-warning-500/20 border-warning-500/30 text-warning-400' : 'bg-dark-900 border-dark-700 text-tactical-muted'}`}
              >{mode.toUpperCase()}</button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
