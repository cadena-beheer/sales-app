import { useState } from "react"
import { CHANGELOG, forPerson, unseenReleases } from "./changelog"

const SEEN_KEY = "whats-new-seen"

// Per device, in the browser: only a convenience. If storage is unavailable the news shows again, which is harmless.
function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function writeSeen(id: string) {
  try {
    localStorage.setItem(SEEN_KEY, id)
  } catch {
    // Shown again next time; nothing lost.
  }
}

/**
 * "Wat is er nieuw": after an update, the releases this device has not seen yet open once on their own; the menu
 * opens all of them. Closing marks the newest as seen. Worked out on every render, so the sales manager's changes
 * appear once the profile has loaded.
 */
export function useWhatsNew(admin: boolean) {
  const [shown, setShown] = useState<"unseen" | "all" | null>(() =>
    unseenReleases(readSeen(), true).length > 0 ? "unseen" : null,
  )
  const releases =
    shown === "all" ? forPerson(CHANGELOG, admin) : shown === "unseen" ? unseenReleases(readSeen(), admin) : []

  return {
    releases: releases.length > 0 ? releases : null,
    openAll: () => setShown("all"),
    close: () => {
      if (CHANGELOG[0]) writeSeen(CHANGELOG[0].id)
      setShown(null)
    },
  }
}
