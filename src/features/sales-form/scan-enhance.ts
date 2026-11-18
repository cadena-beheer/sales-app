import type { ScanCorners, ScanPoint } from "@shared/form-schema"

/**
 * The scanner-style copy of a contract photo, the one that goes to ZMAdmin: the sheet cut out and straightened by the
 * corners Claude found, shadows and the grey cast of the paper taken out, so the paper is white and the ink stands
 * out. Colors stay: the office should still see blue pen. Without usable corners only the paper is whitened.
 * All on the phone, on a canvas: no extra library, and the edge functions have little CPU to spare.
 */
export async function enhanceScan(photo: Blob, corners: ScanCorners | null): Promise<File> {
  const bitmap = await createImageBitmap(photo)
  const source = toImageData(bitmap, bitmap.width, bitmap.height)
  bitmap.close()

  const quad = corners && usableCorners(corners, source.width, source.height)
  const straight = quad ? warp(source, quad) : source
  whiten(straight)

  const canvas = document.createElement("canvas")
  canvas.width = straight.width
  canvas.height = straight.height
  canvas.getContext("2d")!.putImageData(straight, 0, 0)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Foto verwerken mislukt"))),
      "image/jpeg",
      0.85,
    ),
  )
  return new File([blob], "scan.jpg", { type: "image/jpeg" })
}

type Quad = [ScanPoint, ScanPoint, ScanPoint, ScanPoint]

/**
 * The corners in pixels when they make a sheet worth cutting out: four corners in order around a convex shape that
 * covers a fair part of the photo. Anything else (a guess gone wrong) is null, and the photo is not cut.
 */
export function usableCorners(corners: ScanCorners, width: number, height: number): Quad | null {
  const quad = corners.map(({ x, y }) => ({ x: x * width, y: y * height })) as Quad
  // Convex and in one direction around: every turn has the same sign.
  const turns = quad.map((point, i) => {
    const next = quad[(i + 1) % 4]
    const after = quad[(i + 2) % 4]
    return (next.x - point.x) * (after.y - next.y) - (next.y - point.y) * (after.x - next.x)
  })
  if (!turns.every((turn) => turn > 0) && !turns.every((turn) => turn < 0)) return null
  // Shoelace: at least a fifth of the photo.
  const area = Math.abs(quad.reduce((sum, p, i) => sum + p.x * quad[(i + 1) % 4].y - quad[(i + 1) % 4].x * p.y, 0)) / 2
  return area >= 0.2 * width * height ? quad : null
}

/**
 * The 3×3 projective transform (row-major, last entry 1) that takes the four points `from` to the four points `to`.
 * Used from the straight output back to the photo, so every output pixel looks up where it comes from.
 */
export function homography(from: Quad, to: Quad): number[] {
  // Eight equations, eight unknowns: for each pair x' = (ax + by + c) / (gx + hy + 1), likewise y'.
  const rows: number[][] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i]
    const { x: u, y: v } = to[i]
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
  }
  return [...solve(rows), 1]
}

/** Applies a homography to a point. */
export function project(matrix: number[], x: number, y: number): ScanPoint {
  const w = matrix[6] * x + matrix[7] * y + matrix[8]
  return { x: (matrix[0] * x + matrix[1] * y + matrix[2]) / w, y: (matrix[3] * x + matrix[4] * y + matrix[5]) / w }
}

/** Gauss-Jordan elimination with partial pivoting on an augmented matrix; returns the solution. */
function solve(rows: number[][]): number[] {
  const n = rows.length
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row
    ;[rows[col], rows[pivot]] = [rows[pivot], rows[col]]
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = rows[row][col] / rows[col][col]
      for (let k = col; k <= n; k++) rows[row][k] -= factor * rows[col][k]
    }
  }
  return rows.map((row, i) => row[n] / row[i])
}

const distance = (a: ScanPoint, b: ScanPoint) => Math.hypot(a.x - b.x, a.y - b.y)

