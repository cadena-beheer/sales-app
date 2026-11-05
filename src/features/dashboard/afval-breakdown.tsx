import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AFVAL_AGES, formatRate, isWindowComplete, type Period } from "./periods"
import { ShowMore } from "./show-more"

type Props = {
  period: Period
  showBank: boolean
  /** Whether ZMAdmin sends how long after the sale it fell away. */
  byAge: boolean
  enteredUntil: string | null
  reasons: { reason: string; count: number }[]
  /** When the reasons are only known for everything loaded, not for this period: then no share of this period's sales. */
  reasonsNote: string | null
  /** Cancellations with the reason "Verkeerd voorgelicht"; null when they are not known per period. */
  voorgelicht: number | null
  voorgelichtReason: string
}

/**
 * All the afval of one period, also what is too late to count against netto: the numbers, then when and why, each starting
 * with its first rows. Every percentage is a share of the bruto sales, so the rows of a block add up, and the bars are on one scale.
 */
export function AfvalBreakdown(props: Props) {
  const { period, showBank, byAge, enteredUntil, reasons, reasonsNote, voorgelicht, voorgelichtReason } = props
  const afval = period.cancelled + period.bank
  if (afval === 0) return <p className="py-2 text-sm text-muted-foreground">Geen afval in deze periode.</p>

  const share = (count: number) => formatRate(period.sold > 0 ? count / period.sold : null)
  const ages = AFVAL_AGES.map((age, step) => ({
    label: age.short,
    opgezegd: period.aged.opgezegd[step],
    bank: period.aged.bank[step],
    complete: isWindowComplete(period, Number.isFinite(age.upTo) ? age.upTo : 365, enteredUntil),
  }))
  // Whatever has no known date, such as a typo in ZMAdmin.
  const undated = afval - ages.reduce((sum, age) => sum + age.opgezegd + age.bank, 0)
  const others = reasons.filter((r) => r.reason !== voorgelichtReason)
  const reasonMax = reasonsNote ? Math.max(1, ...reasons.map((r) => r.count)) : afval

  return (
    <div className="flex flex-col divide-y [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label="Totaal" count={afval} share={share(afval)} />
        <Stat label="Opgezegd" swatch="bg-opgezegd" count={period.cancelled} share={share(period.cancelled)} />
        {showBank && <Stat label="Bankafval" swatch="bg-bankafval" count={period.bank} share={share(period.bank)} />}
        {voorgelicht !== null && (
          <Stat label={voorgelichtReason} swatch="bg-voorgelicht" count={voorgelicht} share={share(voorgelicht)} />
        )}
      </dl>

      {byAge && (
        <section className="flex flex-col gap-2.5">
          <h3 className="font-medium">Wanneer na de verkoop</h3>
          <Rows limit={2}>
            {ages.map((age) => (
              <Row
                key={age.label}
                label={age.label}
                note={share(age.opgezegd + age.bank)}
                count={age.opgezegd + age.bank}
                max={afval}
                faded={!age.complete}
              >
                <Bar color="bg-opgezegd" count={age.opgezegd} />
                <Bar color="bg-bankafval" count={age.bank} />
              </Row>
            ))}
            {undated > 0 && (
              <Row label="Onbekend" note={share(undated)} count={undated} max={afval}>
                <Bar color="bg-muted-foreground" count={undated} />
              </Row>
            )}
          </Rows>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <div>
          <h3 className="font-medium">Reden van opzeggen</h3>
          {reasonsNote && <p className="text-xs text-muted-foreground">{reasonsNote}</p>}
        </div>
        <Rows limit={3}>
          {voorgelicht !== null && (
            <Row label={voorgelichtReason} note={share(voorgelicht)} count={voorgelicht} max={reasonMax} strong>
              <Bar color="bg-voorgelicht" count={voorgelicht} />
            </Row>
          )}
          {others.map((r) => (
            <Row
              key={r.reason}
              label={r.reason}
              note={reasonsNote ? null : share(r.count)}
              count={r.count}
              max={reasonMax}
            >
              <Bar color="bg-opgezegd" count={r.count} />
            </Row>
          ))}
          {reasons.length === 0 && voorgelicht === null && (
            <li className="text-sm text-muted-foreground">Geen opzeggingen.</li>
          )}
        </Rows>
      </section>
    </div>
  )
}

type StatProps = { label: string; swatch?: string; count: number; share: string }

function Stat({ label, swatch, count, share }: StatProps) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {swatch && <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${swatch}`} />}
        {label}
      </dt>
      <dd className="flex items-baseline gap-2 tabular-nums">
        <span className="text-3xl leading-tight font-medium">{count}</span>
        <span className="text-base text-muted-foreground">{share}</span>
      </dd>
    </div>
  )
}

function Rows({ limit, children }: { limit: number; children: ReactNode }) {
  return (
    <ShowMore limit={limit} className="flex flex-col gap-2">
      {children}
    </ShowMore>
  )
}

type RowProps = {
  label: string
  count: number
  max: number
  /** A percentage after the count. */
  note: string | null
  /** A time that is not over yet for every sale of the period: it can still grow. */
  faded?: boolean
  strong?: boolean
  children: ReactNode
}

function Row({ label, count, max, note, faded, strong, children }: RowProps) {
  return (
    <li className={cn("grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-2 text-sm", faded && "opacity-60")}>
      <span className={cn("truncate", strong && "font-medium")} title={label}>
        {label}
      </span>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-r-[4px]" style={{ width: `${(count / max) * 100}%` }}>
        {children}
      </div>
      <span className="text-right text-muted-foreground tabular-nums">
        <strong className={cn("font-semibold text-foreground", count === 0 && "font-normal text-muted-foreground")}>
          {count}
        </strong>
        {note && ` · ${note}`}
      </span>
    </li>
  )
}

function Bar({ color, count }: { color: string; count: number }) {
  return count > 0 ? <div className={color} style={{ flexGrow: count }} /> : null
}
