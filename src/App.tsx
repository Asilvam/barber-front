import { lazy, Suspense } from 'react'
import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import ProtectedRoute from './components/ProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const AdminBarbers = lazy(() => import('./pages/AdminBarbers'))
const AdminReserves = lazy(() => import('./pages/AdminReserves'))
const BarberAvailability = lazy(() => import('./pages/BarberAvailability'))

function AppFallback() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading-card">
        <div className="app-loading-mark">BS</div>
        <p>Cargando reserva...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <Suspense fallback={<AppFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/barbers/:id/availability" element={<BarberAvailability />} />
          </Route>
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin/barbers" element={<AdminBarbers />} />
            <Route path="/admin/reserves" element={<AdminReserves />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
