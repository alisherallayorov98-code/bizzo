import { useQuery, useMutation } from '@tanstack/react-query'
import { aiService } from '@services/ai.service'

export function useAIRecommendations() {
  return useQuery({
    queryKey:        ['ai', 'recommendations'],
    queryFn:         aiService.getRecommendations,
    staleTime:       5 * 60_000,
    refetchInterval: 10 * 60_000,
  })
}

export function useAIQuery() {
  return useMutation({
    mutationFn: (question: string) => aiService.query(question),
  })
}

export function useDashboardInsights() {
  return useQuery({
    queryKey:        ['ai', 'dashboard'],
    queryFn:         aiService.getDashboardInsights,
    staleTime:       2 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}
