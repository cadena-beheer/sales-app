import { useState, type ReactNode } from "react"
import { ChevronRightIcon } from "lucide-react"

type Props = {
  title: ReactNode
  children: ReactNode
}

/**
 * Details that stay closed until tapped. Stays open when another period is chosen. What is inside only renders once
 * open, so it can do its own lookups.
 */
export function Fold({ title, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <details className="group" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 font-medium">{title}</span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      {open && <div className="pt-3">{children}</div>}
    </details>
  )
}
