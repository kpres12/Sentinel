// Asset store and WS handling
import { summitClient } from '../lib/summitClient'

type Status = 'ONLINE' | 'STALE' | 'OFFLINE'

export type Asset = {
  id: string
  type: 'TOWER' | 'DRONE' | 'UGV' | string
  status: Status
  last_seen?: string
  location?: { lat: number; lon: number; elev_m?: number }
  retired?: boolean
}

type State = {
  assets: Record<string, Asset>
  coverage: any | null
}

class Emitter {
  private listeners = new Set<(s: State) => void>()
  emit(state: State) { this.listeners.forEach(l => l(state)) }
  subscribe(fn: (s: State) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
}

class AssetStore {
  private state: State = { assets: {}, coverage: null }
  private emitter = new Emitter()
  private ws?: WebSocket
  private timerId: any = null
  private staleMinutes = Number(process.env.NEXT_PUBLIC_STALE_MIN || 2)
  private offlineMinutes = Number(process.env.NEXT_PUBLIC_OFFLINE_MIN || 5)

  getState() { return this.state }
  subscribe(fn: (s: State) => void) { return this.emitter.subscribe(fn) }

  upsertAsset(patch: Partial<Asset> & { id: string }) {
    const prev = this.state.assets[patch.id]
    const next: Asset = { id: patch.id, type: patch.type || prev?.type || 'UNKNOWN', status: patch.status || prev?.status || 'OFFLINE', last_seen: patch.last_seen || prev?.last_seen, location: patch.location || prev?.location, retired: patch.retired ?? prev?.retired }
    this.state.assets[patch.id] = next
    this.emitter.emit(this.state)
  }

  markRetired(id: string) {
    if (this.state.assets[id]) {
      this.state.assets[id].retired = true
      this.emitter.emit(this.state)
    }
  }

  setCoverage(fc: any) {
    this.state.coverage = fc
    this.emitter.emit(this.state)
  }

  private recalcStatus(id: string) {
    const a = this.state.assets[id]
    if (!a?.last_seen) return
    const last = new Date(a.last_seen).getTime()
    const now = Date.now()
    const mins = (now - last) / 60000
    let status: Status = 'ONLINE'
    if (mins >= this.offlineMinutes) status = 'OFFLINE'
    else if (mins >= this.staleMinutes) status = 'STALE'
    if (a.status !== status) {
      a.status = status
      this.emitter.emit(this.state)
    }
  }

  startTimers() {
    if (this.timerId) return
    this.timerId = setInterval(() => {
      Object.keys(this.state.assets).forEach(id => this.recalcStatus(id))
    }, 30000)
  }

  stopTimers() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  connectWS() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
    const url = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001').replace(/\/$/, '')
    this.ws = new WebSocket(url)
    this.ws.onopen = () => { /* noop */ }
    this.ws.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'heartbeat' && msg.node_id) {
          const now = new Date().toISOString()
          this.upsertAsset({ id: msg.node_id, status: 'ONLINE', last_seen: now })
        } else if (msg.type === 'coverage_updated') {
          try {
            await this.refreshCoverage()
          } catch {}
        }
      } catch {}
    }
    this.ws.onclose = () => { setTimeout(() => this.connectWS(), 3000) }
  }

  async refreshCoverage() {
    const cov = await summitClient.getCoverage()
    const fc: any = { type: 'FeatureCollection', features: (cov as any).features || [] }
    const unioned = await this.unionCoverage(fc)
    this.setCoverage(unioned)
  }

  private async unionCoverage(fc: any): Promise<any> {
    const feats = (fc?.features || []).filter((f: any) => f && (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'))
    if (feats.length <= 1) return fc
    try {
      // dynamic import to avoid SSR issues if not installed
      // @ts-ignore
      const turf = await import('@turf/turf')
      let current: any = feats[0]
      for (let i = 1; i < feats.length; i++) {
        try {
          // @ts-ignore
          current = turf.union(current, feats[i]) || current
        } catch {
          // ignore and continue
        }
      }
      const rest = (fc.features || []).filter((f: any) => !(f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'))
      const outFeats = current?.type === 'FeatureCollection' ? [...current.features, ...rest] : [current, ...rest]
      return { type: 'FeatureCollection', features: outFeats }
    } catch {
      return fc
    }
  }
}

export const assetStore = new AssetStore()
export type { State as AssetState }
