import { describe, expect, it } from "vitest"
import {
  buildPeriods,
  daysBetween,
  delaySteps,
  formatTimestamp,
  isProvisional,
  longLabel,
  medianDelay,
  periodKey,
  periodStart,
  reasonsIn,
  shortLabel,
  uitvalRate,
} from "./periods"

const day = (date: string, sold: number, cancelled = 0, recruiter = "0212BB") => ({ date, recruiter, sold, cancelled })

describe("periodKey", () => {
  it.each([
    ["2026-09-07", "2026-W37"], // Monday
    ["2026-09-13", "2026-W37"], // Sunday
    ["2026-01-01", "2026-W01"], // Thursday: week 1 of 2026
    ["2027-01-01", "2026-W53"], // Friday: still the last week of 2026
    ["2024-12-30", "2025-W01"], // Monday of week 1 of 2025
  ])("week of %s is %s", (date, key) => {
    expect(periodKey(date, "week")).toBe(key)
  })

  it("month is yyyy-MM", () => {
    expect(periodKey("2026-09-30", "month")).toBe("2026-09")
  })
})

describe("periodStart", () => {
  it("weeks start on Monday", () => {
    expect(periodStart("2026-09-13", "week")).toBe("2026-09-07")
    expect(periodStart("2026-09-07", "week")).toBe("2026-09-07")
  })
})

describe("buildPeriods", () => {
  it("adds up the days per week, also across recruiters, and keeps empty weeks", () => {
    const periods = buildPeriods(
      [day("2026-09-07", 3, 1), day("2026-09-08", 2, 0, "0618BB"), day("2026-09-22", 4, 2)],
      "week",
      "2026-09-07",
      "2026-09-27",
    )
    expect(periods.map((p) => [p.key, p.start, p.end, p.sold, p.cancelled])).toEqual([
      ["2026-W37", "2026-09-07", "2026-09-13", 5, 1],
      ["2026-W38", "2026-09-14", "2026-09-20", 0, 0],
      ["2026-W39", "2026-09-21", "2026-09-27", 4, 2],
    ])
  })

  it("skips a week that started before the loaded range, and includes the running one", () => {
    const periods = buildPeriods([day("2026-09-02", 5), day("2026-10-07", 1)], "week", "2026-09-01", "2026-10-07")
    expect(periods[0].start).toBe("2026-09-07")
    expect(periods.at(-1)).toMatchObject({ start: "2026-10-05", end: "2026-10-11", sold: 1 })
  })

  it("groups by month", () => {
    const periods = buildPeriods([day("2026-08-31", 2, 1), day("2026-09-01", 1)], "month", "2026-08-01", "2026-09-15")
    expect(periods.map((p) => [p.key, p.end, p.sold, p.cancelled])).toEqual([
      ["2026-08", "2026-08-31", 2, 1],
      ["2026-09", "2026-09-30", 1, 0],
    ])
  })
})

describe("labels", () => {
  const [week] = buildPeriods([], "week", "2026-08-31", "2026-08-31")
  const [january] = buildPeriods([], "month", "2027-01-01", "2027-01-01")

  it("names weeks with their days", () => {
    expect(shortLabel(week, "week")).toBe("wk 36")
    expect(longLabel(week, "week")).toBe("week 36 · 31 aug – 6 sep 2026")
  })

  it("names months, January with its year", () => {
    expect(shortLabel(january, "month")).toBe("jan '27")
    expect(longLabel(january, "month")).toBe("januari 2027")
  })
})

describe("uitvalRate", () => {
  it("is the share cancelled or never paid, or null without sales", () => {
    expect(uitvalRate({ sold: 8, cancelled: 2, bank: 0 })).toBe(0.25)
    expect(uitvalRate({ sold: 8, cancelled: 2, bank: 2 })).toBe(0.5)
    expect(uitvalRate({ sold: 0, cancelled: 0, bank: 0 })).toBeNull()
  })
})

