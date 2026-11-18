import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  EXTRACTABLE_FIELDS,
  type ExtractableField,
  type ExtractedFields,
  type FormInput,
  type ScanProblem,
  type ScanResponse,
} from "@shared/form-schema"
import { readScan, uploadScan } from "@/lib/api"
import { getErrorMessage, isRetryable } from "@/lib/errors"
import { scannedDateDiffers } from "./contract-date"
import type { SalesFormApi } from "./form-types"
import { normalizeNaam, type NaamCorrection } from "./naam"
import { photoProblem, type PhotoProblem } from "./photo-quality"
import { enhanceScan } from "./scan-enhance"
import { prepareScanImage } from "./scan-image"

// Fill animation: text fields are "typed" character by character, pickers are set at once.
const TYPE_CHAR_MS = 22
const MAX_TYPE_FIELD_MS = 450
const PICKER_STEP_MS = 120
// A date input only accepts a complete date, so it cannot be typed character by character either.
const PICKER_FIELDS = new Set<ExtractableField>([
  "datum",
  "geslacht",
  "landcode",
  "landcode2",
  "contractType",
  "betaalperiode",
])
/** From this many turned-down photos of one form on, the recruiter may use one anyway: the check can be wrong. */
const USE_ANYWAY_AFTER = 2

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A photo that was turned down: why, and whether it may be used anyway. */
export type ScanRejection = { problem: PhotoProblem | ScanProblem; canUseAnyway: boolean }

/**
 * Camera scan, the start of every form. The photo is checked on the phone (nothing readable at all), then read by
 * Claude, which also judges whether the printed text is readable and finds the corners of the sheet. A photo that is
 * not readable is turned down (`rejection`) and the recruiter takes another. A readable one is typed into the form,
 * top to bottom, and its scanner-style copy is kept with the form (`savePhoto`) and uploaded (`scanPath`).
 * Offline, or when reading fails, the photo is still kept and the recruiter fills the form in by hand; it is uploaded
 * when the form is sent (withUploadedPhoto).
 * `phase` drives the blocking overlay: "reading" shows a spinner, "filling" only blocks input. The scanned name gets
 * the same capitalization fix as a typed one; `naamCorrection` lets the field offer undo. A date on the form that is
 * not today is put to the recruiter (`scannedDate`) right away, while the paper is still in hand.
 */
