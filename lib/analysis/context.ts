import { getProfileById } from '@/lib/db/profiles'
import { getCvById } from '@/lib/db/cvs'
import { getSurveyForProfile } from '@/lib/db/surveys'
import type { ProfileRow } from '@/lib/db/rows'
import type { ParsedCv, SurveyData, TargetRole } from '@/lib/types'

// A unit of knowledge retrieved by semantic similarity (Phase 1: pgvector over
// the ESCO taxonomy, job ads, CV benchmarks). ALWAYS empty in Phase 0 — the type
// exists so call sites can render `retrieved` today and have it light up later
// without changing.
export type RetrievedChunk = {
  source: string // e.g. "esco" | "job_ad" | "cv_benchmark"
  content: string
  metadata?: Record<string, unknown>
}

// The two-source context every analysis call receives (see docs/architecture.md):
//   structured — personal, queried by ID, always present in full (Postgres).
//   retrieved  — general market knowledge, queried by meaning (pgvector, Phase 1).
// The two are never mixed. In Phase 0 `retrieved` is `[]`.
export type AnalysisContext = {
  structured: {
    profile: ProfileRow
    survey: SurveyData | null
    parsedCv: ParsedCv
    targetRole: TargetRole | null
  }
  retrieved: RetrievedChunk[]
}

// Assembles the context for an analysis run. DB reads ONLY — never calls the LLM
// and never builds prompt strings (the call functions own their prompts). This
// is the single seam where Phase 1 RAG slots in: it gains a retrieval step that
// fills `retrieved[]`; no call site changes.
export async function gatherAnalysisContext(args: {
  profileId: string
  cvId: string
  targetRole: TargetRole | null
}): Promise<AnalysisContext> {
  const [profile, cv, survey] = await Promise.all([
    getProfileById(args.profileId),
    getCvById(args.cvId),
    getSurveyForProfile(args.profileId),
  ])

  if (!profile) throw new Error(`gatherAnalysisContext: profile ${args.profileId} not found`)
  if (!cv) throw new Error(`gatherAnalysisContext: cv ${args.cvId} not found`)
  if (!cv.parsed_data) {
    throw new Error(`gatherAnalysisContext: cv ${args.cvId} has no parsed_data to analyze`)
  }

  return {
    structured: {
      profile,
      survey,
      parsedCv: cv.parsed_data,
      targetRole: args.targetRole,
    },
    // Phase 0: no retrieval. Phase 1 populates this from pgvector.
    retrieved: [],
  }
}

// Renders the retrieved chunks as a prompt-appendable block. Empty string in
// Phase 0 (no chunks), so appending it to a user message is a no-op today; in
// Phase 1 it surfaces the retrieved knowledge without touching the call code.
export function renderRetrievedBlock(retrieved: RetrievedChunk[]): string {
  if (retrieved.length === 0) return ''
  const chunks = retrieved
    .map((c, i) => `[${i + 1}] (${c.source})\n${c.content}`)
    .join('\n\n')
  return `\n\nCONTESTO RECUPERATO (conoscenza di mercato pertinente):\n${chunks}`
}
