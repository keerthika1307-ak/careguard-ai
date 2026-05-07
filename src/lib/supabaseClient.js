 
// src/lib/supabaseClient.js
// ============================================
// SINGLE SOURCE OF TRUTH for all Supabase calls
// Import this everywhere instead of raw supabase client
// ============================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// AUTH HELPERS
// ============================================

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  })
  return { data, error }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ============================================
// PROFILE HELPERS
// ============================================

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

// ============================================
// CHECK-IN HELPERS
// ============================================

export async function saveCheckin(userId, moodScore, sleepHours, notes = '') {
  const { data, error } = await supabase
    .from('checkins')
    .insert({ user_id: userId, mood_score: moodScore, sleep_hours: sleepHours, notes })
    .select()
    .single()
  return { data, error }
}

export async function getRecentCheckins(userId, days = 7) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function getTodayCheckin(userId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return { data, error }
}

// ============================================
// VOICE ANALYSIS HELPERS
// ============================================

export async function saveVoiceAnalysis(userId, features, stressLabel, explanation, transcript = '') {
  const { data, error } = await supabase
    .from('voice_analyses')
    .insert({
      user_id: userId,
      rms_energy: features.rmsEnergy,
      pitch_mean: features.pitchMean,
      pitch_variance: features.pitchVariance,
      speaking_rate: features.speakingRate,
      spectral_centroid: features.spectralCentroid,
      stress_label: stressLabel,
      claude_explanation: explanation,
      transcript
    })
    .select()
    .single()
  return { data, error }
}

export async function getLatestVoiceAnalysis(userId) {
  const { data, error } = await supabase
    .from('voice_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return { data, error }
}

// ============================================
// RISK SCORE HELPERS
// ============================================

export async function saveRiskScore(userId, score, tier, components, explanation) {
  const { data, error } = await supabase
    .from('risk_scores')
    .insert({
      user_id: userId,
      score,
      tier,
      voice_component: components.voice,
      mood_component: components.mood,
      sleep_component: components.sleep,
      trend_component: components.trend,
      claude_explanation: explanation
    })
    .select()
    .single()
  return { data, error }
}

export async function getRiskScoreHistory(userId, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('risk_scores')
    .select('score, tier, created_at')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function getLatestRiskScore(userId) {
  const { data, error } = await supabase
    .from('risk_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return { data, error }
}

// ============================================
// CHAT MESSAGE HELPERS
// ============================================

export async function saveChatMessage(userId, role, content, language = 'en') {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, role, content, language })
    .select()
    .single()
  return { data, error }
}

export async function getChatHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)
  return { data, error }
}

// ============================================
// RESPITE CENTER HELPERS
// ============================================

export async function getRespiteCenters(city = null) {
  let query = supabase
    .from('respite_centers')
    .select('*')
    .eq('is_available', true)
    .order('rating', { ascending: false })

  if (city) {
    query = query.ilike('city', `%${city}%`)
  }

  const { data, error } = await query
  return { data, error }
}

// ============================================
// INTERVENTIONS HELPERS
// ============================================

export async function logIntervention(userId, tier, type, content) {
  const { data, error } = await supabase
    .from('interventions')
    .insert({ user_id: userId, tier, type, content })
    .select()
    .single()
  return { data, error }
}

// ============================================
// PEER MATCHING HELPERS
// ============================================

export async function getMyPeerMatches(userId) {
  const { data, error } = await supabase
    .from('peer_matches')
    .select(`
      *,
      user_a_profile:profiles!peer_matches_user_a_fkey(full_name, caregiver_type, years_caregiving),
      user_b_profile:profiles!peer_matches_user_b_fkey(full_name, caregiver_type, years_caregiving)
    `)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq('status', 'accepted')
  return { data, error }
}