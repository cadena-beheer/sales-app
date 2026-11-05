import type { SalesStatsDay, SalesStatsDelay, SalesStatsReason } from "@shared/kpi"

// Dates are handled as yyyy-MM-dd strings and computed in UTC, so the time zone of the phone never shifts a day.

export type Granularity = "week" | "month"

export type Period = {
  key: string
  /** First and last day, inclusive (yyyy-MM-dd). */
  start: string
  end: string
  sold: number
  cancelled: number
  /** Sold, not cancelled, but never paid. */
  bank: number
  /** Per step of AFVAL_AGES, how many sales fell away that long after the sale; zeros when that is not known. */
  aged: { opgezegd: number[]; bank: number[] }
  /** The afval that counts against netto and the bonus: see COUNTED_DAYS. */
  counted: { opgezegd: number; bank: number }
}

/**
 * Only what falls away this many days after the sale counts against netto and the bonus; later afval shows in the
 * breakdown but changes neither.
 */
export const COUNTED_DAYS = 14

/**
 * How long after the sale sales fall away: first days are about the sale itself, after a year about the renewal.
 * A month's or a week's total grows for years, so only what fell away within a fixed time compares periods fairly.
 */
export const AFVAL_AGES = [
  { label: "Binnen 14 dagen", short: "≤ 14 dagen", upTo: 14, color: "bg-afval-14" },
  { label: "Binnen 30 dagen", short: "15–30 dagen", upTo: 30, color: "bg-afval-30" },
  { label: "Binnen 1 jaar", short: "31 dagen–1 jaar", upTo: 365, color: "bg-afval-jaar" },
  { label: "Na 1 jaar", short: "Na 1 jaar", upTo: Infinity, color: "bg-afval-later" },
] as const

/** The windows a percentage can be over; null is everything that fell away so far. */
export const AFVAL_WINDOWS = [
  { days: 14, label: "14 dagen" },
  { days: 30, label: "30 dagen" },
  { days: 365, label: "1 jaar" },
  { days: null, label: "Alles" },
] as const

export type AfvalWindow = (typeof AFVAL_WINDOWS)[number]["days"]

/** Which step of AFVAL_AGES a number of days falls in. */
export const ageStep = (days: number) => AFVAL_AGES.findIndex((age) => days <= age.upTo)

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]
const MONTHS_LONG = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
]

/**
 * Every week or month whose first day is on or after `from` and that has started by `to`, oldest first, also
 * when nothing was sold. A week starts on Monday (ISO).
 */
export function buildPeriods(
  days: SalesStatsDay[],
  granularity: Granularity,
  from: string,
  to: string,
  delays: SalesStatsDelay[] = [],
): Period[] {
  const periods: Period[] = []
  const byKey = new Map<string, Period>()
  for (let start = firstStartOnOrAfter(from, granularity); start <= to; start = nextStart(start, granularity)) {
    const period = {
      key: periodKey(start, granularity),
      start,
      end: periodEnd(start, granularity),
      sold: 0,
      cancelled: 0,
      bank: 0,
      aged: { opgezegd: AFVAL_AGES.map(() => 0), bank: AFVAL_AGES.map(() => 0) },
      counted: { opgezegd: 0, bank: 0 },
    }
    periods.push(period)
    byKey.set(period.key, period)
  }
  for (const day of days) {
    const period = byKey.get(periodKey(day.date, granularity))
    if (!period) continue
    period.sold += day.sold
    period.cancelled += day.cancelled
    period.bank += day.bankAfval ?? 0
  }
  for (const delay of delays) {
    const period = byKey.get(periodKey(delay.date, granularity))
    if (period) period.aged[delay.kind][ageStep(delay.days)] += delay.count
  }
  for (const period of periods) {
    // Without delays nothing says when it fell away. Then all of it counts, rather than netto looking like bruto.
    period.counted =
      delays.length > 0
        ? { opgezegd: period.aged.opgezegd[0], bank: period.aged.bank[0] }
        : { opgezegd: period.cancelled, bank: period.bank }
  }
  return periods
}

/** Netto per recruiter per calendar month for the first bonus, and how much more for every next one: 50, 60, 70, … */
export const BONUS_FIRST = 50
const BONUS_STEP = 10

/** The highest bonus a month's netto has reached (null for none), and the next one to go for. */
export function bonusStages(netto: number): { reached: number | null; next: number } {
  if (netto < BONUS_FIRST) return { reached: null, next: BONUS_FIRST }
  const reached = BONUS_FIRST + Math.floor((netto - BONUS_FIRST) / BONUS_STEP) * BONUS_STEP
  return { reached, next: reached + BONUS_STEP }
}

/** The afval that counts against netto. */
export const countedAfval = (period: Pick<Period, "counted">) => period.counted.opgezegd + period.counted.bank

