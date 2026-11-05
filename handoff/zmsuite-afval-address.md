# Handoff: address of fallen-away customers in the Contracts API (ZMSuite)

The dashboard's "Afgevallen klanten" shows street and house number with a button to Street View, instead of the
customer's name. `GET /Sales/2026.1/Stats` does not send the address yet. Nothing is changed in ZMSuite. Until it is, the
app shows the name and no button; the fields are optional in `salesStatsSchema`, so the order of deploying does not
matter.

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
