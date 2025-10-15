1|'use client'
2|
3|import React, { useEffect, useState } from 'react'
4|import { settingsStore, type Settings } from '../../store/settingsStore'
5|
6|export function SettingsPanel() {
7|  const [settings, setSettings] = useState<Settings>(settingsStore.get())
8|
9|  useEffect(() => settingsStore.subscribe(setSettings), [])
10|
11|  return (
12|    <div className="h-full flex flex-col">
13|      <div className="px-4 py-3 border-b border-dark-700">
14|        <h2 className="text-lg font-bold text-tactical-400">SETTINGS</h2>
15|      </div>
16|      <div className="flex-1 overflow-y-auto p-4 space-y-6">
17|        {/* DEM version */}
18|        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
19|          <h3 className="text-sm font-mono text-tactical-300 mb-2">DEM VERSION</h3>
20|          <select
21|            className="bg-dark-900 border border-dark-700 rounded p-2 text-sm font-mono"
22|            value={settings.demVersion}
23|            onChange={(e) => settingsStore.set({ demVersion: e.target.value })}
24|          >
25|            <option value="SRTM-1">SRTM-1</option>
26|            <option value="SRTM-3">SRTM-3</option>
27|            <option value="USGS-10M">USGS 10m</option>
28|            <option value="COPERNICUS-30M">Copernicus 30m</option>
29|          </select>
30|        </section>
31|
32|        {/* Sensor FOV preset */}
33|        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
34|          <h3 className="text-sm font-mono text-tactical-300 mb-2">TOWER SENSOR FOV</h3>
35|          <div className="flex gap-2">
36|            {(['wide','medium','narrow'] as const).map(p => (
37|              <button
38|                key={p}
39|                onClick={() => settingsStore.set({ towerFovPreset: p })}
40|                className={`px-3 py-2 rounded text-xs font-mono border ${settings.towerFovPreset===p ? 'bg-tactical-500/20 border-tactical-500/30 text-tactical-400' : 'bg-dark-900 border-dark-700 text-tactical-muted'}`}
41|              >{p.toUpperCase()}</button>
42|            ))}
43|          </div>
44|        </section>
45|
46|        {/* Bitrate cap */}
47|        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
48|          <h3 className="text-sm font-mono text-tactical-300 mb-2">BITRATE CAP (kbps)</h3>
49|          <input
50|            type="number"
51|            min={128}
52|            step={128}
53|            value={settings.bitrateCapKbps}
54|            onChange={(e) => settingsStore.set({ bitrateCapKbps: Number(e.target.value) })}
55|            className="bg-dark-900 border border-dark-700 rounded p-2 text-sm font-mono w-40"
56|          />
57|        </section>
58|
59|        {/* Geofence */}
60|        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
61|          <h3 className="text-sm font-mono text-tactical-300 mb-2">GEOFENCE</h3>
62|          <select
63|            className="bg-dark-900 border border-dark-700 rounded p-2 text-sm font-mono"
64|            value={settings.geofence || ''}
65|            onChange={(e) => settingsStore.set({ geofence: e.target.value || null })}
66|          >
67|            <option value="">None</option>
68|            <option value="SECTOR-7">SECTOR 7</option>
69|            <option value="RANGER-DISTRICT-A">RANGER DIST A</option>
70|            <option value="CUSTOM">CUSTOM…</option>
71|          </select>
72|        </section>
73|
74|        {/* Risk gate behavior */}
75|        <section className="bg-dark-800 p-4 rounded-lg border border-dark-700">
76|          <h3 className="text-sm font-mono text-tactical-300 mb-2">RISK GATE FOR MISSIONS</h3>
77|          <div className="flex gap-2">
78|            {(['auto','confirm','manual'] as const).map(mode => (
79|              <button
80|                key={mode}
81|                onClick={() => settingsStore.set({ riskGate: mode })}
82|                className={`px-3 py-2 rounded text-xs font-mono border ${settings.riskGate===mode ? 'bg-warning-500/20 border-warning-500/30 text-warning-400' : 'bg-dark-900 border-dark-700 text-tactical-muted'}`}
83|              >{mode.toUpperCase()}</button>
84|            ))}
85|          </div>
86|        </section>
87|      </div>
88|    </div>
89|  )
90|}
