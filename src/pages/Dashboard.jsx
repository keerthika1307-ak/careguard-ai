// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import Sidebar from '../components/Sidebar'
import { getUser, getProfile, getLatestRiskScore, getRiskScoreHistory, getRecentCheckins, getTodayCheckin, getDailyWellnessTip } from '../lib/supabaseClient'
import { getDailyWellnessTip as getClaudeTip } from '../lib/claudeClient'

// Mock data for demo if no real data yet
const MOCK_HISTORY = [
  { date: 'Apr 30', score: 3.2 },
  { date: 'May 1',  score: 4.1 },
  { date: 'May 2',  score: 4.8 },
  { date: 'May 3',  score: 5.5 },
  { date: 'May 4',  score: 5.1 },
  { date: 'May 5',  score: 6.4 },
  { date: 'May 6',  score: 6.8 },
  { date: 'May 7',  score: 7.2 },
]

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const score = payload[0].value
  const tier = score >= 7 ? 'red' : score >= 4 ? 'yellow' : 'green'
  const color = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' }[tier]
  return (
    <div style={{ background: 'rgba(13,31,35,0.95)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{payload[0].payload.date}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{score}</div>
    </div>
  )
}

function RiskGauge({ score, tier }) {
  const tierColor = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' }[tier] ?? 'var(--text-muted)'
  const tierLabel = { green: 'Low Risk', yellow: 'Moderate Risk', red: 'High Risk' }[tier] ?? '—'
  const pct = (score / 10) * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
      {/* Arc gauge */}
      <div style={{ position: 'relative', width: 180, height: 100, marginBottom: 16 }}>
        <svg width="180" height="100" viewBox="0 0 180 100">
          {/* Track */}
          <path d="M 10 95 A 80 80 0 0 1 170 95" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
          {/* Fill — animated */}
          <path d="M 10 95 A 80 80 0 0 1 170 95" fill="none"
            stroke={tierColor} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${pct * 2.51} 251`}
            style={{ transition: 'stroke-dasharray 1.2s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 8px ${tierColor})` }} />
          {/* Zone markers */}
          <text x="10" y="112" fontSize="10" fill="var(--green)" textAnchor="middle">0</text>
          <text x="90" y="25" fontSize="10" fill="var(--yellow)" textAnchor="middle">5</text>
          <text x="170" y="112" fontSize="10" fill="var(--red)" textAnchor="middle">10</text>
        </svg>
        {/* Score in centre */}
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 700, color: tierColor, lineHeight: 1, filter: `drop-shadow(0 0 16px ${tierColor}44)` }}>
            {score !== null ? score.toFixed(1) : '—'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: tierColor, boxShadow: `0 0 10px ${tierColor}`, animation: tier === 'red' ? 'pulse-ring 1.5s ease-out infinite' : 'none' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: tierColor }}>{tierLabel}</span>
      </div>
    </div>
  )
}

