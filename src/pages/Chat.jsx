// src/pages/Chat.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import {
  getUser, getProfile, getLatestRiskScore,
  saveChatMessage, getChatHistory
} from '../lib/supabaseClient'
import { chatWithCaregiver } from '../lib/claudeClient'

const QUICK_PROMPTS_EN = [
  "I'm feeling overwhelmed today",
  "I haven't slept well in days",
  "I feel guilty when I take breaks",
  "How do I deal with caregiver guilt?",
  "I need someone to talk to",
]

const QUICK_PROMPTS_TA = [
  "இன்று மிகவும் சோர்வாக இருக்கிறேன்",
  "பல நாட்களாக தூக்கமில்லை",
  "ஓய்வெடுக்கும்போது குற்ற உணர்வு வருகிறது",
  "யாரிடமாவது பேச வேண்டும்",
]

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 18px', background: 'rgba(255,255,255,0.05)', borderRadius: '18px 18px 18px 4px', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rose-light)', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
    </div>
  )
}

function Message({ msg, isUser }) {
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16, animation: 'fadeUp 0.3s ease' }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--rose), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginRight: 10, marginTop: 2 }}>
          🛡️
        </div>
      )}
      <div style={{
        maxWidth: '72%',
        padding: '14px 18px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser
          ? 'linear-gradient(135deg, var(--rose), var(--rose-dark))'
          : 'rgba(255,255,255,0.06)',
        border: isUser ? 'none' : '1px solid var(--border)',
        fontSize: 15,
        lineHeight: 1.7,
        color: 'var(--text)',
      }}>
        {msg.content}
        <div style={{ fontSize: 11, color: isUser ? 'rgba(255,255,255,0.6)' : 'var(--text-dim)', marginTop: 6, textAlign: isUser ? 'right' : 'left' }}>
          {new Date(msg.created_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

export default function Chat() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [riskScore, setRiskScore] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState('en')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    async function load() {
      const u = await getUser()
      if (!u) { navigate('/login'); return }
      setUser(u)

      const { data: p } = await getProfile(u.id)
      setProfile(p)
      setLang(p?.language ?? 'en')

      const { data: s } = await getLatestRiskScore(u.id)
      if (s) setRiskScore(s.score)

      // Load chat history
      const { data: history } = await getChatHistory(u.id, 30)
      if (history?.length) {
        setMessages(history)
      } else {
        // Welcome message
        const welcome = {
          id: 'welcome',
          role: 'assistant',
          content: p?.language === 'ta'
            ? `வணக்கம் ${p?.full_name?.split(' ')[0] ?? ''}! நான் CareGuard AI. நீங்கள் எப்படி இருக்கிறீர்கள்? இன்று உங்கள் மனதில் என்ன இருக்கிறது?`
            : `Hello ${p?.full_name?.split(' ')[0] ?? 'there'} 💙 I'm CareGuard, your AI companion. I'm here to listen — no judgement, no pressure. How are you feeling today?`,
          created_at: new Date().toISOString()
        }
        setMessages([welcome])
      }
    }
    load()
  }, [navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || loading) return
    setInput('')

    const userMsg = { id: Date.now(), role: 'user', content, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      // Save user message
      await saveChatMessage(user.id, 'user', content, lang)

      // Build message history for Claude (exclude welcome msg)
      const history = [...messages.filter(m => m.id !== 'welcome'), userMsg]
        .map(m => ({ role: m.role, content: m.content }))

      // Call Claude
      const reply = await chatWithCaregiver(history, profile ?? {}, riskScore, lang)

      const assistantMsg = { id: Date.now() + 1, role: 'assistant', content: reply, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, assistantMsg])

      // Save assistant message
      await saveChatMessage(user.id, 'assistant', reply, lang)
    } catch (e) {
      const errMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: lang === 'ta'
          ? 'மன்னிக்கவும், தொடர்பு கொள்ள இயலவில்லை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.'
          : 'I\'m having trouble connecting right now. Please try again in a moment.',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const quickPrompts = lang === 'ta' ? QUICK_PROMPTS_TA : QUICK_PROMPTS_EN
  const showQuickPrompts = messages.length <= 1

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar profile={profile} riskScore={riskScore} />

      <main style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(13,31,35,0.8)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--rose), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--bg)' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>CareGuard AI</div>
              <div style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                Online · Available 24/7
              </div>
            </div>
          </div>

          {/* Language toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, gap: 3 }}>
            {[{ v: 'en', l: 'EN' }, { v: 'ta', l: 'தமிழ்' }].map(l => (
              <button key={l.v} onClick={() => setLang(l.v)}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', transition: 'all 0.2s', background: lang === l.v ? 'var(--rose)' : 'transparent', color: lang === l.v ? 'white' : 'var(--text-muted)' }}>
                {l.l}
              </button>
            ))}
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {/* Risk score context banner */}
          {riskScore !== null && (
            <div style={{ marginBottom: 24, padding: '12px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>📊</span>
              <span>
                {lang === 'ta'
                  ? `உங்கள் இன்றைய burnout risk score: ${riskScore.toFixed(1)}/10 — AI இதை கணக்கில் எடுத்துக்கொள்ளும்`
                  : `Context: Your current risk score is ${riskScore.toFixed(1)}/10 — CareGuard will tailor responses accordingly`}
              </span>
            </div>
          )}

          {/* Messages */}
          {messages.map(msg => (
            <Message key={msg.id} msg={msg} isUser={msg.role === 'user'} />
          ))}

          {loading && (
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--rose), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginRight: 10, flexShrink: 0 }}>🛡️</div>
              <TypingIndicator />
            </div>
          )}

          {/* Quick prompts */}
          {showQuickPrompts && !loading && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 12 }}>
                {lang === 'ta' ? 'விரைவு கேள்விகள்' : 'QUICK STARTS'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {quickPrompts.map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p)}
                    style={{ padding: '10px 16px', borderRadius: 99, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.color = 'var(--rose-light)'; e.currentTarget.style.background = 'rgba(232,146,124,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'rgba(13,31,35,0.8)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'flex-end', gap: 10, transition: 'border-color 0.2s' }}
              onFocus={() => {}} >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={lang === 'ta' ? 'உங்கள் மனதில் உள்ளதை சொல்லுங்கள்...' : 'Share what\'s on your mind... (Enter to send)'}
                rows={1}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 15, resize: 'none', lineHeight: 1.5, maxHeight: 120 }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
              />
            </div>
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: input.trim() && !loading ? 'linear-gradient(135deg, var(--rose), var(--rose-dark))' : 'rgba(255,255,255,0.08)', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, transition: 'all 0.2s', boxShadow: input.trim() && !loading ? '0 4px 16px rgba(232,146,124,0.4)' : 'none' }}>
              ↑
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>
            {lang === 'ta' ? 'CareGuard AI மனநல நிபுணர் அல்ல — தொழில்முறை உதவிக்கு மருத்துவரை அணுகவும்' : 'CareGuard AI is not a mental health professional — seek professional help for serious concerns'}
          </div>
        </div>
      </main>
    </div>
  )
}