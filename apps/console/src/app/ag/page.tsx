"use client"

import { useFeature, useFlags } from '../../flags/FeatureFlags'

export default function AgriOpsPage() {
  const enabled = useFeature('ui.routes.agriculture', false)
  const flags = useFlags()
  if (!enabled) {
    return (
      <div className="p-6 text-sm font-mono text-tactical-muted">
        Agriculture pack is disabled for this tenant.
      </div>
    )
  }
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-tactical-400">AgriOps Pack</h1>
      <p className="text-sm text-tactical-muted">Domain-specific workflows, layers, and terminology for agriculture.</p>
      <div className="mt-4 text-xs font-mono text-tactical-300">Theme: {flags.terminology.theme}</div>
    </div>
  )
}
