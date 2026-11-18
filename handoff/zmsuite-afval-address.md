# Handoff: address of fallen-away customers in the Contracts API (ZMSuite)

The dashboard's "Afgevallen klanten" shows street and house number with a button to Street View, instead of the
customer's name. `GET /Sales/2026.1/Stats` does not send the address yet.

The code is written on ZMSuite branch `jan/feature/sales-stats-address`, in the worktree `~/workspace/zm/ZMSuite-address`,
from `origin/main` as last fetched here (`55875332`). It is committed there (`130481f5`), not pushed or deployed. It has not been built or
run: on the Mac the NuGet feed answers 401 and a project needs the Windows SDK. On Windows, build `Contracts.api` and run
`SalesStatsSnapshotTests` and `SalesStatsDatabaseTests` (the last needs LocalDB).

The app shows the button on every row with a street; the fields are optional in `salesStatsSchema`, so until the
endpoint sends them a row shows the name and no button.

## What to add

To both `SalesStatsCancellation` and `SalesStatsBankAfval` (`ZMAdmin.Contracts/Responses/Sales/SalesStatsResponse.cs`):

| Field         | Example       | From                                     |
| ------------- | ------------- | ---------------------------------------- |
| `Street`      | `Dorpsstraat` | `Addresses.Street` of the home address   |
| `HouseNumber` | `12A`         | `Addresses.HouseNr` + `HouseNrAddition`  |
| `Postcode`    | `3511AB`      | `SoldContract.PostalCode`, already there |

Empty strings when there is no home address.

## Where

1. `SalesStatsSource.cs`: add `a.Street`, `a.HouseNr` and `a.HouseNrAddition` to the `homes` select, next to `a.City` and
   `a.PostalCode`.
2. `SoldContract.cs`: two optional parameters, `Street` and `HouseNumber`.
3. `SalesStatsSnapshot.Answer`: set the three fields in both `Select`s. Those lists stay empty for the whole team, so a
   recruiter's request only ever gets their own customers' addresses.

The app gets the location for Street View from PDOK with the postcode and house number, so the API sends no coordinates.
