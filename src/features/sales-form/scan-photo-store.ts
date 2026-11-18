import { del, get, set } from "idb-keyval"
import { appStore } from "@/lib/idb"

/**
 * The contract photo of a form, on the phone, until the form has been sent: the photo a form must have, also when it
 * was taken offline. Keyed by the form's rowId, so it stays with a form that waits in the outbox or is opened again
 * from it. The form's `scanPath` says whether (and where) it has been uploaded yet.
 */
const photoKey = (rowId: string) => `scan:${rowId}`

export const loadScanPhoto = (rowId: string) => get<Blob>(photoKey(rowId), appStore)
export const saveScanPhoto = (rowId: string, photo: Blob) => set(photoKey(rowId), photo, appStore)
export const deleteScanPhoto = (rowId: string) => del(photoKey(rowId), appStore)
