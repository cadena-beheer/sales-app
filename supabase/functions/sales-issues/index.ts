import { requireUser } from "../_shared/auth.ts"
import { issuesUrl } from "../_shared/contracts-api.ts"
import { optionalEnv } from "../_shared/env.ts"
import { HttpError, json, serve } from "../_shared/http.ts"
import { demoSalesIssues } from "../_shared/sales-issues-demo.ts"
import { salesIssuesRequestSchema, salesIssuesSchema, type SalesIssuesResponse } from "../_shared/sales-issues.ts"
import { isTestRequest } from "../_shared/test-request.ts"

// Where storingen were solved, per street, for the map. Admins only for now, like the monteurs' homes. Without
// STATS_API_KEY the answers are made up (demo mode).

serve(async (req) => {
  // Only the test deployment shows the map for now; the production app never asks.
  if (!isTestRequest(req)) throw new HttpError(404, "De kaart is alleen in de testversie")
  const { supabase, user } = await requireUser(req)
  const parsed = salesIssuesRequestSchema.safeParse(await req.json())
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Ongeldig verzoek")

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) throw new HttpError(403, "Geen beheerrechten")

  const { from, to } = parsed.data
  const key = optionalEnv("STATS_API_KEY")
  const issues = key ? await fetchIssues(key, from, to) : demoSalesIssues(from, to)
  const response: SalesIssuesResponse = { demo: !key, ...issues }
  return json(response)
})

async function fetchIssues(key: string, from: string, to: string) {
  const url = new URL(issuesUrl())
  url.searchParams.set("from", from)
  url.searchParams.set("to", to)
  const response = await fetch(url, {
    headers: { "X-API-Key": key, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  }).catch((error) => {
    console.error("Issues endpoint unreachable", error)
    throw new HttpError(502, "De storingen zijn nu niet bereikbaar")
  })
  const text = await response.text()
  if (!response.ok) {
    console.error(`Issues endpoint answered ${response.status}: ${text.slice(0, 500)}`)
    throw new HttpError(502, "De storingen zijn nu niet bereikbaar")
  }
  const parsed = salesIssuesSchema.safeParse(JSON.parse(text))
  if (!parsed.success) {
    console.error("Unexpected answer from the issues endpoint", parsed.error.issues)
    throw new HttpError(502, "Onverwacht antwoord van de storingen")
  }
  return parsed.data
}
