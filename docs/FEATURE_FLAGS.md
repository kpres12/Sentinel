# Feature Flag Matrix — Platform + Domain Packs

Purpose: enable one UI shell and shared services while swapping domain packs (wildfire, agriculture, oil & gas) via flags. Use per-tenant config; default to safe minimal features.

Conventions
- Flags live under a hierarchical namespace. Example env keys map to JSON using `__` as nesting: `FEATURE__UI__ROUTES__WILDFIRE=true`.
- Types: bool, enum, list. Changes must be backward-compatible; remove only with deprecation.

Quick-start JSON (per-tenant)
```json
{
  "domain": { "pack": "wildfire" },
  "terminology": { "theme": "wildfire" },
  "ui": {
    "routes": { "wildfire": true, "agriculture": false, "oilgas": false },
    "widgets": {
      "fireProgress": true, "yieldEstimator": false, "leakProbability": false
    },
    "map": {
      "layers": {
        "fireBehaviorOverlay": true,
        "ndviOverlay": false,
        "methanePlumeOverlay": false,
        "airspaceBlocks": true,
        "criticalAssets": true
      }
    }
  },
  "detection": {
    "models": {
      "wildfire_smoke": true,
      "thermal_hotspot": true,
      "crop_stress": false,
      "methane_plume": false
    }
  },
  "mission": {
    "templates": {
      "emberDamp": true,
      "assetWet": true,
      "fieldSpray": false,
      "pipelinePatrol": false,
      "leakInvestigation": false
    }
  },
  "policy": { "roe": { "id": "roe_wildfire_v1" }, "humanApprovalRequired": true },
  "autonomy": { "constraints": { "daylightOnly": true, "maxWindMps": 12 } },
  "payloads": { "supported": ["emberwing", "camera"] },
  "telemetry": { "units": "imperial" },
  "reporting": {
    "templates": {
      "afterActionReport": true,
      "cropTreatmentSummary": false,
      "leakInvestigationReport": false
    }
  }
}
```

Matrix (Defaults per Domain)
- T = enabled by default for domain, F = disabled by default. Tenants can override.

| Flag | Type | Wildfire | Agriculture | Oil & Gas | Notes |
|---|---|---:|---:|---:|---|
| domain.pack | enum(wildfire,agriculture,oilgas) | wildfire | agriculture | oilgas | Drives default set |
| terminology.theme | enum | wildfire | agriculture | oilgas | UI wording/colors |
| ui.routes.wildfire | bool | T | F | F | Route mount /wildfire |
| ui.routes.agriculture | bool | F | T | F | Route mount /ag |
| ui.routes.oilgas | bool | F | F | T | Route mount /oilgas |
| ui.widgets.fireProgress | bool | T | F | F | Wildfire widget |
| ui.widgets.yieldEstimator | bool | F | T | F | Ag widget |
| ui.widgets.leakProbability | bool | F | F | T | O&G widget |
| ui.map.layers.fireBehaviorOverlay | bool | T | F | F | Rothermel/forecast |
| ui.map.layers.ndviOverlay | bool | F | T | F | NDVI/thermal |
| ui.map.layers.methanePlumeOverlay | bool | F | F | T | Plume modeling |
| ui.map.layers.airspaceBlocks | bool | T | T | T | Shared airspace |
| ui.map.layers.criticalAssets | bool | T | T | T | Assets theme varies |
| detection.models.wildfire_smoke | bool | T | F | F | Sentinel plugin |
| detection.models.thermal_hotspot | bool | T | F | F | Sentinel plugin |
| detection.models.crop_stress | bool | F | T | F | Sentinel plugin |
| detection.models.methane_plume | bool | F | F | T | Sentinel plugin |
| mission.templates.emberDamp | bool | T | F | F | Summit.OS template |
| mission.templates.assetWet | bool | T | F | F | Summit.OS template |
| mission.templates.fieldSpray | bool | F | T | F | Summit.OS template |
| mission.templates.pipelinePatrol | bool | F | F | T | Summit.OS template |
| mission.templates.leakInvestigation | bool | F | F | T | Summit.OS template |
| policy.roe.id | string | roe_wildfire_v1 | roe_ag_v1 | roe_oilgas_v1 | Managed via OPA |
| policy.humanApprovalRequired | bool | T | T | T | Default cautious |
| autonomy.constraints.daylightOnly | bool | T | F | T | Domain safety |
| autonomy.constraints.maxWindMps | number | 12 | 8 | 15 | Example values |
| payloads.supported | list | [emberwing,camera] | [sprayer,camera] | [camera] | Planning caps |
| telemetry.units | enum(metric,imperial) | imperial | metric | imperial | Tenant choice |
| reporting.templates.afterActionReport | bool | T | F | F | Post-mission |
| reporting.templates.cropTreatmentSummary | bool | F | T | F | Ag report |
| reporting.templates.leakInvestigationReport | bool | F | F | T | O&G report |

Operational Guidance
- Feature gates live in platform config; UI shell and services check flags via a central provider.
- Domain packs must declare their required flags and expose safe fallbacks when disabled.
- All packs must conform to Summit.OS canonical contracts; flags cannot change contract shapes, only availability/behavior.
