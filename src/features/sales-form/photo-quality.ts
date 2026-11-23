import { releaseCanvas } from "./scan-image"

/**
 * A quick look at a photo on the phone, before it is uploaded: only photos on which nothing can be read are caught
 * here (almost black, washed out, or one flat grey). Whether the printed text of the form can be read is up to
 * Claude, which sees far more; this check only saves the wait for the obvious cases, also offline.
 */
export type PhotoProblem = "te_donker" | "te_licht" | "geen_contrast"

export type Luminance = {
  /** Average brightness, 0..255. */
  mean: number
  /** Spread of the brightness: text on paper gives a lot, a flat surface little. */
  spread: number
  /** Share of the pixels that are nearly black, and nearly white. */
  dark: number
  bright: number
}

/** Pixels per side of the copy the photo is measured on: enough for brightness, fast on any phone. */
const SAMPLE_EDGE = 256

/** Brightness of RGBA pixel data (as from a canvas). */
export function measureLuminance(pixels: Uint8ClampedArray): Luminance {
  const count = pixels.length / 4
  let sum = 0
  let squares = 0
  let dark = 0
  let bright = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const value = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    sum += value
    squares += value * value
    if (value < 25) dark++
    if (value > 245) bright++
  }
  const mean = sum / count
  return {
    mean,
    spread: Math.sqrt(Math.max(0, squares / count - mean * mean)),
    dark: dark / count,
    bright: bright / count,
  }
}

/**
 * What is wrong with a photo by its brightness alone, or null. Deliberately lenient: a contract on a dark table is
 * fine, so only a photo that is dark or white nearly everywhere is turned down.
 */
export function luminanceProblem({ mean, spread, dark, bright }: Luminance): PhotoProblem | null {
  if (mean < 45 || dark > 0.85) return "te_donker"
  if (mean > 240 || bright > 0.85) return "te_licht"
  if (spread < 12) return "geen_contrast"
  return null
}

/** Measures a photo on a small copy and says what is wrong with it, or null. */
export async function photoProblem(photo: Blob): Promise<PhotoProblem | null> {
  const bitmap = await createImageBitmap(photo)
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  try {
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) throw new Error(`No 2d canvas for ${canvas.width}x${canvas.height}`)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return luminanceProblem(measureLuminance(context.getImageData(0, 0, canvas.width, canvas.height).data))
  } finally {
    bitmap.close()
    releaseCanvas(canvas)
  }
}
