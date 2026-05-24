import { gatherAnalysisContext } from './context'
import { runFormalEvaluation } from '@/lib/llm/formal-evaluation'
import { runGapAnalysis } from '@/lib/llm/gap-analysis'
import { runLearningPath } from '@/lib/llm/learning-path'
import {
  createAnalysis,
  updateAnalysisStep,
  getAnalysisById,
} from '@/lib/db/analyses'
import type { AnalysisRow } from '@/lib/db/rows'
import type { GapAnalysis, TargetRole } from '@/lib/types'

// Runs `fn`; on any throw (API error OR Zod validation failure), retries exactly
// once. A second throw propagates, marking the step failed.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    return await fn()
  }
}

/**
 * The 3-step analysis pipeline. Creates the analysis row, gathers context once,
 * then runs the calls SEQUENTIALLY, persisting each step the moment it resolves:
 *
 *   1. Formal evaluation  — independent.
 *   2. Gap analysis       — independent.
 *   3. Learning path      — depends on Call 2; skipped (marked failed) if Call 2
 *                           failed, since it has no gaps to consume.
 *
 * A failed call never aborts the others (except the 2→3 dependency); previously
 * persisted outputs are preserved. Returns the final row with all three statuses.
 */
export async function runAnalysisPipeline(args: {
  profileId: string
  cvId: string
  targetRole: TargetRole | null
}): Promise<AnalysisRow> {
  const analysis = await createAnalysis(args)
  const id = analysis.id

  const ctx = await gatherAnalysisContext({
    profileId: args.profileId,
    cvId: args.cvId,
    targetRole: args.targetRole,
  })

  // --- Call 1: formal evaluation ---
  try {
    const formal = await withRetry(() => runFormalEvaluation(ctx))
    await updateAnalysisStep(id, 'formal_evaluation', { status: 'success', output: formal })
  } catch (error) {
    console.error(`Analysis ${id} — formal_evaluation failed:`, error)
    await updateAnalysisStep(id, 'formal_evaluation', { status: 'failed' })
  }

  // --- Call 2: gap analysis ---
  let gap: GapAnalysis | null = null
  try {
    gap = await withRetry(() => runGapAnalysis(ctx))
    await updateAnalysisStep(id, 'gap_analysis', { status: 'success', output: gap })
  } catch (error) {
    console.error(`Analysis ${id} — gap_analysis failed:`, error)
    await updateAnalysisStep(id, 'gap_analysis', { status: 'failed' })
  }

  // --- Call 3: learning path (only if gap analysis produced gaps) ---
  if (gap) {
    try {
      const learningPath = await withRetry(() => runLearningPath(ctx, gap!))
      await updateAnalysisStep(id, 'learning_path', { status: 'success', output: learningPath })
    } catch (error) {
      console.error(`Analysis ${id} — learning_path failed:`, error)
      await updateAnalysisStep(id, 'learning_path', { status: 'failed' })
    }
  } else {
    // No gaps to build a path from. The status enum has no 'skipped', so 'failed'
    // is the honest representation that it produced no output.
    await updateAnalysisStep(id, 'learning_path', { status: 'failed' })
  }

  return (await getAnalysisById(id)) ?? analysis
}
