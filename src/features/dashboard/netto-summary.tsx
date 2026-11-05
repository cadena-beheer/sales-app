import { cn } from "@/lib/utils"
import {
  addDays,
  bonusStages,
  COUNTED_DAYS,
  countedAfval,
  formatDay,
  formatRate,
  nettoOf,
  periodTitle,
  type Period,
} from "./periods"

type Props = {
  period: Period
  /** The calendar month this period counts towards for the bonus; null when there is none, as for the team. */
  bonusMonth: BonusMonth | null
}

type BonusMonth = {
  period: Period
  /** The month is still running, so sales can still be added. */
  running: boolean
  /** Every sale of the month is past the days that count, so afval can no longer change it. */
  final: boolean
}

/**
 * The numbers that matter side by side, with one bar: netto, then the afval that counts. For a month the bar's outline
 * ends at the next bonus, so what is empty is what is missing; afval beyond it is cut off. A week is only part of that,
 * so there the bar is the bruto number, and the bonus number says which month it is about.
 */
export function NettoSummary({ period, bonusMonth }: Props) {
  const netto = nettoOf(period)
  const afval = countedAfval(period)
  const bonus = bonusMonth ? bonusKpi(bonusMonth) : null
  const target = bonusMonth?.period.key === period.key ? bonusStages(netto).next : null
  const scale = target ?? Math.max(1, period.sold)
  const parts = [
    { count: netto, color: "bg-netto" },
    { count: period.counted.opgezegd, color: "bg-opgezegd" },
    { count: period.counted.bank, color: "bg-bankafval" },
  ].filter((part) => part.count > 0)

  return (
    <div className="flex flex-col gap-3">
      <dl className={cn("grid gap-3", bonus ? "grid-cols-3" : "grid-cols-2")}>
        <Kpi label="Netto" swatch="bg-netto" value={netto} note={`van ${period.sold} bruto`} />
        <Kpi
          label={`Afval ≤${COUNTED_DAYS}d`}
          swatch="bg-opgezegd"
          value={formatRate(period.sold > 0 ? afval / period.sold : null)}
          note={`${afval} van ${period.sold}`}
        />
        {bonus && (
          <Kpi
            label={target === null ? `Bonus ${bonus.month}` : "Bonus"}
            value={bonus.value}
            note={bonus.note}
            alignEnd
          />
        )}
      </dl>
      <div aria-hidden className="flex h-3.5 overflow-hidden rounded-[4px] border-[1.5px] border-netto">
        {parts.map((part) => (
          <div
            key={part.color}
            className={cn("shrink-0", part.color)}
            style={{ width: `${(part.count / scale) * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}

type KpiProps = { label: string; swatch?: string; value: string | number; note: string; alignEnd?: boolean }

function Kpi({ label, swatch, value, note, alignEnd }: KpiProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", alignEnd && "text-right")}>
      <dt className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", alignEnd && "justify-end")}>
        {swatch && <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${swatch}`} />}
        {label}
      </dt>
      <dd className="flex flex-col gap-1">
        <span className="text-4xl leading-none font-medium tabular-nums sm:text-5xl">{value}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{note}</span>
      </dd>
    </div>
  )
}

/** The number that matters for the bonus right now, and what it says. */
function bonusKpi({ period, running, final }: BonusMonth) {
  const netto = nettoOf(period)
  const { reached, next } = bonusStages(netto)
  const month = periodTitle(period, "month").split(" ")[0]
  if (reached === null) {
    return {
      month,
      value: next - netto,
      note: `nodig voor de ${next} netto bonus`,
    }
  }
  if (running) {
    return { month, value: next - netto, note: `nodig voor de ${next} netto bonus (${reached} gehaald)` }
  }
  const finalOn = final ? "" : `, definitief na ${formatDay(addDays(period.end, COUNTED_DAYS))}`
  return { month, value: reached, note: `netto bonus gehaald${finalOn}` }
}
