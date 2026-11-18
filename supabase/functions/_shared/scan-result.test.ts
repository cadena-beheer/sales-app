import { describe, expect, it } from "vitest"
import type { Extraction } from "./form-schema"
import { toScanCorners, toScanResult } from "./scan-result"

// What Claude might answer for a fully filled-in paper form.
const claudeAnswer: Extraction = {
  datum: "2026-10-14",
  klantnummer: "100234",
  geslacht: "Vrouw",
  naam: "M.A. de Vries",
  postcode: "1012JS",
  huisnummer: "1",
  toevoeging: "A",
  straat: "Dam",
  plaats: "Amsterdam",
  landcode: "+31",
  telefoon: "0612345678",
  landcode2: "+31",
  telefoon2: "201234567",
  email: "m.devries@voorbeeld.nl",
  iban: "nl91 abna 0417 1643 00",
  ibanTnv: "J. de Vries",
  contractType: "Service",
  betaalperiode: "Maand Machtiging",
}

describe("toScanResult", () => {
  it("leaves out name, phone numbers, straat and plaats by default", () => {
    expect(toScanResult(claudeAnswer, false)).toEqual({
      datum: "2026-10-14",
      klantnummer: "100234",
      geslacht: "Vrouw",
      postcode: "1012JS",
      huisnummer: "1",
      toevoeging: "A",
      landcode: "+31",
      email: "m.devries@voorbeeld.nl",
      iban: "NL91ABNA0417164300",
      ibanTnv: "J. de Vries",
      contractType: "Service",
      betaalperiode: "Maand Machtiging",
    })
  })

  it("returns name and phone numbers for a recruiter with scan_contact_fields on, never straat and plaats", () => {
    const fields = toScanResult(claudeAnswer, true)
    expect(fields).toMatchObject({
      naam: "M.A. de Vries",
      telefoon: "612345678",
      landcode2: "+31",
      telefoon2: "201234567",
    })
    expect(fields).not.toHaveProperty("straat")
    expect(fields).not.toHaveProperty("plaats")
  })

  it("drops fields Claude left empty or read as invalid", () => {
    const fields = toScanResult({ ...claudeAnswer, klantnummer: "", datum: "2026-06-31", landcode2: "31" }, true)
    expect(fields).not.toHaveProperty("klantnummer")
    expect(fields).not.toHaveProperty("datum")
    expect(fields).not.toHaveProperty("landcode2")
  })
})

describe("toScanCorners", () => {
  const point = (x: number, y: number) => ({ x, y })

  it("keeps fractions in the order top left, top right, bottom right, bottom left, clamped to the photo", () => {
    const hoeken = {
      linksboven: point(-0.05, 0.1),
      rechtsboven: point(0.9, 0.08),
      rechtsonder: point(0.92, 1.04),
      linksonder: point(0.06, 0.95),
    }
    expect(toScanCorners(hoeken)).toEqual([point(0, 0.1), point(0.9, 0.08), point(0.92, 1), point(0.06, 0.95)])
  })

  it("is null without corners or with pixels instead of fractions", () => {
    expect(toScanCorners(null)).toBeNull()
    const pixels = {
      linksboven: point(40, 60),
      rechtsboven: point(1900, 50),
      rechtsonder: point(1880, 1400),
      linksonder: point(30, 1390),
    }
    expect(toScanCorners(pixels)).toBeNull()
  })
})
