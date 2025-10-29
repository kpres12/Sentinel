import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PREDICT_PORT ? Number(process.env.PREDICT_PORT) : 8102
const AUDIT_DIR = path.join(process.cwd(), 'logs')
const AUDIT_FILE = path.join(AUDIT_DIR, 'predict.audit.jsonl')
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true })

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/scenarios/golden', (_req, res) => {
  res.json({
    scenario: 'golden-1',
    input: { ignition_points: [{ lat: 40.0, lon: -120.0 }], conditions: { wind_speed_mps: 5, wind_direction_deg: 270 } },
    output: {
      perimeter: [
        { lat: 40.000, lon: -120.000 },
        { lat: 40.010, lon: -120.005 },
        { lat: 40.005, lon: -119.990 },
        { lat: 40.000, lon: -120.000 },
      ],
      isochrones: [
        { hours_from_start: 1, area_hectares: 5.2 },
        { hours_from_start: 2, area_hectares: 12.7 },
        { hours_from_start: 3, area_hectares: 20.1 },
      ],
      confidence: { overall: 0.8, weather: 0.75, fuel: 0.8, terrain: 0.85 },
      rationale: ['moderate wind', 'flat terrain (stub)']
    }
  })
})

// Stub prediction endpoint with uncertainty and audit log
app.post('/predict', (req, res) => {
  const { ignition_points, conditions } = req.body || {}
  const output = {
    ignition_points_count: Array.isArray(ignition_points) ? ignition_points.length : 0,
    conditions_present: Boolean(conditions),
    perimeter: [
      { lat: 40.000, lon: -120.000 },
      { lat: 40.010, lon: -120.005 },
      { lat: 40.005, lon: -119.990 },
      { lat: 40.000, lon: -120.000 },
    ],
    isochrones: [
      { hours_from_start: 1, area_hectares: 5.2, perimeter_km: 1.1 },
      { hours_from_start: 2, area_hectares: 12.7, perimeter_km: 2.6 },
      { hours_from_start: 3, area_hectares: 20.1, perimeter_km: 3.9 },
    ],
    confidence: { overall: 0.78, weather: 0.7, fuel: 0.8, terrain: 0.85 },
    rationale: ['baseline model (stub)', 'conditions moderate']
  }
  try {
    fs.appendFileSync(AUDIT_FILE, JSON.stringify({ ts: Date.now(), input: req.body, output }) + '\n')
  } catch {}
  res.json(output)
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Predict stub listening on :${PORT}`)
})
