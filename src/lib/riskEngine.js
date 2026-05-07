 
// src/lib/riskEngine.js
// ============================================
// BURNOUT RISK SCORING ENGINE
// Pure JS — no API needed, runs instantly
// Formula: Voice(35%) + Sleep(30%) + Mood(25%) + Trend(10%)
// ============================================

// ============================================
// SCORE INDIVIDUAL COMPONENTS (each 0–10)
// ============================================

/**
 * Score voice stress (0 = relaxed, 10 = high stress)
 * Based on RMS energy, pitch variance, speaking rate
 */
export function scoreVoice(voiceAnalysis) {
    if (!voiceAnalysis) return null
  
    let score = 0
  
    // RMS Energy (low energy = high burnout risk)
    // Normal: 0.05-0.15 | Low: <0.03 | Very low: <0.01
    if (voiceAnalysis.rms_energy < 0.01) score += 4
    else if (voiceAnalysis.rms_energy < 0.03) score += 3
    else if (voiceAnalysis.rms_energy < 0.05) score += 2
    else if (voiceAnalysis.rms_energy < 0.08) score += 1
  
    // Pitch variance (monotone = exhaustion)
    // Normal: >20 Hz | Low: <10 Hz | Very monotone: <5 Hz
    if (voiceAnalysis.pitch_variance < 5) score += 3
    else if (voiceAnalysis.pitch_variance < 10) score += 2
    else if (voiceAnalysis.pitch_variance < 15) score += 1
  
    // Speaking rate (slow = fatigued)
    // Normal: 2.5-3.5 | Slow: <2.0 | Very slow: <1.5
    if (voiceAnalysis.speaking_rate < 1.5) score += 3
    else if (voiceAnalysis.speaking_rate < 2.0) score += 2
    else if (voiceAnalysis.speaking_rate < 2.5) score += 1
  
    // Claude's stress label as override signal
    if (voiceAnalysis.stress_label === 'high') score = Math.max(score, 7)
    if (voiceAnalysis.stress_label === 'medium') score = Math.max(score, 4)
    if (voiceAnalysis.stress_label === 'low') score = Math.min(score, 4)
  
    return Math.min(10, score)
  }
  
  /**
   * Score sleep quality (0 = well rested, 10 = severely sleep deprived)
   * Based on reported hours of sleep
   */
  export function scoreSleep(sleepHours) {
    if (sleepHours === null || sleepHours === undefined) return null
  
    if (sleepHours >= 7.5) return 0      // Excellent
    if (sleepHours >= 7.0) return 1      // Good
    if (sleepHours >= 6.5) return 2      // Adequate
    if (sleepHours >= 6.0) return 3      // Slightly low
    if (sleepHours >= 5.5) return 4      // Below recommended
    if (sleepHours >= 5.0) return 5      // Noticeably tired
    if (sleepHours >= 4.5) return 6      // Significantly tired
    if (sleepHours >= 4.0) return 7      // Severely sleep deprived
    if (sleepHours >= 3.0) return 8.5    // Dangerous deprivation
    return 10                             // Extreme deprivation
  }
  
  /**
   * Score mood (0 = very happy, 10 = very low mood)
   * Based on emoji scale 1-5 (1=very sad, 5=very happy)
   */
  export function scoreMood(moodScore) {
    if (!moodScore) return null
  
    const mapping = {
      5: 0,    // 😊 Very good
      4: 2,    // 🙂 Good
      3: 4,    // 😐 Neutral
      2: 7,    // 😟 Low
      1: 10    // 😢 Very low
    }
    return mapping[moodScore] ?? 5
  }
  
  /**
   * Score 7-day trend (0 = improving, 10 = rapid deterioration)
   * Looks at direction and speed of change
   */
  export function scoreTrend(recentScores) {
    if (!recentScores || recentScores.length < 2) return 5 // neutral if no history
  
    const scores = recentScores.map(r => r.score)
    const n = scores.length
  
    // Simple linear regression slope
    const xMean = (n - 1) / 2
    const yMean = scores.reduce((a, b) => a + b, 0) / n
    let numerator = 0, denominator = 0
    scores.forEach((y, x) => {
      numerator += (x - xMean) * (y - yMean)
      denominator += (x - xMean) ** 2
    })
    const slope = denominator === 0 ? 0 : numerator / denominator
  
    // Slope per day:
    // Negative = improving, Positive = worsening
    if (slope <= -1.0) return 0      // Rapidly improving
    if (slope <= -0.5) return 2      // Improving
    if (slope <= -0.1) return 3      // Slightly improving
    if (slope <= 0.1) return 5       // Stable
    if (slope <= 0.5) return 6       // Slightly worsening
    if (slope <= 1.0) return 7.5     // Worsening
    return 10                         // Rapidly worsening
  }
  
  // ============================================
  // MAIN RISK SCORE CALCULATOR
  // ============================================
  
  /**
   * Compute final burnout risk score (0–10)
   * 
   * @param {object} params
   * @param {object|null} params.voiceAnalysis - latest voice_analyses row
   * @param {number|null} params.sleepHours - from today's check-in
   * @param {number|null} params.moodScore - from today's check-in (1-5)
   * @param {array} params.recentScores - last 7 risk_scores rows
   * @returns {object} { score, tier, components, summaryText }
   */
  export function computeRiskScore({ voiceAnalysis, sleepHours, moodScore, recentScores }) {
    const voiceScore = scoreVoice(voiceAnalysis)
    const sleepScore = scoreSleep(sleepHours)
    const moodScoreValue = scoreMood(moodScore)
    const trendScore = scoreTrend(recentScores)
  
    // Weighted average — only include components we have data for
    const components = []
    if (voiceScore !== null) components.push({ score: voiceScore, weight: 0.35, label: 'voice' })
    if (sleepScore !== null) components.push({ score: sleepScore, weight: 0.30, label: 'sleep' })
    if (moodScoreValue !== null) components.push({ score: moodScoreValue, weight: 0.25, label: 'mood' })
    components.push({ score: trendScore, weight: 0.10, label: 'trend' })
  
    // Normalize weights if some components are missing
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0)
    const finalScore = components.reduce((sum, c) => sum + (c.score * c.weight / totalWeight), 0)
  
    const roundedScore = Math.round(finalScore * 10) / 10
  
    const tier = roundedScore >= 7 ? 'red'
      : roundedScore >= 4 ? 'yellow'
      : 'green'
  
    // Trend description for Claude explanation
    const trendDesc = trendScore <= 3 ? 'improving over the past week'
      : trendScore <= 6 ? 'stable over the past week'
      : 'worsening over the past week'
  
    const summaryParts = []
    if (sleepHours !== null) summaryParts.push(`${sleepHours}h sleep last night`)
    if (moodScore !== null) summaryParts.push(`mood rated ${moodScore}/5`)
    if (voiceAnalysis) summaryParts.push(`voice stress: ${voiceAnalysis.stress_label}`)
  
    return {
      score: roundedScore,
      tier,
      components: {
        voice: voiceScore,
        sleep: sleepScore,
        mood: moodScoreValue,
        trend: trendScore
      },
      recentData: {
        trend: trendDesc,
        summary: summaryParts.join(', ') || 'Limited data available'
      }
    }
  }
  
  // ============================================
  // TIER HELPER UTILITIES
  // ============================================
  
  export function getTierColor(tier) {
    return {
      green: '#22c55e',
      yellow: '#f59e0b',
      red: '#ef4444'
    }[tier] ?? '#6b7280'
  }
  
  export function getTierLabel(tier, language = 'en') {
    const labels = {
      en: { green: 'Low Risk', yellow: 'Moderate Risk', red: 'High Risk' },
      ta: { green: 'குறைந்த ஆபத்து', yellow: 'மிதமான ஆபத்து', red: 'அதிக ஆபத்து' }
    }
    return labels[language]?.[tier] ?? tier
  }
  
  export function getInterventionForTier(tier) {
    const interventions = {
      green: [
        { type: 'wellness_tip', label: 'Daily Wellness Tip' },
        { type: 'breathing', label: '5-min Breathing Exercise' },
        { type: 'community', label: 'Join Peer Community' }
      ],
      yellow: [
        { type: 'peer_match', label: 'Connect with a Peer Caregiver' },
        { type: 'respite_finder', label: 'Find Respite Care Nearby' },
        { type: 'meditation', label: 'Guided Meditation (10 min)' },
        { type: 'helpline', label: 'Mental Health Helpline' }
      ],
      red: [
        { type: 'emergency_respite', label: 'Book Emergency Respite Care' },
        { type: 'emergency_alert', label: 'Alert Emergency Contact' },
        { type: 'counsellor', label: 'Request Counsellor Callback' }
      ]
    }
    return interventions[tier] ?? []
  }
  
  // ============================================
  // AUDIO FEATURE EXTRACTION
  // Runs entirely in the browser — no server needed
  // ============================================
  
  /**
   * Extract stress biomarkers from an audio blob
   * Uses Web Audio API — works in all modern browsers
   * 
   * @param {Blob} audioBlob - recorded audio
   * @returns {object} features: rmsEnergy, pitchMean, pitchVariance, speakingRate, spectralCentroid
   */
  export async function extractAudioFeatures(audioBlob) {
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const frameSize = 2048
  
    const rmsValues = []
    const pitchValues = []
    const centroidValues = []
    let silenceFrames = 0
    let totalFrames = 0
  
    // Process in frames
    for (let i = 0; i < channelData.length - frameSize; i += frameSize) {
      const frame = channelData.slice(i, i + frameSize)
      totalFrames++
  
      // RMS Energy
      const rms = Math.sqrt(frame.reduce((sum, x) => sum + x * x, 0) / frameSize)
      rmsValues.push(rms)
  
      // Detect silence (for speaking rate estimation)
      if (rms < 0.01) silenceFrames++
  
      // Simple pitch estimation using zero-crossing rate
      let zeroCrossings = 0
      for (let j = 1; j < frame.length; j++) {
        if ((frame[j] >= 0) !== (frame[j - 1] >= 0)) zeroCrossings++
      }
      const zcr = zeroCrossings / frameSize
      // Convert ZCR to approximate frequency
      const estimatedFreq = (zcr * sampleRate) / 2
      if (estimatedFreq > 60 && estimatedFreq < 400) {
        pitchValues.push(estimatedFreq)
      }
  
      // Spectral centroid approximation
      // Using magnitude-weighted frequency average
      let weightedSum = 0, magnitudeSum = 0
      for (let j = 0; j < frame.length; j++) {
        const freq = (j * sampleRate) / frameSize
        const magnitude = Math.abs(frame[j])
        weightedSum += freq * magnitude
        magnitudeSum += magnitude
      }
      if (magnitudeSum > 0) {
        centroidValues.push(weightedSum / magnitudeSum)
      }
    }
  
    // Compute final features
    const rmsEnergy = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length
  
    const pitchMean = pitchValues.length > 0
      ? pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length
      : 150
  
    const pitchVariance = pitchValues.length > 0
      ? Math.sqrt(pitchValues.reduce((sum, p) => sum + (p - pitchMean) ** 2, 0) / pitchValues.length)
      : 0
  
    const spectralCentroid = centroidValues.length > 0
      ? centroidValues.reduce((a, b) => a + b, 0) / centroidValues.length
      : 1500
  
    // Estimate speaking rate from silence ratio
    // More silence = slower speech
    const silenceRatio = silenceFrames / totalFrames
    // Normal speech: ~40-60% silence, gives ~2.5-3.5 words/sec
    const speakingRate = Math.max(0.5, (1 - silenceRatio) * 5)
  
    audioContext.close()
  
    return {
      rmsEnergy: Math.round(rmsEnergy * 10000) / 10000,
      pitchMean: Math.round(pitchMean * 10) / 10,
      pitchVariance: Math.round(pitchVariance * 10) / 10,
      speakingRate: Math.round(speakingRate * 100) / 100,
      spectralCentroid: Math.round(spectralCentroid)
    }
  }