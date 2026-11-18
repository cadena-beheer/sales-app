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
import { shortDate } from "../sales-list/days"

type Props = { date: string; now: string; onKeep: () => void; onUseToday: () => void }

/** Right after a scan: the date on the paper form is not today. A date in the future cannot be kept at all. */
export function ScannedDateDialog({ date, now, onKeep, onUseToday }: Props) {
  const future = date > now
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Datum op het formulier is niet vandaag</AlertDialogTitle>
          <AlertDialogDescription>
            Op het formulier staat {shortDate(date)}, vandaag is het {shortDate(now)}.{" "}
            {future ? "Een datum in de toekomst kan niet." : "Welke datum klopt?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!future && <AlertDialogCancel onClick={onKeep}>{shortDate(date)} laten staan</AlertDialogCancel>}
          <AlertDialogAction onClick={onUseToday}>Vandaag gebruiken</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
