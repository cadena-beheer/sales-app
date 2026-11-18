import { describe, expect, it } from "vitest"
import { actionsAt, parsePostcodes } from "./marketing-actions"

describe("parsePostcodes", () => {
  it("reads any level, however it is typed, once each", () => {
    expect(parsePostcodes("3811, 3812 ab;3813C\n3811").postcodes).toEqual(["3811", "3812AB", "3813C"])
  })

  it("names what is no postcode", () => {
    expect(parsePostcodes("3811, abc, 381").wrong).toEqual(["ABC", "381"])
    expect(parsePostcodes(" , ").postcodes).toEqual([])
  })
})

describe("actionsAt", () => {
  const flyers = { id: "1", kind: "Flyers", doneOn: "2026-10-01", postcodes: ["3811", "3812AB"] }

  it("finds an action in a smaller or larger area than its own codes", () => {
    expect(actionsAt([flyers], "3811AC")).toEqual([flyers])
    expect(actionsAt([flyers], "3812")).toEqual([flyers])
    expect(actionsAt([flyers], "3812AB")).toEqual([flyers])
  })

  it("does not find it elsewhere", () => {
    expect(actionsAt([flyers], "3813")).toEqual([])
    expect(actionsAt([flyers], "3812AC")).toEqual([])
  })
})
