import { useState, type FormEvent } from "react"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import type { AdminGroup, AdminUser } from "@shared/admin-types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { adminApi } from "@/lib/api"
import { getErrorMessage } from "@/lib/errors"
import { useAdminAction } from "./use-admin-users"

type Props = {
  /** The group to edit, or null to add a new one. */
  group: AdminGroup | null
  users: AdminUser[]
  groups: AdminGroup[]
  onClose: () => void
}

/** Toggles one id in a list. */
const toggled = (ids: string[], id: string, on: boolean) => (on ? [...ids, id] : ids.filter((other) => other !== id))

/**
 * Add or edit a group: its name, who is in it and who manages it. Mounted only while open (and keyed by group), so
 * its state starts fresh every time it opens.
 */
export function GroupDialog({ group, users, groups, onClose }: Props) {
  const [name, setName] = useState(group?.name ?? "")
  const [memberIds, setMemberIds] = useState(() =>
    group ? users.filter((user) => user.groupId === group.id).map((user) => user.id) : [],
  )
  const [managerIds, setManagerIds] = useState(() =>
    group ? users.filter((user) => user.managerOf.includes(group.id)).map((user) => user.id) : [],
  )
  const save = useAdminAction(() => adminApi.saveGroup(group?.id, { name, memberIds, managerIds }), {
    toastErrors: false,
  })
  const remove = useAdminAction(() => adminApi.deleteGroup(group!.id), { toastErrors: false })
  const error = save.error ?? remove.error

  // Someone blocked is only listed while they are still part of this group, so they can be taken out.
  const listed = users.filter(
    (user) => user.status !== "disabled" || memberIds.includes(user.id) || managerIds.includes(user.id),
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate(undefined, {
      onSuccess: () => {
        toast.success(group ? "Groep opgeslagen" : "Groep toegevoegd")
        onClose()
      },
    })
  }

  function handleDelete() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success(`Groep ${group!.name} verwijderd; de wervers staan nu zonder groep`)
        onClose()
      },
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{group ? "Groep bewerken" : "Groep toevoegen"}</DialogTitle>
            <DialogDescription>
              Een werver zit in één groep. Een manager mag meerdere groepen hebben en hoeft er zelf niet in te zitten.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{getErrorMessage(error)}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="group-name">Naam</FieldLabel>
              <Input id="group-name" required value={name} onChange={(event) => setName(event.target.value)} />
            </Field>

            <div>
              <div className="flex items-center gap-3 border-b pb-1 text-xs text-muted-foreground">
                <span className="min-w-0 flex-1">Gebruiker</span>
                <span className="w-14 text-center">In groep</span>
                <span className="w-14 text-center">Manager</span>
              </div>
              <ul className="max-h-[40svh] divide-y overflow-y-auto">
                {listed.map((user) => {
                  // In another group: joining this one takes them out of that, so say so.
                  const elsewhere =
                    user.groupId !== group?.id ? groups.find((other) => other.id === user.groupId)?.name : undefined
                  return (
                    <li key={user.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{user.wervernaam || user.email}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.wervernr}
                          {elsewhere && ` · nu in ${elsewhere}`}
                        </p>
                      </div>
                      <span className="flex w-14 justify-center">
                        <Switch
                          aria-label={`${user.wervernaam} in deze groep`}
                          checked={memberIds.includes(user.id)}
                          onCheckedChange={(on) => setMemberIds(toggled(memberIds, user.id, on))}
                        />
                      </span>
                      <span className="flex w-14 justify-center">
                        <Switch
                          aria-label={`${user.wervernaam} is manager van deze groep`}
                          checked={managerIds.includes(user.id)}
                          onCheckedChange={(on) => setManagerIds(toggled(managerIds, user.id, on))}
                        />
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </FieldGroup>

          <DialogFooter className="sm:justify-between">
            {group ? (
              <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete}>
                {remove.isPending ? <Spinner /> : <Trash2Icon />}
                Verwijderen
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Spinner />}
                {group ? "Opslaan" : "Toevoegen"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
