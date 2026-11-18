import { describe, expect, it } from "vitest"
import type { ScanCorners } from "@shared/form-schema"
import { cleanChannel, homography, project, usableCorners } from "./scan-enhance"

const point = (x: number, y: number) => ({ x, y })

describe("homography", () => {
  it("takes each corner to its counterpart, and keeps straight lines straight", () => {
    const rect = [point(0, 0), point(100, 0), point(100, 140), point(0, 140)] as const
    const photo = [point(30, 20), point(180, 35), point(170, 260), point(15, 240)] as const
    const matrix = homography([...rect], [...photo])
    rect.forEach((corner, i) => {
      const { x, y } = project(matrix, corner.x, corner.y)
      expect(x).toBeCloseTo(photo[i].x, 6)
      expect(y).toBeCloseTo(photo[i].y, 6)
    })
    // The middle of the top edge lands on the line between the top corners.
    const { x, y } = project(matrix, 50, 0)
    const t = (x - 30) / (180 - 30)
    expect(y).toBeCloseTo(20 + t * 15, 6)
  })
})

describe("usableCorners", () => {
  const sheet: ScanCorners = [point(0.1, 0.05), point(0.9, 0.08), point(0.92, 0.95), point(0.08, 0.93)]

  it("gives the corners in pixels for a sheet that fills a fair part of the photo", () => {
    expect(usableCorners(sheet, 1000, 2000)?.[1]).toEqual(point(900, 160))
  })

  it("is null for corners out of order or a sheet that is too small", () => {
    const crossed: ScanCorners = [sheet[0], sheet[2], sheet[1], sheet[3]]
    expect(usableCorners(crossed, 1000, 2000)).toBeNull()
    const tiny: ScanCorners = [point(0.4, 0.4), point(0.5, 0.4), point(0.5, 0.5), point(0.4, 0.5)]
    expect(usableCorners(tiny, 1000, 2000)).toBeNull()
  })
})

describe("cleanChannel", () => {
  // A photo of grey paper (200) under even light.
  const paper = 200

  it("lightens the paper halfway to white", () => {
    expect(cleanChannel(paper, paper)).toBe(228)
  })

  it("keeps pencil (80% of the paper) apart from the paper, more than the photo does", () => {
    const contrast = cleanChannel(paper, paper) - cleanChannel(0.8 * paper, paper)
    expect(contrast).toBeGreaterThan(paper - 0.8 * paper)
  })

  it("keeps dark ink dark", () => {
    expect(cleanChannel(0.15 * paper, paper)).toBeLessThan(20)
  })
})
