# Mentor Chatbot — Implementation Plan (Phase 0)

Read `CLAUDE.md`, `docs/architecture.md`, `docs/llm-pipeline.md`,
`docs/json-schemas.md`, `docs/db-schema-proposal.md`, and
`docs/analysis-pipeline-plan.md` first.

Plan for the conversational Mentor: a practical career consultant + light
mental coach for Italian university students. **Plan only — no code yet.**
Phase 0: no RAG, no embeddings, no pgvector. Groq only (no OpenAI). The
architecture must already be RAG-ready via an empty `retrievedContext`.

---

## 0. Grounding: what the code audit shows

The docs are stale relative to the code — same situation
`analysis-pipeline-plan.md` already flagged. Facts that shape this plan:

- **Groq is already wired and is the only client.** `lib/llm/openai-client.ts`
  exposes `getOpenAIClient()` and `GROQ_MODEL` (`llama-3.3-70b-versatile`,
  overridable via env). The file is named `openai-client.ts` because it uses the
  **OpenAI-compatible SDK pointed at `https://api.groq.com/openai/v1`** with
  `GROQ_API_KEY` — it is Groq, not OpenAI. **We do not rename it** (§3).
  `docs/llm-pipeline.md`'s "GPT-4.1-mini" for the mentor is **obsolete** —
  ignore it. No OpenAI, no new client.
- **The `openai` SDK (v6) is installed; there is NO Vercel AI SDK.** Streaming
  uses `client.chat.completions.create({ stream: true })` → async iterable,
  piped into a Web `ReadableStream`. The client reads it with `fetch` +
  `response.body.getReader()`. We do **not** add `ai`/`@ai-sdk` — that would be
  over-engineering.
- **The analysis pipeline is the exact template to mirror.**
  `lib/analysis/context.ts` (`gatherAnalysisContext`, `RetrievedChunk`,
  `renderRetrievedBlock`), `lib/analysis/pipeline.ts` (orchestrator),
  `lib/llm/<call>.ts` (prompt builder + run fn), `app/api/analyses/route.ts`
  (Zod-validated route). The mentor reuses this shape, with one difference: it
  **streams free text**, so it does **not** use `completeJson`/JSON-mode/Zod on
  the output.
- **The mentor DB layer is read-only.** `lib/db/mentor.ts` has
  `getConversationsForProfile` and `getMessagesForConversation`. **No writes
  exist** — that's the main gap.
- **Tables already exist (assumed) with bookmark columns.**
  `mentor_conversations` and `mentor_messages` are typed in `lib/db/rows.ts`
  (`ConversationRow`, `MessageRow` with `is_bookmarked` / `bookmark_label`) and
  read by `bundle.ts`. **No schema change is required.** Note
  `MessageRole = 'user' | 'mentor'` — the API expects `'assistant'`, so a role
  mapping is needed.
- **The read/hydrate path is done.** `getAllProfileBundles()` (in
  `app/layout.tsx`) hydrates `conversations` into `ProfileProvider`;
  `useProfile().current.conversations` feeds `mentor-page.tsx`. There's already
  an `applyAnalysis()` precedent in `profile-context.tsx` for merging fresh
  server data into client state without a full refetch — we mirror it with
  `applyMentorTurn()`.
- **`mentor-page.tsx` is fully mock.** The input's `onKeyDown` / `onClick` just
  clear the field ("Messages are not actually sent"). The star/bookmark button
  is decorative.

**Precondition (same as the analysis plan):** confirm
`mentor_conversations` / `mentor_messages` exist on the Supabase project in
`.mcp.json`, are seeded with the mock profiles' chat histories, and
`GROQ_API_KEY` + Supabase env vars are set. If tables don't exist, run the
`db-schema-proposal.md` migration first. This is task #0, not part of the
mentor feature itself.

---

## 1. Files to create / modify

```
lib/
  mentor/
    context.ts        # NEW: MentorContext + RetrievedContextChunk types, gatherMentorContext() — DB reads ONLY
    prompt.ts         # NEW: buildMentorPrompt(ctx) → ChatMessage[]; serializeMentorContext + retrieved block. NO DB, NO LLM
  llm/
    chat.ts           # NEW: streamChat({messages,...}) → Groq streaming wrapper. NO DB, NO prompt building
    knowledge/
      mentor-guidelines.ts   # NEW: static persona/behavior/guardrails (Italian) — mirrors knowledge/formal-rubric.ts
  db/
    mentor.ts         # EXTEND: createConversation(), appendMessage(), touchConversation()
app/
  api/
    mentor/
      chat/route.ts   # NEW: POST — orchestration + streamed response (Node runtime)
components/
  mentor-page.tsx     # MODIFY: wire send → stream → render → persist; New chat button (local reset only)
lib/
  profile-context.tsx # MODIFY (optional but recommended): add applyMentorTurn() mirroring applyAnalysis()
```

