import { Routes, Route, Navigate } from 'react-router-dom'
import SalesPipelinePage       from './SalesPipelinePage'
import SalesDealsPage          from './SalesDealsPage'
import SalesInvoicesPage       from './SalesInvoicesPage'
import SalesDealDetailPage     from './SalesDealDetailPage'
import SalesInvoiceDetailPage  from './SalesInvoiceDetailPage'

export default function SalesModule() {
  return (
    <Routes>
      <Route index                      element={<SalesPipelinePage />}      />
      <Route path="deals"               element={<SalesDealsPage />}         />
      <Route path="deals/:id"           element={<SalesDealDetailPage />}    />
      <Route path="invoices"            element={<SalesInvoicesPage />}      />
      <Route path="invoices/:id"        element={<SalesInvoiceDetailPage />} />
      <Route path="*"                   element={<Navigate to="" replace />} />
    </Routes>
  )
}
