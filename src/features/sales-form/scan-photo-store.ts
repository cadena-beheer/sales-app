import { del, get, set } from "idb-keyval"
import { appStore } from "@/lib/idb"
import { reportClientError } from "@/lib/report-error"

/**
 * The contract photo of a form, on the phone, until the form has been sent: the photo a form must have, also when it
 * was taken offline. Keyed by the form's rowId, so it stays with a form that waits in the outbox or is opened again
 * from it. The form's `scanPath` says whether (and where) it has been uploaded yet.
 * When IndexedDB will not take the photo (Safari in a private tab cannot store one there), it is kept in memory
 * instead: enough to send the form in this session, lost when the app is closed.
 */
const photoKey = (rowId: string) => `scan:${rowId}`
const inMemory = new Map<string, Blob>()

export async function loadScanPhoto(rowId: string): Promise<Blob | undefined> {
  const kept = inMemory.get(rowId)
  if (kept) return kept
  try {
    return await get<Blob>(photoKey(rowId), appStore)
  } catch (error) {
    reportClientError("scan.photo-load", error)
    return undefined
  }
}

/** Keeps the photo; false when it is only in memory, so it must be uploaded before the app is closed. */
export async function saveScanPhoto(rowId: string, photo: Blob): Promise<boolean> {
  try {
    await set(photoKey(rowId), photo, appStore)
    inMemory.delete(rowId)
    return true
  } catch (error) {
    reportClientError("scan.photo-save", error, { size: photo.size, type: photo.type })
    inMemory.set(rowId, photo)
    return false
  }
}

export async function deleteScanPhoto(rowId: string) {
  inMemory.delete(rowId)
  await del(photoKey(rowId), appStore)
}
