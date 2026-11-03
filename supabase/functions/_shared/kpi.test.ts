import { describe, expect, it } from "vitest"
import { salesStatsSchema, statsFor } from "./kpi.ts"

const answer = {
  cancellationsEnteredUntil: null,
  salesEnteredUntil: null,
  days: [{ date: "2026-09-01", recruiter: "0212BB", sold: 3, cancelled: 1 }],
  recruiters: [],
  cancellations: [],
  reasons: [],
}

describe("salesStatsSchema", () => {
  it("accepts an endpoint that does not send bankafval yet", () => {
    const stats = salesStatsSchema.parse(answer)
    expect(stats.days[0].bankAfval).toBeUndefined()
    expect(stats.bankAfval).toEqual([])
    expect(stats.afvalDelays).toEqual([])
  })
})

describe("statsFor", () => {
  const stats = salesStatsSchema.parse({
    ...answer,
    days: [{ ...answer.days[0], bankAfval: 1 }],
    afvalDelays: [{ date: "2026-09-01", kind: "bank", days: 41, count: 1 }],
  })

  it("gives admins after how many days sales fell away", () => {
    expect(statsFor(stats, true).afvalDelays).toHaveLength(1)
  })

  it("leaves that out for a recruiter, who keeps their bankafval count", () => {
    const own = statsFor(stats, false)
    expect(own.afvalDelays).toEqual([])
    expect(own.days[0].bankAfval).toBe(1)
  })
})
