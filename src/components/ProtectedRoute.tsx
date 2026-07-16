import { Navigate, Outlet } from 'react-router-dom'
import { getAuthToken, getAuthUser } from '../auth/session'
import type { AuthUser } from '../types/auth'

type ProtectedRouteProps = {
  requiredRole?: AuthUser['role']
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const token = getAuthToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!requiredRole) {
    return <Outlet />
  }

  const user = getAuthUser()
  if (!user || user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
