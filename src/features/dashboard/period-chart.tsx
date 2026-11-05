import { cn } from "@/lib/utils"
import { countedAfval, formatRate, longLabel, nettoOf, shortLabel, type Granularity, type Period } from "./periods"

type Props = {
  periods: Period[]
  granularity: Granularity
  selectedKey: string | undefined
  onSelect: (key: string) => void
  isProvisional: (period: Period) => boolean
  /** Netto a period must reach, drawn as a line; null for none. */
  target: number | null
}

const PLOT_HEIGHT = 150
/** Room above the tallest column for its percentage. */
const PLOT_TOP = 22
/** Netto's number has to fit in its segment. */
const MIN_NETTO_HEIGHT = 16

/**
 * A few weeks or months side by side: a column per period with netto at the bottom, its number inside, and the afval
 * that counts on top, so the whole column is the bruto number. Above it the afval percentage. Tapping a column selects it.
 */
export function PeriodChart({ periods, granularity, selectedKey, onSelect, isProvisional, target }: Props) {
  // Bankafval rarely comes this soon after a sale, so it only joins the legend when there is some.
  const showBank = periods.some((p) => p.counted.bank > 0)
  const max = Math.max(1, target ?? 0, ...periods.map((p) => p.sold))
  const scale = (count: number) => (count / max) * (PLOT_HEIGHT - PLOT_TOP)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex">
        {target !== null && (
          <div aria-hidden className="relative w-14 shrink-0 text-[11px] text-muted-foreground">
            <span
              className="absolute right-1 translate-y-1/2 whitespace-nowrap"
              style={{ bottom: `calc(1.5rem + ${scale(target)}px)` }}
            >
              Bonus {target}
            </span>
          </div>
        )}

        <div className="relative flex min-w-0 flex-1 gap-0.5">
          {target !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-netto"
              style={{ top: PLOT_HEIGHT - scale(target) }}
            />
          )}
          {periods.map((period) => {
            const selected = period.key === selectedKey
            const netto = nettoOf(period)
            const provisional = isProvisional(period)
            const rate = formatRate(period.sold > 0 ? countedAfval(period) / period.sold : null)
            const bank = showBank ? `, ${period.counted.bank} bankafval` : ""
            const summary = `${longLabel(period, granularity)}: ${netto} netto, binnen 14 dagen ${period.counted.opgezegd} opgezegd${bank}, ${rate} afval`
            return (
              <button
                key={period.key}
                type="button"
                onClick={() => onSelect(period.key)}
                aria-pressed={selected}
                aria-label={`${summary}${provisional ? ", netto kan nog dalen" : ""}`}
                title={summary}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-stretch rounded-md text-center tabular-nums outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
                  selected && "bg-muted",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col items-center justify-end rounded-t-md",
                    provisional &&
                      "bg-[repeating-linear-gradient(135deg,transparent_0_5px,var(--color-border)_5px_6px)]",
                  )}
                  style={{ height: PLOT_HEIGHT }}
                >
                  <span
                    className={cn(
                      "relative z-20 mb-0.5 text-xs leading-4 text-muted-foreground",
                      selected && "font-semibold text-foreground",
                    )}
                  >
                    {rate}
                  </span>
                  {period.counted.opgezegd > 0 && (
                    <Segment color="bg-opgezegd" height={scale(period.counted.opgezegd)} />
                  )}
                  {period.counted.bank > 0 && <Segment color="bg-bankafval" height={scale(period.counted.bank)} />}
                  {netto > 0 && (
                    <Segment color="bg-netto" height={Math.max(MIN_NETTO_HEIGHT, scale(netto))}>
                      {netto}
                    </Segment>
                  )}
                </div>
                <span
                  className={cn(
                    "flex h-6 items-center justify-center text-xs whitespace-nowrap text-muted-foreground",
                    selected && "font-semibold text-foreground",
                  )}
                >
                  {shortLabel(period, granularity)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Legend swatch="bg-netto">Netto</Legend>
        <Legend swatch="bg-opgezegd">Opgezegd ≤14d</Legend>
        {showBank && <Legend swatch="bg-bankafval">Bankafval ≤14d</Legend>}
        <li>% = afval ≤14d</li>
        {periods.some(isProvisional) && (
          <Legend swatch="bg-[repeating-linear-gradient(135deg,transparent_0_2px,var(--color-muted-foreground)_2px_3px)]">
            Opzeggingen kunnen nog binnenkomen.
          </Legend>
        )}
      </ul>
    </div>
  )
}

function Segment({ color, height, children }: { color: string; height: number; children?: number }) {
  return (
    <div
      className={cn(
        "flex w-6 shrink-0 items-center justify-center overflow-hidden text-xs font-medium text-white first-of-type:rounded-t-[4px] sm:w-10 lg:w-12",
        color,
      )}
      style={{ height: Math.max(2, height) }}
    >
      {children}
    </div>
  )
}

function Legend({ swatch, children }: { swatch: string; children: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={`size-2.5 shrink-0 rounded-[3px] ${swatch}`} />
      {children}
    </li>
  )
}
