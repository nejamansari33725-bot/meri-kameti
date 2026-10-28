import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import MemberDashboard from './pages/member/Dashboard'
import SubmitPayment from './pages/member/SubmitPayment'
import PaymentHistory from './pages/member/PaymentHistory'
import KhataLedger from './pages/KhataLedger'
import AdminDashboard from './pages/admin/AdminDashboard'
import Approvals from './pages/admin/Approvals'
import Members from './pages/admin/Members'
import CommitteeWinner from './pages/admin/CommitteeWinner'
import Reports from './pages/admin/Reports'

function AppRoutes() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navbar />}
      <div className={user ? 'pt-2 pb-8' : ''}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

          {/* Member routes */}
          <Route path="/dashboard" element={<ProtectedRoute><MemberDashboard /></ProtectedRoute>} />
          <Route path="/pay" element={<ProtectedRoute><SubmitPayment /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><KhataLedger /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/ledger" element={<ProtectedRoute adminOnly><KhataLedger /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute adminOnly><Approvals /></ProtectedRoute>} />
          <Route path="/admin/members" element={<ProtectedRoute adminOnly><Members /></ProtectedRoute>} />
          <Route path="/admin/committee" element={<ProtectedRoute adminOnly><CommitteeWinner /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />

          {/* Default redirect */}
          <Route path="/" element={
            user
              ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} />
              : <Navigate to="/login" />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
