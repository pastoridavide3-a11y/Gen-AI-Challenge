import { completeJson } from './json'
import { renderRetrievedBlock, type AnalysisContext } from '@/lib/analysis/context'
import { LearningPathSchema } from '@/lib/types'
import type { GapAnalysis, LearningPath } from '@/lib/types'

// `schema_version` is code-stamped, so it's excluded from the model output.
const LearningPathOutputSchema = LearningPathSchema.omit({ schema_version: true })

// Mirrors LearningPathOutputSchema exactly — keep them in sync.
const OUTPUT_SHAPE = `{
  "intro": string,
  "actions": [
    {
      "id": string (slug stabile, lowercase, snake_case, es. "tableau_fundamentals_coursera"),
      "type": "course" | "project" | "certification" | "reading" | "networking" | "other",
      "title": string,
      "description": string,
      "addresses_gaps": string[],
      "estimated_effort": string,
      "estimated_cost": string | null,
      "priority": "high" | "medium" | "low",
      "resources": [
        { "label": string, "url": string | null, "note": string | null }
      ],
      "outcome": string
    }
  ]
}`

const SYSTEM_PROMPT = `Sei un career coach esperto. Trasformi le lacune (gap) identificate per un candidato in un percorso di apprendimento concreto e personalizzato, restituendo un singolo oggetto JSON che rispetta lo schema fornito. Tutti i testi che generi sono in italiano.

ISTRUZIONI:
- intro: 2-3 righe che personalizzano il percorso al profilo e ai suoi obiettivi.
- actions: 4-6 azioni ETEROGENEE (corsi, progetti, certificazioni, letture, networking), ordinate per priorità decrescente.
- addresses_gaps: per ogni azione, elenca i TITOLI ESATTI dei gap che risolve (copiati verbatim dai gap forniti). Usa [] solo per azioni non legate a un gap specifico.
- Rispetta i vincoli del candidato: budget di formazione, ore di studio settimanali, preferenze e obiettivi. Allinea estimated_effort ed estimated_cost a questi vincoli.
- resources: suggerimenti concreti e noti (Coursera, edX, Google/Microsoft, Tableau Public, documentazione ufficiale, ecc.). url = null se la risorsa non ha un link.
- outcome: una frase su cosa avrà ottenuto il candidato al termine dell'azione.

FORMATO DI OUTPUT (obbligatorio):
- Rispondi ESCLUSIVAMENTE con un singolo oggetto JSON valido.
- Nessun testo prima o dopo, nessuna spiegazione, nessun markdown, non racchiudere il JSON in blocchi di codice.
- Usa esattamente queste chiavi, con i tipi indicati (null dove consentito). Includi sempre tutte le chiavi.

Schema dell'oggetto JSON da restituire:
${OUTPUT_SHAPE}`

/**
 * Call 3 — learning path generation. Consumes Call 2's gaps (passed explicitly,
 * not via context, so `gatherAnalysisContext` stays a pure DB-read) plus the
 * survey's constraints/preferences/goals. Runs only after a successful Call 2.
 */
export async function runLearningPath(
  ctx: AnalysisContext,
  gap: GapAnalysis,
): Promise<LearningPath> {
  const { survey } = ctx.structured

  const user = `GAP DA COLMARE (output della gap analysis, ordinati per priorità):
${JSON.stringify(gap.gaps)}

RUOLO TARGET: ${gap.target_role}

VINCOLI E PREFERENZE DEL CANDIDATO (dalla survey):
${JSON.stringify({
    constraints: survey?.constraints ?? null,
    work_preferences: survey?.work_preferences ?? null,
    career_goals: survey?.career_goals ?? null,
  })}${renderRetrievedBlock(ctx.retrieved)}`

  const result = await completeJson(LearningPathOutputSchema, {
    system: SYSTEM_PROMPT,
    user,
    temperature: 0.4,
  })

  return { schema_version: '1.0', ...result }
}
