/** A marketing action in an area, such as flyers, on the "kansen" map. */
export type MarketingAction = { id: string; kind: string; doneOn: string; postcodes: string[] }

export type NewMarketingAction = Omit<MarketingAction, "id">

/**
 * The postcodes in what someone typed, separated by commas, semicolons or new lines: "3811, 3812 ab" as
 * ["3811", "3812AB"]. Null with the ones that are no postcode, so they can be named.
 */
export function parsePostcodes(text: string): { postcodes: string[]; wrong: string[] } {
  const parts = text
    .split(/[,;\n]+/)
    .map((part) => part.replace(/\s/g, "").toUpperCase())
    .filter(Boolean)
  return {
    postcodes: [...new Set(parts.filter((part) => /^[1-9]\d{3}[A-Z]{0,2}$/.test(part)))],
    wrong: parts.filter((part) => !/^[1-9]\d{3}[A-Z]{0,2}$/.test(part)),
  }
}

/** The actions in an area: a code covers every postcode it starts, either way round. */
export function actionsAt(actions: MarketingAction[], postcode: string): MarketingAction[] {
  return actions.filter((action) => action.postcodes.some((c) => c.startsWith(postcode) || postcode.startsWith(c)))
}