export function useScanFill(form: SalesFormApi, userId: string, savePhoto: (photo: Blob) => Promise<void>) {
  const [phase, setPhase] = useState<"reading" | "filling" | null>(null)
  const [naamCorrection, setNaamCorrection] = useState<NaamCorrection | null>(null)
  const [scannedDate, setScannedDate] = useState<string | null>(null)
  const [rejection, setRejection] = useState<ScanRejection | null>(null)
  // What "use anyway" continues with, and how many photos of which form were turned down.
  const pending = useRef<(() => Promise<void>) | null>(null)
  const rejected = useRef({ rowId: "", count: 0 })
  // The newest scan; an upload of an older one must not set the form's scanPath.
  const latest = useRef(0)

  async function scan(file: File) {
    setRejection(null)
    setNaamCorrection(null)
    await run(async () => {
      const photo = await prepareScanImage(file)
      const problem = await photoProblem(photo)
      if (problem) return reject(problem, () => read(photo))
      await read(photo)
    })
  }

  /** The turned-down photo after all, from where it was stopped. */
  async function acceptAnyway() {
    const next = pending.current
    pending.current = null
    setRejection(null)
    if (next) await run(next)
  }

  function dismissRejection() {
    pending.current = null
    setRejection(null)
  }

  async function run(step: () => Promise<void>) {
    setPhase("reading")
    try {
      await step()
    } catch (error) {
      toast.error(getErrorMessage(error, "Foto verwerken mislukt"))
    } finally {
      setPhase(null)
    }
  }

  function reject(problem: PhotoProblem | ScanProblem, next: () => Promise<void>) {
    const rowId = form.getValues("rowId")
    rejected.current = { rowId, count: rejected.current.rowId === rowId ? rejected.current.count + 1 : 1 }
    pending.current = next
    setRejection({ problem, canUseAnyway: rejected.current.count >= USE_ANYWAY_AFTER })
  }

  async function read(photo: File) {
    if (!navigator.onLine) return keepUnread(photo, null)
    let result: ScanResponse
    try {
      result = await readScan(userId, photo)
    } catch (error) {
      return keepUnread(photo, isRetryable(error) ? null : error)
    }
    if (result.problem) return reject(result.problem, () => apply(photo, result))
    await apply(photo, result)
  }

  /** Keeps a photo that could not be read (offline: `error` null), for the recruiter to fill the form in by hand. */
  async function keepUnread(photo: File, error: unknown) {
    latest.current++
    await savePhoto(await enhanceScan(photo, null))
    form.setValue("scanPath", "", { shouldDirty: true })
    if (error === null) {
      toast.info("Geen verbinding: de foto is bewaard en gaat mee met het formulier. Vul het zelf in.")
    } else {
      toast.error(
        `${getErrorMessage(error, "Uitlezen van de foto is mislukt")}. De foto is bewaard; vul het formulier zelf in.`,
      )
    }
  }

  async function apply(photo: File, { fields, mock, corners }: ScanResponse) {
    const scan = ++latest.current
    const rowId = form.getValues("rowId")
    const copy = await enhanceScan(photo, corners)
    await savePhoto(copy)
    form.setValue("scanPath", "", { shouldDirty: true })
    // Uploaded right away so sending is quick; if this fails, it goes up when the form is sent.
    void uploadScan(userId, copy)
      .then((path) => {
        if (path && latest.current === scan && form.getValues("rowId") === rowId) {
          form.setValue("scanPath", path, { shouldDirty: true })
        }
      })
      .catch((error: unknown) => console.warn("Uploading the scan copy failed; it goes with the form", error))
    setPhase("filling")
    await typeIntoForm(fields)
    if (scannedDateDiffers(fields.datum)) setScannedDate(fields.datum)
    if (mock) toast.info("Demo: voorbeeldgegevens ingevuld (Claude is nog niet gekoppeld)")
    else toast.success("Formulier ingevuld — controleer de gegevens")
  }

  async function typeIntoForm(fields: ExtractedFields) {
    const filled: ExtractableField[] = []
    for (const name of EXTRACTABLE_FIELDS) {
      let value = fields[name]
      if (value === undefined) continue
      if (name === "naam" && normalizeNaam(value) !== value) {
        setNaamCorrection({ typed: value, corrected: normalizeNaam(value) })
        value = normalizeNaam(value)
      }
      if (name === "email") form.setValue("perPost", false)
      if (name === "ibanTnv") form.setValue("ibanTnvZelfde", false)
      filled.push(name)
      highlight(name)

      if (PICKER_FIELDS.has(name)) {
        setField(name, value)
        await sleep(PICKER_STEP_MS)
      } else {
        const perChar = Math.min(TYPE_CHAR_MS, MAX_TYPE_FIELD_MS / value.length)
        for (let i = 1; i <= value.length; i++) {
          setField(name, value.slice(0, i))
          await sleep(perChar)
        }
      }
      setField(name, value)
    }
    await form.trigger(filled)
  }

  /**
   * Sets one extracted field. The loop iterates over a union of field names, which TypeScript cannot correlate
   * with the matching value type; the values were validated against the same schema on the server.
   */
  function setField(name: ExtractableField, value: string) {
    form.setValue(name, value as FormInput[typeof name], { shouldDirty: true })
  }

  /** The recruiter's answer: the date stays as read, or the form gets `date` instead. */
  function resolveScannedDate(date?: string) {
    if (date) form.setValue("datum", date, { shouldDirty: true, shouldValidate: true })
    setScannedDate(null)
  }

  return {
    phase,
    naamCorrection,
    scan,
    scannedDate,
    resolveScannedDate,
    rejection,
    acceptAnyway,
    dismissRejection,
  }
}

function highlight(name: ExtractableField) {
  document
    .querySelector(`[data-field="${name}"]`)
    ?.animate(
      [{ backgroundColor: "color-mix(in oklab, var(--primary) 15%, transparent)" }, { backgroundColor: "transparent" }],
      { duration: 900, easing: "ease-out" },
    )
}
