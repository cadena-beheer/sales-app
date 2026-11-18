import { Children, useState, type ReactNode } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  /** How many rows show before "Toon alle". */
  limit: number
  className?: string
  /** The rows, as `li`s. */
  children: ReactNode
}

/** A list that starts with its first rows, so it is clear it is there. Stays open when another period is chosen. */
export function ShowMore({ limit, className, children }: Props) {
  const [open, setOpen] = useState(false)
  const rows = Children.toArray(children)
  return (
    <div className="flex flex-col gap-1">
      <ul className={className}>{open ? rows : rows.slice(0, limit)}</ul>
      {rows.length > limit && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2.5 self-start text-muted-foreground"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "Toon minder" : `Toon alle ${rows.length}`}
          <ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      )}
    </div>
  )
}
