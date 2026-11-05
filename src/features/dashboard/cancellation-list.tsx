import { useQuery } from "@tanstack/react-query"
import { MapPinIcon } from "lucide-react"
import type { SalesStatsBankAfval, SalesStatsCancellation } from "@shared/kpi"
import { Button } from "@/components/ui/button"
import { lookupHouse } from "@/lib/api"
import { cn } from "@/lib/utils"
import { COUNTED_DAYS, daysBetween, formatDay } from "./periods"

/** Off until the endpoint sends addresses (handoff/zmsuite-afval-address.md). */
const SHOW_STREET_VIEW: boolean = false

type Props = {
  items: SalesStatsCancellation[]
  bank: SalesStatsBankAfval[]
}

type Line = {
  regNr: string
  name: string
  city: string
  street: string
  houseNumber: string
  postcode: string
  soldOn: string
  on: string | null
  kind: string
  reason: string
  detail: string
}

/**
 * The recruiter's own sales that fell away: which house, why, how many days after the sale and on which date. Those
 * days are the number to look at, so they stand out, and are faded when too late to count against netto.
 */
export function CancellationList({ items, bank }: Props) {
  const lines: Line[] = [
    ...items.map((item) => ({ ...item, on: item.cancelledOn, kind: "Opgezegd" })),
    ...bank.map((item) => ({
      ...item,
      on: item.returnedOn,
      kind: "Bankafval",
      detail: "",
    })),
  ].sort((a, b) => (b.on ?? "").localeCompare(a.on ?? ""))

  if (lines.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">Geen afval in deze periode.</p>
  }
  return (
    <ul className="-my-2 divide-y">
      {lines.map((line, index) => {
        const days = line.on ? daysBetween(line.soldOn, line.on) : null
        return (
          <li
            key={`${line.regNr}-${index}`}
            className="flex items-center gap-3 py-3"
            title={`${line.regNr} · verkocht ${formatDay(line.soldOn)}${line.on ? ` · ${line.kind.toLowerCase()} ${formatDay(line.on.slice(0, 10))}` : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {line.street ? `${line.street} ${line.houseNumber}` : line.name || "Onbekende klant"}
                {line.city && <span className="font-normal text-muted-foreground"> · {line.city}</span>}
              </p>
              <p className="text-sm text-muted-foreground">
                {line.kind === "Bankafval" && <span className="font-medium text-foreground">Bankafval · </span>}
                {line.reason}
                {line.detail && ` · “${line.detail}”`}
              </p>
            </div>
            {line.on && days !== null && (
              <div className="shrink-0 text-right tabular-nums">
                <p>
                  <span className="mr-1 text-sm text-muted-foreground">Na</span>

                  <span className={cn("text-xl font-medium", days > COUNTED_DAYS && "text-muted-foreground")}>
                    {days}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">dagen</span>
                </p>
                <p className="text-sm text-muted-foreground">{fallenOn(line.on, line.soldOn)}</p>
              </div>
            )}
            {SHOW_STREET_VIEW && line.street && <StreetViewLink line={line} />}
          </li>
        )
      })}
    </ul>
  )
}

/** "29 okt", with the year when that is not the year of the sale. */
function fallenOn(on: string, soldOn: string): string {
  const date = on.slice(0, 10)
  return date.slice(0, 4) === soldOn.slice(0, 4) ? formatDay(date) : `${formatDay(date)} ${date.slice(0, 4)}`
}

/**
 * Opens Street View at the house. Google needs a location for that, so PDOK is asked for it first; until it answers, or
 * if it does not know the address, the link searches for the address in Google Maps instead.
 */
function StreetViewLink({ line }: { line: Line }) {
  const { data: house } = useQuery({
    queryKey: ["house", line.postcode, line.houseNumber],
    queryFn: () => lookupHouse(line.postcode, line.houseNumber),
    enabled: line.postcode !== "" && line.houseNumber !== "",
    staleTime: Infinity,
    retry: false,
  })
  const address = `${line.street} ${line.houseNumber}, ${line.postcode} ${line.city}`
  const href = house
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${house[1].toFixed(6)},${house[0].toFixed(6)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  return (
    <Button asChild variant="outline" size="icon" className="shrink-0">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={`Street View van ${line.street} ${line.houseNumber}`}
        title="Street View"
      >
        <MapPinIcon />
      </a>
    </Button>
  )
}
