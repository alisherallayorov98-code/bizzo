import { useQuery } from '@tanstack/react-query'
import smartApi from '@services/smart-analytics.service'

export const useHealthScore  = () => useQuery({ queryKey: ['smart-health'],    queryFn: smartApi.getHealthScore,  staleTime: 5 * 60 * 1000 })
export const useABCAnalysis  = () => useQuery({ queryKey: ['smart-abc'],       queryFn: smartApi.getABC,          staleTime: 10 * 60 * 1000 })
export const useRFMAnalysis  = () => useQuery({ queryKey: ['smart-rfm'],       queryFn: smartApi.getRFM,          staleTime: 10 * 60 * 1000 })
export const useSalesForecast = () => useQuery({ queryKey: ['smart-forecast'], queryFn: smartApi.getForecast,     staleTime: 30 * 60 * 1000 })
export const useStockDepletion = () => useQuery({ queryKey: ['smart-depletion'], queryFn: smartApi.getDepletion,  staleTime: 10 * 60 * 1000 })
export const useAnomalies    = () => useQuery({ queryKey: ['smart-anomalies'], queryFn: smartApi.getAnomalies,    staleTime: 5 * 60 * 1000 })
export const useMorningDigest = () => useQuery({ queryKey: ['smart-digest'],   queryFn: smartApi.getDigest,       staleTime: 60 * 60 * 1000 })
export const useSmartAlerts  = () => useQuery({ queryKey: ['smart-alerts'],    queryFn: smartApi.getAlerts,       staleTime: 5 * 60 * 1000 })
