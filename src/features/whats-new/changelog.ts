/**
 * What changed for the people using the app, newest release first. After an update the app shows the releases a
 * device has not seen yet, once ("Wat is er nieuw"); the menu shows them all. Add a release at the top when a change
 * is worth telling the wervers; its `id` must be new, and only the newest id is remembered.
 */
export type Release = {
  id: string
  /** yyyy-MM-dd */
  date: string
  changes: Change[]
}

export type Change = {
  title: string
  text: string
  /** Only for the sales manager. */
  adminOnly?: boolean
}

export const CHANGELOG: Release[] = [
  {
    id: "2026-11-foto-eerst",
    date: "2026-11-18",
    changes: [
      {
        title: "Elk formulier begint met een foto van het contract",
        text:
          "Maak eerst een foto van het papieren contract. Het formulier wordt daarna voor je ingevuld; jij controleert " +
          "het en verstuurt. Zonder foto kan een formulier niet meer worden verstuurd.",
      },
      {
        title: "Onleesbare foto? Maak een nieuwe",
        text:
          "Is de foto te donker, te licht, onscherp of staat het contract er niet helemaal op, dan vraagt de app om " +
          "een nieuwe foto. De foto wordt daarna netjes bijgesneden, als een scan.",
      },
      {
        title: "Ook zonder internet",
        text: "Geen verbinding? De foto wordt bewaard en gaat mee zodra je weer online bent. Het formulier vul je dan zelf in.",
      },
      {
        title: "Verkopen per contractdatum",
        text:
          "Mijn verkopen toont de verkopen op de datum van het contract. Is een verkoop op een andere dag verstuurd, " +
          "dan zie je dat aan het oranje label.",
      },
      {
        title: "Afval: alleen wat telt",
        text:
          "Bij de resultaten zie je alleen nog opzeggingen binnen 14 dagen en bankafval. Bankafval telt voortaan altijd " +
          "mee voor netto.",
      },
    ],
  },
]

/** The releases newer than the one last seen (all when none was seen), with what applies to this person. */
export function unseenReleases(lastSeen: string | null, admin: boolean, changelog = CHANGELOG): Release[] {
  const seenAt = lastSeen === null ? -1 : changelog.findIndex((release) => release.id === lastSeen)
  const unseen = seenAt === -1 ? changelog : changelog.slice(0, seenAt)
  return forPerson(unseen, admin)
}

/** The changes that apply to this person; a release with none left is dropped. */
export function forPerson(releases: Release[], admin: boolean): Release[] {
  return releases
    .map((release) => ({ ...release, changes: release.changes.filter((change) => admin || !change.adminOnly) }))
    .filter((release) => release.changes.length > 0)
}
