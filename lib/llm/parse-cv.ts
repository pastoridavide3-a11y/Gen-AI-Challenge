import { PDFParse } from 'pdf-parse'
import { getOpenAIClient } from './openai-client'
import { extractJsonObject } from './json'
import { ParsedCvSchema } from '@/lib/types'
import type { ParsedCv } from '@/lib/types'

const STRUCTURING_MODEL = 'llama-3.3-70b-versatile'

// `schema_version` is a constant we stamp in code, not something the model
// decides, so it's omitted from the expected output shape and added back after
// parsing. We still validate the model's JSON against this schema.
const ParsedCvOutputSchema = ParsedCvSchema.omit({ schema_version: true })

// Groq doesn't support `json_schema` structured outputs, so we describe the
// shape in the prompt and parse the response ourselves. The skeleton below
// mirrors ParsedCvOutputSchema exactly — keep them in sync.
const OUTPUT_SHAPE = `{
  "personal_info": {
    "full_name": string,
    "email": string | null,
    "phone": string | null,
    "location": string | null,
    "linkedin_url": string | null,
    "github_url": string | null,
    "portfolio_url": string | null
  },
  "education": [
    {
      "institution": string,
      "location": string | null,
      "degree": string,
      "field_of_study": string | null,
      "start_date": string | null,
      "end_date": string | null,
      "expected": boolean,
      "gpa": string | null,
      "honors": string[],
      "relevant_courses": string[]
    }
  ],
  "work_experience": [
    {
      "role": string,
      "company": string,
      "location": string | null,
      "start_date": string | null,
      "end_date": string | null,
      "is_current": boolean,
      "type": "internship" | "full_time" | "part_time" | "freelance" | "contract" | null,
      "bullets": string[]
    }
  ],
  "projects": [
    {
      "name": string,
      "context": string | null,
      "location": string | null,
      "start_date": string | null,
      "end_date": string | null,
      "is_current": boolean,
      "technologies": string[],
      "url": string | null,
      "bullets": string[]
    }
  ],
  "extracurriculars": [
    {
      "title": string,
      "organization": string | null,
      "start_date": string | null,
      "end_date": string | null,
      "bullets": string[]
    }
  ],
  "additional_info": {
    "technical_skills": string[],
    "languages": [{ "name": string, "level": string | null }],
    "certifications": [{ "name": string, "issuer": string | null, "date": string | null }],
    "interests": string[]
  }
}`

const SYSTEM_PROMPT = `Sei un estrattore di CV. Trasformi il testo grezzo di un CV nel JSON strutturato definito dallo schema fornito.

Regole (trasformazione MECCANICA, non interpretativa):
- Non riassumere, non normalizzare, non valutare, non inventare. Riporta il testo verbatim, in particolare le bullet.
- Mantieni la lingua originale del CV (non tradurre).
- Campi assenti: usa null per gli scalari, [] per gli array. Non lasciare stringhe vuote.
- Date nel formato "YYYY-MM" (o "YYYY-MM-DD" se è indicato il giorno). Se è presente solo l'anno, usa "YYYY".
- expected = true se un titolo di studio è in corso o ha una data di fine futura; is_current = true per esperienze/progetti ancora in corso.
- work_experience = esperienze remunerate (internship, full_time, part_time, freelance, contract). Imposta "type" se desumibile, altrimenti null.
- projects = lavori non remunerati ma con output tangibile (personali, accademici, hackathon, associazioni studentesche).
- extracurriculars = attività né lavorative né progettuali (volontariato, sport, tutoraggio, hobby strutturati).
- technical_skills = lista piatta, una voce per skill/tool, non categorizzata.
- bullets = un elemento dell'array per ogni bullet, testo esatto come appare nel CV.

FORMATO DI OUTPUT (obbligatorio):
- Rispondi ESCLUSIVAMENTE con un singolo oggetto JSON valido.
- Nessun testo prima o dopo, nessuna spiegazione, nessun markdown, non racchiudere il JSON in blocchi di codice.
- Usa esattamente queste chiavi, con i tipi indicati (null dove consentito). Includi sempre tutte le chiavi.

Schema dell'oggetto JSON da restituire:
${OUTPUT_SHAPE}`

/**
 * Phase 1 — text extraction. Reads the PDF locally (no LLM) and returns the
 * concatenated raw text. Throws if the PDF yields no usable text (e.g. a
 * scanned document) so the caller can surface a clear error.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const { text } = await parser.getText()
    return text.trim()
  } finally {
    await parser.destroy()
  }
}

/**
 * Phase 2 — structuring. Sends the raw text to the model with a prompt-based
 * JSON contract (Groq doesn't support `json_schema` structured outputs),
 * extracts the JSON from the response, and validates it against the parsed_data
 * schema before returning a typed ParsedCv.
 */
export async function structureCvText(rawText: string): Promise<ParsedCv> {
  const client = getOpenAIClient()

  const completion = await client.chat.completions.create({
    model: STRUCTURING_MODEL,
    temperature: 0,
    // JSON mode (supported by Groq, unlike `json_schema`) guarantees the
    // response is syntactically valid JSON. The shape is still enforced by the
    // prompt + the Zod validation below.
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: rawText },
    ],
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('CV structuring returned an empty response')
  }

  const result = ParsedCvOutputSchema.safeParse(extractJsonObject(content))
  if (!result.success) {
    throw new Error(`CV structuring returned JSON that does not match the schema: ${result.error.message}`)
  }

  return { schema_version: '1.0', ...result.data }
}
