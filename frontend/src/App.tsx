import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { queryClient } from '@config/queryClient'
import { ErrorBoundary } from '@components/shared/ErrorBoundary'
import { useServiceWorker } from '@hooks/useServiceWorker'
import { useUIStore } from '@store/ui.store'
import { PermissionGate } from '@components/auth/PermissionGate'

// Layout komponentlar
const AppLayout        = lazy(() => import('@components/layout/AppLayout').then(m => ({ default: m.AppLayout })))
const AuthLayout       = lazy(() => import('@components/layout/AuthLayout').then(m => ({ default: m.AuthLayout })))
const SuperAdminLayout = lazy(() => import('@components/layout/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })))

// Route guards
const ProtectedRoute   = lazy(() => import('@components/shared/ProtectedRoute').then(m => ({ default: m.ProtectedRoute })))
const SuperAdminRoute  = lazy(() => import('@components/shared/SuperAdminRoute').then(m => ({ default: m.SuperAdminRoute })))

// Super Admin sahifalar
const SuperAdminDashboard   = lazy(() => import('@pages/super-admin/SuperAdminDashboard'))
const SACompaniesPage       = lazy(() => import('@pages/super-admin/SACompaniesPage'))
const SACompanyDetailPage   = lazy(() => import('@pages/super-admin/SACompanyDetailPage'))
const SAUsersPage           = lazy(() => import('@pages/super-admin/SAUsersPage'))

// Auth sahifalar
const LoginPage           = lazy(() => import('@pages/auth/LoginPage'))
const ForgotPasswordPage  = lazy(() => import('@pages/auth/ForgotPasswordPage'))
const ResetPasswordPage   = lazy(() => import('@pages/auth/ResetPasswordPage'))
const VerifyEmailPage     = lazy(() => import('@pages/auth/VerifyEmailPage'))

// Asosiy sahifalar
const DashboardPage       = lazy(() => import('@pages/dashboard/DashboardPage'))
const ContactsListPage    = lazy(() => import('@pages/contacts/ContactsListPage'))
const ContactDetailPage   = lazy(() => import('@pages/contacts/ContactDetailPage'))
const ContactFormPage     = lazy(() => import('@pages/contacts/ContactFormPage'))
const ContactReportPage   = lazy(() => import('@pages/contacts/ContactReportPage'))
const ProductsListPage    = lazy(() => import('@pages/products/ProductsListPage'))
const ProductDetailPage   = lazy(() => import('@pages/products/ProductDetailPage'))
const ProductFormPage     = lazy(() => import('@pages/products/ProductFormPage'))
const WarehousePage       = lazy(() => import('@pages/warehouse/WarehouseOverviewPage'))
const StockMovementsPage  = lazy(() => import('@pages/warehouse/StockMovementsPage'))
const InventoryPage       = lazy(() => import('@pages/warehouse/InventoryPage'))
const IncomingPage        = lazy(() => import('@pages/warehouse/IncomingPage'))
const OutgoingPage        = lazy(() => import('@pages/warehouse/OutgoingPage'))
const EmployeesListPage   = lazy(() => import('@pages/employees/EmployeesListPage'))
const EmployeeDetailPage  = lazy(() => import('@pages/employees/EmployeeDetailPage'))
const SalaryPage          = lazy(() => import('@pages/employees/SalaryPage'))
const DebtsPage           = lazy(() => import('@pages/debts/DebtsPage'))
const ContractsListPage   = lazy(() => import('@pages/contracts/ContractsListPage'))
const ContractDetailPage  = lazy(() => import('@pages/contracts/ContractDetailPage'))
const ContractFormPage    = lazy(() => import('@pages/contracts/ContractFormPage'))
const ContractTemplatesPage = lazy(() => import('@pages/contracts/TemplatesPage'))
const ReportsPage         = lazy(() => import('@pages/reports/ReportsPage'))
const CompanySettingsPage  = lazy(() => import('@pages/settings/CompanySettingsPage'))

// Modullar
const WasteModule         = lazy(() => import('@pages/modules/waste'))
const SalesModule         = lazy(() => import('@pages/modules/sales'))
const ConstructionModule  = lazy(() => import('@pages/modules/construction'))
const ProductionModule    = lazy(() => import('@pages/modules/production'))

// Smart Analytics
const SmartInsightsPage   = lazy(() => import('@pages/smart/SmartInsightsPage'))

// Xizmat moduli
const ServiceTicketsPage  = lazy(() => import('@pages/service/ServiceTicketsPage'))

// POS
const POSPage             = lazy(() => import('@pages/pos/POSPage'))

// Import Markazi
const ImportCenterPage    = lazy(() => import('@pages/import/ImportCenterPage'))

// Recurring
const RecurringPage       = lazy(() => import('@pages/recurring/RecurringPage'))

// Landing
const LandingLayout       = lazy(() => import('@pages/landing/LandingLayout').then(m => ({ default: m.LandingLayout })))
const LandingPage         = lazy(() => import('@pages/landing/LandingPage'))

// Billing
const PricingPage         = lazy(() => import('@pages/billing/PricingPage'))
const CheckoutPage        = lazy(() => import('@pages/billing/CheckoutPage'))
const BillingPage         = lazy(() => import('@pages/billing/BillingPage'))
const BillingSuccessPage  = lazy(() => import('@pages/billing/SuccessPage'))

// Xato sahifalar
const NotFoundPage        = lazy(() => import('@pages/errors/NotFoundPage'))
const UnauthorizedPage    = lazy(() => import('@pages/errors/UnauthorizedPage'))
const OfflinePage         = lazy(() => import('@pages/errors/OfflinePage'))

// Loading komponenti
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: 'var(--color-accent-primary)', borderRightColor: 'var(--color-accent-primary)' }} />
        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
          Yuklanmoqda...
        </p>
      </div>
    </div>
  )
}

