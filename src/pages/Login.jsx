// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    caregiverType: '', language: 'en'
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
        navigate('/dashboard')
      } else {
        if (!form.fullName || !form.email || !form.password) throw new Error('Please fill all fields')
        const { error } = await signUp(form.email, form.password, form.fullName)
        if (error) throw error
        navigate('/dashboard')
      }
    } catch (e) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const caregiverTypes = [
    { value: 'elderly_parent', label: 'Elderly Parent' },
    { value: 'disabled_spouse', label: 'Disabled Spouse' },
    { value: 'chronically_ill_child', label: 'Chronically Ill Child' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>

      {/* Left panel — visual */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px', position: 'relative', background: 'linear-gradient(160deg, rgba(26,95,106,0.35) 0%, rgba(13,31,35,0) 60%)', borderRight: '1px solid var(--border)' }}>

        {/* Blob */}
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,146,124,0.15) 0%, transparent 70%)', top: -100, left: -100, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,95,106,0.2) 0%, transparent 70%)', bottom: -60, right: 0, pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 64, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--rose), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛡️</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>CareGuard <span style={{ color: 'var(--rose-light)' }}>AI</span></span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 24 }}>
          You care for others.<br />
          <span className="gradient-text">Let us care for you.</span>
        </h2>

        <p style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.8, maxWidth: 400, marginBottom: 48 }}>
          CareGuard monitors your wellbeing passively — so you can focus on what matters. No judgement. No pressure. Just support.
        </p>

        {/* Trust signals */}
        {[
          '🔒 Your voice data never leaves your device',
          '🌐 Available in English & Tamil',
          '❤️ Built for India\'s 150M caregivers',
        ].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontSize: 14, color: 'var(--text-muted)' }}>
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* Right panel — form */}
      <div style={{ width: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px' }}>

        {/* Toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 36 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                background: mode === m ? 'linear-gradient(135deg, var(--rose), var(--rose-dark))' : 'transparent',
                color: mode === m ? 'white' : 'var(--text-muted)' }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          {mode === 'login' ? 'Welcome back' : 'Join CareGuard'}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
          {mode === 'login' ? 'Your burnout dashboard is waiting.' : 'Takes 60 seconds. Free forever.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Full Name</label>
              <input className="input" placeholder="Priya Lakshmi" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
            </div>
          )}

          <div>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Email Address</label>
            <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Password</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>I care for (optional)</label>
                <select className="input" value={form.caregiverType} onChange={e => set('caregiverType', e.target.value)}
                  style={{ cursor: 'pointer', appearance: 'none' }}>
                  <option value="">Select...</option>
                  {caregiverTypes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Preferred Language</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ v: 'en', l: '🇬🇧 English' }, { v: 'ta', l: '🇮🇳 Tamil' }].map(lang => (
                    <button key={lang.v} onClick={() => set('language', lang.v)}
                      style={{ flex: 1, padding: '11px', borderRadius: 8, border: `1px solid ${form.language === lang.v ? 'var(--rose)' : 'var(--border)'}`, background: form.language === lang.v ? 'rgba(232,146,124,0.12)' : 'transparent', color: form.language === lang.v ? 'var(--rose-light)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)' }}>
                      {lang.l}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: 'var(--red)' }}>
              ⚠️ {error}
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ marginTop: 8, fontSize: 16, padding: '15px', borderRadius: 12, justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
            {loading ? '...' : mode === 'login' ? 'Sign In →' : 'Create My Account →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-dim)' }}>
          By continuing you agree to our privacy-first data policy. Your voice stays on your device.
        </p>
      </div>
    </div>
  )
}