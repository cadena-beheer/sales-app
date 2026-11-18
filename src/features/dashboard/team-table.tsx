import { ChevronRightIcon } from "lucide-react"
import type { SalesStats } from "@shared/kpi"
import { ageStep, formatRate, type Period } from "./periods"

type Props = {
  stats: SalesStats
  period: Period
  showBank: boolean
  onPick: (wervernr: string) => void
}

/** The reason that says most about how a sale was made, so it gets its own number. */
export const VERKEERD_VOORGELICHT = "Verkeerd voorgelicht"

/** Sales manager: every recruiter's numbers for the selected period, highest netto first. Tap to open one. */
export function TeamTable({ stats, period, showBank, onPick }: Props) {
  const names = new Map(stats.recruiters.map((r) => [r.number, r.name]))
  const totals = new Map<string, { sold: number; cancelled: number; bank: number }>()
  for (const day of stats.days) {
    if (day.date < period.start || day.date > period.end) continue
    const total = totals.get(day.recruiter) ?? { sold: 0, cancelled: 0, bank: 0 }
    total.sold += day.sold
    total.cancelled += day.cancelled
    total.bank += day.bankAfval ?? 0
    totals.set(day.recruiter, total)
  }
  // Both need the recruiter on their rows, which the endpoint may not send yet.
  const inPeriod = (date?: string) => date !== undefined && date >= period.start && date <= period.end
  const showChurn = stats.afvalDelays.some((delay) => delay.recruiter)
  const showVoorgelicht = stats.reasons.some((reason) => reason.recruiter)
  const countBy = (rows: { recruiter?: string; count: number }[], recruiter: string) =>
    rows.reduce((sum, row) => (row.recruiter === recruiter ? sum + row.count : sum), 0)
  const within14 = stats.afvalDelays.filter(
    (delay) => delay.kind === "opgezegd" && inPeriod(delay.date) && ageStep(delay.days) === 0,
  )
  const voorgelicht = stats.reasons.filter((r) => inPeriod(r.date) && r.reason === VERKEERD_VOORGELICHT)

  // As netto: cancellations within 14 days (all of them without that per recruiter) and all bankafval.
  const rows = [...totals]
    .map(([number, total]) => {
      const opgezegd = showChurn ? countBy(within14, number) : total.cancelled
      return {
        number,
        name: names.get(number) ?? number,
        sold: total.sold,
        opgezegd,
        bank: total.bank,
        netto: total.sold - opgezegd - total.bank,
        voorgelicht: countBy(voorgelicht, number),
      }
    })
    .sort((a, b) => b.netto - a.netto || a.name.localeCompare(b.name, "nl"))

  if (rows.length === 0) return <p className="py-2 text-sm text-muted-foreground">Geen verkopen in deze periode.</p>

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="pb-2 text-left font-normal">Werver</th>
          <th className="pb-2 text-right font-medium text-foreground">Netto</th>
          <th className="pb-2 pl-2 text-right font-normal">Bruto</th>
          <th
            className="hidden pb-2 pl-2 text-right font-normal sm:table-cell"
            title={showChurn ? "Opgezegd binnen 14 dagen" : undefined}
          >
            Opgezegd
          </th>
          {showBank && <th className="hidden pb-2 pl-2 text-right font-normal sm:table-cell">Bank</th>}
          <th className="pb-2 pl-2 text-right font-normal">Afval</th>
          {showVoorgelicht && (
            <th className="pb-2 pl-2 text-right font-normal" title={VERKEERD_VOORGELICHT}>
              Voorgel.
            </th>
          )}
          <th className="w-6" />
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((row) => (
          <tr key={row.number} className="cursor-pointer hover:bg-muted/60" onClick={() => onPick(row.number)}>
            <td className="py-3 pr-2">
              {/* The click bubbles to the row; the button makes it reachable by keyboard. */}
              <button type="button" className="text-left outline-none focus-visible:underline">
                <span className="font-medium">{row.name}</span>
                <span className="block text-xs text-muted-foreground">{row.number}</span>
              </button>
            </td>
            <td className="py-3 text-right font-semibold tabular-nums">{row.netto}</td>
            <td className="py-3 text-right tabular-nums">{row.sold}</td>
            <td className="hidden py-3 text-right tabular-nums sm:table-cell">{row.opgezegd}</td>
            {showBank && <td className="hidden py-3 text-right tabular-nums sm:table-cell">{row.bank}</td>}
            <td className="py-3 text-right tabular-nums">
              {formatRate(row.sold > 0 ? (row.sold - row.netto) / row.sold : null)}
            </td>
            {showVoorgelicht && (
              <td className="py-3 text-right tabular-nums">
                {row.voorgelicht}
                <span className="block text-xs text-muted-foreground">
                  {formatRate(row.sold > 0 ? row.voorgelicht / row.sold : null)}
                </span>
              </td>
            )}
            <td className="py-3 text-right text-muted-foreground">
              <ChevronRightIcon className="ml-auto size-4" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
