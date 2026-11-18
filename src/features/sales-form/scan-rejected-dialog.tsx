import { CameraIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ScanRejection } from "./use-scan-fill"

const ADVICE: Record<ScanRejection["problem"], string> = {
  te_donker: "De foto is te donker. Zoek meer licht of zet de flitser aan.",
  te_licht: "De foto is te licht of er zit een schittering op. Houd het contract uit fel licht.",
  geen_contrast: "Op de foto is bijna niets te zien.",
  onscherp: "De foto is onscherp. Houd de telefoon stil en tik op het contract om scherp te stellen.",
  afgesneden: "Het contract staat niet helemaal op de foto.",
  geen_formulier: "Op de foto staat geen verkoopcontract.",
}

type Props = { rejection: ScanRejection; onRetake: () => void; onUseAnyway: () => void; onCancel: () => void }

/** A photo on which the contract cannot be read: take another. After a few tries it may be used anyway. */
export function ScanRejectedDialog({ rejection, onRetake, onUseAnyway, onCancel }: Props) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Contract niet goed leesbaar</AlertDialogTitle>
          <AlertDialogDescription>{ADVICE[rejection.problem]} Maak een nieuwe foto.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {rejection.canUseAnyway ? (
            <AlertDialogCancel onClick={onUseAnyway}>Toch deze foto gebruiken</AlertDialogCancel>
          ) : (
            <AlertDialogCancel onClick={onCancel}>Annuleren</AlertDialogCancel>
          )}
          <AlertDialogAction onClick={onRetake}>
            <CameraIcon /> Nieuwe foto
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
