#!/usr/bin/env node
// Advance a mission's status/progress via API
// Usage:
//   node scripts/advance_mission.mjs <mission_id> <status> [progress]
// Example:
//   node scripts/advance_mission.mjs recon-12345 active 10

const API = process.env.SUMMIT_API_URL || process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.SUMMIT_API_KEY || '';

const [,, missionId, statusArg, progressArg] = process.argv;
if (!missionId || !statusArg) {
  console.error('Usage: node scripts/advance_mission.mjs <mission_id> <status> [progress]');
  process.exit(1);
}

const patch = { status: statusArg };
if (progressArg !== undefined) {
  const p = Number(progressArg);
  if (!Number.isNaN(p)) patch.progress = p;
}

(async () => {
  try {
    const res = await fetch(`${API}/api/v1/missions/${missionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {})
      },
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      console.error('Request failed:', res.status, await res.text());
      process.exit(1);
    }
    const data = await res.json();
    console.log('Updated mission:', data);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
