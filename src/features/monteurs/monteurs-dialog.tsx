import { useState, type FormEvent } from "react"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/errors"
import { homeAddress, type MonteurHome } from "./monteur-homes"
import { useAddMonteurHome, useDeleteMonteurHome } from "./use-monteurs"

type Props = { homes: MonteurHome[]; onClose: () => void }

const EMPTY = { name: "", postcode: "", huisnummer: "", toevoeging: "" }

/** Enter or remove the homes of the monteurs. The location comes from the address. */
export function MonteursDialog({ homes, onClose }: Props) {
  const [home, setHome] = useState(EMPTY)
  const add = useAddMonteurHome()
  const remove = useDeleteMonteurHome()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    add.mutate(home, {
      onSuccess: () => {
        toast.success(`${home.name.trim()} staat op de kaart`)
        setHome(EMPTY)
      },
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Monteurs</DialogTitle>
          <DialogDescription>Waar de monteurs wonen. Alleen beheerders zien deze adressen en pins.</DialogDescription>
        </DialogHeader>

        <ul className="max-h-[30svh] divide-y overflow-y-auto">
          {homes.length === 0 && <li className="py-2 text-sm text-muted-foreground">Nog geen monteurs ingevoerd.</li>}
          {homes.map((h) => (
            <li key={h.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{h.name}</p>
                <p className="truncate text-xs text-muted-foreground">{homeAddress(h)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${h.name} verwijderen`}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(h.id, {
                    onSuccess: () => toast.success(`${h.name} verwijderd`),
                    onError: (error) => toast.error(getErrorMessage(error)),
                  })
                }
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-3 border-t pt-4">
            {add.error && (
              <Alert variant="destructive">
                <AlertDescription>{getErrorMessage(add.error)}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="monteur-name">Naam</FieldLabel>
              <Input
                id="monteur-name"
                required
                maxLength={100}
                value={home.name}
                onChange={(event) => setHome({ ...home, name: event.target.value })}
              />
            </Field>
            <div className="grid grid-cols-[1fr_5rem_5rem] gap-2">
              <Field>
                <FieldLabel htmlFor="monteur-postcode">Postcode</FieldLabel>
                <Input
                  id="monteur-postcode"
                  required
                  autoComplete="off"
                  value={home.postcode}
                  onChange={(event) => setHome({ ...home, postcode: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="monteur-huisnummer">Huisnr.</FieldLabel>
                <Input
                  id="monteur-huisnummer"
                  required
                  inputMode="numeric"
                  value={home.huisnummer}
                  onChange={(event) => setHome({ ...home, huisnummer: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="monteur-toevoeging">Toev.</FieldLabel>
                <Input
                  id="monteur-toevoeging"
                  maxLength={10}
                  value={home.toevoeging}
                  onChange={(event) => setHome({ ...home, toevoeging: event.target.value })}
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={add.isPending}>
                {add.isPending && <Spinner />}
                Toevoegen
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
