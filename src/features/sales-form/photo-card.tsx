import { CameraIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormSection } from "./sections/form-section"

type Props = {
  /** The photo on the phone; null for a form whose photo was uploaded by an earlier app version. */
  url: string | null
  disabled: boolean
  onRetake: () => void
}

/**
 * At the top of the form: the contract photo it was filled in from, and a new one if this one is not right. Whether
 * it has been uploaded yet is the app's business, not the werver's: it goes with the form either way.
 */
export function PhotoCard({ url, disabled, onRetake }: Props) {
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
    </FormSection>
  )
}
