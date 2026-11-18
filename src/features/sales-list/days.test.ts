import { describe, expect, it } from "vitest"
import { dayTitle, localDate } from "./days"

describe("localDate", () => {
  it("is the day on the phone's calendar", () => {
    expect(localDate(new Date("2026-10-13T12:00:00").toISOString())).toBe("2026-10-13")
  })
})

describe("dayTitle", () => {
  it("names today and yesterday, otherwise the weekday", () => {
    expect(dayTitle("2026-10-13", "2026-10-13")).toBe("Vandaag")
    expect(dayTitle("2026-10-12", "2026-10-13")).toBe("Gisteren")
    expect(dayTitle("2026-10-10", "2026-10-13")).toBe("Zaterdag")
  })
})
