// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './styles/theme.css'

// Pages
import Landing   from './pages/Landing'
import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import Checkin from './pages/Checkin'

// Placeholder pages (build these next)
const Placeholder = ({ title }) => (
  <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
    <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--rose-light)' }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>Coming next — building in progress</div>
    </div>
  </div>
)

// Protected route wrapper
function Protected({ children }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'authed' | 'guest'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? 'authed' : 'guest')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'authed' : 'guest')
    })
    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--rose-light)' }}>CareGuard AI</div>
      </div>
    )
  }

  return status === 'authed' ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"      element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/checkin" element={<Protected><Checkin /></Protected>} />
        <Route path="/chat"      element={<Protected><Placeholder title="AI Companion" /></Protected>} />
        <Route path="/respite"   element={<Protected><Placeholder title="Respite Care" /></Protected>} />
        <Route path="/peers"     element={<Protected><Placeholder title="Peer Community" /></Protected>} />
        <Route path="/profile"   element={<Protected><Placeholder title="Profile" /></Protected>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}