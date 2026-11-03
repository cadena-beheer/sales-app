import type { SalesStatsDelay } from "@shared/kpi"
import { delaySteps, medianDelay, type Period } from "./periods"

type Props = { delays: SalesStatsDelay[]; period: Period }

/** Admins: after how many days the sales of this period fell away, cancelled and at the bank. */
export function AfvalDelays({ delays, period }: Props) {
  const steps = delaySteps(delays, period)
  if (steps.length === 0) return <p className="py-2 text-sm text-muted-foreground">Nog geen afval in deze periode.</p>

  const max = Math.max(...steps.map((step) => step.opgezegd + step.bank))
  const medians = [
    { label: "Opgezegd", swatch: "bg-opgezegd", days: medianDelay(delays, period, "opgezegd") },
    { label: "Bankafval", swatch: "bg-bankafval", days: medianDelay(delays, period, "bank") },
  ]
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5">
        {steps.map((step) => (
          <li key={step.label} className="grid grid-cols-[minmax(0,7rem)_1fr] items-center gap-3 text-sm">
            <span className="truncate">{step.label}</span>
            <div className="flex items-center gap-2">
              <div className="flex h-3 gap-[2px]" style={{ width: `${((step.opgezegd + step.bank) / max) * 75}%` }}>
                {step.opgezegd > 0 && (
                  <div className="rounded-l-[2px] bg-opgezegd" style={{ flexGrow: step.opgezegd }} />
                )}
                {step.bank > 0 && <div className="rounded-r-[4px] bg-bankafval" style={{ flexGrow: step.bank }} />}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{step.opgezegd + step.bank}</span>
            </div>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {medians.map(
          (median) =>
            median.days !== null && (
              <li key={median.label} className="flex items-center gap-1.5">
                <span aria-hidden className={`size-2.5 rounded-[3px] ${median.swatch}`} />
                {median.label}: de helft binnen{" "}
                <strong className="font-semibold text-foreground">{median.days} dagen</strong>
              </li>
            ),
        )}
      </ul>
    </div>
  )
}
