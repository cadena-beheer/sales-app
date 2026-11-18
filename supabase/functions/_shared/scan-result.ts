import {
  EXTRACTABLE_FIELDS,
  normalizeIban,
  type ExtractableField,
  type ExtractedFields,
  type Extraction,
  type ScanCorners,
  type ScanReading,
} from "./form-schema.ts"

// Read too unreliably from handwriting to trust: only returned for recruiters with profiles.scan_contact_fields on.
// The second number's country code goes with it.
export const CONTACT_FIELDS: readonly ExtractableField[] = ["naam", "telefoon", "landcode2", "telefoon2"]
// Never returned: the app's address lookup derives them from postcode and huisnummer.
export const LOOKED_UP_FIELDS: readonly ExtractableField[] = ["straat", "plaats"]

/**
 * What the app gets from a scan: the fields Claude read, cleaned up, minus the ones this recruiter may not have
 * filled in. Withheld fields are not in the answer at all, so every app version leaves them for the recruiter.
 */
export function toScanResult(extraction: Extraction, scanContactFields: boolean): ExtractedFields {
  const withheld = new Set(scanContactFields ? LOOKED_UP_FIELDS : [...LOOKED_UP_FIELDS, ...CONTACT_FIELDS])
  const fields = normalize(extraction)
  for (const key of withheld) delete fields[key]
  return fields
}

/** Cleans up what was read into the shape the form expects, and drops empty (not found) values. */
function normalize(extraction: Extraction): ExtractedFields {
  const cleaned: Extraction = {
    ...extraction,
    huisnummer: extraction.huisnummer.replace(/\D/g, ""),
    telefoon: cleanPhone(extraction.telefoon),
    telefoon2: cleanPhone(extraction.telefoon2),
    landcode2: cleanLandcode(extraction.landcode2),
    iban: normalizeIban(extraction.iban),
    landcode: cleanLandcode(extraction.landcode),
    datum: isRealDate(extraction.datum.trim()) ? extraction.datum.trim() : "",
  }
  const fields: Record<string, string> = {}
  for (const key of EXTRACTABLE_FIELDS) {
    const value = cleaned[key].trim()
    if (value) fields[key] = value
  }
  return fields as ExtractedFields
}

function cleanPhone(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+/, "")
}

function cleanLandcode(value: string): string {
  return /^\+\d{1,4}$/.test(value.trim()) ? value.trim() : ""
}

/** yyyy-MM-dd that exists on the calendar (no 31 June), so the form's date field accepts it. */
function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/**
 * The corners of the paper as the app uses them, or null when Claude found none or gave something that is not a
 * fraction of the photo (e.g. pixels). Slightly outside the photo is clamped: the paper may run off the edge.
 */
export function toScanCorners(hoeken: ScanReading["hoeken"]): ScanCorners | null {
  if (!hoeken) return null
  const points = [hoeken.linksboven, hoeken.rechtsboven, hoeken.rechtsonder, hoeken.linksonder]
  const fractions = points.every(
    ({ x, y }) => Number.isFinite(x) && Number.isFinite(y) && x >= -0.1 && x <= 1.1 && y >= -0.1 && y <= 1.1,
  )
  if (!fractions) return null
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  return points.map(({ x, y }) => ({ x: clamp(x), y: clamp(y) })) as ScanCorners
}
