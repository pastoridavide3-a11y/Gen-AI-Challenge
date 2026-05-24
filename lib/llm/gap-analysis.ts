import { completeJson } from './json'
import { ROLE_KNOWLEDGE } from './knowledge/roles'
import { renderRetrievedBlock, type AnalysisContext } from '@/lib/analysis/context'
import { GapAnalysisSchema } from '@/lib/types'
import type { GapAnalysis } from '@/lib/types'
import { TARGET_ROLE_LABELS } from '@/lib/labels'

// `schema_version` and `target_role` are code-stamped (the latter snapshotted
// from context), so both are excluded from the model output and re-added after.
const GapAnalysisOutputSchema = GapAnalysisSchema.omit({
  schema_version: true,
  target_role: true,
})

// Mirrors GapAnalysisOutputSchema exactly — keep them in sync.
const OUTPUT_SHAPE = `{
  "dimension_scores": {
    "market_fit": { "score": int 0-100, "summary": string },
    "relevance": { "score": int 0-100, "summary": string }
  },
  "match_summary": string,
  "possessed_skills": [
    { "skill": string, "evidence": string, "strength": "strong" | "moderate" | "basic" }
  ],
  "gaps": [
    {
      "title": string,
      "detail": string,
      "priority": "high" | "medium" | "low",
      "category": "technical_skill" | "tool" | "certification" | "experience" | "soft_signal"
    }
  ],
  "reframing_suggestions": [
    {
      "target_section": "education" | "work_experience" | "projects" | "extracurriculars" | "additional_info",
      "current_text": string,
      "suggested_text": string,
      "rationale": string
    }
  ]
}`

function buildSystemPrompt(roleKnowledge: string): string {
  return `Sei un career advisor esperto del mercato del lavoro italiano. Confronti un CV con un ruolo target e restituisci un singolo oggetto JSON che rispetta lo schema fornito. Tutti i testi che generi sono in italiano.

${roleKnowledge}

ISTRUZIONI:
- market_fit (0-100): quanto il profilo nel suo insieme matcha le aspettative del ruolo sul mercato italiano.
- relevance (0-100): quanto il contenuto specifico del CV (bullet, progetti, esperienze) è pertinente al ruolo vs riempitivo.
- possessed_skills: skill RILEVANTI PER IL RUOLO che il CV dimostra, ciascuna con evidenza concreta (cita la sezione/bullet) e livello.
- gaps: 3-5 lacune ordinate per priorità rispetto al ruolo, con categoria corretta.
- reframing_suggestions: 2-4 riscritture di bullet ESISTENTI del CV in chiave del ruolo; current_text deve essere una citazione letterale dal CV.

FORMATO DI OUTPUT (obbligatorio):
- Rispondi ESCLUSIVAMENTE con un singolo oggetto JSON valido.
- Nessun testo prima o dopo, nessuna spiegazione, nessun markdown, non racchiudere il JSON in blocchi di codice.
- Usa esattamente queste chiavi, con i tipi indicati (null dove consentito). Includi sempre tutte le chiavi. NON includere "target_role".

Schema dell'oggetto JSON da restituire:
${OUTPUT_SHAPE}`
}

/**
 * Call 2 — gap analysis vs the target role. Consumes the parsed CV + survey +
 * target role, with the role's static market knowledge embedded in the system
 * prompt (Phase 1: augmented by retrieved chunks). Throws if no target role is
 * set — the pipeline guards this and marks the step failed.
 */
export async function runGapAnalysis(ctx: AnalysisContext): Promise<GapAnalysis> {
  const { targetRole, parsedCv, survey, profile } = ctx.structured
  if (!targetRole) {
    throw new Error('runGapAnalysis: a target_role is required for the gap analysis')
  }

  const user = `RUOLO TARGET: ${TARGET_ROLE_LABELS[targetRole]} (${targetRole})

ANAGRAFICA CANDIDATO:
${JSON.stringify({
    name: profile.name,
    university: profile.university,
    course: profile.course,
    year: profile.year,
  })}

CV STRUTTURATO (parsed_data):
${JSON.stringify(parsedCv)}

SURVEY (preferenze, obiettivi, vincoli):
${JSON.stringify(survey)}${renderRetrievedBlock(ctx.retrieved)}`

  const result = await completeJson(GapAnalysisOutputSchema, {
    system: buildSystemPrompt(ROLE_KNOWLEDGE[targetRole]),
    user,
    temperature: 0.3,
  })

  // target_role is snapshotted from context, not trusted to the model.
  return { schema_version: '1.0', target_role: targetRole, ...result }
}
