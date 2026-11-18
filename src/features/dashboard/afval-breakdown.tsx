import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { COUNTED_DAYS, countedAfval, formatRate, type Period } from "./periods"
import { ShowMore } from "./show-more"

type Props = {
  period: Period
  showBank: boolean
  /** The reasons of the cancellations that count (within COUNTED_DAYS), most frequent first. */
  reasons: { reason: string; count: number }[]
  /** When the reasons are not just those of this period's afval that counts: then no share of this period's sales. */
  reasonsNote: string | null
  /** Cancellations with the reason "Verkeerd voorgelicht"; null when they are not known per period. */
  voorgelicht: number | null
  voorgelichtReason: string
}

/**
 * The afval of one period that is about the sale, and so counts against netto: cancelled within COUNTED_DAYS, and all
 * bankafval. Later cancellations are about the customer and are left out. The numbers, then why, starting with the
 * first rows. Every percentage is a share of the bruto sales.
 */
export function AfvalBreakdown(props: Props) {
  const { period, showBank, reasons, reasonsNote, voorgelicht, voorgelichtReason } = props
  const afval = countedAfval(period)
  if (afval === 0) return <p className="py-2 text-sm text-muted-foreground">Geen afval in deze periode.</p>

  const share = (count: number) => formatRate(period.sold > 0 ? count / period.sold : null)
  const others = reasons.filter((r) => r.reason !== voorgelichtReason)
  const reasonMax = reasonsNote ? Math.max(1, ...reasons.map((r) => r.count)) : afval

  return (
    <div className="flex flex-col divide-y [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label="Totaal" count={afval} share={share(afval)} />
        <Stat
          label={`Opgezegd ≤ ${COUNTED_DAYS} dagen`}
          swatch="bg-opgezegd"
          count={period.counted.opgezegd}
          share={share(period.counted.opgezegd)}
        />
        {showBank && (
          <Stat
            label="Bankafval"
            swatch="bg-bankafval"
            count={period.counted.bank}
            share={share(period.counted.bank)}
          />
        )}
        {voorgelicht !== null && (
          <Stat label={voorgelichtReason} swatch="bg-voorgelicht" count={voorgelicht} share={share(voorgelicht)} />
        )}
      </dl>

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
  strong?: boolean
  children: ReactNode
}

function Row({ label, count, max, note, strong, children }: RowProps) {
  return (
    <li className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-2 text-sm">
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
