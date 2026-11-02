import { describe, expect, it } from "vitest"
import type { Door } from "@/features/areas/doors"
import { homeAddress, homeDoor } from "./monteur-homes"

const door = (toevoeging: string, at?: [number, number]): Door => ({
  postcode: "3811AB",
  huisnummer: 12,
  toevoeging,
  straat: "Kerkstraat",
  plaats: "Amersfoort",
  at,
})

describe("homeDoor", () => {
  it("finds the addition however it is written", () => {
    const doors = [door("", [5, 52]), door("A-1", [5.1, 52.1])]
    expect(homeDoor(doors, "a 1")?.at).toEqual([5.1, 52.1])
  })

  it("falls back to the first address of the house number", () => {
    expect(homeDoor([door("", [5, 52])], "B")?.at).toEqual([5, 52])
  })

  it("skips addresses without a location, and finds nothing without any", () => {
    expect(homeDoor([door("A"), door("", [5, 52])], "A")?.at).toEqual([5, 52])
    expect(homeDoor([door("A")], "A")).toBeUndefined()
  })
})

describe("homeAddress", () => {
  const home = {
    id: "1",
    name: "Piet",
    postcode: "3811AB",
    huisnummer: "12",
    toevoeging: "A",
    straat: "Kerkstraat",
    plaats: "Amersfoort",
    lon: 5,
    lat: 52,
  }

  it("reads as an address", () => {
    expect(homeAddress(home)).toBe("Kerkstraat 12A, Amersfoort")
  })

  it("uses the postcode when the street is unknown", () => {
    expect(homeAddress({ ...home, straat: "", plaats: "", toevoeging: "" })).toBe("3811AB 12")
  })
})
