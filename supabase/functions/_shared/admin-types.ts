// Shared between the admin-users edge function and the web app.

export type AdminUser = {
  id: string
  email: string
  wervernaam: string
  wervernr: string
  isAdmin: boolean
  /** Whether the photo scan may fill in the customer's name and phone numbers for this recruiter. */
  scanContactFields: boolean
  /** The group this recruiter is in. */
  groupId: string | null
  /** The groups this person is a manager of, whether or not they are also in them. */
  managerOf: string[]
  status: "active" | "invited" | "disabled"
  invitedAt: string | null
  lastSignInAt: string | null
  submissions: number
}

/** A group of recruiters, usually an office. Who is in it and who manages it is on each AdminUser. */
export type AdminGroup = { id: string; name: string }