/** Bruto minus the afval that counts. */
export const nettoOf = (period: Pick<Period, "sold" | "counted">) => period.sold - countedAfval(period)

/** Whether every sale of a period is past the days that count, as far as cancellations have been entered. */
export const isCountedComplete = (period: Pick<Period, "end">, enteredUntil: string | null) =>
  isWindowComplete(period, COUNTED_DAYS, enteredUntil)

/** Columns in the chart: few enough to read at a glance on a phone. */
export const CHART_PERIODS = 6

/** The periods to chart: the newest ones, or, once further back than that, those up to the selected one. */
export function chartPeriods(periods: Period[], selectedIndex: number): Period[] {
  const end = selectedIndex < periods.length - CHART_PERIODS ? selectedIndex + 1 : periods.length
  return periods.slice(Math.max(0, end - CHART_PERIODS), end)
}

/** "2026-W37" or "2026-09". */
export function periodKey(date: string, granularity: Granularity): string {
  if (granularity === "month") return date.slice(0, 7)
  const { year, week } = isoWeek(date)
  return `${year}-W${String(week).padStart(2, "0")}`
}

export function periodStart(date: string, granularity: Granularity): string {
  if (granularity === "month") return `${date.slice(0, 7)}-01`
  const day = parse(date)
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7))
  return format(day)
}

export function addDays(date: string, days: number): string {
  const day = parse(date)
  day.setUTCDate(day.getUTCDate() + days)
  return format(day)
}

export function addMonths(date: string, months: number): string {
  const day = parse(`${date.slice(0, 7)}-01`)
  day.setUTCMonth(day.getUTCMonth() + months)
  return format(day)
}

/** Months fetched per request; "Eerder" loads the next block further back. */
const WINDOW_MONTHS = 12
/** Today on the phone's calendar, yyyy-MM-dd. */
export function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** Page 0 covers the current month and the eleven before it; every next page the twelve months before that. */
export function kpiWindow(page: number, until: string): { from: string; to: string } {
  const firstFrom = addMonths(until, -(WINDOW_MONTHS - 1))
  return {
    from: addMonths(firstFrom, -WINDOW_MONTHS * page),
    to: page === 0 ? until : addDays(addMonths(firstFrom, -WINDOW_MONTHS * (page - 1)), -1),
  }
}

/** The reasons of the sales in one period (or all of them, for null), most frequent first. */
export function reasonsIn(
  reasons: SalesStatsReason[],
  period: Pick<Period, "start" | "end"> | null,
): { reason: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of reasons) {
    if (period && !(r.date && r.date >= period.start && r.date <= period.end)) continue
    counts.set(r.reason, (counts.get(r.reason) ?? 0) + r.count)
  }
  return [...counts]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, "nl"))
}

/** The steps of "after how many days": up to and including `upTo`, the last without an end. */
const DELAY_STEPS = [
  { label: "0–7 dagen", upTo: 7 },
  { label: "8–14 dagen", upTo: 14 },
  { label: "15–30 dagen", upTo: 30 },
  { label: "31–60 dagen", upTo: 60 },
  { label: "61–90 dagen", upTo: 90 },
  { label: "91–180 dagen", upTo: 180 },
  { label: "181–365 dagen", upTo: 365 },
  { label: "Na een jaar", upTo: Infinity },
]

export type DelayStep = { label: string; opgezegd: number; bank: number }

/** The sales of one period that fell away, per number of days after the sale. Only the steps from first to last used. */
export function delaySteps(delays: SalesStatsDelay[], period: Pick<Period, "start" | "end">): DelayStep[] {
  const steps: DelayStep[] = DELAY_STEPS.map(({ label }) => ({ label, opgezegd: 0, bank: 0 }))
  for (const delay of delays) {
    if (delay.date < period.start || delay.date > period.end) continue
    steps[DELAY_STEPS.findIndex((step) => delay.days <= step.upTo)][delay.kind] += delay.count
  }
  const used = steps.flatMap((step, index) => (step.opgezegd + step.bank > 0 ? [index] : []))
  return used.length === 0 ? [] : steps.slice(used[0], used[used.length - 1] + 1)
}

/** The number of days by which half of a period's sales of this kind had fallen away; null without any. */
export function medianDelay(
  delays: SalesStatsDelay[],
  period: Pick<Period, "start" | "end">,
  kind: SalesStatsDelay["kind"],
): number | null {
  const inPeriod = delays
    .filter((delay) => delay.kind === kind && delay.date >= period.start && delay.date <= period.end)
    .sort((a, b) => a.days - b.days)
  const total = inPeriod.reduce((sum, delay) => sum + delay.count, 0)
  let counted = 0
  for (const delay of inPeriod) {
    counted += delay.count
    if (counted * 2 >= total) return delay.days
  }
  return null
}

