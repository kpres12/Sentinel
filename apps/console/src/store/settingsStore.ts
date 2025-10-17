// Simple settings store with localStorage persistence
export type Settings = {
  demVersion: string
  towerFovPreset: 'wide' | 'medium' | 'narrow'
  bitrateCapKbps: number
  geofence: string | null
  riskGate: 'auto' | 'manual' | 'confirm'
}

const DEFAULTS: Settings = {
  demVersion: 'SRTM-1',
  towerFovPreset: 'medium',
  bitrateCapKbps: 2000,
  geofence: null,
  riskGate: 'confirm'
}

let state: Settings = load()
const listeners = new Set<(s: Settings) => void>()

function load(): Settings {
  try {
    const raw = localStorage.getItem('wfops:settings')
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

function save() {
  try { localStorage.setItem('wfops:settings', JSON.stringify(state)) } catch {}
}

export const settingsStore = {
  get(): Settings { return state },
  set(patch: Partial<Settings>) {
    state = { ...state, ...patch }
    save()
    listeners.forEach(l => l(state))
  },
  subscribe(fn: (s: Settings) => void) { listeners.add(fn); return () => listeners.delete(fn) }
}
