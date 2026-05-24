import { createClient } from './client'
import type { AnalysisRow, AnalysisStatus } from './rows'
import type {
  FormalEvaluation,
  GapAnalysis,
  LearningPath,
  TargetRole,
} from '@/lib/types'

// The three independent analysis steps. Each maps to a `<step>` JSONB column and
// a `<step>_status` column on `analyses`.
export type AnalysisStep = 'formal_evaluation' | 'gap_analysis' | 'learning_path'

// Output type per step, so updateAnalysisStep is type-checked against the column.
type AnalysisStepOutput = {
  formal_evaluation: FormalEvaluation
  gap_analysis: GapAnalysis
  learning_path: LearningPath
}

export async function getLatestAnalysisForProfile(profileId: string): Promise<AnalysisRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`getLatestAnalysisForProfile(${profileId}): ${error.message}`)
  return (data as AnalysisRow | null) ?? null
}

export async function getLatestAnalysisForCv(cvId: string): Promise<AnalysisRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('cv_id', cvId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`getLatestAnalysisForCv(${cvId}): ${error.message}`)
  return (data as AnalysisRow | null) ?? null
}

export async function getAnalysisById(id: string): Promise<AnalysisRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`getAnalysisById(${id}): ${error.message}`)
  return (data as AnalysisRow | null) ?? null
}

// Creates the analysis row at the start of a run. All three outputs are NULL and
// all three statuses default to 'pending' (DB defaults); each step flips its own
// status as it resolves. One row per run keeps score history (newest wins on read).
export async function createAnalysis(args: {
  profileId: string
  cvId: string
  targetRole: TargetRole | null
}): Promise<AnalysisRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('analyses')
    .insert({
      profile_id: args.profileId,
      cv_id: args.cvId,
      target_role: args.targetRole,
    })
    .select('*')
    .single()

  if (error) throw new Error(`createAnalysis: ${error.message}`)
  return data as AnalysisRow
}

// Persists a single step the moment it resolves — a separate UPDATE per step, so
// a crash mid-pipeline still leaves earlier results saved. On success the JSONB
// output is written alongside the status; on failure only the status changes, so
// any previously persisted output is preserved.
export async function updateAnalysisStep<S extends AnalysisStep>(
  id: string,
  step: S,
  payload:
    | { status: 'success'; output: AnalysisStepOutput[S] }
    | { status: Exclude<AnalysisStatus, 'success'> },
): Promise<AnalysisRow> {
  const supabase = await createClient()

  const patch: Record<string, unknown> = {
    [`${step}_status`]: payload.status,
    updated_at: new Date().toISOString(),
  }
  if (payload.status === 'success') {
    patch[step] = payload.output
  }

  const { data, error } = await supabase
    .from('analyses')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(`updateAnalysisStep(${id}, ${step}): ${error.message}`)
  return data as AnalysisRow
}
