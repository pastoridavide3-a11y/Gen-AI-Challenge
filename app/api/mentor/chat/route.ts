import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  appendMessage,
  createConversation,
  deriveLabel,
  touchConversation,
} from '@/lib/db/mentor'
import { gatherMentorContext } from '@/lib/mentor/context'
import { buildMentorPrompt } from '@/lib/mentor/prompt'
import { streamChat } from '@/lib/llm/chat'

// Streams a Groq completion (~10-30s). Node runtime for the Groq SDK; generous
// maxDuration so the whole stream completes in one request. Styled after
// app/api/analyses/route.ts.
export const runtime = 'nodejs'
export const maxDuration = 60

const BodySchema = z.object({
  profile_id: z.string().min(1),
  conversation_id: z.string().min(1).optional(),
  message: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body.', issues: parsed.error.issues },
        { status: 400 },
      )
    }
    const { profile_id, conversation_id, message } = parsed.data

    // Resolve the conversation: create a row ONLY on the first message of a
    // brand-new chat (no conversation_id). The "New chat" button never does this.
    // For a new conversation we also return the derived label so the client can
    // adopt it without importing server code.
    let conversationId: string
    let newLabel: string | null = null
    if (conversation_id) {
      conversationId = conversation_id
    } else {
      newLabel = deriveLabel(message)
      conversationId = (await createConversation({ profileId: profile_id, label: newLabel })).id
    }

    // Always persist the user message BEFORE calling Groq, so the user's turn is
    // never lost regardless of what happens downstream.
    await appendMessage({ conversationId, role: 'user', content: message })

    // Gather context (the just-saved user message is the last recentMessage) and
    // build the prompt. buildMentorPrompt must NOT re-append that user message.
    const ctx = await gatherMentorContext({ profileId: profile_id, conversationId })
    const messages = buildMentorPrompt(ctx)

    const groqStream = await streamChat({ messages })
    const iterator = groqStream[Symbol.asyncIterator]()

    // Peek the first delta. If Groq fails before producing ANY mentor text we
    // haven't started the HTTP response body yet, so we can still return a clean
    // JSON error (§6 rule 5). The user message is already persisted, so the user
    // can simply retry.
    let first: IteratorResult<string>
    try {
      first = await iterator.next()
    } catch (error) {
      console.error(`POST /api/mentor/chat — stream failed before any token (conv ${conversationId}):`, error)
      return NextResponse.json(
        { error: 'Il mentor non è riuscito a rispondere. Riprova.' },
        { status: 502, headers: { 'X-Conversation-Id': conversationId } },
      )
    }

    const encoder = new TextEncoder()
    const cid = conversationId
    let accumulated = ''

    // Best-effort persistence of the mentor reply + recency bump. Used by both
    // the success path and the partial-failure path (§6 rules 3 & 4). Swallows
    // its own errors: a save failure must not crash the already-streaming body.
    async function persistMentorReply() {
      try {
        if (accumulated) {
          await appendMessage({ conversationId: cid, role: 'mentor', content: accumulated })
        }
        await touchConversation(cid)
      } catch (saveError) {
        console.error(`POST /api/mentor/chat — failed to persist mentor reply (conv ${cid}):`, saveError)
      }
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (!first.done && first.value) {
            accumulated += first.value
            controller.enqueue(encoder.encode(first.value))
          }
          while (true) {
            const { value, done } = await iterator.next()
            if (done) break
            if (value) {
              accumulated += value
              controller.enqueue(encoder.encode(value))
            }
          }
          // Success: persist the full mentor reply (§6 rule 3).
          await persistMentorReply()
        } catch (error) {
          // Mid-stream failure AFTER partial text: best-effort save of whatever
          // was generated so the turn survives, even truncated (§6 rule 4).
          console.error(`POST /api/mentor/chat — stream failed mid-response (conv ${cid}):`, error)
          await persistMentorReply()
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Conversation-Id': conversationId,
        // Present only for a brand-new conversation, so the client adopts the
        // server's exact sidebar title without re-deriving it.
        ...(newLabel !== null ? { 'X-Conversation-Label': encodeURIComponent(newLabel) } : {}),
      },
    })
  } catch (error) {
    console.error('POST /api/mentor/chat failed:', error)
    const message =
      error instanceof Error ? error.message : 'Unexpected error in the mentor chat.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
