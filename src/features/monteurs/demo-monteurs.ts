import type { MonteurHome } from "./monteur-homes"

// Dev only (`?demo&kaart`): made-up monteurs, kept in memory so a home added shows on the map until the page reloads.

let homes: MonteurHome[] = [
  {
    id: "demo-1",
    name: "Demo monteur Amersfoort",
    postcode: "3813AA",
    huisnummer: "1",
    toevoeging: "",
    straat: "Voorbeeldstraat",
    plaats: "Amersfoort",
    lon: 5.387,
    lat: 52.156,
  },
  {
    id: "demo-2",
    name: "Demo monteur Utrecht",
    postcode: "3511AA",
    huisnummer: "2",
    toevoeging: "",
    straat: "Voorbeeldlaan",
    plaats: "Utrecht",
    lon: 5.121,
    lat: 52.09,
  },
  {
    id: "demo-3",
    name: "Demo monteur Zwolle",
    postcode: "8011AA",
    huisnummer: "3",
    toevoeging: "",
    straat: "Voorbeeldweg",
    plaats: "Zwolle",
    lon: 6.09,
    lat: 52.51,
  },
]

export const demoMonteurHomes = () => homes

export function demoAddMonteurHome(home: Omit<MonteurHome, "id">) {
  homes = [...homes, { ...home, id: crypto.randomUUID() }].sort((a, b) => a.name.localeCompare(b.name, "nl"))
}

export function demoDeleteMonteurHome(id: string) {
  homes = homes.filter((home) => home.id !== id)
}
