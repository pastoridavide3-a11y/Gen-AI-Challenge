// Groq via the OpenAI-compatible API — the `openai` SDK is pointed at
// api.groq.com (see openai-client.ts), this is NOT real OpenAI. This module is a
// thin, pure streaming primitive: it relays `messages` and yields content
// deltas. Deliberately NOT `completeJson` (that's JSON-mode for the analysis
// pipeline); the mentor is free-text prose. It knows nothing about Supabase,
// profiles, or prompt content.
import { getOpenAIClient, GROQ_MODEL } from './openai-client'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

// Default mentor model — quality over first-token latency, since the mentor must
// not feel generic. Defaults to GROQ_MODEL (llama-3.3-70b-versatile); override
// with MENTOR_MODEL (e.g. llama-3.1-8b-instant) to trade quality for speed.
// One const, one place — never hardcode the model at a call site.
export const MENTOR_MODEL = process.env.MENTOR_MODEL ?? GROQ_MODEL

/**
 * Streams a chat completion from Groq. Returns an async-iterable of plain
 * content-delta strings (empties skipped). No `response_format`, no JSON mode —
 * free-text output. Create-time errors (auth, rate limits) reject the returned
 * promise; mid-stream errors surface as a throw while iterating.
 */
export async function streamChat(opts: {
  messages: ChatMessage[]
  model?: string
  temperature?: number // default ~0.6 — warmer than analysis's 0.2
}): Promise<AsyncIterable<string>> {
  const client = getOpenAIClient()

  const completion = await client.chat.completions.create({
    model: opts.model ?? MENTOR_MODEL,
    temperature: opts.temperature ?? 0.6,
    stream: true,
    messages: opts.messages,
  })

  async function* deltas(): AsyncGenerator<string> {
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  return deltas()
}
