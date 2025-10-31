// Feature Flags provider and hook
// Reads flags from NEXT_PUBLIC_FEATURE_FLAGS_URL (default /config/flags.json) with sane wildfire defaults
'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type FeatureFlags = {
  domain: { pack: 'wildfire' | 'agriculture' | 'oilgas' }
  terminology: { theme: 'wildfire' | 'agriculture' | 'oilgas' }
  ui: {
    routes: { wildfire: boolean; agriculture: boolean; oilgas: boolean }
    widgets: {
      fireProgress?: boolean
      yieldEstimator?: boolean
      leakProbability?: boolean
      chaosLab?: boolean
    }
    map: {
      layers: {
        fireBehaviorOverlay?: boolean
        ndviOverlay?: boolean
        methanePlumeOverlay?: boolean
        airspaceBlocks?: boolean
        criticalAssets?: boolean
      }
    }
  }
  detection: { models: Record<string, boolean> }
  mission: { templates: Record<string, boolean> }
  policy: { roe: { id: string }; humanApprovalRequired?: boolean }
  autonomy?: { constraints?: { daylightOnly?: boolean; maxWindMps?: number } }
  payloads?: { supported?: string[] }
  telemetry?: { units?: 'metric' | 'imperial' }
  reporting?: { templates?: Record<string, boolean> }
}

const DEFAULT_FLAGS: FeatureFlags = {
  domain: { pack: 'wildfire' },
  terminology: { theme: 'wildfire' },
  ui: {
    routes: { wildfire: true, agriculture: false, oilgas: false },
    widgets: { fireProgress: true, chaosLab: true },
    map: { layers: { fireBehaviorOverlay: true, airspaceBlocks: true, criticalAssets: true } }
  },
  detection: { models: { wildfire_smoke: true, thermal_hotspot: true } },
  mission: { templates: { emberDamp: true, assetWet: true } },
  policy: { roe: { id: 'roe_wildfire_v1' }, humanApprovalRequired: true },
  autonomy: { constraints: { daylightOnly: true, maxWindMps: 12 } },
  payloads: { supported: ['emberwing', 'camera'] },
  telemetry: { units: 'imperial' },
  reporting: { templates: { afterActionReport: true } }
}

const FlagsCtx = createContext<FeatureFlags>(DEFAULT_FLAGS)

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS)

  useEffect(() => {
    let canceled = false
    const url = process.env.NEXT_PUBLIC_FEATURE_FLAGS_URL || '/config/flags.json'
    fetch(url, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`flags fetch ${r.status}`)
        return r.json()
      })
      .then((json) => { if (!canceled) setFlags({ ...DEFAULT_FLAGS, ...json }) })
      .catch(() => { /* fall back to defaults */ })
    return () => { canceled = true }
  }, [])

  const value = useMemo(() => flags, [flags])
  return <FlagsCtx.Provider value={value}>{children}</FlagsCtx.Provider>
}

export function useFlags() { return useContext(FlagsCtx) }
export function useFeature(path: string, fallback?: boolean): boolean {
  const flags = useFlags()
  try {
    // simple dot-path getter
    const val = path.split('.').reduce<any>((acc, key) => (acc ? acc[key] : undefined), flags)
    return typeof val === 'boolean' ? val : (fallback ?? false)
  } catch { return fallback ?? false }
}
