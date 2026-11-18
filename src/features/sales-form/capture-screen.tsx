import { CameraIcon, CloudOffIcon } from "lucide-react"
import { PAGE_WIDTH } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Props = { online: boolean; disabled: boolean; onCapture: () => void }

/**
 * A new form starts here: every sale needs a photo of its paper contract, and the form is filled in from it. Only
 * after the photo does the form show, filled in, to check.
 */
export function CaptureScreen({ online, disabled, onCapture }: Props) {
  return (
    <div className={`mx-auto flex flex-col gap-4 p-4 ${PAGE_WIDTH}`}>
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CameraIcon className="size-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold">Begin met een foto van het contract</h2>
            <p className="text-sm text-muted-foreground">
              Het formulier wordt daarna voor je ingevuld. Jij controleert het en verstuurt.
            </p>
          </div>
          <Button size="lg" className="h-14 w-full max-w-sm text-base" disabled={disabled} onClick={onCapture}>
            <CameraIcon /> Maak foto
          </Button>
          <ul className="flex max-w-sm flex-col gap-1 text-left text-sm text-muted-foreground">
            <li>• Leg het contract plat, het liefst op een donkere ondergrond.</li>
            <li>• Zorg voor genoeg licht, zonder schaduw of schittering.</li>
            <li>• Het hele contract op de foto, recht van boven.</li>
          </ul>
          {!online && (
            <p className="flex items-start gap-2 rounded-md bg-amber-500/15 p-3 text-left text-sm text-amber-800 dark:text-amber-300">
              <CloudOffIcon className="mt-0.5 size-4 shrink-0" />
              Geen verbinding: de foto wordt bewaard en gaat mee zodra je online bent. Het formulier vul je dan zelf in.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
