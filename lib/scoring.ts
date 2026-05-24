import type { FormalEvaluation, GapAnalysis } from '@/lib/types'

// The five fixed radar dimensions: completeness/action_impact/clarity come from
// Call 1 (formal evaluation), market_fit/relevance from Call 2 (gap analysis).
export type ScoreBreakdown = {
  completeness: number
  action_impact: number
  clarity: number
  market_fit: number
  relevance: number
}

// Weights live in one place. market_fit is the strongest signal for a student.
const WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  completeness: 0.15,
  action_impact: 0.2,
  clarity: 0.15,
  market_fit: 0.3,
  relevance: 0.2,
}

export function buildScoreBreakdown(
  formal: FormalEvaluation | null,
  gap: GapAnalysis | null,
): ScoreBreakdown | null {
  if (!formal || !gap) return null
  return {
    completeness: formal.dimension_scores.completeness.score,
    action_impact: formal.dimension_scores.action_impact.score,
    clarity: formal.dimension_scores.clarity.score,
    market_fit: gap.dimension_scores.market_fit.score,
    relevance: gap.dimension_scores.relevance.score,
  }
}

// Weighted overall score. If one call is missing, weights are renormalized over
// the dimensions that are available so a partial analysis still yields a score.
export function computeOverallScore(
  formal: FormalEvaluation | null,
  gap: GapAnalysis | null,
): number | null {
  const parts: { value: number; weight: number }[] = []

  if (formal) {
    parts.push({ value: formal.dimension_scores.completeness.score, weight: WEIGHTS.completeness })
    parts.push({ value: formal.dimension_scores.action_impact.score, weight: WEIGHTS.action_impact })
    parts.push({ value: formal.dimension_scores.clarity.score, weight: WEIGHTS.clarity })
  }
  if (gap) {
    parts.push({ value: gap.dimension_scores.market_fit.score, weight: WEIGHTS.market_fit })
    parts.push({ value: gap.dimension_scores.relevance.score, weight: WEIGHTS.relevance })
  }

  if (parts.length === 0) return null

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0)
  const weighted = parts.reduce((sum, p) => sum + p.value * p.weight, 0)
  return Math.round(weighted / totalWeight)
}
