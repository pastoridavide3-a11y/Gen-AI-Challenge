import type { z } from 'zod'
import { getOpenAIClient, GROQ_MODEL } from './openai-client'

/**
 * Pulls the JSON object out of a model response. We instruct the model to emit
 * raw JSON, but prompt-based JSON (Groq has no `json_schema` structured-output
 * enforcement) can still arrive wrapped in ```json fences or with stray prose,
 * so we slice from the first "{" to the last "}" before parsing.
 */
export function extractJsonObject(content: string): unknown {
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('LLM response did not contain a JSON object')
  }

  try {
    return JSON.parse(content.slice(start, end + 1))
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    throw new Error(`LLM response was not valid JSON: ${reason}`)
  }
}

export type CompleteJsonOptions = {
  system: string
  user: string
  /** Defaults to GROQ_MODEL — only override to pin a specific model. */
  model?: string
  temperature?: number
}

/**
 * The single Groq-call → parse → validate path shared by every analysis call.
 * Sends a system + user message, asks for JSON-mode output (syntactic validity),
 * extracts the object, and validates it against `schema`. Throws on an empty
 * response, malformed JSON, or a schema mismatch — any of which the caller's
 * retry wrapper treats as a failed attempt.
 *
 * `schema` should be the output schema with code-stamped fields (e.g.
 * `schema_version`) omitted; the caller stamps those back after a successful
 * parse, mirroring `structureCvText()`.
 */
export async function completeJson<T>(
  schema: z.ZodType<T>,
  opts: CompleteJsonOptions,
): Promise<T> {
  const client = getOpenAIClient()

  const completion = await client.chat.completions.create({
    model: opts.model ?? GROQ_MODEL,
    temperature: opts.temperature ?? 0.3,
    // JSON mode (supported by Groq, unlike `json_schema`) guarantees a
    // syntactically valid JSON response. Shape is still enforced by the prompt
    // + the Zod validation below.
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('LLM returned an empty response')
  }

  const result = schema.safeParse(extractJsonObject(content))
  if (!result.success) {
    throw new Error(`LLM response did not match the expected schema: ${result.error.message}`)
  }

  return result.data
}
