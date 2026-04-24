import { Routes, Route, Navigate } from 'react-router-dom'
import WasteDashboardPage    from './WasteDashboardPage'
import WasteBatchesPage      from './WasteBatchesPage'
import WasteBatchDetailPage  from './WasteBatchDetailPage'
import WasteProcessingPage   from './WasteProcessingPage'
import WasteAnalyticsPage    from './WasteAnalyticsPage'
import WasteWorkersPage      from './WasteWorkersPage'

export default function WasteModule() {
  return (
    <Routes>
      <Route index               element={<WasteDashboardPage />}   />
      <Route path="batches"      element={<WasteBatchesPage />}     />
      <Route path="batches/:id"  element={<WasteBatchDetailPage />} />
      <Route path="processing"   element={<WasteProcessingPage />}  />
      <Route path="analytics"    element={<WasteAnalyticsPage />}   />
      <Route path="workers"      element={<WasteWorkersPage />}     />
      <Route path="*"            element={<Navigate to="" replace />} />
    </Routes>
  )
}
