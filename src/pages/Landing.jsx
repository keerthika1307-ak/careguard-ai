// src/pages/Landing.jsx
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'

const stats = [
  { number: '150M+', label: 'Caregivers in India', sub: 'mostly women, unsupported' },
  { number: '73%',   label: 'Develop depression', sub: 'within 2 years of caregiving' },
  { number: '2–4wk', label: 'Early detection',    sub: 'before crisis occurs' },
  { number: '50:1',  label: 'ROI of prevention',  sub: 'vs reactive crisis care' },
]

const features = [
  {
    icon: '🎙️',
    title: 'Voice Biomarker Analysis',
    desc: 'Detects stress through pitch, energy and speech patterns during a 30-second voice check-in. No wearable needed.',
  },
  {
    icon: '🧠',
    title: 'AI Burnout Risk Score',
    desc: 'Multi-modal engine combines voice, mood and sleep into a real-time 0–10 burnout risk index — explained in plain language.',
  },
  {
    icon: '🌿',
    title: 'Tiered Interventions',
    desc: 'Green tips, Yellow peer matching, Red emergency respite — the right support at exactly the right moment.',
  },
  {
    icon: '🤝',
    title: 'Peer Community',
    desc: 'AI matches you with caregivers facing similar challenges. You are not alone in this.',
  },
  {
    icon: '💬',
    title: 'Empathetic AI Chat',
    desc: 'Available 24/7 in English and Tamil. A space to vent, seek advice, or just feel heard.',
  },
  {
    icon: '🏥',
    title: 'Respite Care Finder',
    desc: 'Instantly locate and book nearby respite care centres. One tap, no waiting.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? '232,146,124' : '42,138,153',
    }))

    let raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`
        ctx.fill()
        p.x += p.dx; p.y += p.dy
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1
      })
      raf = requestAnimationFrame(draw)
    }
    draw()

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden', position: 'relative' }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* Mesh blobs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,95,106,0.25) 0%, transparent 70%)', top: -100, right: -100, animation: 'meshMove 12s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,146,124,0.18) 0%, transparent 70%)', bottom: 100, left: -100, animation: 'meshMove 15s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,149,74,0.12) 0%, transparent 70%)', top: '40%', left: '40%', animation: 'meshMove 18s ease-in-out infinite 3s' }} />
      </div>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(13,31,35,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--rose), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>CareGuard <span style={{ color: 'var(--rose-light)' }}>AI</span></span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-ghost" style={{ padding: '9px 22px', fontSize: 14 }} onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn-primary" style={{ padding: '9px 22px', fontSize: 14 }} onClick={() => navigate('/login')}>Get Started →</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: '120px 24px 80px' }}>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,146,124,0.12)', border: '1px solid rgba(232,146,124,0.3)', borderRadius: 99, padding: '6px 16px', fontSize: 13, color: 'var(--rose-light)', marginBottom: 32, animation: 'fadeUp 0.5s ease forwards' }}>
          <span>✦</span> WitchHunt Hackathon 2026 · Health & Wellbeing Track
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 7vw, 82px)', fontWeight: 700, lineHeight: 1.1, maxWidth: 860, marginBottom: 24, animation: 'fadeUp 0.6s ease 0.1s both' }}>
          The caregiver is<br />
          <span className="gradient-text">the invisible patient.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-muted)', maxWidth: 580, lineHeight: 1.7, marginBottom: 44, animation: 'fadeUp 0.6s ease 0.2s both' }}>
          CareGuard AI detects burnout in family caregivers 2–4 weeks before crisis — using voice biomarkers and a compassionate AI companion. Built for the 150 million caregivers India leaves behind.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeUp 0.6s ease 0.3s both' }}>
          <button className="btn-primary" style={{ fontSize: 16, padding: '14px 36px' }} onClick={() => navigate('/login')}>
            Start Your Journey →
          </button>
          <button className="btn-ghost" style={{ fontSize: 16, padding: '14px 36px' }}>
            Watch Demo ▷
          </button>
        </div>

        {/* Floating risk score preview */}
        <div style={{ marginTop: 72, animation: 'fadeUp 0.6s ease 0.5s both' }}>
          <div className="glass" style={{ display: 'inline-flex', alignItems: 'center', gap: 20, padding: '20px 32px', borderRadius: 20, border: '1px solid rgba(232,146,124,0.2)' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>BURNOUT RISK SCORE</div>
              <div style={{ fontSize: 42, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--yellow)', lineHeight: 1 }}>6.4</div>
              <div style={{ fontSize: 12, color: 'var(--yellow)', marginTop: 4 }}>● Moderate — Yellow Zone</div>
            </div>
            <div style={{ width: 1, height: 60, background: 'var(--border)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>TODAY'S SIGNAL</div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>😴 Sleep: 4.5h <span style={{ color: 'var(--red)' }}>↓</span></div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>🎙️ Voice: Monotone detected</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>😟 Mood: 2 / 5</div>
            </div>
            <div style={{ width: 1, height: 60, background: 'var(--border)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>RECOMMENDED</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 99, padding: '6px 14px', fontSize: 13, color: 'var(--yellow)' }}>
                🤝 Connect with a peer
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {stats.map((s, i) => (
            <div key={i} className="glass" style={{ padding: '32px 28px', borderRadius: 20, textAlign: 'center', animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, color: 'var(--rose-light)', lineHeight: 1, marginBottom: 8 }}>{s.number}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 13, color: 'var(--rose)', fontFamily: 'var(--font-mono)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Platform Features</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, lineHeight: 1.2 }}>
              Everything a caregiver<br /><span className="gradient-text">deserves.</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} className="glass" style={{ padding: '28px', borderRadius: 20, transition: 'all 0.3s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(232,146,124,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>{f.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 48px 120px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div className="glass" style={{ padding: '60px 48px', borderRadius: 32, border: '1px solid rgba(232,146,124,0.2)', background: 'linear-gradient(135deg, rgba(26,95,106,0.2), rgba(232,146,124,0.08))' }}>
            <div style={{ fontSize: 13, color: 'var(--rose)', fontFamily: 'var(--font-mono)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>For caregivers, by design</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, marginBottom: 20, lineHeight: 1.2 }}>
              Preventing 1 crisis saves<br /><span className="gradient-text">₹2.5 lakh in healthcare costs.</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 36, lineHeight: 1.7 }}>
              Join 50,000 caregivers who deserve to be seen, supported, and protected.
            </p>
            <button className="btn-primary" style={{ fontSize: 17, padding: '16px 44px' }} onClick={() => navigate('/login')}>
              Begin for Free →
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '32px', borderTop: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 13 }}>
        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--rose-light)' }}>CareGuard AI</span> · Team Mystic Matrix · WitchHunt Hackathon 2026
      </footer>
    </div>
  )
}