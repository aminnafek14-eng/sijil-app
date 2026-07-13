import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import AdminLogin    from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ProgramEditor from './pages/ProgramEditor'
import UserPortal    from './pages/UserPortal'
import './index.css'

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/admin" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#64748b' }}>
      Memuatkan...
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        {/* Portal pengguna — halaman utama */}
        <Route path="/"               element={<UserPortal />} />
        <Route path="/jana/:programId" element={<UserPortal />} />

        {/* Admin */}
        <Route path="/admin" element={
          session ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />
        } />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute session={session}>
            <AdminDashboard session={session} />
          </ProtectedRoute>
        } />
        <Route path="/admin/program/:id" element={
          <ProtectedRoute session={session}>
            <ProgramEditor session={session} />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
