// src/lib/claudeClient.js
// ============================================
// ALL CLAUDE API CALLS IN ONE PLACE
// Never call Claude directly from components
// Always use these functions
// ============================================

const CLAUDE_API = '/api/anthropic/v1/messages'

// Model choices (use haiku to save credits, sonnet for important calls)
const HAIKU = 'claude-haiku-4-5'
const SONNET = 'claude-sonnet-4-5'

async function parseClaudeError(res) {
  try {
    const err = await res.json()
    return err.error?.message || `Claude API error (${res.status})`
  } catch {
    return `Claude API error (${res.status})`
  }
}

async function callClaude(model, systemPrompt, userMessage, maxTokens = 300) {
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  })

  if (!res.ok) {
    throw new Error(await parseClaudeError(res))
  }

  const data = await res.json()
  return data.content[0].text
}

// ============================================
// 1. VOICE STRESS ANALYSIS
// Takes extracted audio features → returns stress label + explanation
// Uses Sonnet for better accuracy (this is the core AI feature)
// ============================================

export async function analyzeVoiceStress(features, language = 'en') {
  const langInstruction = language === 'ta'
    ? 'Reply in Tamil language (தமிழ்). Keep it short — 2 sentences max.'
    : 'Reply in English. Keep it short — 2 sentences max.'

  const system = `You are a clinical voice stress analyzer specializing in caregiver burnout detection.
Analyze voice biomarkers and classify stress level. ${langInstruction}
Always respond with EXACTLY this JSON format:
{"stress_label": "low|medium|high", "explanation": "your 2-sentence explanation here"}`

  const user = `Analyze these voice biomarkers from a family caregiver:

RMS Energy: ${features.rmsEnergy.toFixed(4)} (scale 0-1; below 0.03 = very low energy)
Pitch Mean: ${features.pitchMean.toFixed(1)} Hz (normal female 165-255 Hz, male 85-155 Hz)
Pitch Variance: ${features.pitchVariance.toFixed(1)} Hz (below 10 = monotone, exhausted)
Speaking Rate: ${features.speakingRate.toFixed(2)} words/sec (below 2.0 = very slow, fatigued)
Spectral Centroid: ${features.spectralCentroid.toFixed(0)} Hz (below 1500 = dull, lifeless voice)

Clinical context: High stress caregivers show low energy, monotone pitch, slow speech.
Classify as: low (rested), medium (mild stress), or high (burnout risk).`

  const response = await callClaude(SONNET, system, user, 200)

  try {
    const cleaned = response.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    // Fallback if JSON parsing fails
    return {
      stress_label: 'medium',
      explanation: response
    }
  }
}

// ============================================
// 2. RISK SCORE EXPLANATION
// Takes the computed score → returns plain-language explanation
// Uses Haiku (cheap, simple task)
// ============================================

export async function explainRiskScore(score, tier, components, recentData, language = 'en') {
  const langInstruction = language === 'ta'
    ? 'Reply in Tamil language (தமிழ்). 3 sentences max. Warm and empathetic tone.'
    : 'Reply in English. 3 sentences max. Warm and empathetic tone.'

  const system = `You are an empathetic caregiver wellness coach explaining a burnout risk score.
${langInstruction}
Never be alarmist. Always end with one small, doable action they can take right now.`

  const user = `Explain this caregiver's burnout risk score:

Overall Score: ${score.toFixed(1)} / 10 (${tier.toUpperCase()} zone)
Voice stress component: ${components.voice?.toFixed(1) ?? 'N/A'} / 10
Mood component: ${components.mood?.toFixed(1) ?? 'N/A'} / 10  
Sleep component: ${components.sleep?.toFixed(1) ?? 'N/A'} / 10
7-day trend: ${recentData.trend}

Recent pattern: ${recentData.summary}

Explain why their score is ${score.toFixed(1)} and what one small thing they can do today.`

  return await callClaude(HAIKU, system, user, 250)
}

// ============================================
// 3. EMPATHETIC CHATBOT
// Full conversation with caregiver
// Uses Haiku (many messages, need to conserve credits)
// ============================================

export async function chatWithCaregiver(messages, userProfile, currentRiskScore, language = 'en') {
  const langInstruction = language === 'ta'
    ? 'Always respond in Tamil (தமிழ்). You can mix a little English for medical terms.'
    : 'Respond in English.'

  const system = `You are CareGuard, an empathetic AI companion for family caregivers in India.
${langInstruction}

About this caregiver:
- Name: ${userProfile.full_name}
- Caregiving for: ${userProfile.caregiver_type?.replace(/_/g, ' ') ?? 'family member'}
- Years caregiving: ${userProfile.years_caregiving ?? 'unknown'}
- Current burnout risk score: ${currentRiskScore ?? 'unknown'} / 10

Your role:
- Listen first, advise second
- Validate their feelings before offering solutions
- Suggest practical, India-specific resources when relevant
- If risk score is 7+, gently suggest they use the Respite Care finder
- Never diagnose. Never replace professional mental health support.
- Keep responses under 120 words. Be warm, not clinical.`

  // Convert our chat history format to Claude's format
  const claudeMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }))

  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: 300,
      system,
      messages: claudeMessages
    })
  })

  if (!res.ok) {
    throw new Error(await parseClaudeError(res))
  }

  const data = await res.json()
  return data.content[0].text
}

// ============================================
// 4. WELLNESS TIP GENERATOR
// Generates a personalized daily tip (Green zone)
// Uses Haiku (very simple, very cheap)
// ============================================

export async function getDailyWellnessTip(userProfile, currentScore, language = 'en') {
  const langInstruction = language === 'ta'
    ? 'Reply in Tamil language (தமிழ்).'
    : 'Reply in English.'

  const system = `You are a wellness coach for caregivers. ${langInstruction}
Give ONE specific, actionable wellness tip. Max 2 sentences. Practical for busy Indian caregivers.`

  const user = `Give a wellness tip for a caregiver who:
- Cares for: ${userProfile.caregiver_type?.replace(/_/g, ' ') ?? 'family member'}
- Current risk score: ${currentScore} / 10
- Time of day: ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}

Make it specific to their situation, not generic.`

  return await callClaude(HAIKU, system, user, 150)
}

// ============================================
// 5. PEER MATCH INTRODUCTION
// Generates an intro message when two caregivers are matched
// ============================================

export async function generatePeerIntroduction(userA, userB, language = 'en') {
  const langInstruction = language === 'ta' ? 'Write in Tamil.' : 'Write in English.'

  const system = `You create warm introductions between matched caregiver peers. ${langInstruction}
Keep it to 3 sentences. Highlight what they have in common. Encouraging tone.`

  const user = `Write a peer introduction for these two matched caregivers:

Caregiver A: ${userA.full_name}, caring for ${userA.caregiver_type?.replace(/_/g, ' ')}, ${userA.years_caregiving} years
Caregiver B: ${userB.full_name}, caring for ${userB.caregiver_type?.replace(/_/g, ' ')}, ${userB.years_caregiving} years

Introduce them to each other and highlight their shared experience.`

  return await callClaude(HAIKU, system, user, 150)
}