import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import NewRequest from '@/pages/NewRequest'
import ViewRequest from '@/pages/ViewRequest'
import EditRequest from '@/pages/EditRequest'
import AdminPanel from '@/pages/Admin'
import MyRequests from '@/pages/MyRequests'
import Approvals from '@/pages/ApprovalsInbox'
import Reports from '@/pages/ReportsPage'
import { Layout } from '@/components/Layout'

function AppRoutes() {
  const { user, loading, userRole } = useAuth()

  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('[session-refresh] getSession error:', error.message)
      } else if (session && session.expires_at && session.expires_at * 1000 < Date.now() + 5 * 60 * 1000) {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          console.error('[session-refresh] refresh error:', refreshError.message)
        }
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // User is authenticated - render protected routes
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-requests" element={<MyRequests />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/new-request" element={<NewRequest />} />
        <Route path="/request/:id" element={<ViewRequest />} />
        <Route path="/edit-request/:id" element={<EditRequest />} />
        <Route path="/profile" element={<Dashboard />} />
        <Route
          path="/admin" 
          element={
            userRole === 'admin' ? <AdminPanel /> : <Navigate to="/dashboard" replace />
          } 
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
