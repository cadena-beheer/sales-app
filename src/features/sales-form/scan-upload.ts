import type { FormInput } from "@shared/form-schema"
import { uploadScan } from "@/lib/api"
import { loadScanPhoto } from "./scan-photo-store"

/**
 * The form as it can be sent: with a photo that is only on the phone (taken offline, or its upload failed) uploaded
 * first. Throws like any request when that cannot be done right now, so the form stays in the outbox.
 */
export async function withUploadedPhoto(userId: string, values: FormInput): Promise<FormInput> {
  if (values.scanPath) return values
  const photo = await loadScanPhoto(values.rowId)
  if (!photo) return values
  return { ...values, scanPath: await uploadScan(userId, photo) }
}
