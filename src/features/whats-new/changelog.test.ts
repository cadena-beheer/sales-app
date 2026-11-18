import { describe, expect, it } from "vitest"
import { unseenReleases, type Release } from "./changelog"

const release = (id: string, adminOnly = false): Release => ({
  id,
  date: "2026-11-18",
  changes: [{ title: id, text: "", adminOnly }],
})
const changelog = [release("c"), release("b", true), release("a")]

describe("unseenReleases", () => {
  it("is everything newer than the last one seen", () => {
    expect(unseenReleases("a", true, changelog).map((r) => r.id)).toEqual(["c", "b"])
    expect(unseenReleases("c", true, changelog)).toEqual([])
  })

  it("is everything when nothing was seen, or the seen one is no longer listed", () => {
    expect(unseenReleases(null, true, changelog)).toHaveLength(3)
    expect(unseenReleases("gone", true, changelog)).toHaveLength(3)
  })

  it("leaves out what is only for the sales manager", () => {
    expect(unseenReleases("a", false, changelog).map((r) => r.id)).toEqual(["c"])
  })
})
