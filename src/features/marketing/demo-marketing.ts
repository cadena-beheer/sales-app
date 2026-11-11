import type { MarketingAction, NewMarketingAction } from "./marketing-actions"

// Dev only (`?demo&kaart`): made-up actions, kept in memory so an action added shows on the map until the page reloads.

let actions: MarketingAction[] = [
  { id: "demo-1", kind: "Flyers", doneOn: "2026-10-12", postcodes: ["3814", "3815"] },
  { id: "demo-2", kind: "Deurhangers", doneOn: "2026-09-28", postcodes: ["3821", "3822A"] },
]

export const demoMarketingActions = () => actions

export function demoAddMarketingAction(action: NewMarketingAction) {
  actions = [{ ...action, id: crypto.randomUUID() }, ...actions]
}

export function demoDeleteMarketingAction(id: string) {
  actions = actions.filter((action) => action.id !== id)
}
