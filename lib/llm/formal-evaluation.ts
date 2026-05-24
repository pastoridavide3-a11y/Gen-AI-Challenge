import { completeJson } from './json'
import { FORMAL_RUBRIC } from './knowledge/formal-rubric'
import { renderRetrievedBlock, type AnalysisContext } from '@/lib/analysis/context'
import { FormalEvaluationSchema } from '@/lib/types'
import type { FormalEvaluation } from '@/lib/types'

// `schema_version` is code-stamped, so it's excluded from what the model returns
// (then re-added after a successful parse) — same trick as ParsedCvOutputSchema.
const FormalEvaluationOutputSchema = FormalEvaluationSchema.omit({ schema_version: true })

// Mirrors FormalEvaluationOutputSchema exactly — keep them in sync.
const OUTPUT_SHAPE = `{
  "dimension_scores": {
    "completeness": { "score": int 0-100, "summary": string },
    "action_impact": { "score": int 0-100, "summary": string },
    "clarity": { "score": int 0-100, "summary": string }
  },
  "strengths": [
    { "title": string, "detail": string }
  ],
  "improvement_suggestions": [
    {
      "title": string,
      "detail": string,
      "priority": "high" | "medium" | "low",
      "target_section": "personal_info" | "education" | "work_experience" | "projects" | "extracurriculars" | "additional_info" | "overall"
    }
  ],
  "writing_issues": [
    {
      "section": "personal_info" | "education" | "work_experience" | "projects" | "extracurriculars" | "additional_info" | "overall",
      "issue": string,
      "example": string | null
    }
  ]
}`

const SYSTEM_PROMPT = `Sei un revisore esperto di CV. Valuti un CV in modo FORMALE e indipendente dal ruolo, restituendo un singolo oggetto JSON che rispetta lo schema fornito. Tutti i testi che generi sono in italiano.

${FORMAL_RUBRIC}

FORMATO DI OUTPUT (obbligatorio):
- Rispondi ESCLUSIVAMENTE con un singolo oggetto JSON valido.
- Nessun testo prima o dopo, nessuna spiegazione, nessun markdown, non racchiudere il JSON in blocchi di codice.
- Usa esattamente queste chiavi, con i tipi indicati (null dove consentito). Includi sempre tutte le chiavi.
- I punteggi sono interi 0-100. strengths: 3-5 elementi. improvement_suggestions: 3-5 elementi ordinati per priorità.

Schema dell'oggetto JSON da restituire:
${OUTPUT_SHAPE}`

/**
 * Call 1 — formal CV evaluation. Role-agnostic; consumes only the parsed CV.
 * Never uses retrieval (in either phase), but appends the (empty) retrieved
 * block for uniformity with the other calls.
 */
export async function runFormalEvaluation(ctx: AnalysisContext): Promise<FormalEvaluation> {
  const user = `CV STRUTTURATO (parsed_data):
${JSON.stringify(ctx.structured.parsedCv)}${renderRetrievedBlock(ctx.retrieved)}`

  const result = await completeJson(FormalEvaluationOutputSchema, {
    system: SYSTEM_PROMPT,
    user,
    temperature: 0.2,
  })

  return { schema_version: '1.0', ...result }
}
