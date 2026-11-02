import { useState, type FormEvent } from "react"
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"
import type { AdminUser } from "@shared/admin-types"
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
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { adminApi, type AdminProfileInput } from "@/lib/api"
import { getErrorMessage } from "@/lib/errors"
import { useAdminAction } from "./use-admin-users"

type Props = {
  /** The recruiter to edit, or null to add a new one. */
  user: AdminUser | null
  isSelf: boolean
  onClose: () => void
}

/**
 * Add or edit a recruiter. Mounted only while open (and keyed by user), so its state starts fresh
 * every time it opens.
 */
export function UserDialog({ user, isSelf, onClose }: Props) {
  const [email, setEmail] = useState("")
  const [profile, setProfile] = useState<AdminProfileInput>({
    wervernaam: user?.wervernaam ?? "",
    wervernr: user?.wervernr ?? "",
    isAdmin: user?.isAdmin ?? false,
    scanContactFields: user?.scanContactFields ?? false,
  })
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const save = useAdminAction(
    async () => {
      if (user) return adminApi.update(user.id, profile)
      const { password } = await adminApi.invite(email.trim(), profile)
      setCreated({ email: email.trim(), password })
    },
    { toastErrors: false },
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate(undefined, {
      onSuccess: () => {
        if (!user) return
        toast.success("Wijzigingen opgeslagen")
        onClose()
      },
    })
  }

  if (created) return <CreatedDialog {...created} onClose={onClose} />

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{user ? "Werver bewerken" : "Werver toevoegen"}</DialogTitle>
            <DialogDescription>
              {user
                ? user.email
                : "De werver krijgt een eigen wachtwoord, dat je hierna te zien krijgt en zelf doorstuurt. Er gaat geen e-mail uit."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            {save.error && (
              <Alert variant="destructive">
                <AlertDescription>{getErrorMessage(save.error)}</AlertDescription>
              </Alert>
            )}
            {!user && (
              <Field>
                <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="wervernaam">Wervernaam</FieldLabel>
              <Input
                id="wervernaam"
                required
                value={profile.wervernaam}
                onChange={(event) => setProfile({ ...profile, wervernaam: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="wervernr">Wervernummer</FieldLabel>
              <Input
                id="wervernr"
                required
                value={profile.wervernr}
                onChange={(event) => setProfile({ ...profile, wervernr: event.target.value })}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="is-admin">Beheerder</FieldLabel>
                <FieldDescription>Mag wervers bekijken en toevoegen</FieldDescription>
              </FieldContent>
              <Switch
                id="is-admin"
                checked={profile.isAdmin}
                disabled={isSelf}
                onCheckedChange={(checked) => setProfile({ ...profile, isAdmin: checked })}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="scan-contact-fields">Naam en telefoon scannen</FieldLabel>
                <FieldDescription>De scanner vult ook naam en telefoonnummers in</FieldDescription>
              </FieldContent>
              <Switch
                id="scan-contact-fields"
                checked={profile.scanContactFields}
                onCheckedChange={(checked) => setProfile({ ...profile, scanContactFields: checked })}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              {user ? "Opslaan" : "Toevoegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Shows the new recruiter's password, the only time it can be seen. It closes only through its button, so a stray
 * click next to the dialog cannot lose the password.
 */
function CreatedDialog({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const message = [
    "Je account voor Z&M Sales staat klaar.",
    "",
    `Inloggen: ${window.location.origin}`,
    `E-mail: ${email}`,
    `Wachtwoord: ${password}`,
    "",
    "Wijzig je wachtwoord na het inloggen via het accountmenu.",
  ].join("\n")

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message)
      toast.success("Bericht gekopieerd")
    } catch {
      toast.error("Kopiëren lukte niet, selecteer het wachtwoord zelf")
    }
  }

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Werver toegevoegd</DialogTitle>
          <DialogDescription>
            {email} kan nu inloggen. Stuur het wachtwoord door: je ziet het hierna niet meer.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="py-4">
          <Field>
            <FieldLabel htmlFor="temporary-password">Wachtwoord</FieldLabel>
            <Input
              id="temporary-password"
              readOnly
              className="font-mono"
              value={password}
              onFocus={(event) => event.target.select()}
            />
            <FieldDescription>De werver wijzigt het na het inloggen via het accountmenu.</FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={copyMessage}>
            <CopyIcon />
            Kopieer bericht
          </Button>
          <Button type="button" onClick={onClose}>
            Klaar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
