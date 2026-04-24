import { useQuery } from '@tanstack/react-query'
import { reportService, ReportFilters } from '@services/report.service'

const REPORTS_KEY = 'reports'
const STALE = 5 * 60_000

const enabled = (f: ReportFilters) => !!f.dateFrom && !!f.dateTo

export function useFinancialReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'financial', filters],
    queryFn:  () => reportService.getFinancial(filters),
    enabled:  enabled(filters),
    staleTime: STALE,
  })
}

export function useWarehouseReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'warehouse', filters],
    queryFn:  () => reportService.getWarehouse(filters),
    enabled:  enabled(filters),
    staleTime: STALE,
  })
}

export function useSalesReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'sales', filters],
    queryFn:  () => reportService.getSales(filters),
    enabled:  enabled(filters),
    staleTime: STALE,
  })
}

export function useEmployeesReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'employees', filters],
    queryFn:  () => reportService.getEmployees(filters),
    enabled:  enabled(filters),
    staleTime: STALE,
  })
}

export function useWasteReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'waste', filters],
    queryFn:  () => reportService.getWaste(filters),
    enabled:  enabled(filters),
    staleTime: STALE,
  })
}

export function useConstructionReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'construction', filters],
    queryFn:  () => reportService.getConstruction(filters),
    enabled:  enabled(filters),
    staleTime: STALE,
  })
}

export function useProductionReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'production', filters],
    queryFn:  () => reportService.getProduction(filters),
    enabled:  enabled(filters),
    staleTime: STALE,
  })
}
