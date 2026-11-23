const MAX_EDGE = 2000
/** Below Claude's 5 MB image limit: a photo this small may go as taken when it cannot be shrunk on the phone. */
const MAX_UNSHRUNK_BYTES = 4_500_000
const SENDABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

/** Downscales a camera photo to a JPEG that fits comfortably within Claude's image limits. */
export async function prepareScanImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    return await drawToJpeg(bitmap, bitmap.width, bitmap.height)
  } finally {
    bitmap.close()
  }
}

/**
 * The same through an <img>: another decoder in Safari, for when createImageBitmap fails on a photo.
 */
export async function prepareScanImageViaElement(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return await drawToJpeg(image, image.naturalWidth, image.naturalHeight)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** The photo as taken, when it can go to Claude like that; null when it is too large or of another kind. */
export function unshrunkPhoto(file: File): File | null {
  return SENDABLE_TYPES.has(file.type) && file.size <= MAX_UNSHRUNK_BYTES ? file : null
}

async function drawToJpeg(source: CanvasImageSource, width: number, height: number): Promise<File> {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const canvas = document.createElement("canvas")
  try {
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext("2d")
    if (!context) throw new Error(`No 2d canvas for ${canvas.width}x${canvas.height}`)
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = await canvasToJpeg(canvas, 0.85)
    return new File([blob], "scan.jpg", { type: "image/jpeg" })
  } finally {
    releaseCanvas(canvas)
  }
}

/** A canvas as JPEG; Safari gives null instead of an error when the canvas is too large for it. */
export function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error(`toBlob gave nothing for ${canvas.width}x${canvas.height}`)),
      "image/jpeg",
      quality,
    ),
  )
}

/**
 * Frees a canvas's memory now. Safari keeps it until garbage collection and refuses new canvases once its total
 * canvas memory is used up, which a few full-size photos in a row can do.
 */
export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0
  canvas.height = 0
}
