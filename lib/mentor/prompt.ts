import { MENTOR_GUIDELINES } from '@/lib/llm/knowledge/mentor-guidelines'
import { renderRetrievedBlock, type MentorContext } from './context'
import type { ChatMessage } from '@/lib/llm/chat'
import {
  COMPANY_SIZE_LABELS,
  INDUSTRY_LABELS,
  WORK_STYLE_LABELS,
  targetRoleLabel,
} from '@/lib/labels'
import type { AnalysisRow, ProfileRow } from '@/lib/db/rows'
import type { ParsedCv, SurveyData } from '@/lib/types'

type Structured = MentorContext['structured']

// Drops null/empty entries and joins one-per-line. Used by every section so the
// summary stays terse (one line per item) and never prints empty labels.
function lines(items: (string | null | undefined | false)[]): string {
  return items.filter((x): x is string => Boolean(x)).join('\n')
}

function profileSection(profile: ProfileRow): string {
  return `=== USER PROFILE ===\n${lines([
    `nome: ${profile.name}`,
    profile.university && `università: ${profile.university}`,
    profile.course && `corso: ${profile.course}`,
    profile.year && `anno: ${profile.year}`,
    `ruolo target: ${targetRoleLabel(profile.target_role)}`,
  ])}`
}

function surveySection(survey: SurveyData | null): string | null {
  if (!survey) return null
  const { career_goals: goals, constraints: c, work_preferences: p } = survey
  const body = lines([
    survey.industry_interests.length > 0 &&
      `interessi di settore: ${survey.industry_interests.map((i) => INDUSTRY_LABELS[i]).join(', ')}`,
    `obiettivo 1 anno: ${goals.one_year_goal}`,
    `obiettivo 3 anni: ${goals.three_year_goal}`,
    goals.what_i_dont_want && `cosa non vuole: ${goals.what_i_dont_want}`,
    c.geographic_availability.length > 0 &&
      `disponibilità geografica: ${c.geographic_availability.join(', ')}`,
    c.weekly_study_hours && `ore di studio/settimana: ${c.weekly_study_hours}`,
    c.training_budget && `budget formazione: ${c.training_budget}`,
    c.other_constraints && `altri vincoli: ${c.other_constraints}`,
    p.company_size.length > 0 &&
      `dimensione aziendale preferita: ${p.company_size.map((s) => COMPANY_SIZE_LABELS[s]).join(', ')}`,
    p.work_languages.length > 0 && `lingue di lavoro: ${p.work_languages.join(', ')}`,
    p.work_style && `stile di lavoro: ${WORK_STYLE_LABELS[p.work_style]}`,
    p.other_preferences && `altre preferenze: ${p.other_preferences}`,
  ])
  return `=== SURVEY ===\n${body}`
}

function cvSection(cv: ParsedCv | null): string | null {
  if (!cv) return null
  const out: string[] = []

  for (const e of cv.education) {
    const parts = [e.institution, e.degree, e.field_of_study, e.end_date].filter(Boolean)
    out.push(`- formazione: ${parts.join(' · ')}`)
  }
  for (const w of cv.work_experience) {
    const head = [w.role, w.company].filter(Boolean).join(' @ ')
    out.push(`- esperienza: ${head}${w.bullets[0] ? ` — ${w.bullets[0]}` : ''}`)
  }
  for (const pr of cv.projects) {
    const head = [pr.name, pr.context].filter(Boolean).join(' · ')
    out.push(`- progetto: ${head}${pr.bullets[0] ? ` — ${pr.bullets[0]}` : ''}`)
  }
  const skills = cv.additional_info.technical_skills
  if (skills.length > 0) out.push(`- competenze: ${skills.join(', ')}`)

  const langs = cv.additional_info.languages
  if (langs.length > 0) {
    out.push(`- lingue: ${langs.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(', ')}`)
  }
  const certs = cv.additional_info.certifications
  if (certs.length > 0) {
    out.push(`- certificazioni: ${certs.map((c) => (c.issuer ? `${c.name} (${c.issuer})` : c.name)).join(', ')}`)
  }

  if (out.length === 0) return null
  return `=== ACTIVE CV SUMMARY ===\n${out.join('\n')}`
}

function analysisSection(analysis: AnalysisRow | null): string | null {
  if (!analysis) return null
  const formal = analysis.formal_evaluation
  const gap = analysis.gap_analysis
  const lp = analysis.learning_path

  const dims: string[] = []
  if (formal?.dimension_scores) {
    const d = formal.dimension_scores
    dims.push(`completezza ${d.completeness.score}`, `impatto ${d.action_impact.score}`, `chiarezza ${d.clarity.score}`)
  }
  if (gap?.dimension_scores) {
    dims.push(`market fit ${gap.dimension_scores.market_fit.score}`, `rilevanza ${gap.dimension_scores.relevance.score}`)
  }

  const body = lines([
    analysis.target_role && `ruolo analizzato: ${targetRoleLabel(analysis.target_role)}`,
    gap?.match_summary && `posizionamento: ${gap.match_summary}`,
    (formal?.strengths?.length ?? 0) > 0 &&
      `punti di forza: ${formal!.strengths.map((s) => s.title).join('; ')}`,
    (gap?.gaps?.length ?? 0) > 0 &&
      `gap: ${gap!.gaps.map((g) => `${g.title} (${g.priority})`).join('; ')}`,
    dims.length > 0 && `punteggi: ${dims.join(', ')}`,
    lp?.intro && `piano di crescita: ${lp.intro}`,
    (lp?.actions?.length ?? 0) > 0 &&
      `azioni consigliate: ${lp!.actions.map((a) => a.title).join('; ')}`,
  ])
  if (!body) return null
  return `=== LATEST ANALYSIS ===\n${body}`
}

/**
 * Compact, grouped, human-readable summary of the student's structured context.
 * NEVER raw JSON — selected fields only, one line per item, under fixed labels.
 * Sections whose source is null/empty are omitted entirely.
 */
export function serializeMentorContext(structured: Structured): string {
  return [
    profileSection(structured.profile),
    surveySection(structured.survey),
    cvSection(structured.parsedCv),
    analysisSection(structured.analysis),
  ]
    .filter((s): s is string => Boolean(s))
    .join('\n\n')
}

/**
 * Pure transform `MentorContext → ChatMessage[]`. No DB, no LLM. Builds one
 * cache-friendly `system` message (static persona first, dynamic context last,
 * then the empty-in-Phase-0 retrieved block), followed by the conversation
 * history.
 *
 * ⚠️ Does NOT append the new user message: it is already the last entry in
 * `recentMessages` (the route saved it before gathering context). Appending it
 * again would duplicate the user's turn.
 */
export function buildMentorPrompt(ctx: MentorContext): ChatMessage[] {
  const system =
    [
      MENTOR_GUIDELINES,
      'CONTESTO DELLO STUDENTE (dati reali — non inventare nulla che non sia qui):',
      serializeMentorContext(ctx.structured),
    ].join('\n\n') + renderRetrievedBlock(ctx.retrievedContext)

  // Map DB roles to API roles: 'mentor' → 'assistant', 'user' → 'user'.
  const history: ChatMessage[] = ctx.structured.recentMessages.map((m) => ({
    role: m.role === 'mentor' ? 'assistant' : 'user',
    content: m.content,
  }))

  return [{ role: 'system', content: system }, ...history]
}
