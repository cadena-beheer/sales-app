// Made-up "kansen" in the shape of the Contracts API, used until the endpoint is configured (and by the app's
// dev-only demo mode). Deterministic per band. No Deno APIs here.
import { streetThresholds } from "./sales-map-view.ts"
import type {
  OpportunityAreas,
  OpportunityPc5,
  OpportunityPc6,
  OpportunityStreets,
  WozBand,
} from "./sales-opportunities.ts"

const PC4S = ["3811", "3812", "3813", "3814", "3815", "3816", "3818", "3821", "3822", "3823", "3824", "3825"]
const STREETS = ["Kerkstraat", "Molenweg", "Lindelaan", "Beukenhof", "Schoolstraat", "Dorpsweg", "Parklaan"]
const LETTERS = "ABCDEGHJKLMNPRST"

/** The limits of the bands in the demo, as in the real figures: the middle third is around the gemeente's average. */
const INDEX_LOW_BELOW = 80
const INDEX_HIGH_FROM = 107

/** A WOZ index that fits the band, in percent of the gemeente's average. */
function indexIn(woz: WozBand, random: () => number): number {
  if (woz === "low") return 50 + Math.floor(random() * (INDEX_LOW_BELOW - 50))
  if (woz === "mid") return INDEX_LOW_BELOW + Math.floor(random() * (INDEX_HIGH_FROM - INDEX_LOW_BELOW))
  if (woz === "high") return INDEX_HIGH_FROM + Math.floor(random() * 60)
  return 60 + Math.floor(random() * 108)
}

export function demoOpportunityAreas(woz: WozBand): OpportunityAreas {
  const random = mulberry32(hash(woz))
  const areas = PC4S.map((postcode) => {
    const households = 200 + Math.floor(random() * 1800)
    const customers = Math.floor(households * random() * 0.12)
    const open = households - customers
    return { postcode, households, customers, open, bestStreetOpen: Math.floor(open * (0.02 + random() * 0.08)) }
  })
  return {
    statistics: "Voorbeeld",
    indexLowBelow: INDEX_LOW_BELOW,
    indexHighFrom: INDEX_HIGH_FROM,
    customersCountedAt: null,
    streetThresholds: streetThresholds(areas.map((a) => a.bestStreetOpen)),
    areas,
  }
}

export function demoOpportunityStreets(pc4: string, woz: WozBand): OpportunityStreets {
  const random = mulberry32(hash(pc4 + woz))
  const streets = Array.from({ length: 8 }, (_, i) => {
    const households = 15 + Math.floor(random() * 60)
    const customers = Math.floor(households * random() * 0.15)
    return {
      postcode: `${pc4}${LETTERS[i * 2]}${LETTERS[i * 2 + 1]}`,
      streets: STREETS[Math.floor(random() * STREETS.length)],
      city: "Amersfoort",
      households,
      customers,
      open: households - customers,
      wozIndex: indexIn(woz, random),
    }
  })
  return { postcode: pc4, streets: streets.sort((a, b) => b.open - a.open) }
}

/** The streets of the demo's PC4 areas, wherever the map looks: a zoomed-in map to try the shades and popups on. */
export function demoOpportunityPc6(woz: WozBand): OpportunityPc6 {
  const random = mulberry32(hash(`pc6${woz}`))
  const streets = PC4S.flatMap((pc4) =>
    [...LETTERS].flatMap((first) =>
      [...LETTERS].map((second) => {
        const households = 5 * (1 + Math.floor(random() * 14))
        const customers = Math.floor(households * random() * 0.15)
        const open = households - customers
        return { postcode: `${pc4}${first}${second}`, households, customers, open, wozIndex: indexIn(woz, random) }
      }),
    ),
  ).filter((street) => street.postcode.charCodeAt(5) % 2 === 0 || street.open > 30)
  return { streetThresholds: streetThresholds(streets.map((s) => s.open)), streets }
}

/** The demo's streets added up per PC5, like the API does. */
export function demoOpportunityPc5(woz: WozBand): OpportunityPc5 {
  const perPc5 = new Map<string, OpportunityPc5["areas"][number]>()
  for (const { postcode, households, customers, open } of demoOpportunityPc6(woz).streets) {
    const code = postcode.slice(0, 5)
    const area = perPc5.get(code) ?? { postcode: code, households: 0, customers: 0, open: 0, bestStreetOpen: 0 }
    area.households += households
    area.customers += customers
    area.open += open
    area.bestStreetOpen = Math.max(area.bestStreetOpen, open)
    perPc5.set(code, area)
  }
  const areas = [...perPc5.values()]
  return { areaThresholds: streetThresholds(areas.map((a) => a.bestStreetOpen)), areas }
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
