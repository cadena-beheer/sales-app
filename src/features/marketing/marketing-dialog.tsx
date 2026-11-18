import { useState, type FormEvent } from "react"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/errors"
import { formatDay, today } from "../dashboard/periods"
import { parsePostcodes, type MarketingAction } from "./marketing-actions"
import { useAddMarketingAction, useDeleteMarketingAction } from "./use-marketing"

type Props = { actions: MarketingAction[]; onClose: () => void }

const KINDS = ["Flyers", "Deurhangers", "Poster", "Huis-aan-huisblad", "Online advertentie"]

/** Enter or remove marketing actions, per area. */
export function MarketingDialog({ actions, onClose }: Props) {
  const [kind, setKind] = useState("")
  const [doneOn, setDoneOn] = useState(today())
  const [codes, setCodes] = useState("")
  const [invalid, setInvalid] = useState<string | null>(null)
  const add = useAddMarketingAction()
  const remove = useDeleteMarketingAction()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const { postcodes, wrong } = parsePostcodes(codes)
    if (wrong.length > 0 || postcodes.length === 0) {
      setInvalid(wrong.length > 0 ? `Geen postcode: ${wrong.join(", ")}` : "Vul minstens één postcode in")
      return
    }
    setInvalid(null)
    add.mutate(
      { kind: kind.trim(), doneOn, postcodes },
      {
        onSuccess: () => {
          toast.success(`${kind.trim()} staat op de kaart`)
          setKind("")
          setCodes("")
        },
      },
    )
  }

  const problem = invalid ?? (add.error ? getErrorMessage(add.error) : null)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marketingacties</DialogTitle>
          <DialogDescription>Acties per gebied, zodat je de wervers eromheen kunt plannen.</DialogDescription>
        </DialogHeader>

        <ul className="max-h-[30svh] divide-y overflow-y-auto">
          {actions.length === 0 && <li className="py-2 text-sm text-muted-foreground">Nog geen acties ingevoerd.</li>}
          {actions.map((action) => (
            <li key={action.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {action.kind} · {formatDay(action.doneOn)} {action.doneOn.slice(0, 4)}
                </p>
                <p className="truncate text-xs text-muted-foreground">{action.postcodes.join(", ")}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${action.kind} verwijderen`}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(action.id, {
                    onSuccess: () => toast.success(`${action.kind} verwijderd`),
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
            {problem && (
              <Alert variant="destructive">
                <AlertDescription>{problem}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-[1fr_9rem] gap-2">
              <Field>
                <FieldLabel htmlFor="marketing-kind">Soort actie</FieldLabel>
                <Input
                  id="marketing-kind"
                  required
                  maxLength={60}
                  list="marketing-kinds"
                  autoComplete="off"
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                />
                <datalist id="marketing-kinds">
                  {KINDS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </Field>
              <Field>
                <FieldLabel htmlFor="marketing-date">Datum</FieldLabel>
                <Input
                  id="marketing-date"
                  type="date"
                  required
                  value={doneOn}
                  onChange={(event) => setDoneOn(event.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="marketing-postcodes">Postcodes</FieldLabel>
              <Textarea
                id="marketing-postcodes"
                rows={2}
                value={codes}
                onChange={(event) => setCodes(event.target.value)}
              />
              <FieldDescription>Met komma's ertussen, bijvoorbeeld 3811, 3812A, 3813 AB</FieldDescription>
            </Field>
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
