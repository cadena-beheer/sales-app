// Shared between the sales-issues edge function and the web app: where we solved storingen, per street, from the
// Contracts API (GET .../Sales/2026.1/Issues). No addresses or customers: a count and a place per postcode. No Deno
// APIs here.
import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum")

export const salesIssuesRequestSchema = z.object({ from: isoDate, to: isoDate })

export type SalesIssuesRequest = z.input<typeof salesIssuesRequestSchema>

export const salesIssuesSchema = z.object({
  issues: z.array(
    z.object({
      postcode: z.string().regex(/^\d{4}[A-Z]{2}$/),
      /** The middle of the postcode. */
      lon: z.number(),
      lat: z.number(),
      /** Storingen solved here in the period. */
      count: z.number().int(),
      lastOn: isoDate,
    }),
  ),
})

export type SalesIssues = z.infer<typeof salesIssuesSchema>
export type SalesIssue = SalesIssues["issues"][number]

export type SalesIssuesResponse = SalesIssues & { demo: boolean }
