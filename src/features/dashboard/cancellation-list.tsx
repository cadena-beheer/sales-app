import type { SalesStatsBankAfval, SalesStatsCancellation } from "@shared/kpi"
import { daysBetween, formatDay } from "./periods"

type Props = {
  items: SalesStatsCancellation[]
  bank: SalesStatsBankAfval[]
  /** Admins also see after how many days each sale fell away. */
  showDays: boolean
}

type Line = {
  regNr: string
  name: string
  city: string
  soldOn: string
  on: string | null
  /** "opgezegd" or what happened at the bank, after the sale date. */
  what: string
  reason: string
  detail: string
  swatch: string
}

/** The recruiter's own sales that fell away, with what the customer or the bank said, so they can learn from them. */
export function CancellationList({ items, bank, showDays }: Props) {
  const lines: Line[] = [
    ...items.map((item) => ({ ...item, on: item.cancelledOn, what: "opgezegd", swatch: "bg-opgezegd" })),
    ...bank.map((item) => ({
      ...item,
      on: item.returnedOn,
      what: "niet betaald",
      detail: "",
      reason: `Bankafval · ${item.reason}`,
      swatch: "bg-bankafval",
    })),
  ].sort((a, b) => (b.on ?? "").localeCompare(a.on ?? ""))

  if (lines.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">Geen opzeggingen van verkopen in deze periode.</p>
  }
  return (
    <ul className="-my-2 divide-y">
      {lines.map((line, index) => (
        <li key={`${line.regNr}-${index}`} className="flex flex-col gap-1 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">
              {line.name || "Onbekende klant"}
              {line.city && <span className="font-normal text-muted-foreground"> · {line.city}</span>}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{line.regNr}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              <span aria-hidden className={`size-2 rounded-full ${line.swatch}`} />
              {line.reason}
            </span>
            {line.detail && <span className="text-sm text-foreground italic">“{line.detail}”</span>}
          </div>
          <span className="text-xs text-muted-foreground">
            Verkocht {formatDay(line.soldOn)}
            {line.on && ` · ${line.what} ${formatDay(line.on.slice(0, 10))}`}
            {showDays && line.on && (
              <strong className="font-medium text-foreground"> · na {daysBetween(line.soldOn, line.on)} dagen</strong>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