function StatPill({ icon, label, value, sub, color }) {
  return (
    <div className="glass" style={{ padding: '16px 20px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: color ?? 'var(--text)', fontFamily: 'var(--font-display)' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [latestScore, setLatestScore] = useState(null)
  const [history, setHistory] = useState(MOCK_HISTORY)
  const [todayCheckin, setTodayCheckin] = useState(null)
  const [tip, setTip] = useState('')
  const [loadingTip, setLoadingTip] = useState(false)

  useEffect(() => {
    async function load() {
      const user = await getUser()
      if (!user) { navigate('/login'); return }

      const { data: prof } = await getProfile(user.id)
      setProfile(prof)

      const { data: score } = await getLatestRiskScore(user.id)
      if (score) setLatestScore(score)

      const { data: hist } = await getRiskScoreHistory(user.id, 7)
      if (hist?.length > 1) {
        setHistory(hist.map(r => ({
          date: new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          score: r.score
        })))
      }

      const { data: checkin } = await getTodayCheckin(user.id)
      setTodayCheckin(checkin)

      // Load Claude tip
      setLoadingTip(true)
      try {
        const t = await getClaudeTip(prof ?? {}, score?.score ?? 5, prof?.language ?? 'en')
        setTip(t)
      } catch { setTip('Take 3 deep breaths right now. In for 4 counts, hold for 4, out for 6. You deserve this moment.') }
      finally { setLoadingTip(false) }
    }
    load()
  }, [navigate])

  const score = latestScore?.score ?? null
  const tier = latestScore?.tier ?? 'green'
  const tierColor = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' }[tier]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar profile={profile} riskScore={score} />

      {/* Main content */}
      <main style={{ marginLeft: 'var(--sidebar-w)', flex: 1, padding: '36px 40px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 6 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
              {profile ? `Good ${new Date().getHours() < 12 ? 'morning' : 'evening'}, ${profile.full_name?.split(' ')[0]}` : 'Your Dashboard'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 6 }}>
              {todayCheckin ? "Today's check-in complete. Your progress is tracked." : "Complete today's check-in to update your risk score."}
            </p>
          </div>

          {!todayCheckin && (
            <button className="btn-primary" onClick={() => navigate('/checkin')} style={{ flexShrink: 0 }}>
              ✦ Daily Check-in
            </button>
          )}
        </div>

        {/* Alert banner for Red zone */}
        {tier === 'red' && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 16, padding: '18px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 24 }}>🚨</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--red)', marginBottom: 2 }}>High Burnout Risk Detected</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your score is above 7. Please consider booking respite care or alerting a family member.</div>
              </div>
            </div>
            <button className="btn-primary" onClick={() => navigate('/respite')} style={{ background: 'linear-gradient(135deg, var(--red), #c0392b)', flexShrink: 0 }}>
              Find Help →
            </button>
          </div>
        )}

        {/* Top row — Risk gauge + Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, marginBottom: 24 }}>

          {/* Risk gauge card */}
          <div className="glass" style={{ padding: '28px 24px', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 20, alignSelf: 'flex-start' }}>BURNOUT RISK INDEX</div>
            <RiskGauge score={score} tier={tier} />
            <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '20px 0' }} />
            <div style={{ width: '100%', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, textAlign: 'center', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
              {latestScore?.claude_explanation
                ? `"${latestScore.claude_explanation.slice(0, 120)}..."`
                : '"Complete your check-in to generate your personalised risk score."'}
            </div>
          </div>

          {/* 7-day trend chart */}
          <div className="glass" style={{ padding: '28px', borderRadius: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 4 }}>7-DAY STRESS TREND</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  {history.length >= 2
                    ? history[history.length - 1].score > history[0].score
                      ? '📈 Stress increasing — take action today'
                      : '📉 Improving — keep going!'
                    : 'Building your trend data...'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ label: 'Low', color: 'var(--green)' }, { label: 'Mid', color: 'var(--yellow)' }, { label: 'High', color: 'var(--red)' }].map(z => (
                  <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: z.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{z.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={history}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--green)" />
                    <stop offset="45%" stopColor="var(--yellow)" />
                    <stop offset="100%" stopColor="var(--red)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={4} stroke="rgba(251,191,36,0.3)" strokeDasharray="4 4" />
                <ReferenceLine y={7} stroke="rgba(248,113,113,0.3)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="score" stroke="url(#scoreGrad)" strokeWidth={3} dot={{ fill: 'var(--bg)', stroke: tierColor, strokeWidth: 2, r: 5 }} activeDot={{ r: 7, fill: tierColor }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatPill icon="😴" label="LAST SLEEP" value={todayCheckin ? `${todayCheckin.sleep_hours}h` : '—'} sub="Self reported" color={todayCheckin?.sleep_hours >= 6 ? 'var(--green)' : 'var(--red)'} />
          <StatPill icon="😊" label="MOOD TODAY" value={todayCheckin ? `${todayCheckin.mood_score}/5` : '—'} sub="Emoji scale" color={todayCheckin?.mood_score >= 3 ? 'var(--green)' : 'var(--yellow)'} />
          <StatPill icon="🎙️" label="VOICE STRESS" value={latestScore?.voice_component !== null ? `${latestScore?.voice_component?.toFixed(1) ?? '—'}/10` : '—'} sub="Today's reading" color="var(--rose-light)" />
          <StatPill icon="📈" label="7-DAY TREND" value={history.length >= 2 ? (history[history.length-1].score > history[0].score ? '↑ Rising' : '↓ Falling') : '—'} sub="vs last week" color={history.length >= 2 && history[history.length-1].score <= history[0].score ? 'var(--green)' : 'var(--yellow)'} />
        </div>

        {/* Bottom row — Claude tip + Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

          {/* AI Tip */}
          <div className="glass" style={{ padding: '28px', borderRadius: 20, background: 'linear-gradient(135deg, rgba(26,95,106,0.15), rgba(232,146,124,0.08))' }}>
            <div style={{ fontSize: 11, color: 'var(--rose)', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 16 }}>✦ YOUR AI COMPANION SAYS</div>
            {loadingTip ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rose)', animation: `pulse-ring 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Thinking...</span>
              </div>
            ) : (
              <p style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.8, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                "{tip}"
              </p>
            )}
            <button onClick={() => navigate('/chat')} style={{ marginTop: 20, background: 'none', border: 'none', color: 'var(--rose-light)', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
              Talk to CareGuard AI →
            </button>
          </div>

          {/* Quick actions */}
          <div className="glass" style={{ padding: '28px', borderRadius: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 20 }}>QUICK ACTIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '🎙️', label: 'Record Voice Check-in', path: '/checkin', color: 'var(--rose)' },
                { icon: '💬', label: 'Chat with AI Companion', path: '/chat', color: 'var(--teal-light)' },
                { icon: '🤝', label: 'Find a Peer Match', path: '/peers', color: 'var(--gold)' },
                { icon: '🏥', label: 'Browse Respite Care', path: '/respite', color: 'var(--green)' },
              ].map(a => (
                <button key={a.path} onClick={() => navigate(a.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', textAlign: 'left', width: '100%', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = `${a.color}11` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <span>{a.label}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}