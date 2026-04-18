import { Routes, Route } from 'react-router-dom'
import ProductionFormulasPage from './ProductionFormulasPage'
import ProductionBatchesPage from './ProductionBatchesPage'
import ProductionBatchDetailPage from './ProductionBatchDetailPage'

export default function ProductionModule() {
  return (
    <Routes>
      <Route index                element={<ProductionBatchesPage />} />
      <Route path="batches"       element={<ProductionBatchesPage />} />
      <Route path="batches/:id"   element={<ProductionBatchDetailPage />} />
      <Route path="formulas"      element={<ProductionFormulasPage />} />
    </Routes>
  )
}
