import { describe, expect, it } from "vitest"
import { salesStatsSchema } from "./kpi.ts"

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
