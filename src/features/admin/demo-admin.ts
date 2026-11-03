import type { AdminGroup, AdminUser } from "@shared/admin-types"

// Dev only (`?demo&beheer`): the admin-users function's answers from made-up people, kept in memory so a change shows
// up until the page reloads.

const person = (id: string, wervernaam: string, wervernr: string, extra: Partial<AdminUser> = {}): AdminUser => ({
  id,
  email: `${wervernaam.split(" ")[0].toLowerCase()}@example.com`,
  wervernaam,
  wervernr,
  isAdmin: false,
  scanContactFields: false,
  groupId: null,
  managerOf: [],
  status: "active",
  invitedAt: null,
  lastSignInAt: "2026-10-30T08:12:00Z",
  submissions: 12,
  ...extra,
})

let groups: AdminGroup[] = [
  { id: "demo-utrecht", name: "Kantoor Utrecht" },
  { id: "demo-zwolle", name: "Kantoor Zwolle" },
]

let users: AdminUser[] = [
  person("demo-jan", "Jan van Dorth", "0212BB", { isAdmin: true, submissions: 3 }),
  person("demo-sanne", "Sanne de Wit", "0144SV", { groupId: "demo-utrecht", managerOf: ["demo-utrecht"] }),
  person("demo-daan", "Daan Smit", "0187DS", { groupId: "demo-utrecht" }),
  person("demo-lotte", "Lotte Bakker", "0301LB", { groupId: "demo-utrecht" }),
  person("demo-yara", "Yara Haddou", "0322YH", { groupId: "demo-zwolle", managerOf: ["demo-zwolle"] }),
  person("demo-mehmet", "Mehmet Kaya", "1210AP", { groupId: "demo-zwolle" }),
  person("demo-noor", "Noor Hendriks", "2303GM"),
]

type Body = Record<string, unknown>

export function demoAdminCall(body: Body): unknown {
  switch (body.action) {
    case "list":
      return { users, groups }
    case "invite":
      users = [...users, person(crypto.randomUUID(), String(body.wervernaam), String(body.wervernr), profile(body))]
      users.at(-1)!.email = String(body.email)
      return { ok: true, password: "demo-wachtwoord" }
    case "update":
      users = users.map((user) => (user.id === body.id ? { ...user, ...profile(body) } : user))
      return { ok: true }
    case "setDisabled":
      users = users.map((user) =>
        user.id === body.id ? { ...user, status: body.disabled ? "disabled" : "active" } : user,
      )
      return { ok: true }
    case "saveGroup": {
      const id = (body.id as string | undefined) ?? crypto.randomUUID()
      const name = String(body.name).trim()
      if (groups.some((group) => group.id !== id && group.name.toLowerCase() === name.toLowerCase())) {
        throw new Error("Er is al een groep met deze naam")
      }
      groups = [...groups.filter((group) => group.id !== id), { id, name }]
      groups.sort((a, b) => a.name.localeCompare(b.name, "nl"))
      const members = body.memberIds as string[]
      const managers = body.managerIds as string[]
      users = users.map((user) => ({
        ...user,
        groupId: members.includes(user.id) ? id : user.groupId === id ? null : user.groupId,
        managerOf: [...user.managerOf.filter((group) => group !== id), ...(managers.includes(user.id) ? [id] : [])],
      }))
      return { ok: true }
    }
    case "deleteGroup":
      groups = groups.filter((group) => group.id !== body.id)
      users = users.map((user) => ({
        ...user,
        groupId: user.groupId === body.id ? null : user.groupId,
        managerOf: user.managerOf.filter((group) => group !== body.id),
      }))
      return { ok: true }
    default:
      return { ok: true }
  }
}

function profile(body: Body): Partial<AdminUser> {
  return {
    wervernaam: String(body.wervernaam),
    wervernr: String(body.wervernr),
    isAdmin: Boolean(body.isAdmin),
    scanContactFields: Boolean(body.scanContactFields),
    groupId: (body.groupId as string | null | undefined) ?? null,
  }
}
