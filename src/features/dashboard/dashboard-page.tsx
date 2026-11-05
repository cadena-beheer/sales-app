import { useMemo, useState } from "react"
import { ArrowLeftIcon, ChevronDownIcon, ClockIcon } from "lucide-react"
import { AppMenu } from "@/components/app-menu"
import { HEADER_BUTTON_CLASS, PAGE_WIDTH, PageHeader } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { Profile } from "@/hooks/use-profile"
import { getErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"
import { AfvalBreakdown } from "./afval-breakdown"
import { CancellationList } from "./cancellation-list"
import { NettoSummary } from "./netto-summary"
import { PeriodBar } from "./period-bar"
import { PeriodChart } from "./period-chart"
import {
  addDays,
  BONUS_FIRST,
  buildPeriods,
  chartPeriods,
  formatDay,
  formatTimestamp,
  isCountedComplete,
  periodDates,
  periodKey,
  periodTitle,
  reasonsIn,
  today,
  type Granularity,
} from "./periods"
import { TeamTable, VERKEERD_VOORGELICHT } from "./team-table"
import { useKpi } from "./use-kpi"

type Props = { profile: Profile | undefined; onBack: () => void }

/**
 * Results from ZMAdmin for one week or month at a time: netto first, then the last few periods, then what the afval
 * consists of and who it is. A recruiter sees their own; the sales manager sees the team and can open any recruiter.
 */
export function DashboardPage({ profile, onBack }: Props) {
  const isAdmin = profile?.isAdmin ?? false
  // Admins: null = the whole team. Recruiters always get their own numbers (the server enforces that too).
  const [picked, setPicked] = useState<string | null>(null)
  const wervernr = isAdmin ? picked : (profile?.wervernr ?? null)
  const team = useKpi(null, isAdmin)
  const kpi = useKpi(wervernr, profile !== undefined)
  const [granularity, setGranularity] = useState<Granularity>("month")
  const [selectedKey, setSelectedKey] = useState<string>()

  const data = kpi.data
  const periods = useMemo(
    () => (data ? buildPeriods(data.stats.days, granularity, data.from, data.to, data.stats.afvalDelays) : []),
    [data, granularity],
  )
  const months = useMemo(
    () => (data ? buildPeriods(data.stats.days, "month", data.from, data.to, data.stats.afvalDelays) : []),
    [data],
  )
  const selected = periods.find((p) => p.key === selectedKey) ?? periods.at(-1)
  const selectedIndex = selected ? periods.indexOf(selected) : -1
  const enteredUntil = data?.stats.cancellationsEnteredUntil ?? null
  const provisional = selected ? !isCountedComplete(selected, enteredUntil) : false
  // Bankafval shows once ZMAdmin sends it.
  const showBank = data?.stats.days.some((day) => day.bankAfval !== undefined) ?? false
  // How long after the sale sales fell away shows once ZMAdmin sends it.
  const byAge = (data?.stats.afvalDelays.length ?? 0) > 0
  const recruiters = team.data?.stats.recruiters ?? data?.stats.recruiters ?? []
  const unit = granularity === "week" ? "week" : "maand"
  // The bonus is per recruiter per calendar month. A week counts towards the month its Thursday is in.
  const bonusPeriod =
    selected && wervernr !== null
      ? months.find((month) => month.key === periodKey(addDays(selected.start, 3), "month"))
      : undefined
  const customers = selected
    ? {
        items: data?.stats.cancellations.filter((c) => c.soldOn >= selected.start && c.soldOn <= selected.end) ?? [],
        bank: data?.stats.bankAfval.filter((b) => b.soldOn >= selected.start && b.soldOn <= selected.end) ?? [],
      }
    : { items: [], bank: [] }
  // "week 41" or "juni 2025". Only the bar at the top names the period: every card below is about it.
  const periodName = selected ? periodTitle(selected, granularity) : ""

  // A recruiter's reasons come from their own cancellations, which carry the sale day. The team only has the totals
  // per reason; per period once the endpoint sends their sale day (see SalesStats.reasons).
  const reasonsPerPeriod = wervernr !== null || (data?.stats.reasons.every((r) => r.date) ?? true)
  const reasons =
    !data || !selected
      ? []
      : wervernr !== null
        ? reasonsIn(
            data.stats.cancellations.map((c) => ({ date: c.soldOn, reason: c.reason, count: 1 })),
            selected,
          )
        : reasonsIn(data.stats.reasons, reasonsPerPeriod ? selected : null)

  const voorgelicht = reasonsPerPeriod ? (reasons.find((r) => r.reason === VERKEERD_VOORGELICHT)?.count ?? 0) : null

  function changeGranularity(next: Granularity) {
    // Stay on the same moment: the week or month that contains the selected period's first day.
    if (selected) setSelectedKey(periodKey(selected.start, next))
    setGranularity(next)
  }

  async function previous() {
    if (!selected) return
    if (selectedIndex > 0) return setSelectedKey(periods[selectedIndex - 1].key)
    // The oldest loaded period: load the year before, then step into it.
    await kpi.fetchNextPage()
    setSelectedKey(periodKey(addDays(selected.start, -1), granularity))
  }

  return (
    <div className="min-h-svh bg-muted">
      <PageHeader
        start={
          <Button variant="ghost" size="icon" className={HEADER_BUTTON_CLASS} aria-label="Terug" onClick={onBack}>
            <ArrowLeftIcon />
          </Button>
        }
        title={
          isAdmin ? (
            // Whose numbers: the page's subject, so it is the title. Native select for the phone's own picker.
            <span className="relative flex max-w-full min-w-0 items-center">
              <select
                aria-label="Wiens cijfers"
                className="max-w-[60vw] min-w-0 appearance-none truncate rounded-md bg-white/15 py-1.5 pr-8 pl-3 text-lg font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                value={picked ?? ""}
                onChange={(event) => setPicked(event.target.value || null)}
              >
                <option className="text-foreground" value="">
                  Hele team
                </option>
                {recruiters.map((r) => (
                  <option className="text-foreground" key={r.number} value={r.number}>
                    {r.name} ({r.number})
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2 size-5" />
            </span>
          ) : (
            "Mijn resultaten"
          )
        }
        end={<AppMenu />}
      />

      {selected && (
        <PeriodBar
          granularity={granularity}
          onGranularity={changeGranularity}
          title={granularity === "month" ? periodName.split(" ")[0] : periodName}
          subtitle={granularity === "month" ? selected.start.slice(0, 4) : periodDates(selected, granularity)}
          canPrevious={selectedIndex > 0 || kpi.hasNextPage}
          canNext={selectedIndex < periods.length - 1}
          loadingPrevious={kpi.isFetchingNextPage}
          onPrevious={() => void previous()}
          onNext={() => setSelectedKey(periods[selectedIndex + 1].key)}
          onLatest={() => setSelectedKey(undefined)}
        />
      )}

      <main
        className={cn(
          "mx-auto flex flex-col gap-4 p-4 transition-opacity",
          PAGE_WIDTH,
          kpi.isPlaceholderData && "pointer-events-none opacity-50",
        )}
        aria-busy={kpi.isPlaceholderData}
      >
        {kpi.error && !data && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-2">
              {getErrorMessage(kpi.error, "De cijfers konden niet worden geladen")}
              <Button size="sm" variant="outline" onClick={() => void kpi.refetch()}>
                Opnieuw
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!data && !kpi.error && (
          <div className="flex justify-center p-12">
            <Spinner className="size-6" />
          </div>
        )}

        {data && selected && (
          // Large screens: netto and the last periods on the left, what the afval consists of and who on the right.
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="flex min-w-0 flex-col gap-4">
              <Card>
                <CardContent className="flex flex-col gap-3">
                  <NettoSummary
                    period={selected}
                    bonusMonth={
                      bonusPeriod
                        ? {
                            period: bonusPeriod,
                            running: bonusPeriod.end >= today(),
                            final: isCountedComplete(bonusPeriod, enteredUntil),
                          }
                        : null
                    }
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ClockIcon className="size-4 shrink-0" />
                    <p className="min-w-0 flex-1">
                      Opzeggingen bijgewerkt t/m {enteredUntil ? formatTimestamp(enteredUntil) : "onbekend"}.
                    </p>
                    {provisional && <Badge variant="secondary">voorlopig</Badge>}
                  </div>
                  {data.demo && (
                    <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      Voorbeeldcijfers: de koppeling met ZMAdmin staat nog niet aan. Namen en aantallen zijn verzonnen.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Netto en afval per {unit}</CardTitle>
                </CardHeader>
                <CardContent>
                  <PeriodChart
                    periods={chartPeriods(periods, selectedIndex)}
                    granularity={granularity}
                    selectedKey={selected.key}
                    onSelect={setSelectedKey}
                    isProvisional={(period) => !isCountedComplete(period, enteredUntil)}
                    target={granularity === "month" && wervernr !== null ? BONUS_FIRST : null}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Alle afval</CardTitle>
                </CardHeader>
                <CardContent>
                  <AfvalBreakdown
                    period={selected}
                    showBank={showBank}
                    byAge={byAge}
                    enteredUntil={enteredUntil}
                    reasons={reasons}
                    reasonsNote={
                      reasonsPerPeriod
                        ? null
                        : `Verkopen sinds ${formatDay(data.from)} ${data.from.slice(0, 4)}; per ${unit} volgt nog.`
                    }
                    voorgelicht={voorgelicht}
                    voorgelichtReason={VERKEERD_VOORGELICHT}
                  />
                </CardContent>
              </Card>

              {wervernr === null ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Per werver</CardTitle>
                    <CardDescription>Tik op een werver voor diens afgevallen klanten.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TeamTable
                      stats={data.stats}
                      period={selected}
                      showBank={showBank}
                      onPick={(number) => {
                        setPicked(number)
                        window.scrollTo({ top: 0 })
                      }}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Afgevallen klanten</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CancellationList items={customers.items} bank={customers.bank} />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
