import { describe, expect, it } from "vitest"
import { recruiterFrom } from "@shared/kpi"
import { kpiWindow } from "./periods"

describe("kpiWindow", () => {
  it("starts with the current month and the eleven before it, then goes back a year per page", () => {
    expect(kpiWindow(0, "2026-10-07")).toEqual({ from: "2025-11-01", to: "2026-10-07" })
    expect(kpiWindow(1, "2026-10-07")).toEqual({ from: "2024-11-01", to: "2025-10-31" })
    expect(kpiWindow(2, "2026-10-07")).toEqual({ from: "2023-11-01", to: "2024-10-31" })
  })
})

describe("recruiterFrom", () => {
  it("is the first of the month two months back, also across a new year", () => {
    expect(recruiterFrom("2026-11-23")).toBe("2026-09-01")
    expect(recruiterFrom("2026-11-01")).toBe("2026-09-01")
    expect(recruiterFrom("2027-01-31")).toBe("2026-11-01")
    expect(recruiterFrom("2027-02-15")).toBe("2026-12-01")
  })
})