describe("bankafval per period", () => {
  it("adds up, and counts as nothing while the endpoint does not send it", () => {
    const days = [
      { ...day("2026-09-01", 5, 1), bankAfval: 2 },
      { ...day("2026-09-02", 3), bankAfval: 1 },
      day("2026-09-03", 4),
    ]
    const [september] = buildPeriods(days, "month", "2026-09-01", "2026-09-30")
    expect(september).toMatchObject({ sold: 12, cancelled: 1, bank: 3 })
  })
})

describe("delays", () => {
  const september = { start: "2026-09-01", end: "2026-09-30" }
  const delay = (date: string, kind: "opgezegd" | "bank", days: number, count = 1) => ({ date, kind, days, count })
  const delays = [
    delay("2026-09-01", "opgezegd", 3, 2),
    delay("2026-09-01", "opgezegd", 7),
    delay("2026-09-02", "opgezegd", 40),
    delay("2026-09-03", "bank", 35),
    delay("2026-09-03", "bank", 60),
    delay("2026-09-03", "bank", 61),
    // Sold in another month.
    delay("2026-10-01", "opgezegd", 400),
  ]

  it("puts each in its step, with the steps between the first and last used", () => {
    expect(delaySteps(delays, september)).toEqual([
      { label: "0–7 dagen", opgezegd: 3, bank: 0 },
      { label: "8–14 dagen", opgezegd: 0, bank: 0 },
      { label: "15–30 dagen", opgezegd: 0, bank: 0 },
      { label: "31–60 dagen", opgezegd: 1, bank: 2 },
      { label: "61–90 dagen", opgezegd: 0, bank: 1 },
    ])
  })

  it("has a last step without an end, and no steps without afval", () => {
    expect(delaySteps(delays, { start: "2026-10-01", end: "2026-10-31" })).toEqual([
      { label: "Na een jaar", opgezegd: 1, bank: 0 },
    ])
    expect(delaySteps([], september)).toEqual([])
  })

  it("finds the day by which half had fallen away", () => {
    expect(medianDelay(delays, september, "opgezegd")).toBe(3)
    expect(medianDelay(delays, september, "bank")).toBe(60)
    expect(medianDelay([], september, "bank")).toBeNull()
  })
})

describe("daysBetween", () => {
  it("counts whole days, also from a timestamp and across a month", () => {
    expect(daysBetween("2026-09-20", "2026-10-02T09:26:35.37")).toBe(12)
    expect(daysBetween("2026-09-20", "2026-09-20")).toBe(0)
  })
})

describe("isProvisional", () => {
  it("is provisional until cancellations are entered four weeks past the period", () => {
    expect(isProvisional({ end: "2026-09-04" }, "2026-10-02T09:26:35.37")).toBe(false)
    expect(isProvisional({ end: "2026-09-05" }, "2026-10-02T09:26:35.37")).toBe(true)
    expect(isProvisional({ end: "2026-01-31" }, null)).toBe(true)
  })
})

describe("formatTimestamp", () => {
  it("reads ZMAdmin's local time without shifting it", () => {
    expect(formatTimestamp("2026-10-02T09:26:35.37")).toBe("vr 2 okt 2026, 09:26")
    expect(formatTimestamp("2026-10-02")).toBe("vr 2 okt 2026")
  })
})

describe("reasonsIn", () => {
  it("adds up the reasons of the sale days in the period", () => {
    const reasons = [
      { date: "2026-09-06", reason: "Bedacht", count: 5 }, // Sunday before
      { date: "2026-09-07", reason: "Te duur", count: 1 },
      { date: "2026-09-08", reason: "Bedacht", count: 1 },
      { date: "2026-09-13", reason: "Bedacht", count: 1 },
    ]
    expect(reasonsIn(reasons, { start: "2026-09-07", end: "2026-09-13" })).toEqual([
      { reason: "Bedacht", count: 2 },
      { reason: "Te duur", count: 1 },
    ])
  })

  it("adds up everything without a period, also reasons without a date", () => {
    expect(
      reasonsIn(
        [
          { reason: "Bedacht", count: 2 },
          { date: "2026-09-07", reason: "Bedacht", count: 1 },
        ],
        null,
      ),
    ).toEqual([{ reason: "Bedacht", count: 3 }])
  })
})
