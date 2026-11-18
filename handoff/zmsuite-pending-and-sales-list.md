# Handoff: one truth for "Verkopen" and "Resultaten" (ZMSuite side)

The sales app shows sales in two places that disagree:

- **Verkopen** lists what was sent from the app (Supabase `submissions`, now by contract date). Paper contracts
  the office enters by hand in ZMAdmin are missing.
- **Resultaten** counts what is in ZMAdmin (`GET .../Sales/2026.1/Stats`). App sales whose onboarding failed and
  sit on **"Actie nodig"** in the office's intake-failure grid are missing until someone re-enters them.

The fix: ZMAdmin is the source of truth, and both screens also show what is still on its way. That needs three
changes in the Contracts API. Match key between the two systems: the **klantnummer** (`Contracts.RegNr`, which
onboarding returns as `regNr` on 202). `DSRowId` (the app's row id) is sent with every onboarding request but not
stored on the contract; storing it would make matching exact (optional, item 4).

## 1. Stats: count "Actie nodig" per sale day and recruiter

Add `pending` to `days[]` in `SalesStatsResponse`:

```jsonc
{ "date": "2026-11-17", "recruiter": "0212BB", "sold": 6, "cancelled": 1, "bankAfval": 0, "pending": 2 }
```

- `pending` = open intake failures (`IntakeFailureStatus.Open`, the grid's "Actie nodig") of flow `Onboarding`,
  source `Appeee`, grouped by the contract date and recruiter code in their `RawPayload` (payload version
  `2026.1`, `AppeeePaperContractRequest`).
- Not in `sold`: the app adds it to bruto itself, so it can show "+2 wachten op kantoor".
- Once the office retries or enters it by hand it becomes a contract (status Hersteld) and moves to `sold`; if
  closed without entering (Vervallen) it drops out.

## 2. Stats: reasons with how long after the sale

The results now only show cancellations within 14 days (and all bankafval). For one recruiter the app filters
`cancellations[]` itself. For the team it only has `reasons[] {date, recruiter, reason, count}` with no age, so the
team's reasons still include later cancellations (the app says so under the list). Add `days` (whole days from
`StartDate` to `CancelDate`) to each `reasons[]` row, grouped like now plus `days` — or simpler, a `within14` count
per row.

## 3. New endpoint: the contracts of one day

`GET /Sales/2026.1/Contracts?date=yyyy-MM-dd&recruiter=0212BB` (recruiter optional for admins = everyone), same
`ApiKeyPolicy`, same Company filter as Stats:

```jsonc
{
  "contracts": [
    {
      "regNr": "7000123",
      "recruiter": "0212BB",
      "soldOn": "2026-11-17",          // Contracts.StartDate
      "enteredOn": "2026-11-18T09:12:00", // when it was created in ZMAdmin
      "source": "app" | "papier",      // app = came in through onboarding
      "name": "P.J. Jansen", "street": "Kerkstraat", "houseNumber": "12", "postcode": "3511AB", "city": "Utrecht",
      "cancelled": false
    }
  ],
  "pending": [
    // the open intake failures of that day, same shape, plus the failure message for the office's wording
    { "regNr": "7000124", "recruiter": "0212BB", "soldOn": "2026-11-17", "dsRowId": "…", "message": "…" }
  ]
}
```

The app then merges per day: ZMAdmin's contracts (badge App / Papier), plus app submissions without a matching
`regNr` (badge Actie nodig / Geweigerd / Wachtrij from the app's own onboarding status). Verkopen and Resultaten
then count the same sales.

## 4. Optional: store `DSRowId` on the contract

If onboarding wrote `DSRowId` to the contract (or a link table), the app could match on its own row id instead of
the klantnummer the recruiter wrote on the paper (which can be mistyped).
