import { getProfileById } from '@/lib/db/profiles'
import { getSurveyForProfile } from '@/lib/db/surveys'
import { listCvsForProfile } from '@/lib/db/cvs'
import { getLatestAnalysisForCv } from '@/lib/db/analyses'
import { getMessagesForConversation } from '@/lib/db/mentor'
import type { AnalysisRow, MessageRow, ProfileRow } from '@/lib/db/rows'
import type { ParsedCv, SurveyData } from '@/lib/types'

// A unit of knowledge retrieved by semantic similarity (Phase 1: pgvector over
// role descriptions, job ads, learning resources, career advice). ALWAYS empty
// in Phase 0 — the type exists so `buildMentorPrompt` can render it today and
// have it light up later without any call-site change. Uses the product-brief
// names (`retrievedContext`, `RetrievedContextChunk`) — see the naming note below.
export type RetrievedContextChunk = {
  id: string
  sourceType: 'role_description' | 'job_ad' | 'learning_resource' | 'career_advice'
  title: string
  content: string
  metadata?: Record<string, unknown>
}

// The context every mentor turn receives — the sibling of `AnalysisContext`:
//   structured — the student's personal data, queried by ID (Postgres).
//   retrievedContext — general market knowledge, queried by meaning (pgvector,
//                      Phase 1). ALWAYS `[]` in Phase 0.
// Each structured field is independently nullable: a profile may have no CV,
// no parsed_data, or no analysis. The mentor must still work with just profile +
// survey, so `serializeMentorContext` omits absent sections gracefully.
export type MentorContext = {
  structured: {
    profile: ProfileRow
    survey: SurveyData | null
    parsedCv: ParsedCv | null // latest ACTIVE CV only
    analysis: AnalysisRow | null // latest analysis for that CV
    recentMessages: MessageRow[] // last N of THIS conversation, chronological
  }
  retrievedContext: RetrievedContextChunk[]
}

// Assembles the context for one mentor turn. DB reads ONLY — never calls the LLM
// and never builds prompt strings (prompt.ts owns that). This is the single seam
// where Phase 1 RAG slots in: it gains a retrieval step that fills
// `retrievedContext[]` (querying pgvector for the latest user message); no call
// site changes.
export async function gatherMentorContext(args: {
  profileId: string
  conversationId: string
  recentLimit?: number
}): Promise<MentorContext> {
  const recentLimit = args.recentLimit ?? 12

  const [profile, survey, cvs, messages] = await Promise.all([
    getProfileById(args.profileId),
    getSurveyForProfile(args.profileId),
    listCvsForProfile(args.profileId),
    getMessagesForConversation(args.conversationId),
  ])

  if (!profile) {
    throw new Error(`gatherMentorContext: profile ${args.profileId} not found`)
  }

  // Latest active CV (one active per profile by convention); fall back to the
  // newest version. `parsed_data` may still be null — handled downstream.
  const activeCv = cvs.find((c) => c.status === 'active') ?? cvs[0] ?? null
  const parsedCv = activeCv?.parsed_data ?? null

  // Latest analysis for THAT CV, so the analysis in context matches the CV.
  const analysis = activeCv ? await getLatestAnalysisForCv(activeCv.id) : null

  // Last N messages of this conversation, chronological. Includes the user
  // message the route saved just before calling this — it is the final entry.
  const recentMessages = messages.slice(-recentLimit)

  return {
    structured: { profile, survey, parsedCv, analysis, recentMessages },
    // Phase 0: no retrieval. Phase 1 populates this from pgvector.
    retrievedContext: [],
  }
}

// Renders the retrieved chunks as a prompt-appendable block. Empty string in
// Phase 0 (no chunks), so appending it is a no-op today; in Phase 1 it surfaces
// the retrieved knowledge under a fixed label without touching the prompt code.
export function renderRetrievedBlock(chunks: RetrievedContextChunk[]): string {
  if (chunks.length === 0) return ''
  const body = chunks
    .map((c, i) => `[${i + 1}] (${c.sourceType}) ${c.title}\n${c.content}`)
    .join('\n\n')
  return `\n\n=== RETRIEVED CONTEXT ===\n${body}`
}

// Naming note: `lib/analysis/context.ts` uses `RetrievedChunk` + a `retrieved`
// property. The mentor uses the product-brief names — the richer
// `RetrievedContextChunk` type and the `retrievedContext` property. Both
// conventions run in parallel for Phase 0; they can converge in Phase 1.
