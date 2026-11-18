import { ArrowLeftIcon } from "lucide-react"
import { AppMenu } from "@/components/app-menu"
import { HEADER_BUTTON_CLASS, PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

type Props = {
  /** Set when the form was opened from a door marked "Verkocht": back to walking. */
  onBack?: () => void
}

/**
 * Header of the form page: back to walking when it came from there, logo and, as on every page, the menu. The photo
 * is taken from the page itself: "Maak foto" on the camera screen, "Opnieuw" on the form.
 */
export function FormHeader({ onBack }: Props) {
  return (
    <PageHeader
      start={
        onBack ? (
          <Button variant="ghost" size="icon" className={HEADER_BUTTON_CLASS} aria-label="Terug" onClick={onBack}>
            <ArrowLeftIcon />
          </Button>
        ) : (
          // As wide as the menu button, so the logo stays in the middle.
          <span aria-hidden className="size-8 shrink-0" />
        )
      }
      title={
        // Same treatment as the footer on zekerenmobiel.nl: the color logo rendered white. It shrinks before the
        // buttons do when the back button leaves less room.
        <img
          src="/logo.png"
          alt="Zeker & Mobiel — Z&M Sales"
          className="h-6 w-auto max-w-full object-contain brightness-0 invert"
        />
      }
      end={<AppMenu />}
    />
  )
}
