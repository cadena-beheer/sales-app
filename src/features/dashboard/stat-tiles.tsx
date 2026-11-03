import { cn } from "@/lib/utils"
import { formatRate, uitvalRate, type Period } from "./periods"

/**
 * The selected period in numbers. The colored dots tie them to the chart. Bankafval shows only once ZMAdmin sends it;
 * without it nothing falls under it, so Netto and Uitval are the same.
 */
export function StatTiles({ period, showBank }: { period: Period; showBank: boolean }) {
  const tiles = [
    { label: "Bruto", value: String(period.sold) },
    { label: "Opgezegd", value: String(period.cancelled), swatch: "bg-opgezegd" },
    ...(showBank
      ? [
          {
            label: "Bankafval",
            value: String(period.bank),
            note: formatRate(period.sold > 0 ? period.bank / period.sold : null),
            swatch: "bg-bankafval",
          },
        ]
      : []),
    { label: "Netto", value: String(period.sold - period.cancelled - period.bank), swatch: "bg-netto" },
    { label: "Uitval", value: formatRate(uitvalRate(period)) },
  ]
  return (
    <dl className={cn("grid gap-2", showBank ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-4")}>
      {tiles.map((tile) => (
        <div key={tile.label} className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-muted px-2 py-2">
          <dt className="flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
            {tile.swatch && <span aria-hidden className={`size-2 shrink-0 rounded-full ${tile.swatch}`} />}
            {tile.label}
          </dt>
          <dd className="text-xl font-semibold tabular-nums">
            {tile.value}
            {tile.note && <span className="ml-1 text-xs font-normal text-muted-foreground">{tile.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