/** Whole days from one date to another; timestamps count by their date. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to.slice(0, 10)).getTime() - parse(from.slice(0, 10)).getTime()) / 86_400_000)
}

/** Short label under a bar: "wk 37" or "sep". January also shows the year. */
export function shortLabel(period: Period, granularity: Granularity): string {
  if (granularity === "week") return `wk ${Number(period.key.slice(6))}`
  const month = Number(period.start.slice(5, 7)) - 1
  return month === 0 ? `jan '${period.start.slice(2, 4)}` : MONTHS[month]
}

/** "week 37" or "september 2026". */
export function periodTitle(period: Period, granularity: Granularity): string {
  return granularity === "week"
    ? `week ${Number(period.key.slice(6))}`
    : `${MONTHS_LONG[Number(period.start.slice(5, 7)) - 1]} ${period.start.slice(0, 4)}`
}

/** "31 aug – 6 sep 2026" for a week; empty for a month, whose title already says it all. */
export function periodDates(period: Period, granularity: Granularity): string {
  if (granularity === "month") return ""
  const sameMonth = period.start.slice(5, 7) === period.end.slice(5, 7)
  return `${formatDay(period.start, !sameMonth)} – ${formatDay(period.end)} ${period.end.slice(0, 4)}`
}

/** "week 37 · 7 – 13 sep 2026" or "september 2026". */
export function longLabel(period: Period, granularity: Granularity): string {
  const dates = periodDates(period, granularity)
  return dates ? `${periodTitle(period, granularity)} · ${dates}` : periodTitle(period, granularity)
}

/** "7 sep" (or "7" without the month). */
export function formatDay(date: string, withMonth = true): string {
  const day = String(Number(date.slice(8, 10)))
  return withMonth ? `${day} ${MONTHS[Number(date.slice(5, 7)) - 1]}` : day
}

const WEEKDAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"]

/** ZMAdmin's local timestamp "2026-10-02T09:26:35.37" as "vr 2 okt 2026, 09:26". */
export function formatTimestamp(timestamp: string): string {
  const date = timestamp.slice(0, 10)
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]
  const time = timestamp.slice(11, 16)
  return `${weekday} ${formatDay(date)} ${date.slice(0, 4)}${time ? `, ${time}` : ""}`
}

/** Share of the sales that fell away, cancelled or never paid, 0..1; null when nothing was sold. */
export function uitvalRate(period: Pick<Period, "sold" | "cancelled" | "bank">): number | null {
  return period.sold > 0 ? (period.cancelled + period.bank) / period.sold : null
}

/** Share of the sales that fell away within a window, 0..1; null when nothing was sold. Null window: all so far. */
export function uitvalWithin(period: Pick<Period, "sold" | "cancelled" | "bank" | "aged">, days: AfvalWindow) {
  if (days === null) return uitvalRate(period)
  if (period.sold === 0) return null
  const steps = AFVAL_AGES.flatMap((age, step) => (age.upTo <= days ? [step] : []))
  return steps.reduce((sum, step) => sum + period.aged.opgezegd[step] + period.aged.bank[step], 0) / period.sold
}

/** Whether every sale of a period has had this long to fall away, as far as cancellations have been entered. */
export function isWindowComplete(
  period: Pick<Period, "end">,
  days: number | null,
  enteredUntil: string | null,
): boolean {
  if (days === null) return true
  return enteredUntil !== null && addDays(period.end, days) <= enteredUntil.slice(0, 10)
}

/** "25%", or "–" when nothing was sold. */
export function formatRate(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate * 100)}%`
}

/**
 * Most cancellations arrive in the first weeks after a sale. Until the office has entered cancellations up to
 * this many days after a period's last day, its numbers will still go up.
 */
export const SETTLE_DAYS = 28

/** True when cancellations for sales in this period are probably still coming in. */
export function isProvisional(period: Pick<Period, "end">, cancellationsEnteredUntil: string | null): boolean {
  if (!cancellationsEnteredUntil) return true
  return addDays(period.end, SETTLE_DAYS) > cancellationsEnteredUntil.slice(0, 10)
}

function isoWeek(date: string): { year: number; week: number } {
  const day = parse(date)
  // The Thursday of this week decides the year.
  day.setUTCDate(day.getUTCDate() + 3 - ((day.getUTCDay() + 6) % 7))
  const year = day.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7))
  return { year, week: 1 + Math.round((day.getTime() - firstThursday.getTime()) / (7 * 86_400_000)) }
}

function firstStartOnOrAfter(date: string, granularity: Granularity): string {
  const start = periodStart(date, granularity)
  return start < date ? nextStart(start, granularity) : start
}

function nextStart(start: string, granularity: Granularity): string {
  return granularity === "week" ? addDays(start, 7) : addMonths(start, 1)
}

function periodEnd(start: string, granularity: Granularity): string {
  return granularity === "week" ? addDays(start, 6) : addDays(addMonths(start, 1), -1)
}

function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function format(date: Date): string {
  return date.toISOString().slice(0, 10)
}