/** Cuts the sheet out of the photo, upright, as large as its longest edges. */
function warp(source: ImageData, quad: Quad): ImageData {
  const [tl, tr, br, bl] = quad
  const width = Math.round(Math.max(distance(tl, tr), distance(bl, br)))
  const height = Math.round(Math.max(distance(tl, bl), distance(tr, br)))
  const rect: Quad = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
  const matrix = homography(rect, quad)
  const out = new ImageData(width, height)
  const src = source.data
  const dst = out.data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { x: sx, y: sy } = project(matrix, x + 0.5, y + 0.5)
      // Bilinear: the four nearest source pixels, weighted.
      const fx = Math.min(source.width - 1.001, Math.max(0, sx - 0.5))
      const fy = Math.min(source.height - 1.001, Math.max(0, sy - 0.5))
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const ax = fx - x0
      const ay = fy - y0
      const i00 = (y0 * source.width + x0) * 4
      const i01 = i00 + 4
      const i10 = i00 + source.width * 4
      const i11 = i10 + 4
      const o = (y * width + x) * 4
      for (let c = 0; c < 3; c++) {
        const top = src[i00 + c] * (1 - ax) + src[i01 + c] * ax
        const bottom = src[i10 + c] * (1 - ax) + src[i11 + c] * ax
        dst[o + c] = top * (1 - ay) + bottom * ay
      }
      dst[o + 3] = 255
    }
  }
  return out
}

// Ink darker than this share of the paper becomes as dark as it gets; paper lighter than WHITE_AT becomes white.
const INK_AT = 0.2
const WHITE_AT = 0.88
/** Blocks per short side when estimating the paper's own color: smaller than a shadow, larger than a letter. */
const BLOCKS = 40

/**
 * Divides every pixel by the paper's color around it, so shadows and a grey or yellow cast go and the paper turns
 * white, then stretches the contrast. The paper's color is the brightest pixel per block (letters are darker than
 * the paper, so they drop out), smoothed over the neighbouring blocks.
 */
function whiten(image: ImageData) {
  const { width, height, data } = image
  const block = Math.max(8, Math.round(Math.min(width, height) / BLOCKS))
  const cols = Math.ceil(width / block)
  const rows = Math.ceil(height / block)
  const brightest = new Float32Array(cols * rows * 3)
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / block) * cols
    for (let x = 0; x < width; x++) {
      const b = (row + Math.floor(x / block)) * 3
      const i = (y * width + x) * 4
      for (let c = 0; c < 3; c++) if (data[i + c] > brightest[b + c]) brightest[b + c] = data[i + c]
    }
  }
  // A 3×3 average over the blocks, so a single dark block (a photo, a logo) does not darken its paper.
  const paper = new Float32Array(brightest.length)
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0
        let count = 0
        for (let dr = -1; dr <= 1; dr++) {
          for (let dk = -1; dk <= 1; dk++) {
            const rr = r + dr
            const kk = k + dk
            if (rr < 0 || rr >= rows || kk < 0 || kk >= cols) continue
            sum += brightest[(rr * cols + kk) * 3 + c]
            count++
          }
        }
        paper[(r * cols + k) * 3 + c] = Math.max(1, sum / count)
      }
    }
  }
  for (let y = 0; y < height; y++) {
    // Bilinear between block centres, so no block edges show.
    const fy = Math.min(rows - 1, Math.max(0, y / block - 0.5))
    const r0 = Math.floor(fy)
    const r1 = Math.min(rows - 1, r0 + 1)
    const ay = fy - r0
    for (let x = 0; x < width; x++) {
      const fx = Math.min(cols - 1, Math.max(0, x / block - 0.5))
      const k0 = Math.floor(fx)
      const k1 = Math.min(cols - 1, k0 + 1)
      const ax = fx - k0
      const i = (y * width + x) * 4
      for (let c = 0; c < 3; c++) {
        const background =
          (paper[(r0 * cols + k0) * 3 + c] * (1 - ax) + paper[(r0 * cols + k1) * 3 + c] * ax) * (1 - ay) +
          (paper[(r1 * cols + k0) * 3 + c] * (1 - ax) + paper[(r1 * cols + k1) * 3 + c] * ax) * ay
        const ratio = data[i + c] / background
        data[i + c] = Math.round(255 * Math.min(1, Math.max(0, (ratio - INK_AT) / (WHITE_AT - INK_AT))))
      }
    }
  }
}

function toImageData(bitmap: ImageBitmap, width: number, height: number): ImageData {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true })!
  context.drawImage(bitmap, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}