function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorker()
  if (!updateAvailable) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-bg-elevated border border-accent-primary/40 rounded-xl px-4 py-3 shadow-xl text-sm">
      <span className="text-text-primary">Yangi versiya mavjud</span>
      <button
        onClick={applyUpdate}
        className="px-3 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary/90 transition-colors"
      >
        Yangilash
      </button>
    </div>
  )
}

function ThemeProvider() {
  const theme = useUIStore(s => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])
  return null
}

function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const setOnline  = () => setIsOnline(true)
    const setOffline = () => setIsOnline(false)
    window.addEventListener('online',  setOnline)
    window.addEventListener('offline', setOffline)
    return () => {
      window.removeEventListener('online',  setOnline)
      window.removeEventListener('offline', setOffline)
    }
  }, [])

  if (!isOnline) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <OfflinePage />
      </Suspense>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider />
      <OfflineDetector>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Landing sahifalar (public) */}
            <Route element={<LandingLayout />}>
              <Route path="/" element={<LandingPage />} />
            </Route>

            {/* Ochiq: tariflar */}
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/billing/success" element={<BillingSuccessPage />} />

            {/* Super Admin — alohida himoyalangan zona */}
            <Route element={<SuperAdminRoute />}>
              <Route element={<SuperAdminLayout />}>
                <Route path="/super-admin"                   element={<SuperAdminDashboard />} />
                <Route path="/super-admin/companies"         element={<SACompaniesPage />} />
                <Route path="/super-admin/companies/:id"     element={<SACompanyDetailPage />} />
                <Route path="/super-admin/users"             element={<SAUsersPage />} />
              </Route>
            </Route>

            {/* Auth sahifalar */}
            <Route element={<AuthLayout />}>
              <Route path="/login"           element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password"  element={<ResetPasswordPage />} />
              <Route path="/verify-email"    element={<VerifyEmailPage />} />
            </Route>

            {/* Himoyalangan sahifalar */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Asosiy */}
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Kontragentlar */}
                <Route path="/contacts"             element={<ContactsListPage />} />
                <Route path="/contacts/new"         element={<ContactFormPage />} />
                <Route path="/contacts/:id"         element={<ContactDetailPage />} />
                <Route path="/contacts/:id/edit"    element={<ContactFormPage />} />
                <Route path="/contacts/:id/report"  element={<ContactReportPage />} />

                {/* Mahsulotlar */}
                <Route path="/products"         element={<ProductsListPage />} />
                <Route path="/products/new"     element={<ProductFormPage />} />
                <Route path="/products/:id"     element={<ProductDetailPage />} />
                <Route path="/products/:id/edit" element={<ProductFormPage />} />

                {/* Ombor */}
                <Route path="/warehouse"            element={<WarehousePage />} />
                <Route path="/warehouse/movements"  element={<StockMovementsPage />} />
                <Route path="/warehouse/inventory"  element={<InventoryPage />} />
                <Route path="/warehouse/incoming"   element={<IncomingPage />} />
                <Route path="/warehouse/outgoing"   element={<OutgoingPage />} />

                {/* Xodimlar */}
                <Route path="/employees"         element={<PermissionGate><EmployeesListPage /></PermissionGate>} />
                <Route path="/employees/:id"     element={<PermissionGate><EmployeeDetailPage /></PermissionGate>} />
                <Route path="/salary"            element={<PermissionGate><SalaryPage /></PermissionGate>} />

                {/* Qarzlar */}
                <Route path="/debts" element={<PermissionGate><DebtsPage /></PermissionGate>} />

                {/* Shartnomalar */}
                <Route path="/contracts"           element={<ContractsListPage />} />
                <Route path="/contracts/new"       element={<ContractFormPage />} />
                <Route path="/contracts/templates" element={<ContractTemplatesPage />} />
                <Route path="/contracts/:id"       element={<ContractDetailPage />} />

                {/* Hisobotlar */}
                <Route path="/reports" element={<PermissionGate><ReportsPage /></PermissionGate>} />
                <Route path="/smart"   element={<PermissionGate><SmartInsightsPage /></PermissionGate>} />

                {/* Import Markazi */}
                <Route path="/import" element={<PermissionGate><ImportCenterPage /></PermissionGate>} />

                {/* Takroriy operatsiyalar */}
                <Route path="/recurring" element={<RecurringPage />} />

                {/* Sozlamalar */}
                <Route path="/settings/*" element={<PermissionGate><CompanySettingsPage /></PermissionGate>} />

                {/* Obuna va toʻlovlar */}
                <Route path="/billing"          element={<BillingPage />} />
                <Route path="/billing/checkout" element={<CheckoutPage />} />

                {/* Qo'shimcha modullar */}
                <Route path="/waste/*"        element={<WasteModule />} />
                <Route path="/sales/*"        element={<SalesModule />} />
                <Route path="/construction/*" element={<ConstructionModule />} />
                <Route path="/production/*"   element={<ProductionModule />} />
                <Route path="/service"        element={<PermissionGate><ServiceTicketsPage /></PermissionGate>} />
                <Route path="/pos"           element={<PermissionGate><POSPage /></PermissionGate>} />

                {/* Ruxsatsiz */}
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      </OfflineDetector>

      {/* PWA yangilash banneri */}
      <UpdateBanner />

      {/* Global toast bildirishnomalar */}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            boxShadow: 'var(--shadow-lg)',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-danger)',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </QueryClientProvider>
    </ErrorBoundary>
  )
}
