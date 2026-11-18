// Made-up storingen in the shape of the Contracts API, used until the endpoint exists (and by the app's dev-only demo
// mode). Deterministic. No Deno APIs here.
import type { SalesIssues } from "./sales-issues.ts"

const PLACES: [pc4: number, lon: number, lat: number, count: number][] = [
  [3811, 5.39, 52.156, 90],
  [3512, 5.12, 52.09, 70],
  [8011, 6.09, 52.51, 40],
  [1011, 4.9, 52.37, 60],
  [6511, 5.86, 51.84, 30],
]
const LETTERS = "ABCDEGHJKLMNPRST"

export function demoSalesIssues(from: string, to: string): SalesIssues {
  let seed = 12345
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const start = Date.parse(from)
  const span = Date.parse(to) - start
  const issues = PLACES.flatMap(([pc4, lon, lat, count]) =>
    Array.from({ length: count }, (_, i) => ({
      postcode: `${pc4 + (i % 8)}${LETTERS[Math.floor(random() * 16)]}${LETTERS[Math.floor(random() * 16)]}`,
      lon: lon + (random() - 0.5) * 0.09,
      lat: lat + (random() - 0.5) * 0.06,
      count: 1 + Math.floor(random() * random() * 6),
      lastOn: new Date(start + random() * span).toISOString().slice(0, 10),
    })),
  )
  return { issues }
}
