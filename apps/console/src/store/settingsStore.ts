1|// Simple settings store with localStorage persistence
2|export type Settings = {
3|  demVersion: string
4|  towerFovPreset: 'wide' | 'medium' | 'narrow'
5|  bitrateCapKbps: number
6|  geofence: string | null
7|  riskGate: 'auto' | 'manual' | 'confirm'
8|}
9|
10|const DEFAULTS: Settings = {
11|  demVersion: 'SRTM-1',
12|  towerFovPreset: 'medium',
13|  bitrateCapKbps: 2000,
14|  geofence: null,
15|  riskGate: 'confirm'
16|}
17|
18|let state: Settings = load()
19|const listeners = new Set<(s: Settings) => void>()
20|
21|function load(): Settings {
22|  try {
23|    const raw = localStorage.getItem('wfops:settings')
24|    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
25|  } catch {
26|    return DEFAULTS
27|  }
28|}
29|
30|function save() {
31|  try { localStorage.setItem('wfops:settings', JSON.stringify(state)) } catch {}
32|}
33|
34|export const settingsStore = {
35|  get(): Settings { return state },
36|  set(patch: Partial<Settings>) {
37|    state = { ...state, ...patch }
38|    save()
39|    listeners.forEach(l => l(state))
40|  },
41|  subscribe(fn: (s: Settings) => void) { listeners.add(fn); return () => listeners.delete(fn) }
42|}
