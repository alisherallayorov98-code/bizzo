import { Routes, Route } from 'react-router-dom'
import ConstructionObjectsPage from './ConstructionObjectsPage'
import ProjectDetailPage       from './ProjectDetailPage'

export default function ConstructionModule() {
  return (
    <Routes>
      <Route index              element={<ConstructionObjectsPage />} />
      <Route path="objects"     element={<ConstructionObjectsPage />} />
      <Route path="objects/:id" element={<ProjectDetailPage />} />
    </Routes>
  )
}
