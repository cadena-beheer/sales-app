import { describe, expect, it } from "vitest"
import { luminanceProblem, measureLuminance } from "./photo-quality"

/** RGBA pixels, each a grey value. */
const pixels = (...greys: number[]) => new Uint8ClampedArray(greys.flatMap((g) => [g, g, g, 255]))
/** A sheet: mostly paper, some ink. */
const sheet = (paper: number, ink: number) => pixels(...Array(80).fill(paper), ...Array(20).fill(ink))

describe("photo quality", () => {
  it("passes a contract with dark text on light paper, also on a dark table", () => {
    expect(luminanceProblem(measureLuminance(sheet(200, 40)))).toBeNull()
    expect(
      luminanceProblem(measureLuminance(pixels(...Array(50).fill(15), ...Array(40).fill(190), ...Array(10).fill(60)))),
    ).toBeNull()
  })

  it("turns down a photo that is dark, white or flat almost everywhere", () => {
    expect(luminanceProblem(measureLuminance(sheet(30, 10)))).toBe("te_donker")
    expect(luminanceProblem(measureLuminance(sheet(252, 235)))).toBe("te_licht")
    expect(luminanceProblem(measureLuminance(sheet(130, 120)))).toBe("geen_contrast")
  })
})
