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
 * The numbers that matter side by side, netto the largest, with one bar: netto, then the afval that counts. For a month
 * the bar's outline ends at the next bonus, so what is empty is what is missing; afval beyond it is cut off. A week is
 * only part of that, so there the bar is the bruto number, and the line under it says which month the bonus is about.
 */
export function NettoSummary({ period, bonusMonth }: Props) {
  const netto = nettoOf(period)
  const afval = countedAfval(period)
  const bonus = bonusMonth ? bonusLine(bonusMonth) : null
  const target = bonusMonth?.period.key === period.key ? bonusStages(netto).next : null
  const scale = target ?? Math.max(1, period.sold)
  const parts = [
    { count: netto, color: "bg-netto" },
    { count: period.counted.opgezegd, color: "bg-opgezegd" },
    { count: period.counted.bank, color: "bg-bankafval" },
  ].filter((part) => part.count > 0)

  return (
    <div className="flex flex-col gap-3">
      {/* By the card's width, not the screen's: on a large screen the card is only half of it. */}
      <div className="@container">
        <dl className="flex gap-2.5 [&>*]:grow [&>*:not(:first-child)]:border-l [&>*:not(:first-child)]:pl-2.5 @lg:gap-4 @lg:[&>*:not(:first-child)]:pl-4">
          <Kpi label="Netto" swatch="bg-netto" value={netto} size="text-[3.25rem] @lg:text-7xl" />
          <Kpi
            label={`Afval ≤${COUNTED_DAYS}d`}
            swatch="bg-opgezegd"
            value={formatRate(period.sold > 0 ? afval / period.sold : null)}
            size="text-4xl @lg:text-5xl"
            count={afval}
          />
          <Kpi label="Bruto" value={period.sold} size="text-3xl @lg:text-[2rem]" />
        </dl>
      </div>
      <div aria-hidden className="flex h-3.5 overflow-hidden rounded-[4px] border-[1.5px] border-netto">
        {parts.map((part) => (
          <div
            key={part.color}
            className={cn("shrink-0", part.color)}
            style={{ width: `${(part.count / scale) * 100}%` }}
          />
        ))}
      </div>
      {bonus && (
        <p className="text-base text-muted-foreground">
          {target === null && `Bonus ${bonus.month}: `}
          <span className="text-foreground tabular-nums">{bonus.value}</span> {bonus.note}
        </p>
      )}
    </div>
  )
}

const NUMBER = "leading-none tabular-nums"

type KpiProps = {
  label: string
  swatch?: string
  value: string | number
  size: string
  /** The count a percentage is about, trailing it. */
  count?: number
}

function Kpi({ label, swatch, value, size, count }: KpiProps) {
  return (
    <div className="flex flex-col justify-between gap-1.5">
      <dt className="flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground">
        {swatch && <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${swatch}`} />}
        {label}
      </dt>
      <dd className="flex items-baseline gap-1.5">
        <span className={cn(NUMBER, size)}>{value}</span>
        {count !== undefined && (
          <span className={cn(NUMBER, "text-xl text-muted-foreground @lg:text-2xl")}>{count}</span>
        )}
      </dd>
    </div>
  )
}

/** The number that matters for the bonus right now, and what it says. */
function bonusLine({ period, running, final }: BonusMonth) {
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
