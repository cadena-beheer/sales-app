import type { Door } from "@/features/areas/doors"

/** Where a monteur lives: a pin on the "kansen" map. Home addresses, so only admins can read them. */
export type MonteurHome = {
  id: string
  name: string
  postcode: string
  huisnummer: string
  toevoeging: string
  straat: string
  plaats: string
  lon: number
  lat: number
}

export type NewMonteurHome = Pick<MonteurHome, "name" | "postcode" | "huisnummer" | "toevoeging">

const bare = (text: string) => text.replace(/[\s-]/g, "").toLowerCase()

/**
 * The address a monteur's home is at, among the addresses of a postcode and house number: the one with this addition,
 * or otherwise the first. The BAG writes additions in its own way, and a pin next door is still the right place.
 */
export function homeDoor(doors: Door[], toevoeging: string): Door | undefined {
  const located = doors.filter((door) => door.at)
  return located.find((door) => bare(door.toevoeging) === bare(toevoeging)) ?? located[0]
}

/** "Kerkstraat 12A, Amersfoort". */
export function homeAddress(home: MonteurHome): string {
  const street = home.straat || home.postcode
  return `${street} ${home.huisnummer}${home.toevoeging}${home.plaats ? `, ${home.plaats}` : ""}`
}