Strict separation of concerns, matching the existing analysis layer:

| Concern | Where | Rule |
|---|---|---|
| Groq streaming | `lib/llm/chat.ts` | takes `messages`, returns a stream. **No Supabase, no prompt strings.** |
| Prompt assembly | `lib/mentor/prompt.ts` | takes `MentorContext`, returns `ChatMessage[]`. **No Supabase, no LLM.** |
| Context gathering | `lib/mentor/context.ts` | **DB reads only.** No LLM, no prompt strings. The RAG seam. |
| Persistence | `lib/db/mentor.ts` | DB writes only. |
| Orchestration | `app/api/mentor/chat/route.ts` | wires the above; calls dedicated functions — never builds a prompt inline, never calls Groq directly with hand-built strings. |

---

## 2. The API route

**`POST /api/mentor/chat`** — Node runtime (`runtime = 'nodejs'`,
`maxDuration ~60`), styled after `app/api/analyses/route.ts`: Zod-validate
body, do work, `console.error` + structured error on failure.

Request body:

```ts
{ profile_id: string; conversation_id?: string; message: string }
```

Orchestration (the route is the only place these are wired together):

1. Zod-validate the body.
2. **Resolve the conversation:** `conversationId = conversation_id ?? (await
   createConversation({ profileId, label: deriveLabel(message) })).id`. A new
   conversation row is created **only here — on the first message without a
   `conversation_id`** (never by the "New chat" button, §7). 
3. `await appendMessage({ conversationId, role: 'user', content: message })`
   — **always save the user message before calling Groq** (§6).
4. `const ctx = await gatherMentorContext({ profileId, conversationId, recentLimit: 12 })`.
   The just-saved user message is the **last item** in `ctx.structured.recentMessages`.
   ⚠️ **Message-duplication rule:** because `recentMessages` already contains the
   new user message, `buildMentorPrompt` must **not** append it again (§5).
5. `const messages = buildMentorPrompt(ctx)`.
6. `const groqStream = await streamChat({ messages })`.
7. Return a streamed `Response` (§7) with header
   `X-Conversation-Id: <conversationId>` so a brand-new chat's id reaches the
   client. Persist the mentor message per the failure rules in §6.

Bookmarks are **not** part of this route — optional secondary scope only (§8/§11).

---

## 3. The Groq wrapper

