import { useCallback, useEffect, useRef, useState } from "react"
import { loadScanPhoto, saveScanPhoto } from "./scan-photo-store"

type Shown = { rowId: string; photo: Blob | null; url: string | null }

/**
 * The contract photo kept on the phone for the form being filled in (see scan-photo-store), and a URL to show it.
 * `loaded` is false until it has been looked up, so the camera screen does not flash for a form that has a photo.
 */
export function useContractPhoto(rowId: string) {
  const [shown, setShown] = useState<Shown | null>(null)
  // The URL on screen, freed when another photo takes its place.
  const shownUrl = useRef<string | null>(null)

  const show = useCallback((next: Shown) => {
    if (shownUrl.current) URL.revokeObjectURL(shownUrl.current)
    shownUrl.current = next.url
    setShown(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadScanPhoto(rowId).then((photo) => {
      if (!cancelled) show({ rowId, photo: photo ?? null, url: photo ? URL.createObjectURL(photo) : null })
    })
    return () => {
      cancelled = true
    }
  }, [rowId, show])

  const save = useCallback(
    async (photo: Blob) => {
      await saveScanPhoto(rowId, photo)
      show({ rowId, photo, url: URL.createObjectURL(photo) })
    },
    [rowId, show],
  )

  const current = shown?.rowId === rowId ? shown : null
  return { loaded: current !== null, photo: current?.photo ?? null, url: current?.url ?? null, save }
}
