# Handoff: WOZ index and bankafval in the Contracts API (ZMSuite)

The code is written on ZMSuite branch `jan/feature/sales-woz-bankafval`, in the worktree `~/workspace/zm/ZMSuite-woz`,
branched from local `jan/feature/sales-stats` (`fc146082`). Those last commits of `jan/feature/sales-stats` are not on
`origin` yet. Nothing is committed, pushed or deployed. The sales app's side is on `feature/groups-monteurs-afval`.

## Still to do

1. On Windows, build `Contracts.api/Contracts.sln` and run `SalesStatsDatabaseTests`, including the new
   `A_removed_customer_with_an_open_payment_is_bankafval_with_the_last_returned_debit`. It has not run: it needs
   LocalDB. It also proves the new `Payments` query translates at compatibility level 110.
2. Compare bankafval with what the back office expects, on TEST (query below).
3. Commit, deploy to TEST.

**Deploy order:** the API first, then the `kpi` and `sales-opportunities` functions. `sales-opportunities` requires the
new WOZ fields, so against today's API "Kansen" says "Onverwacht antwoord van de kansen" instead of showing euro bands
as percentages. The bankafval fields are optional: the dashboard shows no bankafval without them.

## WOZ index

A street's `wozIndex` is its average WOZ as a percentage of its gemeente's average, weighed by households. The
`woz=low|mid|high` bands stay equal-household thirds, now of the index. The answer has `indexLowBelow` and
`indexHighFrom` instead of `lowBelow` and `highFrom`, and `wozIndex` instead of `woz`.

Which postcodes make a gemeente comes from CBS, "Buurt, wijk en gemeente 2026 voor postcode huisnummer"
(`https://download.cbs.nl/postcode/pc6hnr20260801_gwb.zip`, 22 MB). `Data/cbs-pc6.csv.gz` in the worktree already has
them. For a new year, run this after `build-cbs-pc6.mjs`:

```bash
node Contracts.api/ZMAdmin.Documents/Data/add-gemeente-cbs-pc6.mjs pc6hnr20260801_gwb.csv
```

The table is per postcode and house number, so a postcode across a gemeente border goes to the gemeente with most of
its house numbers. In the current file: 405,934 postcodes in 342 gemeenten, 17 across a border, 114 without a gemeente
(1,665 households, which are only in "Alles"). The bands come out as low below 80% and high from 107%.

## Bankafval

ZMAdmin has no field for it. This is the definition in `BankAfval.cs`:

> **The contract is not cancelled, the customer has a `DeletedDate`, and a payment is still open** (`DatePaid`,
> `ManualPaidDate` and `StopPaymentProces` empty, as in the view `Contract_TotalDebt`).

- It catches "Eruit als terugkomt van de bank", the incasso check (`CheckIncassoViewModel`) and the acceptgiro run
  (`AcceptGiroRunViewModel`), which all remove a customer without cancelling the contract.
- The open payment keeps out customers cleaned up by `RemoveCustomersViewModel` and `DatabaseManagementWindowViewModel`.
- It leaves out customers still being collected, who have no `DeletedDate` yet.
- The moment is the last returned debit, or without one the `DeletedDate`. The incasso check can set a `DeletedDate` in
  the future, so a customer can count before that date.
- Reason codes are shown in words from a short list in `BankAfval.ReasonText`, because `BankReturns` has no grant.
  Other codes show as stored.

Check on TEST, which has not been done:

```sql
select count(*) bankafval, count(distinct c.Id) contracten
from Contracts c
join Customers k on k.Id = c.Customer_Id
where c.CompanyID = 1 and c.Recruiter_Id is not null and c.Cancelled = 0
  and k.DeletedDate is not null and c.StartDate >= '2026-01-01'
  and exists (select 1 from Payments p
              where p.ContractPayment_Payment_Id = c.Id
                and p.DatePaid is null and p.ManualPaidDate is null and p.StopPaymentProces is null);
```

## Days until afval

`afvalDelays` has per sale day, kind (`opgezegd` or `bank`) and number of days how many sales fell away. Cancellations
count from `CancelDate`, which is when the office entered them, so it includes their lag of a few days. The `kpi`
function removes it for anyone but admins.
