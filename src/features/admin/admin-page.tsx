import { useState } from "react"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  BanIcon,
  MailIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  ScanTextIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"
import type { AdminGroup, AdminUser } from "@shared/admin-types"
import { AppMenu } from "@/components/app-menu"
import { HEADER_BUTTON_CLASS, PAGE_WIDTH, PageHeader } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { adminApi } from "@/lib/api"
import { getErrorMessage } from "@/lib/errors"
import { GroupDialog } from "./group-dialog"
import { StatusBadge } from "./status-badge"
import { useAdminAction, useAdminUsers } from "./use-admin-users"
import { UserDialog } from "./user-dialog"

type Props = { currentUserId: string; onBack: () => void }

/** Admin-only overview of the groups and all recruiters, with invite, edit, resend invite and block/unblock. */
export function AdminPage({ currentUserId, onBack }: Props) {
  const admin = useAdminUsers()
  const users = admin.data?.users
  const groups = admin.data?.groups ?? []
  // undefined = closed, null = inviting a new recruiter, AdminUser = editing that recruiter.
  const [dialogUser, setDialogUser] = useState<AdminUser | null | undefined>(undefined)
  // The same for groups.
  const [dialogGroup, setDialogGroup] = useState<AdminGroup | null | undefined>(undefined)

  return (
    <div className="min-h-svh bg-muted">
      <PageHeader
        start={
          <Button variant="ghost" size="icon" className={HEADER_BUTTON_CLASS} aria-label="Terug" onClick={onBack}>
            <ArrowLeftIcon />
          </Button>
        }
        title="Beheer wervers"
        end={<AppMenu />}
      />

      <main className={`mx-auto flex flex-col gap-4 p-4 ${PAGE_WIDTH}`}>
        {users && (
          <section className="flex flex-col gap-2" aria-label="Groepen">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Groepen</h2>
              <Button variant="outline" size="sm" onClick={() => setDialogGroup(null)}>
                <PlusIcon /> Groep toevoegen
              </Button>
            </div>
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nog geen groepen. Maak er een aan per kantoor, met de wervers en de manager(s).
              </p>
            )}
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} users={users} onEdit={() => setDialogGroup(group)} />
            ))}
          </section>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {users ? `${users.length} gebruiker${users.length === 1 ? "" : "s"}` : "Laden…"}
          </p>
          <Button onClick={() => setDialogUser(null)}>
            <UserPlusIcon /> Werver toevoegen
          </Button>
        </div>

        {admin.error && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(admin.error)}</AlertDescription>
          </Alert>
        )}
        {admin.isPending && (
          <div className="flex justify-center p-12">
            <Spinner className="size-6" />
          </div>
        )}
        {users?.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            groups={groups}
            isSelf={user.id === currentUserId}
            onEdit={() => setDialogUser(user)}
          />
        ))}
      </main>

      {dialogUser !== undefined && (
        <UserDialog
          key={dialogUser?.id ?? "new"}
          user={dialogUser}
          groups={groups}
          isSelf={dialogUser?.id === currentUserId}
          onClose={() => setDialogUser(undefined)}
        />
      )}
      {dialogGroup !== undefined && (
        <GroupDialog
          key={dialogGroup?.id ?? "new"}
          group={dialogGroup}
          users={users ?? []}
          groups={groups}
          onClose={() => setDialogGroup(undefined)}
        />
      )}
    </div>
  )
}

function GroupCard({ group, users, onEdit }: { group: AdminGroup; users: AdminUser[]; onEdit: () => void }) {
  const members = users.filter((user) => user.groupId === group.id)
  const managers = users.filter((user) => user.managerOf.includes(group.id))
  return (
    <Card className="py-3">
      <CardContent className="flex items-center gap-3 px-4">
        <UsersIcon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{group.name}</p>
          <p className="text-xs text-muted-foreground">
            {members.length} {members.length === 1 ? "lid" : "leden"} ·{" "}
            {managers.length > 0
              ? `${managers.length === 1 ? "manager" : "managers"}: ${managers.map((m) => m.wervernaam).join(", ")}`
              : "geen manager"}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label={`${group.name} bewerken`} onClick={onEdit}>
          <PencilIcon />
        </Button>
      </CardContent>
    </Card>
  )
}

type UserCardProps = { user: AdminUser; groups: AdminGroup[]; isSelf: boolean; onEdit: () => void }

function UserCard({ user, groups, isSelf, onEdit }: UserCardProps) {
  const groupName = groups.find((group) => group.id === user.groupId)?.name
  const manages = groups.filter((group) => user.managerOf.includes(group.id))
  const resendInvite = useAdminAction(() => adminApi.resendInvite(user.id))
  const toggleBlocked = useAdminAction(() => adminApi.setDisabled(user.id, user.status !== "disabled"))

  return (
    <Card className="py-4">
      <CardContent className="flex items-start gap-3 px-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{user.wervernaam || "—"}</span>
            <StatusBadge status={user.status} />
            {groupName && <Badge variant="secondary">{groupName}</Badge>}
            {manages.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <UsersIcon /> Manager {manages.map((group) => group.name).join(", ")}
              </Badge>
            )}
            {user.isAdmin && (
              <Badge variant="outline" className="gap-1">
                <ShieldCheckIcon /> Beheerder
              </Badge>
            )}
            {user.scanContactFields && (
              <Badge variant="outline" className="gap-1">
                <ScanTextIcon /> Scant naam en telefoon
              </Badge>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Wervernr. {user.wervernr || "—"} · {user.submissions} formulier{user.submissions === 1 ? "" : "en"} ·{" "}
            {user.status === "invited"
              ? `uitgenodigd ${formatDate(user.invitedAt)}`
              : `laatst ingelogd ${formatDate(user.lastSignInAt)}`}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Acties voor ${user.email}`}>
              <MoreVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon /> Bewerken
            </DropdownMenuItem>
            {user.status === "invited" && (
              <DropdownMenuItem
                onClick={() =>
                  resendInvite.mutate(undefined, {
                    onSuccess: () => toast.success(`Uitnodiging opnieuw verstuurd naar ${user.email}`),
                  })
                }
              >
                <MailIcon /> Uitnodiging opnieuw sturen
              </DropdownMenuItem>
            )}
            {!isSelf && (
              <DropdownMenuItem
                variant={user.status === "disabled" ? "default" : "destructive"}
                onClick={() =>
                  toggleBlocked.mutate(undefined, {
                    onSuccess: () =>
                      toast.success(user.status === "disabled" ? "Gebruiker gedeblokkeerd" : "Gebruiker geblokkeerd"),
                  })
                }
              >
                <BanIcon /> {user.status === "disabled" ? "Deblokkeren" : "Blokkeren"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}

function formatDate(value: string | null): string {
  if (!value) return "nooit"
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
}
