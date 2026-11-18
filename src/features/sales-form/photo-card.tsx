import { CameraIcon, TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormSection } from "./sections/form-section"

type Props = {
  /** The photo on the phone; null for a form whose photo was uploaded by an earlier app version. */
  url: string | null
  /** Claude found the handwriting faint (e.g. pencil): the fields need an extra careful check. */
  faintWriting: boolean
  disabled: boolean
  onRetake: () => void
}

/**
 * At the top of the form: the contract photo it was filled in from, and a new one if this one is not right. Whether
 * it has been uploaded yet is the app's business, not the werver's: it goes with the form either way.
 */
export function PhotoCard({ url, faintWriting, disabled, onRetake }: Props) {
  return (
    <FormSection title="Contractfoto">
      <div className="flex items-center justify-between gap-3">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Foto groot bekijken">
            <img src={url} alt="Foto van het contract" className="h-20 w-16 rounded-md border object-cover" />
          </a>
        ) : (
          <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-md border bg-muted">
            <CameraIcon className="size-5 text-muted-foreground" />
          </div>
        )}
        <Button type="button" variant="outline" className="shrink-0" disabled={disabled} onClick={onRetake}>
          <CameraIcon /> Opnieuw
        </Button>
      </div>
      {faintWriting && (
        <p className="flex items-start gap-2 rounded-md bg-amber-500/15 p-3 text-sm text-amber-800 dark:text-amber-300">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          Het handschrift is vaag, bijvoorbeeld potlood. Controleer alle velden extra goed met het contract.
        </p>
      )}
    </FormSection>
  )
}
