import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import type { Session } from "@supabase/supabase-js"
import type { FormInput, FormValues } from "@shared/form-schema"
import { Spinner } from "@/components/ui/spinner"
import { doorLabel, type Door } from "@/features/areas/doors"
import { useOnline } from "@/hooks/use-online"
import { useProfile } from "@/hooks/use-profile"
import { getErrorMessage } from "@/lib/errors"
import { OutboxDialog } from "../outbox/outbox-dialog"
import type { OutboxItem } from "../outbox/outbox-store"
import { useOutbox } from "../outbox/use-outbox"
import { salesFormSchema } from "./contract-date"
import { clearDraft } from "./draft-store"
import { createEmptyForm, today } from "./form-defaults"
import { FormHeader } from "./form-header"
import type { SalesFormApi } from "./form-types"
import { SalesForm } from "./sales-form"
import { ScanOverlay } from "./scan-overlay"
import { ScannedDateDialog } from "./scanned-date-dialog"
import { useDraft } from "./use-draft"
import { CaptureScreen } from "./capture-screen"
import { PhotoCard } from "./photo-card"
import { deleteScanPhoto } from "./scan-photo-store"
import { ScanRejectedDialog } from "./scan-rejected-dialog"
import { useContractPhoto } from "./use-contract-photo"
import { useScanFill } from "./use-scan-fill"

type Props = {
  session: Session
  /** Whether the outbox dialog is open; the menu on any page opens it. */
  outboxOpen: boolean
  onOutboxOpenChange: (open: boolean) => void
  onOpenSales: () => void
  /** A door marked "Verkocht" while walking: its address goes into the form. */
  soldAt?: Door | null
  onSoldAtFilled?: () => void
  /** Back to the walk the form was opened from; unset when it was opened any other way. */
  onBack?: () => void
}

/**
 * Main page after login: header, the sales form, the outbox dialog and the scan overlay. A form without a contract
 * photo shows the camera screen instead of the fields: every sale starts with the photo.
 */
export function FormPage(props: Props) {
  const { session, outboxOpen, onOutboxOpenChange: setOutboxOpen, onOpenSales, soldAt, onSoldAtFilled, onBack } = props
  const userId = session.user.id
  const online = useOnline()
  const profile = useProfile(userId)
  const outbox = useOutbox(userId)
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(salesFormSchema),
    defaultValues: createEmptyForm(),
    mode: "onTouched",
  })
  const { ready } = useDraft(form, userId)
  useSoldAt(form, ready, soldAt, onSoldAtFilled)
  // A new rowId means a new form; used as key so the form's local state (e.g. manual address) resets too.
  const rowId = useWatch({ control: form.control, name: "rowId" })
  const scanPath = useWatch({ control: form.control, name: "scanPath" })
  const contractPhoto = useContractPhoto(rowId)
  const scanFill = useScanFill(form, userId, contractPhoto.save)
  const [submitting, setSubmitting] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  // A draft from an app version before the photo was kept on the phone only has its path.
  const hasPhoto = contractPhoto.photo !== null || scanPath !== ""

  /** Starts over. The photo of the old form goes too, unless the form still needs it in the outbox. */
  async function startNewForm({ keepPhoto = false } = {}) {
    if (!keepPhoto) await deleteScanPhoto(form.getValues("rowId"))
    await clearDraft(userId)
    form.reset(createEmptyForm())
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSubmit(values: FormValues) {
    if (!hasPhoto) {
      toast.error("Maak eerst een foto van het contract")
      return
    }
    setSubmitting(true)
    try {
      const result = await outbox.submit(values)
      if (result === "sent") {
        toast.success("Formulier verstuurd", { action: { label: "Bekijk mijn verkopen", onClick: onOpenSales } })
      } else toast.info("Offline opgeslagen — wordt automatisch verstuurd zodra je weer online bent")
      await startNewForm({ keepPhoto: result === "queued" })
    } catch (error) {
      toast.error(getErrorMessage(error, "Versturen mislukt"))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDiscard() {
    await startNewForm()
    toast("Nieuw formulier gestart")
  }

  /** Moves a queued form back into the editor, e.g. to fix a rejected field. */
  function openCamera() {
    scanFill.dismissRejection()
    photoInput.current?.click()
  }

  async function handleEditQueued(item: OutboxItem) {
    await outbox.remove(item.values.rowId)
    form.reset(item.values)
    setOutboxOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast("Formulier uit de wachtrij geopend")
  }

  function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0]
    event.target.value = "" // Allow picking the same file again.
    if (photo) void scanFill.scan(photo)
  }

  return (
    <div className="min-h-svh bg-muted">
      <FormHeader onBack={onBack} />
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {ready && contractPhoto.loaded && !hasPhoto ? (
        <CaptureScreen online={online} disabled={scanFill.phase !== null} onCapture={openCamera} />
      ) : ready && contractPhoto.loaded ? (
        <SalesForm
          key={rowId}
          form={form}
          profile={profile}
          submitting={submitting}
          naamCorrection={scanFill.naamCorrection}
          photo={
            <PhotoCard
              url={contractPhoto.url}
              faintWriting={scanFill.faintWritingFor === rowId}
              disabled={scanFill.phase !== null}
              onRetake={openCamera}
            />
          }
          onSubmit={handleSubmit}
          onDiscard={handleDiscard}
        />
      ) : (
        <div className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}

      <OutboxDialog
        open={outboxOpen}
        onOpenChange={setOutboxOpen}
        items={outbox.items}
        online={online}
        syncing={outbox.syncing}
        onSync={outbox.flush}
        onEdit={handleEditQueued}
        onDelete={async (queuedRowId) => {
          await outbox.remove(queuedRowId)
          await deleteScanPhoto(queuedRowId)
        }}
      />
      <ScanOverlay phase={scanFill.phase} />
      {scanFill.rejection && (
        <ScanRejectedDialog
          rejection={scanFill.rejection}
          onRetake={openCamera}
          onUseAnyway={() => void scanFill.acceptAnyway()}
          onCancel={scanFill.dismissRejection}
        />
      )}
      {scanFill.scannedDate && (
        <ScannedDateDialog
          date={scanFill.scannedDate}
          now={today()}
          onKeep={() => scanFill.resolveScannedDate()}
          onUseToday={() => scanFill.resolveScannedDate(today())}
        />
      )}
    </div>
  )
}

/**
 * Once the draft is back, puts the address of a door marked "Verkocht" into the form: the werver starts at the
 * customer's details. Whatever else the draft held stays.
 */
function useSoldAt(form: SalesFormApi, ready: boolean, door: Door | null | undefined, onFilled?: () => void) {
  useEffect(() => {
    if (!ready || !door) return
    const address = {
      postcode: door.postcode,
      huisnummer: String(door.huisnummer),
      toevoeging: door.toevoeging.replace(/^-/, ""),
      straat: door.straat,
      plaats: door.plaats,
    }
    for (const [field, value] of Object.entries(address)) {
      form.setValue(field as keyof typeof address, value, { shouldDirty: true })
    }
    toast.success(`Adres ingevuld: ${door.straat} ${doorLabel(door)}`)
    onFilled?.()
  }, [form, ready, door, onFilled])
}
