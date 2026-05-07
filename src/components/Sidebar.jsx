// src/components/Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '../lib/supabaseClient'

const navItems = [
  { path: '/dashboard', icon: '◈', label: 'Dashboard' },
  { path: '/checkin',   icon: '✦', label: 'Daily Check-in' },
  { path: '/chat',      icon: '◎', label: 'AI Companion' },
  { path: '/respite',   icon: '⊕', label: 'Respite Care' },
  { path: '/peers',     icon: '◉', label: 'Peer Community' },
  { path: '/profile',   icon: '◌', label: 'Profile' },
]

export default function Sidebar({ profile, riskScore }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tier = riskScore >= 7 ? 'red' : riskScore >= 4 ? 'yellow' : 'green'
  const tierColor = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' }[tier]

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minHeight: '100vh',
      background: 'rgba(13,31,35,0.95)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 16px',
      position: 'fixed',
      top: 0, left: 0,
      backdropFilter: 'blur(20px)',
      zIndex: 50,
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 40, padding: '0 8px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--rose), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🛡️</div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>CareGuard <span style={{ color: 'var(--rose-light)' }}>AI</span></span>
      </div>

      {/* Risk pill */}
      {riskScore !== null && riskScore !== undefined && (
        <div style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}44`, borderRadius: 12, padding: '12px 16px', marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 4 }}>RISK SCORE TODAY</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: tierColor, lineHeight: 1 }}>{riskScore.toFixed(1)}</span>
            <span style={{ fontSize: 12, color: tierColor, textTransform: 'uppercase', fontWeight: 600 }}>/ 10</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: tierColor, boxShadow: `0 0 8px ${tierColor}` }} />
            <span style={{ fontSize: 12, color: tierColor, fontWeight: 600, textTransform: 'capitalize' }}>{tier} zone</span>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(item => {
          const active = pathname === item.path
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active ? 'linear-gradient(135deg, rgba(232,146,124,0.2), rgba(26,95,106,0.15))' : 'transparent',
                borderLeft: active ? '3px solid var(--rose)' : '3px solid transparent',
                color: active ? 'var(--rose-light)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: active ? 600 : 400,
                textAlign: 'left', width: '100%', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text)' }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}}>
              <span style={{ fontSize: 18, lineHeight: 1, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.path === '/checkin' && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--rose)', flexShrink: 0 }} />}
            </button>
          )
        })}
      </nav>

      {/* User profile at bottom */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 8 }}>
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), var(--rose))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {profile.full_name?.[0]?.toUpperCase() ?? 'C'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.full_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{profile.language === 'ta' ? 'Tamil' : 'English'}</div>
            </div>
          </div>
        )}
        <button onClick={handleSignOut}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; e.currentTarget.style.color = 'var(--red)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
          ⎋ Sign Out
        </button>
      </div>
    </aside>
  )
}