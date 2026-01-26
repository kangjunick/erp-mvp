import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import AdminDashboard from '../pages/AdminDashboard.jsx'
import Login from '../pages/Login.jsx'
import OrderStatus from '../pages/OrderStatus.jsx'
import { StaffPage } from '../pages/StaffPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/status/:uuid" element={<OrderStatus />} />

      <Route element={<ProtectedRoute allowRoles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowRoles={['staff']} />}>
        <Route path="/staff" element={<StaffPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/staff" replace />} />
      <Route path="*" element={<Navigate to="/staff" replace />} />
    </Routes>
  )
}

