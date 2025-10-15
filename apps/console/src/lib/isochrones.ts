// Simple isochrone generator (approximate circles by speed * time)
export type IsochronesInput = {
  points: { id: string; lon: number; lat: number; kind: 'drone' | 'ugv' }[]
  minutes: number[] // e.g., [5,10,15]
}

// Speeds in m/s (adjust as needed)
const SPEEDS = {
  drone: Number(process.env.NEXT_PUBLIC_DRONE_SPEED_MS || 20),
  ugv: Number(process.env.NEXT_PUBLIC_UGV_SPEED_MS || 5)
}

function metersToDegrees(m: number, lat: number) {
  const degLat = m / 111320
  const degLon = m / (111320 * Math.cos(lat * Math.PI / 180))
  return { degLat, degLon }
}

export function buildIsochrones({ points, minutes }: IsochronesInput): any {
  const features: any[] = []
  for (const p of points) {
    const speed = SPEEDS[p.kind]
    for (const min of minutes) {
      const radiusM = speed * (min * 60)
      const { degLat, degLon } = metersToDegrees(radiusM, p.lat)
      const steps = 64
      const coords: [number, number][] = []
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI
        const dLon = Math.cos(angle) * degLon
        const dLat = Math.sin(angle) * degLat
        coords.push([p.lon + dLon, p.lat + dLat])
      }
      features.push({
        type: 'Feature',
        properties: { id: `${p.id}-${min}m`, minutes: min, kind: p.kind },
        geometry: { type: 'Polygon', coordinates: [coords] }
      })
    }
  }
  return { type: 'FeatureCollection', features }
}
