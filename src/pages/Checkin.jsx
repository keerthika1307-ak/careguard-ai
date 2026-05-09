// src/pages/Checkin.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { getUser, getProfile, getLatestRiskScore, saveCheckin, saveVoiceAnalysis, saveRiskScore, logIntervention } from '../lib/supabaseClient'
import { analyzeVoiceStress, explainRiskScore } from '../lib/claudeClient'
import { extractAudioFeatures, computeRiskScore, getTierColor, getTierLabel, getInterventionForTier } from '../lib/riskEngine'

const MOODS = [
  { score: 1, emoji: '😢', label: 'Very Low' },
  { score: 2, emoji: '😟', label: 'Low' },
  { score: 3, emoji: '😐', label: 'Neutral' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😊', label: 'Great' },
]

const STEPS = ['mood', 'sleep', 'voice', 'result']

export default function Checkin() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [riskScore, setRiskScore] = useState(null)
  const [step, setStep] = useState(0) // 0=mood, 1=sleep, 2=voice, 3=result

  // Form state
  const [mood, setMood] = useState(null)
  const [sleep, setSleep] = useState(6)
  const [notes, setNotes] = useState('')

  // Voice state
  const [recording, setRecording] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [timer, setTimer] = useState(30)
  const [skipVoice, setSkipVoice] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  // Result state
  const [computing, setComputing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const u = await getUser()
      if (!u) { navigate('/login'); return }
      setUser(u)
      const { data: p } = await getProfile(u.id)
      setProfile(p)
      const { data: s } = await getLatestRiskScore(u.id)
      if (s) setRiskScore(s.score)
    }
    load()
  }, [navigate])

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setRecorded(true)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setTimer(30)

      // Auto stop at 30s
      let t = 30
      timerRef.current = setInterval(() => {
        t -= 1
        setTimer(t)
        if (t <= 0) stopRecording()
      }, 1000)
    } catch {
      setError('Microphone access denied. Please allow microphone in browser settings.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    clearInterval(timerRef.current)
    setRecording(false)
  }

  // Compute final result
  const computeResult = async () => {
    setComputing(true)
    setError('')
    try {
      const lang = profile?.language ?? 'en'
      let voiceAnalysisRow = null
      let voiceFeatures = null

      // Process voice if recorded
      if (audioBlob && !skipVoice) {
        const features = await extractAudioFeatures(audioBlob)
        voiceFeatures = features
        const { stress_label, explanation } = await analyzeVoiceStress(features, lang)

        const { data: vaRow } = await saveVoiceAnalysis(
          user.id, features, stress_label, explanation
        )
        voiceAnalysisRow = { ...vaRow, stress_label, rms_energy: features.rmsEnergy, pitch_variance: features.pitchVariance, speaking_rate: features.speakingRate }
      }

      // Save check-in
      await saveCheckin(user.id, mood, sleep, notes)

      // Compute risk score
      const { score, tier, components, recentData } = computeRiskScore({
        voiceAnalysis: voiceAnalysisRow,
        sleepHours: sleep,
        moodScore: mood,
        recentScores: []
      })

      // Get Claude explanation
      const explanation = await explainRiskScore(score, tier, components, recentData, lang)

      // Save risk score
      await saveRiskScore(user.id, score, tier, components, explanation)

      // Log intervention
      const interventions = getInterventionForTier(tier)
      if (interventions[0]) {
        await logIntervention(user.id, tier, interventions[0].type, interventions[0].label)
      }

      setResult({ score, tier, components, explanation })
      setStep(3)
    } catch (e) {
      setError('Something went wrong: ' + e.message)
    } finally {
      setComputing(false)
    }
  }

  const tierColor = result ? getTierColor(result.tier) : 'var(--rose)'
  const lang = profile?.language ?? 'en'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar profile={profile} riskScore={riskScore} />

      <main style={{ marginLeft: 'var(--sidebar-w)', flex: 1, padding: '36px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Header */}
        <div style={{ width: '100%', maxWidth: 680, marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 8 }}>DAILY CHECK-IN</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700 }}>How are you doing today?</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 15 }}>Takes 2 minutes. Your answers update your burnout risk score.</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, width: '100%', maxWidth: 680 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? 'var(--rose)' : 'rgba(255,255,255,0.1)', transition: 'background 0.4s ease' }} />
          ))}
        </div>

        {/* STEP 0 — MOOD */}
        {step === 0 && (
          <div style={{ width: '100%', maxWidth: 680, animation: 'fadeUp 0.4s ease' }}>
            <div className="glass" style={{ padding: '40px', borderRadius: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>How is your mood right now?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 36 }}>Be honest — this is just for you.</p>

              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
                {MOODS.map(m => (
                  <button key={m.score} onClick={() => setMood(m.score)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 24px', borderRadius: 16, border: `2px solid ${mood === m.score ? 'var(--rose)' : 'var(--border)'}`, background: mood === m.score ? 'rgba(232,146,124,0.12)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s', transform: mood === m.score ? 'scale(1.08)' : 'scale(1)' }}>
                    <span style={{ fontSize: 44 }}>{m.emoji}</span>
                    <span style={{ fontSize: 12, color: mood === m.score ? 'var(--rose-light)' : 'var(--text-muted)', fontWeight: mood === m.score ? 600 : 400 }}>{m.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Any thoughts you want to add? (optional)</label>
                <textarea className="input" rows={3} placeholder="How is your day going..." value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ resize: 'none', lineHeight: 1.6 }} />
              </div>

              <button className="btn-primary" onClick={() => setStep(1)} disabled={!mood}
                style={{ width: '100%', justifyContent: 'center', opacity: !mood ? 0.5 : 1, fontSize: 16, padding: '15px' }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 1 — SLEEP */}
        {step === 1 && (
          <div style={{ width: '100%', maxWidth: 680, animation: 'fadeUp 0.4s ease' }}>
            <div className="glass" style={{ padding: '40px', borderRadius: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>How much did you sleep last night?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 40 }}>Sleep is the #1 predictor of caregiver burnout.</p>

              {/* Big sleep display */}
              <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 80, fontWeight: 700, color: sleep >= 6 ? 'var(--green)' : sleep >= 4.5 ? 'var(--yellow)' : 'var(--red)', lineHeight: 1, transition: 'color 0.3s' }}>
                  {sleep}
                </div>
                <div style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 4 }}>hours</div>
                <div style={{ fontSize: 13, marginTop: 12, color: sleep >= 7 ? 'var(--green)' : sleep >= 5 ? 'var(--yellow)' : 'var(--red)' }}>
                  {sleep >= 7 ? '✓ Well rested' : sleep >= 5 ? '⚠ Below recommended' : '⚠ Severely sleep deprived'}
                </div>
              </div>

              {/* Slider */}
              <div style={{ padding: '0 8px', marginBottom: 40 }}>
                <input type="range" min={0} max={12} step={0.5} value={sleep}
                  onChange={e => setSleep(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--rose)', height: 6, cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                  <span>0h</span><span>3h</span><span>6h</span><span>9h</span><span>12h</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-ghost" onClick={() => setStep(0)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(2)} style={{ flex: 2, justifyContent: 'center', fontSize: 16, padding: '15px' }}>Continue →</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — VOICE */}
        {step === 2 && (
          <div style={{ width: '100%', maxWidth: 680, animation: 'fadeUp 0.4s ease' }}>
            <div className="glass" style={{ padding: '40px', borderRadius: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>Voice stress check</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>
                Record 30 seconds of your voice. Say anything — how your day went, how you're feeling. Our AI analyzes your tone, not your words.
              </p>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 36, fontFamily: 'var(--font-mono)' }}>🔒 Audio is processed locally and never stored</div>

              {/* Recorder UI */}
              {!recorded && !skipVoice && (
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                  {/* Mic button */}
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    {recording && (
                      <>
                        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '2px solid var(--rose)', animation: 'pulse-ring 1.5s ease-out infinite', opacity: 0.5 }} />
                        <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', border: '2px solid var(--rose)', animation: 'pulse-ring 1.5s ease-out infinite 0.4s', opacity: 0.3 }} />
                      </>
                    )}
                    <button onClick={recording ? stopRecording : startRecording}
                      style={{ width: 90, height: 90, borderRadius: '50%', border: 'none', cursor: 'pointer', background: recording ? 'var(--red)' : 'linear-gradient(135deg, var(--rose), var(--rose-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: recording ? '0 0 32px rgba(248,113,113,0.5)' : '0 8px 32px rgba(232,146,124,0.4)', transition: 'all 0.3s', position: 'relative', zIndex: 1 }}>
                      {recording ? '⏹' : '🎙️'}
                    </button>
                  </div>

                  {recording ? (
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, color: 'var(--red)', lineHeight: 1 }}>{timer}s</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>Recording... speak freely</div>
                      <div style={{ marginTop: 16, fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        "Tell me about your day. How are you feeling right now?"
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>Tap to start recording</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>30 seconds · speak naturally</div>
                    </div>
                  )}
                </div>
              )}

              {/* Recorded success */}
              {recorded && !skipVoice && (
                <div style={{ textAlign: 'center', marginBottom: 36, padding: '24px', background: 'rgba(74,222,128,0.08)', borderRadius: 16, border: '1px solid rgba(74,222,128,0.2)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--green)', marginBottom: 8 }}>Voice recorded successfully</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Claude will analyze your voice biomarkers</div>
                  <button onClick={() => { setRecorded(false); setAudioBlob(null) }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>
                    Re-record
                  </button>
                </div>
              )}

              {/* Skip option */}
              {!skipVoice && (
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <button onClick={() => setSkipVoice(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>
                    Skip voice check-in for today
                  </button>
                </div>
              )}

              {skipVoice && (
                <div style={{ textAlign: 'center', marginBottom: 36, padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Voice check-in skipped — score will be based on mood + sleep only.</div>
                  <button onClick={() => setSkipVoice(false)} style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: 13, marginTop: 8, fontFamily: 'var(--font-body)' }}>
                    Record voice instead
                  </button>
                </div>
              )}

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: 'var(--red)' }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                <button className="btn-primary" onClick={computeResult}
                  disabled={(!recorded && !skipVoice) || computing}
                  style={{ flex: 2, justifyContent: 'center', fontSize: 16, padding: '15px', opacity: (!recorded && !skipVoice) || computing ? 0.5 : 1 }}>
                  {computing ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Analyzing with AI...
                    </span>
                  ) : 'Generate My Risk Score →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — RESULT */}
        {step === 3 && result && (
          <div style={{ width: '100%', maxWidth: 680, animation: 'fadeUp 0.5s ease' }}>

            {/* Score card */}
            <div className="glass" style={{ padding: '40px', borderRadius: 24, textAlign: 'center', marginBottom: 20, border: `1px solid ${tierColor}33`, background: `linear-gradient(135deg, ${tierColor}08, transparent)` }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 20 }}>YOUR BURNOUT RISK SCORE</div>

              <div style={{ fontFamily: 'var(--font-display)', fontSize: 96, fontWeight: 700, color: tierColor, lineHeight: 1, filter: `drop-shadow(0 0 24px ${tierColor}66)`, marginBottom: 8 }}>
                {result.score.toFixed(1)}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>out of 10</div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: `${tierColor}18`, border: `1px solid ${tierColor}44`, borderRadius: 99, padding: '10px 24px', marginBottom: 32 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tierColor, boxShadow: `0 0 10px ${tierColor}` }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: tierColor }}>{getTierLabel(result.tier, lang)}</span>
              </div>

              {/* Component breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
                {[
                  { label: lang === 'ta' ? 'குரல்' : 'Voice', value: result.components.voice, icon: '🎙️' },
                  { label: lang === 'ta' ? 'தூக்கம்' : 'Sleep', value: result.components.sleep, icon: '😴' },
                  { label: lang === 'ta' ? 'மனநிலை' : 'Mood', value: result.components.mood, icon: '😊' },
                ].map(c => c.value !== null && (
                  <div key={c.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 10px' }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{c.value.toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Claude explanation */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '20px 24px', textAlign: 'left', borderLeft: `3px solid ${tierColor}` }}>
                <div style={{ fontSize: 11, color: 'var(--rose)', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 10 }}>✦ AI INSIGHT</div>
                <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                  "{result.explanation}"
                </p>
              </div>
            </div>

            {/* Recommended actions */}
            <div className="glass" style={{ padding: '28px', borderRadius: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 16 }}>RECOMMENDED FOR YOU</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {getInterventionForTier(result.tier).map((iv, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: `${tierColor}0D`, border: `1px solid ${tierColor}22`, cursor: 'pointer' }}
                    onClick={() => {
                      if (iv.type.includes('respite') || iv.type === 'emergency_respite') navigate('/respite')
                      else if (iv.type === 'peer_match') navigate('/peers')
                      else navigate('/chat')
                    }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: tierColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: 'var(--text)' }}>{iv.label}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>→</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={() => navigate('/dashboard')}
              style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '16px' }}>
              Back to Dashboard →
            </button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}