import { useQuery } from "@tanstack/react-query"
import { MapPinIcon } from "lucide-react"
import type { SalesStatsBankAfval, SalesStatsCancellation } from "@shared/kpi"
import { Button } from "@/components/ui/button"
import { lookupHouse } from "@/lib/api"
import { cn } from "@/lib/utils"
import { daysBetween, formatDay } from "./periods"
import { ShowMore } from "./show-more"
import { VERKEERD_VOORGELICHT } from "./team-table"

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
  /** "Man" or "Vrouw" when known: who signed, so the recruiter remembers the door. */
  gender: string
}

/**
 * The recruiter's own sales that fell away and count against netto (the caller leaves out later cancellations): which
 * house, why, how many days after the sale and on which date. Those days are the number to look at, so they stand out.
 */
export function CancellationList({ items, bank }: Props) {
  const lines: Line[] = [
    ...items.map((item) => ({ ...item, on: item.cancelledOn, kind: "Opgezegd" })),
    ...bank.map((item) => ({
      ...item,
      on: item.returnedOn,
      kind: "Bankafval",
      detail: "",
      gender: "",
    })),
  ].sort((a, b) => (b.on ?? "").localeCompare(a.on ?? ""))

  if (lines.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">Geen afval in deze periode.</p>
  }
  return (
    <ShowMore limit={3} className="-mt-3 divide-y">
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
              <p className="mt-1 text-sm text-muted-foreground">
                <span
                  className={cn("inline-block rounded-md px-2 py-0.5 text-xs font-medium text-white", badgeColor(line))}
                >
                  {line.kind === "Bankafval" && "Bankafval · "}
                  {line.reason}
                </span>
                {(line.gender === "Man" || line.gender === "Vrouw") && (
                  <span className="ml-1.5 inline-block rounded-md border px-2 py-0.5 text-xs font-medium text-foreground">
                    {line.gender}
                  </span>
                )}
                {line.detail && ` “${line.detail}”`}
              </p>
            </div>
            {line.on && days !== null && (
              <div className="shrink-0 text-right tabular-nums">
                <p>
                  <span className="mr-1 text-sm text-muted-foreground">Na</span>

                  <span className="text-xl font-medium">{days}</span>
                  <span className="ml-1 text-sm text-muted-foreground">dagen</span>
                </p>
                <p className="text-sm text-muted-foreground">{fallenOn(line.on, line.soldOn)}</p>
              </div>
            )}
            {line.street && <StreetViewLink line={line} />}
          </li>
        )
      })}
    </ShowMore>
  )
}

function badgeColor(line: Line): string {
  if (line.kind === "Bankafval") return "bg-bankafval"
  return line.reason === VERKEERD_VOORGELICHT ? "bg-voorgelicht" : "bg-opgezegd-strong"
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
