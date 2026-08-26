import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ShopProvider, useShop } from './data/store'
import { AuthProvider, RequireAuth, RequireSurface } from './auth/AuthProvider'
import { AppShell, NoAccess } from './components/layout/AppShell'
import { ConfirmProvider, Spinner } from './components/ui'
import type { Permission } from './data/types'

const Marketing = lazy(() => import('./pages/marketing/Landing'))
const Overview = lazy(() => import('./pages/admin/Overview'))
const Jobs = lazy(() => import('./pages/admin/Jobs'))
const JobDetail = lazy(() => import('./pages/admin/JobDetail'))
const Bookings = lazy(() => import('./pages/admin/Bookings'))
const Bays = lazy(() => import('./pages/admin/Bays'))
const Staff = lazy(() => import('./pages/admin/Staff'))
const StaffDetail = lazy(() => import('./pages/admin/StaffDetail'))
const Customers = lazy(() => import('./pages/admin/Customers'))
const CustomerDetail = lazy(() => import('./pages/admin/CustomerDetail'))
const Vehicles = lazy(() => import('./pages/admin/Vehicles'))
const VehicleDetail = lazy(() => import('./pages/admin/VehicleDetail'))
const Parts = lazy(() => import('./pages/admin/Parts'))
const PartDetail = lazy(() => import('./pages/admin/PartDetail'))
const Purchasing = lazy(() => import('./pages/admin/Purchasing'))
const PODetail = lazy(() => import('./pages/admin/PODetail'))
const Suppliers = lazy(() => import('./pages/admin/Suppliers'))
const Invoices = lazy(() => import('./pages/admin/Invoices'))
const InvoiceDetail = lazy(() => import('./pages/admin/InvoiceDetail'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const TechShell = lazy(() => import('./pages/tech/TechShell'))
const TechJobs = lazy(() => import('./pages/tech/TechJobs'))
const TechJob = lazy(() => import('./pages/tech/TechJob'))
const Portal = lazy(() => import('./pages/portal/Portal'))
const SignIn = lazy(() => import('./pages/auth/SignIn'))

function Guard({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  const shop = useShop()
  if (!shop.can(perm)) return <NoAccess perm={perm} />
  return <>{children}</>
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ThemeSync() {
  const { theme } = useShop()
  const { pathname } = useLocation()
  useEffect(() => {
    // The technician surface is an instrument, not an office screen: always dark.
    const forced = pathname.startsWith('/tech') ? 'dark' : theme
    document.documentElement.setAttribute('data-theme', forced)
  }, [pathname, theme])
  return null
}

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center text-ink-4">
    <Spinner size={20} />
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <ShopProvider>
        <AuthProvider>
        <ConfirmProvider>
          <ScrollTop />
          <ThemeSync />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Marketing />} />
              <Route path="/signin" element={<SignIn />} />

              <Route path="/app" element={<RequireAuth><RequireSurface surface="/app"><AppShell /></RequireSurface></RequireAuth>}>
                <Route index element={<Guard perm="jobs.view"><Overview /></Guard>} />
                <Route path="jobs" element={<Guard perm="jobs.view"><Jobs /></Guard>} />
                <Route path="jobs/:id" element={<Guard perm="jobs.view"><JobDetail /></Guard>} />
                <Route path="bookings" element={<Guard perm="jobs.view"><Bookings /></Guard>} />
                <Route path="bays" element={<Guard perm="jobs.view"><Bays /></Guard>} />
                <Route path="staff" element={<Guard perm="staff.manage"><Staff /></Guard>} />
                <Route path="staff/:id" element={<Guard perm="staff.manage"><StaffDetail /></Guard>} />
                <Route path="customers" element={<Guard perm="customers.view"><Customers /></Guard>} />
                <Route path="customers/:id" element={<Guard perm="customers.view"><CustomerDetail /></Guard>} />
                <Route path="vehicles" element={<Guard perm="vehicles.view"><Vehicles /></Guard>} />
                <Route path="vehicles/:id" element={<Guard perm="vehicles.view"><VehicleDetail /></Guard>} />
                <Route path="parts" element={<Guard perm="parts.request"><Parts /></Guard>} />
                <Route path="parts/:id" element={<Guard perm="parts.request"><PartDetail /></Guard>} />
                <Route path="purchasing" element={<Guard perm="po.create"><Purchasing /></Guard>} />
                <Route path="purchasing/:id" element={<Guard perm="po.create"><PODetail /></Guard>} />
                <Route path="suppliers" element={<Guard perm="po.create"><Suppliers /></Guard>} />
                <Route path="invoices" element={<Guard perm="invoices.create"><Invoices /></Guard>} />
                <Route path="invoices/:id" element={<Guard perm="invoices.create"><InvoiceDetail /></Guard>} />
                <Route path="reports" element={<Guard perm="reports.view"><Reports /></Guard>} />
                <Route path="settings" element={<Settings />} />
                <Route path="settings/:section" element={<Settings />} />
              </Route>

              <Route path="/tech" element={<RequireAuth><RequireSurface surface="/tech"><TechShell /></RequireSurface></RequireAuth>}>
                <Route index element={<TechJobs />} />
                <Route path=":id" element={<TechJob />} />
              </Route>

              <Route path="/portal" element={<Navigate to="/portal/job-32" replace />} />
              <Route path="/portal/:id" element={<Portal />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ConfirmProvider>
        </AuthProvider>
      </ShopProvider>
    </BrowserRouter>
  )
}
