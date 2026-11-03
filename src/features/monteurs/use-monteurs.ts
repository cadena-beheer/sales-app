import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addMonteurHome, deleteMonteurHome, listMonteurHomes } from "@/lib/api"
import type { NewMonteurHome } from "./monteur-homes"

const MONTEURS_KEY = ["monteur-homes"] as const

/** Admins only: where the monteurs live. */
export function useMonteurHomes(enabled: boolean) {
  return useQuery({ queryKey: MONTEURS_KEY, queryFn: listMonteurHomes, enabled, staleTime: 10 * 60_000 })
}

export function useAddMonteurHome() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (home: NewMonteurHome) => addMonteurHome(home),
    onSuccess: () => client.invalidateQueries({ queryKey: MONTEURS_KEY }),
  })
}

export function useDeleteMonteurHome() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMonteurHome(id),
    onSuccess: () => client.invalidateQueries({ queryKey: MONTEURS_KEY }),
  })
}
