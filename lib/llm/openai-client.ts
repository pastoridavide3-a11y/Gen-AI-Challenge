import OpenAI from 'openai'

// The Groq model used for every LLM call in the app. Defined in ONE place and
// overridable via the GROQ_MODEL env var — never hardcode the model name at a
// call site. `completeJson()` defaults to this; pass `model` only to override.
export const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'

// Single shared OpenAI client. Instantiated lazily so that importing this module
// (or anything that depends on it) doesn't throw at build time when
// OPENAI_API_KEY is absent — the error only surfaces when a call is made.
let client: OpenAI | undefined

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set. Add it to .env.local.')
    }
    client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  }
  return client
}