`lib/llm/chat.ts` — a thin, pure streaming primitive, deliberately **not**
`completeJson` (that's JSON-mode for analysis; the mentor is free-text prose):

```ts
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function streamChat(opts: {
  messages: ChatMessage[]
  model?: string        // defaults to MENTOR_MODEL ?? GROQ_MODEL
  temperature?: number  // default ~0.6 — warmer than analysis's 0.2
}): Promise<AsyncIterable<string>>   // yields content deltas
```

- **Client naming:** reuse `lib/llm/openai-client.ts` as-is via
  `getOpenAIClient()` — **do not rename it.** Add a one-line comment at the top
  of `chat.ts` clarifying *"Groq via the OpenAI-compatible API — the `openai`
  SDK is pointed at api.groq.com, this is not real OpenAI"* so the import isn't
  misread.
- Uses `stream: true`, **no `response_format`** (free text).
- Yields `chunk.choices[0]?.delta?.content` strings, skipping empties.
- Knows nothing about Supabase, profiles, or prompt content — it just relays
  `messages`.
- Model: default to `GROQ_MODEL` (`llama-3.3-70b-versatile`) for quality (the
  mentor must not feel generic), exposed as a `MENTOR_MODEL` override const so
  we can swap to `llama-3.1-8b-instant` if we want faster first-token latency.
  One const, one place.

---

## 4. `gatherMentorContext` (the RAG seam)

`lib/mentor/context.ts` — direct sibling of `gatherAnalysisContext`. **DB reads
only**, never calls the LLM, never builds prompt strings.

```ts
export type RetrievedContextChunk = {
  id: string
  sourceType: 'role_description' | 'job_ad' | 'learning_resource' | 'career_advice'
  title: string
  content: string
  metadata?: Record<string, unknown>
}

export type MentorContext = {
  structured: {
    profile: ProfileRow
    survey: SurveyData | null
    parsedCv: ParsedCv | null            // latest ACTIVE CV only (per requirement)
    analysis: AnalysisRow | null         // latest analysis for that CV
    recentMessages: MessageRow[]         // last N of THIS conversation, chronological (incl. the new user msg)
  }
  retrievedContext: RetrievedContextChunk[]   // ALWAYS [] in Phase 0
}

export async function gatherMentorContext(args: {
  profileId: string
  conversationId: string
  recentLimit?: number
}): Promise<MentorContext>
```

Reads (all from existing helpers, run in parallel where independent):

- `profile` → `getProfileById(profileId)`
- `survey` → `getSurveyForProfile(profileId)`
- **latest active CV** → `listCvsForProfile(profileId)` then
  `find(c => c.status === 'active') ?? cvs[0]`; take `.parsed_data`.
  (Optionally add a one-line `getActiveCvForProfile()` to `cvs.ts` for clarity —
  reuse is fine to avoid new code.)
- **latest analysis** → `getLatestAnalysisForCv(activeCv.id)` so the analysis
  matches the CV in context (falls back to `null`).
- **recent messages** → `getMessagesForConversation(conversationId)`, take the
  last `recentLimit` (default 12). Includes the user message just saved by the
  route.
- **`retrievedContext`** → **always `[]` in Phase 0.** No stubs, no mock chunks.

**Graceful degradation is mandatory:** a profile may have no CV / no
`parsed_data` / no analysis. Each is independently nullable;
`serializeMentorContext` omits absent sections. The mentor must still work with
only profile + survey.

> Naming note: `lib/analysis/context.ts` uses `RetrievedChunk` + a `retrieved`
> property. The mentor uses the product-brief names — the richer
> `RetrievedContextChunk` type and the **`retrievedContext`** property. We keep
> both conventions in parallel for Phase 0; they can converge in Phase 1.

---

## 5. `buildMentorPrompt`

`lib/mentor/prompt.ts` — pure transform `MentorContext → ChatMessage[]`. No DB,
no LLM.

Structure (cache-friendly: static first, dynamic last — same principle
`llm-pipeline.md` notes for caching):

1. **One `system` message**, built top-to-bottom:
   - **Static persona + guidelines** from `lib/llm/knowledge/mentor-guidelines.ts`
     (identical across every turn — the cacheable head, §8).
   - **Compact career context summary** from `serializeMentorContext(structured)`
     — **never raw JSON.** Selected fields only, grouped under fixed labels:

     ```
     === USER PROFILE ===
     nome, università, corso, anno, target_role

     === SURVEY ===
     industry_interests; career_goals (1y / 3y / what_i_dont_want);
     constraints (geo, ore/settimana, budget); work_preferences (size, lingue, stile)

     === ACTIVE CV SUMMARY ===
     education (istituto · titolo · campo · anno)
     work/projects (ruolo/nome · azienda/contesto · 1 riga sintetica)
     skills (lista piatta)
     languages (nome · livello)
     certifications (nome · ente)
     notable experiences (1-3 voci salienti)

     === LATEST ANALYSIS ===
     overall positioning (match_summary)
     strengths (formal.strengths → title)
     gaps (gap.gaps → title + priority)
     suggested target roles (target_role; eventuali alternative emerse)
     recommended next actions (learning_path.intro + action titles)
     dimension scores (formal + gap dimension_scores, se presenti)

     === RETRIEVED CONTEXT ===
     (vuoto in Phase 0)
     ```

     Each group is omitted (or rendered as "non disponibile") when its source is
     null. Keep it terse — one line per item — to bound tokens and keep answers
     focused.
   - **Retrieved block** appended via `renderRetrievedBlock(ctx.retrievedContext)`
     — **empty string in Phase 0** (the RAG seam, §9).
2. **Conversation history**: map `ctx.structured.recentMessages` →
   `ChatMessage[]`, translating DB role `'mentor'` → API role `'assistant'`,
   `'user'` → `'user'`.

⚠️ **Do NOT append the new user message separately.** It is already the last
entry in `recentMessages` (the route saved it in §2 step 3 before gathering
context). `buildMentorPrompt` only maps the history; appending the message again
would duplicate the user's turn.

---

## 6. Saving conversations & messages + streaming-failure behavior

Extend `lib/db/mentor.ts` (writes only; mirrors `cvs.ts` / `analyses.ts` —
`.insert().select().single()`, throw on error):

```ts
createConversation(args: { profileId: string; label: string | null }): Promise<ConversationRow>
appendMessage(args: { conversationId: string; role: MessageRole; content: string }): Promise<MessageRow>
touchConversation(conversationId: string): Promise<void>   // bump updated_at
```

**Persistence + failure rules (no complex message statuses in Phase 0):**

1. **Always save the user message before calling Groq** (route §2 step 3). The
   user's turn is never lost, regardless of what happens next.
2. **Accumulate the mentor response while streaming** into a string.
3. **On successful completion:** `appendMessage({ role: 'mentor', content:
   accumulated })` + `touchConversation(conversationId)`.
4. **On stream failure after partial text was generated:** best-effort save of
   the partial mentor response (same `appendMessage`, with whatever accumulated),
   then `touchConversation`. The turn survives even if truncated.
5. **On stream failure before any mentor text:** save nothing for the mentor and
   return a **clear error** to the UI (the user message is already persisted, so
   the user can simply retry).

No `pending`/`failed`/`streaming` status columns — a message either exists
(possibly partial) or it doesn't.

- **`touchConversation`** bumps `mentor_conversations.updated_at` after each
  saved message so the sidebar's recency ordering and Today/Yesterday/This-week
  grouping (`bundle.ts` `dateGroup`) stay correct. Done in code (no migration).
- **Label strategy:** derive a truncated label from the first user message
  (`deriveLabel`, ~40 chars) so new chats show a meaningful sidebar title instead
  of "Untitled chat". `label` stays nullable; seeded conversations keep their
  hand-written labels.

---

## 7. Streaming to the UI + "New chat" behavior

**Transport: raw UTF-8 text stream + a header for the conversation id.**
Lowest-ceremony, no AI SDK, no SSE framing to hand-parse.

Server (in the route):

- Wrap `groqStream` in a Web `ReadableStream`: for each yielded delta,
  `controller.enqueue(encoder.encode(delta))` and append to the accumulator.
- Apply the §6 failure rules inside the stream's body / `try-catch` /
  close path (success save, partial save on mid-stream throw, error response if
  nothing was generated).
- `return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Conversation-Id': conversationId } })`.

Client (`components/mentor-page.tsx`):

- **`sendMessage()`** replaces the mock handlers:
  1. Optimistically push the user message + an empty "streaming" mentor bubble.
  2. `fetch('/api/mentor/chat', { method: 'POST', body: JSON.stringify({ profile_id, conversation_id, message }) })`.
  3. Read `X-Conversation-Id` from the response (adopt it for a new chat).
  4. Loop `response.body.getReader()` + `TextDecoder`, appending decoded chunks
     to the streaming bubble (token-by-token; existing `formatMessage` /
     `formatInline` handle partial markdown fine).
  5. On end: the message is persisted server-side. Reconcile client state via
     **`applyMentorTurn()`** in `profile-context.tsx` (mirrors `applyAnalysis`):
     merge the new/updated conversation + messages into `current.conversations`
     so the sidebar updates instantly — no heavy `router.refresh()` over all
     profiles. (`router.refresh()` is the simpler fallback.)
  6. On error response (§6 rule 5): surface a toast (`sonner`) and keep the
     user's message visible so they can retry.
- **"New chat" button:** resets the **selected conversation locally only**
  (`setSelectedId(null)` / a `draft` state) and clears the input. It **does NOT**
  create an empty conversation in the DB. The conversation row is created by the
  route on the first sent message (§2 step 2). The thread becomes "real" and
  appears in the sidebar only after the first exchange.
- Disable the input while streaming.

---

## 8. Mentor behavior & the system prompt (the "not generic" requirement)

`lib/llm/knowledge/mentor-guidelines.ts` — a static Italian guidelines string
(the persona contract), embedded at the top of the system message. The
assistant must:

- **answer in Italian by default** (mirror the user's language if they write in
  another);
- be **concrete, practical, and supportive**;
- **avoid generic motivational fluff** — every reply earns its space with
  specific, usable content grounded in the provided context;
- **not always end with a question** — vary closings;
- ask **at most 1–2 focused questions, and only when genuinely needed** to give a
  useful answer (e.g. key info missing);
- **usually close with a concrete practical next step** (an action, not a
  platitude);
- act as a career consultant + **light** mental coach — **never present itself
  as a psychologist or therapist**;
- if the user expresses **serious distress**, respond with empathy and **suggest
  seeking professional support**;
- **not invent facts** absent from the profile / survey / CV / analysis;
- prefer short paragraphs / tight lists; reference concrete CV/profile details
  when relevant.

This is the cacheable head of the prompt, identical every turn — exactly like
`FORMAL_RUBRIC` in `formal-evaluation.ts`.

**Proactive opening message** (`llm-pipeline.md`): treated as **seed data** —
the first `mentor` message of each mock profile's seeded conversation. No runtime
code needed. A runtime-generated opener for brand-new chats is an optional
enhancement, out of core scope.

---

## 9. RAG-readiness

We mirror the analysis seam exactly, so Phase 1 needs **zero call-site
changes**:

- `MentorContext.retrievedContext: RetrievedContextChunk[]` is **literally `[]`**
  in Phase 0 (no stubs, no mock chunks).
- `gatherMentorContext` is the **single seam**: Phase 1 adds a retrieval step
  inside it that populates `retrievedContext[]` (querying pgvector for the user's
  question — likely the latest user message as the query). Nothing else moves.
- `buildMentorPrompt` already appends `renderRetrievedBlock(ctx.retrievedContext)`
  → empty string today, a real "RETRIEVED CONTEXT" block in Phase 1. The prompt
  builder, the Groq wrapper, the route, and the UI stay byte-for-byte identical.

**Do NOT build now:** pgvector, embeddings, LangChain, `document_chunks`, any
retrieval query, any fake chunks.

---

## 10. DB schema changes

**None required.** `mentor_conversations` and `mentor_messages` already exist
and are typed (`rows.ts`), already carry `is_bookmarked` / `bookmark_label`, and
`label` is already nullable. Only operational items: verify tables exist +
seeded (precondition #0); `updated_at` bumping handled in code via
`touchConversation` (no migration).

---

## 11. Scope discipline

**Core (this implementation):** real send → stream → render → persist;
`gatherMentorContext` (profile + survey + active CV + latest analysis + recent
messages + empty `retrievedContext`); `buildMentorPrompt` with the Italian
persona and compact context summary; new-chat-on-first-message (local reset
button); streaming-failure handling per §6; sidebar updates.

**Secondary — do NOT implement unless the core chat is fully working:**
- **Bookmark toggling** (`PATCH /api/mentor/messages/[id]` + `is_bookmarked` UI
  wiring). Out of core scope. Mentioned for completeness only.
- Runtime-generated proactive opener for new chats.
- LLM-summarized conversation labels.
- `updated_at` trigger instead of `touchConversation`.
- Per-turn prompt-cache tuning.

---

## 12. Remaining open items (have defaults — confirm if you disagree)

The product decisions are now locked in (see "Final decisions" below). These
two are the only soft choices left, both with a recommended default:

1. **Sidebar reconciliation:** `applyMentorTurn()` (instant, recommended) vs
   `router.refresh()` (simpler, heavier). Default: `applyMentorTurn`.
2. **Mentor model:** `llama-3.3-70b-versatile` (quality, recommended) vs
   `llama-3.1-8b-instant` (faster first token). Default: 70b, `MENTOR_MODEL`
   override ready.

Precondition still to verify: do `mentor_conversations` / `mentor_messages`
exist + seeded on Supabase? (§0.)

---

## 13. Implementation checklist (ordered)

0. **Precondition** — confirm `mentor_conversations` / `mentor_messages` exist +
   seeded; `GROQ_API_KEY` + Supabase env set.
1. **DB writes** — extend `lib/db/mentor.ts`: `createConversation`,
   `appendMessage`, `touchConversation`.
2. **Guidelines** — `lib/llm/knowledge/mentor-guidelines.ts` (Italian persona +
   guardrails, §8).
3. **Groq wrapper** — `lib/llm/chat.ts`: `streamChat()` + `ChatMessage` (Groq-via-
   OpenAI-compatible comment; reuse `getOpenAIClient()`).
4. **Context** — `lib/mentor/context.ts`: `MentorContext`,
   `RetrievedContextChunk`, `gatherMentorContext()` (DB-only,
   `retrievedContext: []`), `renderRetrievedBlock()`.
5. **Prompt** — `lib/mentor/prompt.ts`: `buildMentorPrompt()` +
   `serializeMentorContext()` (grouped compact summary; role mapping
   mentor→assistant; **no re-append of the user message**).
6. **Route** — `app/api/mentor/chat/route.ts`: Zod body, resolve/create
   conversation → save user msg → gather → build → stream → persist mentor msg
   with §6 failure rules; `X-Conversation-Id` header; `runtime='nodejs'`.
7. **Frontend** — `components/mentor-page.tsx`: real `sendMessage()` with
   streamed read + optimistic bubbles + **local-only "New chat"**;
   `applyMentorTurn()` in `profile-context.tsx`.
8. **Manual test** — seeded profile with full CV+analysis: grounded Italian
   answer streams token-by-token, both messages persist, sidebar recency
   updates; profile with no CV (graceful degradation); brand-new chat (no DB row
   until first message, then created + id adopted); forced mid-stream failure
   (partial mentor text saved) and pre-token failure (clear error, user message
   retained).
