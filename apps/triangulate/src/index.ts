import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.TRIANGULATE_PORT ? Number(process.env.TRIANGULATE_PORT) : 8101
const AUDIT_DIR = path.join(process.cwd(), 'logs')
const AUDIT_FILE = path.join(AUDIT_DIR, 'triangulate.audit.jsonl')
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true })

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Deterministic golden scenario
app.get('/scenarios/golden', (_req, res) => {
  res.json({
    scenario: 'golden-1',
    input: { bearings: [{ lat: 40.0, lon: -120.0, bearing: 45 }, { lat: 40.01, lon: -120.01, bearing: 225 }] },
    output: {
      estimate: { lat: 40.006, lon: -119.997 },
      confidence: 0.9,
      uncertainty: { radius_m: 250, ellipse: { major_m: 400, minor_m: 150, heading_deg: 30 } },
      rationale: ['wide angular spread', 'good baseline', 'low bearing variance'],
    },
  })
})

// Stub triangulation endpoint with uncertainty + rationale and audit log
app.post('/triangulate', (req, res) => {
  const { bearings } = req.body || {}
  const inputCount = Array.isArray(bearings) ? bearings.length : 0
  const response = {
    inputCount,
    estimate: { lat: 40.006, lon: -119.997 },
    confidence: 0.86,
    uncertainty: { radius_m: 300, ellipse: { major_m: 500, minor_m: 200, heading_deg: 25 } },
    rationale: [
      inputCount >= 2 ? '>=2 bearings' : 'insufficient bearings',
      'baseline >= 1km (assumed)',
      'terrain penalty low (stub)'
    ],
    method: 'stub',
  }
  try {
    fs.appendFileSync(AUDIT_FILE, JSON.stringify({ ts: Date.now(), input: req.body, output: response }) + '\n')
  } catch {}
  res.json(response)
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Triangulate stub listening on :${PORT}`)
})
