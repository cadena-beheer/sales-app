import { useCallback, useEffect, useState } from "react"
import type { AreaAssignment, AreaMember, AssignStart } from "@/features/areas/areas"
import type { Granularity } from "@/features/dashboard/periods"

/**
 * The app's pages as browser history: every page has its own address, opening one adds a history entry, so the
 * browser's (and the phone's) back and forward buttons move between pages. What a page was opened with (the area
 * on the map, the werver a manager looks at) travels in the entry's state; after a reload only the address is left,
 * and a page that needs more than it holds opens one step up. What a reload should keep but back should skip, like the
 * period on the results, changes the current entry in place (`replace`).
 */

export type View = "form" | "dashboard" | "map" | "sales" | "admin" | "planning" | "areas" | "walk" | "tick"

/** How the map opens: plain, giving out an area, or on one area. */
export type MapStart = { assign?: AssignStart; focus?: AreaAssignment }

/** The week or month the results show; without a key the current one. */
export type ResultsPeriod = { granularity: Granularity; key?: string }

export type Page = {
  view: View
  map?: MapStart
  /** The werver whose areas a manager opened from the planning, or whose results from the team. */
  viewedAs?: AreaMember
  period?: ResultsPeriod
  /** The area being walked door by door; on the form, the walk it was opened from. */
  walking?: AreaAssignment
  /** The area a sales manager ticks off. */
  ticking?: AreaAssignment
}

/** A page in history, with how many of the app's pages lie before it in this tab. */
type Entry = Page & { depth: number }

const PATHS: Record<View, string> = {
  form: "/",
  dashboard: "/resultaten",
  map: "/kaart",
  sales: "/verkopen",
  admin: "/beheer",
  planning: "/werkgebieden",
  areas: "/gebieden",
  walk: "/lopen",
  tick: "/afvinken",
}

/** The address of a page: its path, and what of its state an address can hold. */
export function urlOf(page: Page): string {
  const params = new URLSearchParams()
  if (page.viewedAs && (page.view === "areas" || page.view === "walk" || page.view === "dashboard")) {
    params.set("werver", page.viewedAs.wervernr)
  }
  if (page.view === "dashboard" && page.period?.granularity === "week") params.set("per", "week")
  if (page.view === "dashboard" && page.period?.key) params.set("periode", page.period.key)
  if (page.view === "map" && page.map?.focus) params.set("gebied", page.map.focus.id)
  if (page.view === "map" && page.map?.assign) params.set("toewijzen", "")
  if (page.view === "walk" && page.walking) params.set("gebied", page.walking.id)
  if (page.view === "tick" && page.ticking) params.set("gebied", page.ticking.id)
  const search = params.toString().replace(/=(?=&|$)/g, "")
  return PATHS[page.view] + (search ? `?${search}` : "")
}

/**
 * The page at an address, as far as the address tells: after a reload, or a link. The map opens plain, a walk
 * (which needs its area) opens the list of areas, and a werver looked at is known by number only.
 */
export function pageFromUrl(pathname: string, search: string): Page {
  const path = pathname.replace(/\/+$/, "") || "/"
  const view = (Object.keys(PATHS) as View[]).find((v) => PATHS[v] === path) ?? "form"
  const werver = new URLSearchParams(search).get("werver")
  const viewedAs = werver ? { wervernr: werver, name: werver } : undefined
  if (view === "walk") return { view: "areas", viewedAs }
  if (view === "tick") return { view: "planning" }
  if (view === "map") return { view: "map", map: {} }
  if (view === "dashboard") return { view, viewedAs, period: periodFromUrl(search) }
  return { view, viewedAs }
}

/** `per=week` and `periode=2026-W41` or `periode=2026-10`; a key that does not fit the granularity is left out. */
function periodFromUrl(search: string): ResultsPeriod | undefined {
  const params = new URLSearchParams(search)
  const granularity: Granularity = params.get("per") === "week" ? "week" : "month"
  const key = params.get("periode") ?? ""
  const fits = granularity === "week" ? /^\d{4}-W\d{2}$/.test(key) : /^\d{4}-\d{2}$/.test(key)
  if (granularity === "month" && !fits) return undefined
  return { granularity, key: fits ? key : undefined }
}

function isEntry(state: unknown): state is Entry {
  return typeof state === "object" && state !== null && "view" in state && "depth" in state
}

/**
 * The current page and the ways to change it. `go` opens a page as a new history entry; `back` returns to the
 * previous one, or, when the app was opened right on this page, replaces it with `fallback`; `replace` changes the
 * current entry without adding one.
 */
export function useNavigation(initial: () => Page) {
  const [entry, setEntry] = useState<Entry>(() => {
    if (isEntry(window.history.state)) return window.history.state
    // The first page gets its address and state, so coming back to it restores it.
    const first = { ...initial(), depth: 0 }
    window.history.replaceState(first, "", keepDemo(urlOf(first)))
    return first
  })

  useEffect(() => {
    const restore = (event: PopStateEvent) => {
      setEntry(isEntry(event.state) ? event.state : { ...pageFromUrl(location.pathname, location.search), depth: 0 })
    }
    window.addEventListener("popstate", restore)
    return () => window.removeEventListener("popstate", restore)
  }, [])

  const go = useCallback(
    (page: Page) => {
      const next = { ...page, depth: entry.depth + 1 }
      window.history.pushState(next, "", keepDemo(urlOf(next)))
      window.scrollTo(0, 0)
      setEntry(next)
    },
    [entry.depth],
  )

  const back = useCallback(
    (fallback: Page) => {
      if (entry.depth > 0) return window.history.back()
      const next = { ...fallback, depth: 0 }
      window.history.replaceState(next, "", keepDemo(urlOf(next)))
      setEntry(next)
    },
    [entry.depth],
  )

  const replace = useCallback(
    (page: Page) => {
      const next = { ...page, depth: entry.depth }
      window.history.replaceState(next, "", keepDemo(urlOf(next)))
      setEntry(next)
    },
    [entry.depth],
  )

  // The depth tells entries apart: a page opened again is a new entry, so it can start fresh.
  return { page: entry as Page, depth: entry.depth, go, back, replace }
}

/** Dev only: keeps `?demo…` on every address, so a reload stays in the demo. */
function keepDemo(url: string): string {
  if (!import.meta.env.DEV) return url
  const demo = new URLSearchParams(window.location.search)
  if (!demo.has("demo")) return url
  const [path, search = ""] = url.split("?")
  const params = new URLSearchParams(search)
  params.set("demo", demo.get("demo") ?? "")
  return `${path}?${params.toString().replace(/=(?=&|$)/g, "")}`
}
