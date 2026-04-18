import { Routes, Route, Navigate } from 'react-router-dom'
import WasteDashboardPage   from './WasteDashboardPage'
import WasteBatchesPage     from './WasteBatchesPage'
import WasteProcessingPage  from './WasteProcessingPage'
import WasteAnalyticsPage   from './WasteAnalyticsPage'

export default function WasteModule() {
  return (
    <Routes>
      <Route index          element={<WasteDashboardPage />}  />
      <Route path="batches"    element={<WasteBatchesPage />}    />
      <Route path="processing" element={<WasteProcessingPage />} />
      <Route path="analytics"  element={<WasteAnalyticsPage />}  />
      <Route path="*"          element={<Navigate to="" replace />} />
    </Routes>
  )
}
