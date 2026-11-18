import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addMarketingAction, deleteMarketingAction, listMarketingActions } from "@/lib/api"
import type { NewMarketingAction } from "./marketing-actions"

const MARKETING_KEY = ["marketing-actions"] as const

/** Admins only: the marketing actions. */
export function useMarketingActions(enabled: boolean) {
  return useQuery({ queryKey: MARKETING_KEY, queryFn: listMarketingActions, enabled, staleTime: 10 * 60_000 })
}

export function useAddMarketingAction() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (action: NewMarketingAction) => addMarketingAction(action),
    onSuccess: () => client.invalidateQueries({ queryKey: MARKETING_KEY }),
  })
}

export function useDeleteMarketingAction() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMarketingAction(id),
    onSuccess: () => client.invalidateQueries({ queryKey: MARKETING_KEY }),
  })
}
