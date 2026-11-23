import { supabase } from "@/lib/supabase"

/**
 * Logs an error that only the phone sees (public.client_errors), so a recruiter's "it fails" can be looked up with
 * the real cause. Never throws and never waits: reporting must not break, or slow down, what it reports on.
 * Offline or signed out the row is lost; the console still has it.
 */
export function reportClientError(context: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`[${context}]`, error, details)
  try {
    const { name, message, stack } = describeError(error)
    void supabase
      .from("client_errors")
      .insert({
        context: context.slice(0, 100),
        name: name.slice(0, 200),
        message: message.slice(0, 2000),
        stack: stack?.slice(0, 8000) ?? null,
        user_agent: navigator.userAgent.slice(0, 500),
        details: { ...environment(), ...details },
      })
      .then(
        ({ error: insertError }) => insertError && console.warn("Could not log the error", insertError),
        () => {},
      )
  } catch {
    // Nothing more to do: the console has it.
  }
}

/** Name and message of anything thrown; Safari's DOMExceptions included. */
export function describeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error && typeof error === "object") {
    const { name, message, stack } = error as { name?: unknown; message?: unknown; stack?: unknown }
    return {
      name: typeof name === "string" ? name : "Error",
      message: typeof message === "string" ? message : String(error),
      stack: typeof stack === "string" ? stack : undefined,
    }
  }
  return { name: typeof error, message: String(error) }
}

function environment() {
  return {
    online: navigator.onLine,
    standalone: window.matchMedia?.("(display-mode: standalone)").matches ?? null,
    screen: `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}`,
  }
}
