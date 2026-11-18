import { SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDay } from "../dashboard/periods"
import type { Release } from "./changelog"

type Props = { releases: Release[]; onClose: () => void }

/** What changed in the app, newest first, in a few plain sentences per change. */
export function WhatsNewDialog({ releases, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" /> Wat is er nieuw
          </DialogTitle>
          <DialogDescription>De app is bijgewerkt. Dit is er veranderd.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {releases.map((release) => (
            <section key={release.id} className="flex flex-col gap-3">
              {releases.length > 1 && (
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {formatDay(release.date)} {release.date.slice(0, 4)}
                </h3>
              )}
              <ul className="flex flex-col gap-3">
                {release.changes.map((change) => (
                  <li key={change.title} className="flex flex-col gap-0.5">
                    <span className="font-medium">{change.title}</span>
                    <span className="text-sm text-muted-foreground">{change.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <DialogFooter>
          <Button className="h-12 w-full sm:w-auto" onClick={onClose}>
            Begrepen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
