# CV Analysis Pipeline — Implementation Plan

Read `CLAUDE.md`, `docs/architecture.md`, `docs/llm-pipeline.md`,
`docs/json-schemas.md`, and `docs/db-schema-proposal.md` first.

Plan for implementing the 3-step LLM analysis pipeline that runs after a CV has
been uploaded and parsed, when the user clicks **"Analyze CV"**. Plan only — no
code yet.

---

## 0. Grounding: what the code audit revealed

The docs are stale relative to the code. The repo has moved well past the
"UI-only, no backend wiring" state `CLAUDE.md` describes. The facts that shape
this plan:

- **Groq is already wired.** `lib/llm/openai-client.ts` instantiates the OpenAI
  SDK against `https://api.groq.com/openai/v1` with `GROQ_API_KEY` (lazy
  singleton, `getOpenAIClient()`). No new client needed.
- **Structured outputs are NOT available on Groq.** `lib/llm/parse-cv.ts`
  documents this and uses the proven pattern: prompt-described JSON shape →
  `extractJsonObject()` (slice first `{` to last `}`) → `ZodSchema.safeParse()`.
  `schema_version` is omitted from the model output and stamped in code
  afterward. **The 3 analysis calls must follow this same pattern**, not
  `response_format: json_schema` (which `docs/llm-pipeline.md` wrongly assumes —
  that doc predates the Groq switch).
- **All three output schemas already exist** as Zod in `lib/types/`
  (`FormalEvaluationSchema`, `GapAnalysisSchema`, `LearningPathSchema`) and match
  `docs/json-schemas.md` exactly. `AnalysisRow` in `lib/db/rows.ts` already types
  the 3 nullable JSONB columns + 3 `*_status` columns.
- **Scoring already handles partial results.** `lib/scoring.ts`
  `computeOverallScore()` renormalizes weights when one call is missing;
  `buildScoreBreakdown()` returns `null` unless both formal+gap exist.
  `lib/db/bundle.ts` already consumes these per-CV.
- **The read path is done.** `getAllProfileBundles()` (called in
  `app/layout.tsx`) hydrates everything into `ProfileProvider`; `router.refresh()`
  re-runs it. `cvs-page.tsx` already renders `cv.analysis?.formal_evaluation` /
  `gap_analysis` with graceful "Analysis not available yet" empty states, and even
  imports a `Sparkles` icon.

**Precondition to verify before any of this runs:**
`docs/db-schema-proposal.md` says "No tables exist on Supabase yet," but the DB
read functions assume they do. Confirm the `analyses` table (and others) actually
exist on the Supabase project in `.mcp.json`, with `GROQ_API_KEY` + Supabase env
vars set and mock profiles seeded. If not, the migration is task #0.

---

## 1. Current-state assessment

**Already exists (reuse, don't rebuild):**

- Groq client, PDF parse + structuring pipeline, parse/save API routes.
- DB layer: `client.ts`, `profiles.ts`, `cvs.ts`, `surveys.ts`, `mentor.ts`,
  `bundle.ts`, and **read-only** `analyses.ts`
  (`getLatestAnalysisForCv/Profile`).
- All Zod types + enums + labels + scoring.
- Frontend CV detail view that already reads analysis blobs and degrades
  gracefully.

**Missing (build this):**

- **DB writes for analyses** — `createAnalysis()` and `updateAnalysisStep()`
  (only reads exist).
- **The 3 LLM call functions** — none exist; only `parse-cv.ts` is in `lib/llm/`.
- **`gatherAnalysisContext()`** — the required context-gathering abstraction.
  Note `bundle.ts` is the *read-side UI aggregator*, a different thing; the
  analysis context layer is new.
- **Static domain knowledge** — the Call-1 rubric and Call-2 role knowledge don't
  exist anywhere yet.
- **Orchestrator** — sequential run + retry + partial persistence.
- **`POST /api/analyses` route.**
- **"Analyze CV" button + progress UI** in `cvs-page.tsx`.

**Parts that change:** `lib/db/analyses.ts` (add writes), `components/cvs-page.tsx`
(button + stepper + per-step status badges). Everything else is additive new
files.

---

## 2. Proposed backend architecture

```
lib/
  llm/
    openai-client.ts          # EXISTS — getOpenAIClient() → Groq
    parse-cv.ts               # EXISTS — pattern to mirror
    json.ts                   # NEW: extractJsonObject + completeJson<T>(schema, opts) helper
    formal-evaluation.ts      # NEW: runFormalEvaluation(ctx) → FormalEvaluation
    gap-analysis.ts           # NEW: runGapAnalysis(ctx) → GapAnalysis
    learning-path.ts          # NEW: runLearningPath(ctx, gap) → LearningPath
    knowledge/
      formal-rubric.ts        # NEW: Call 1 rubric (static TS string)
      roles.ts                # NEW: per-target-role market knowledge (Call 2/3)
  analysis/
    context.ts                # NEW: AnalysisContext type, RetrievedChunk type, gatherAnalysisContext()
    pipeline.ts               # NEW: runAnalysisPipeline() — orchestration + retry + persistence
  db/
    analyses.ts               # EXTEND: createAnalysis(), updateAnalysisStep()
app/
  api/
    analyses/route.ts         # NEW: POST (start); optional GET ?cv_id= (poll)
```

**Where things live (separation of concerns):**

- **Groq client** — stays in `lib/llm/openai-client.ts`. Untouched.
- **Schemas** — already in `lib/types/`. Single source of truth.
- **Prompt builders** — internal to each `lib/llm/<call>.ts`; not in the route,
  not ad-hoc.
- **Context gathering** — `lib/analysis/context.ts`. Reads DB only, **never calls
  the LLM**. This is the RAG seam.
- **Scoring** — stays in `lib/scoring.ts` (already used by `bundle.ts`; computed
  on read, not stored — consistent with current code, so no `overall_score`
  column).
- **Orchestration + DB writes** — `lib/analysis/pipeline.ts`. The pure LLM
  functions in `lib/llm/` **do not touch the DB**; the pipeline gathers context,
  calls them, and persists each result.

**API design:** one route, `POST /api/analyses` (Node runtime, `maxDuration`
~120s to cover ~20–30s of sequential calls plus retries). Mirrors the existing
`app/api/cvs/route.ts` style: validate body with Zod, do work, return JSON,
`console.error` + structured error on failure.

---

## 3. Analysis execution flow

From click to persisted result:

1. **Click "Analyze CV"** in the CV detail view → `POST /api/analyses` with
   `{ cv_id, profile_id, target_role }`.
2. **Route validates** the body (Zod; `target_role` via `TargetRoleEnum`), then
   loads the CV to confirm it has `parsed_data`.
3. **Create the row** — `createAnalysis({ profileId, cvId, targetRole })` inserts
   with `formal_evaluation_status = gap_analysis_status = learning_path_status =
   'pending'` and all 3 JSONB columns `null`. (One row per run =
   score-history-friendly; `getLatestAnalysisForCv` already reads the newest.)
4. **Gather context once** — `gatherAnalysisContext({ profileId, cvId })` →
   `{ structured: { profile, survey, parsedCv, targetRole }, retrieved: [] }`.
5. **Run sequentially** (Call 3 depends on Call 2):
   - **Call 1** `runFormalEvaluation(ctx)` → on success
     `updateAnalysisStep(id, 'formal_evaluation', { output, status:'success' })`;
     on failure-after-retry `{ status:'failed' }`, output stays `null`.
   - **Call 2** `runGapAnalysis(ctx)` → persist independently, same way.
   - **Call 3** — **only if Call 2 succeeded**: `runLearningPath(ctx, gapOutput)`
     → persist. If Call 2 failed, mark `learning_path_status:'failed'` and skip
     the call (it has no gaps to consume).
6. **Each step is persisted the moment it resolves** (a separate `UPDATE` per
   step), so a crash mid-pipeline still leaves earlier results saved.
7. **Route returns** the final `AnalysisRow` (all 3 statuses + whatever outputs
   completed).
8. **Client** stops the stepper and calls `router.refresh()` →
   `getAllProfileBundles()` re-runs → the detail view re-renders with real
   (possibly partial) results.

---

## 4. Context design (the RAG seam)

```ts
// lib/analysis/context.ts
export type RetrievedChunk = {
  source: string          // e.g. "esco" | "job_ad" | "cv_benchmark"
  content: string
  metadata?: Record<string, unknown>
}

export type AnalysisContext = {
  structured: {
    profile: ProfileRow
    survey: SurveyData | null
    parsedCv: ParsedCv
    targetRole: TargetRole | null
  }
  retrieved: RetrievedChunk[]   // ALWAYS [] in Phase 0
}

export async function gatherAnalysisContext(
  args: { profileId: string; cvId: string },
): Promise<AnalysisContext> { /* DB reads only */ }
```

- **From DB/app data:** `profile` (`getProfileById`), `survey`
  (`getSurveyForProfile`), `parsedCv` (`getCvById().parsed_data`), `targetRole`
  (the CV's `target_role`).
- **Prior call outputs** (Call 2's gaps for Call 3) are **not** in the context
  object — they're produced in-run and passed explicitly:
  `runLearningPath(ctx, gap)`. This keeps `gatherAnalysisContext` a pure DB-read
  function.
- **Static rubric/role knowledge is NOT context.** It's domain knowledge embedded
  in each call's *system prompt* (see §5). Per `architecture.md`, "context" = two
  sources only: **structured** (always full) + **retrieved** (semantic). The
  rubric is neither — it's a fixed prompt template. This matches Call 1, which
  "uses retrieval? No."
- **Why this enables RAG:** in Phase 1, `gatherAnalysisContext` gains an optional
  retrieval step that fills `retrieved[]` (and likely takes a
  `{ for: 'gap_analysis' | 'learning_path', query }` arg, since Call 2 retrieves
  role/job-ad chunks and Call 3 retrieves learning resources). Prompt builders
  already append `context.retrieved` to the prompt — empty in Phase 0, so the
  appended block is a no-op today. **No call site changes between phases**; only
  the inside of `gatherAnalysisContext` and the static-knowledge blocks change.

---

## 5. Prompting strategy

Each call uses a system prompt + a user message carrying the structured payload,
following `parse-cv.ts` conventions: **Italian output**, "respond with a single
JSON object, no prose/markdown/fences," explicit shape with all keys, `null`/`[]`
for empties, `schema_version` excluded (stamped in code).

- **System prompt = role + task + static domain knowledge + output-shape
  contract.** Static, top-of-prompt, identical across runs (cache-friendly, per
  the mentor caching note).
- **User message = the structured context as compact JSON** (parsed CV, survey,
  target role) + a final `RETRIEVED CONTEXT:` block rendered from
  `context.retrieved` (empty string in Phase 0).

Per call:

- **Call 1 (formal):** system prompt embeds the **rubric** from
  `knowledge/formal-rubric.ts` — what completeness/action_impact/clarity mean,
  what to penalize, the 0–100 bands. User message = `parsedCv` only. Role-agnostic;
  no `targetRole`, no retrieval ever.
- **Call 2 (gap):** system prompt embeds **role knowledge** for the selected
  `targetRole` from `knowledge/roles.ts` (expected skills/tools/certs and what the
  Italian market values for that role). User message = `parsedCv` + `survey` +
  `targetRole` (+ retrieved block). Output's `target_role` field is filled from
  context, validated by `TargetRoleEnum`.
- **Call 3 (learning path):** system prompt = how to turn gaps into 4–6
  heterogeneous actions, prioritized, respecting constraints. User message =
  **Call 2's gaps** + `survey.constraints` (budget, weekly hours) +
  `survey.work_preferences`/`career_goals` (+ retrieved block). `addresses_gaps[]`
  must reference Call 2 gap `title`s.

**Static knowledge in Phase 0** lives in `lib/llm/knowledge/` as plain TS string
exports (no FS reads). **Phase 1 injection:** retrieved chunks are appended to the
user message via the existing `retrieved` block; the static role text can stay as
a fallback or be progressively replaced. (Full prompts to be written during
implementation; the shape contract should be copied from the schema like
`parse-cv.ts`'s `OUTPUT_SHAPE`.)

---

## 6. Error handling and partial results

- **Retry-once helper** wraps each call: `withRetry(fn)` → try; on throw (API
  error *or* Zod validation failure), try exactly once more; if it throws again,
  surface failure. Validation failure counts as failure, so a malformed JSON also
  triggers the retry.
- **Status transitions per step:** `pending` → `success` (output persisted) or
  `failed` (output stays `null`). Independent `UPDATE` per step, immediately on
  resolution → partial results preserved on crash/disconnect.
- **Call 3 dependency:** if `gap_analysis_status` is `failed`, skip Call 3 and set
  `learning_path_status:'failed'` (enum has no `'skipped'`; `failed` is the honest
  representation that it didn't produce output).
- **Whole-pipeline failure isolation:** one failed call never aborts the others
  (except the Call 2→3 dependency). The route always returns a row.
- **Frontend on partial failure:** the detail view already guards every section
  with `formal?.` / `gap?.`. Add per-step status badges read from
  `cv.analysis.{formal_evaluation,gap_analysis,learning_path}_status` (available
  on the row), e.g. a small "Gap analysis failed — Retry" affordance. Simplest
  retry = re-run the whole analysis (new row); granular per-step retry is an
  optional upgrade. `computeOverallScore` already produces a partial score from
  whatever dimensions exist.

---

## 7. Frontend integration

- **Button location:** `CVDetailView` header in `cvs-page.tsx`, next to the
  existing "Set as Active CV" button. Label "Analyze CV" when `cv.analysis` is
  null, "Re-analyze" otherwise (`Sparkles` icon already imported). **Guard:**
  require a non-null `target_role` (fall back to `profile.target_role`) before
  enabling — Call 2/3 need it; if null, prompt the user to pick a role (the upload
  dialog already has the `TargetRole` selector to copy).
- **Trigger:** `fetch('/api/analyses', { method:'POST', body: JSON.stringify({
  cv_id, profile_id, target_role }) })`, then on success `router.refresh()` —
  identical to the post-save pattern already in `cv-upload-dialog.tsx`.
- **Progress:** local `analyzing` state + a 3-step stepper ("Valutazione formale →
  Gap analysis → Learning path"). The empty states ("Analysis not available yet")
  already cover the pre-analysis view.
- **Recommendation — synchronous + refresh, not polling.** The app runs locally
  during the pitch and total latency is ~20–30s. Do the simplest robust thing: the
  `POST` runs all 3 calls synchronously and persists each step; the client shows a
  stepper during the single request, then `router.refresh()` on response renders
  real (possibly partial) results. This reuses the existing refresh mechanism and
  adds zero infrastructure. The stepper is cosmetic (time-driven), which is fine
  for a demo.
  - *Optional upgrade if you want live per-step reveal:* since per-call
    `*_status` columns exist for exactly this, add `GET /api/analyses?cv_id=` and
    poll every ~2s, flipping badges as statuses change. Don't build this unless
    Phase 0 is done early — it's the schema's intended endgame but not needed for
    the demo.

---

## 8. TypeScript and validation

One unbroken chain, no fragile manual parsing:

- **Single source of truth:** the Zod schemas in `lib/types/`. `lib/db/rows.ts`
  already types the JSONB columns as `FormalEvaluation | null` etc., so DB blob ⇄
  TS type are aligned by construction.
- **One validation helper** in `lib/llm/json.ts`:
  ```ts
  export async function completeJson<T>(
    schema: z.ZodType<T>,
    opts: { system: string; user: string; model: string; temperature?: number },
  ): Promise<T> // call → extractJsonObject → schema.safeParse → typed T (throws on failure, triggering retry)
  ```
  This generalizes the exact logic already in `parse-cv.ts` (move
  `extractJsonObject` here; optionally refactor `parse-cv.ts` to reuse it, but not
  required). Each call passes its schema-with-`schema_version`-omitted and
  re-stamps `'1.0'` after parse — same trick as `ParsedCvOutputSchema`.
- **Harden JSON validity (optional):** add `response_format: { type:
  'json_object' }` to the Groq call if the chosen model supports JSON mode —
  reduces fence/prose stripping. Keep `extractJsonObject` as the safety net
  regardless.
- **Result:** the only place JSON shape is defined is Zod; the LLM output, the DB
  column, and the TS type can't drift.

---

## 9. Phase 0 vs Phase 1

**Build now (Phase 0):**

- `gatherAnalysisContext()` returning `{ structured, retrieved: [] }`.
- 3 call functions with static rubric/role knowledge in prompts.
- Orchestrator with retry + per-step persistence + Call 2→3 guard.
- `createAnalysis` / `updateAnalysisStep` DB writes.
- `POST /api/analyses` + frontend button/stepper/partial-failure badges.

**Do NOT build now:** pgvector, embeddings, LangChain, retrieval, the
`document_chunks` table, any RAG query, and **no fake/stub retrieval**
(`retrieved` is literally `[]`, not mock chunks).

**Where RAG slots in later (all inside the context layer):**
`gatherAnalysisContext` gains a retrieval step populating `retrieved[]` (keyed per
call); the static role knowledge in `knowledge/roles.ts` is augmented or replaced
by retrieved chunks. The prompt builders, the 3 call functions, the orchestrator,
the route, and all 4 screens stay byte-for-byte the same.

---

## 10. Implementation checklist (ordered, ~2–3 days of the week)

0. **Precondition:** confirm Supabase tables exist (run the
   `db-schema-proposal.md` migration via Supabase MCP if not), `GROQ_API_KEY` +
   Supabase env set, profiles seeded.
1. **DB writes** — extend `lib/db/analyses.ts`: `createAnalysis()` (statuses
   `pending`), `updateAnalysisStep(id, step, { output, status })`.
2. **JSON helper** — `lib/llm/json.ts`: lift `extractJsonObject` + add
   `completeJson<T>()`.
3. **Static knowledge** — `lib/llm/knowledge/formal-rubric.ts`, `knowledge/roles.ts`
   (3 roles, concise Italian-market knowledge).
4. **Call functions** — `lib/llm/formal-evaluation.ts`, `gap-analysis.ts`,
   `learning-path.ts` (prompt builder + `runXxx(ctx)`; stamp `schema_version`).
   Reuse `llama-3.3-70b-versatile`, low temperature; confirm the model ID against
   Groq's current catalog, swappable via one const.
5. **Context** — `lib/analysis/context.ts`: `AnalysisContext`, `RetrievedChunk`,
   `gatherAnalysisContext()` (DB reads only, `retrieved: []`).
6. **Orchestrator** — `lib/analysis/pipeline.ts`: gather → 3 calls with
   `withRetry` → persist each step → Call 2→3 guard.
7. **API route** — `app/api/analyses/route.ts`: Zod-validated `POST`,
   `runtime='nodejs'`, `maxDuration` ~120.
8. **Frontend** — `cvs-page.tsx`: Analyze/Re-analyze button (with `target_role`
   guard), 3-step stepper, per-step `*_status` failed badges, `fetch` →
   `router.refresh()`.
9. **Manual test** — a real PDF per target role; force a Call-2 throw to verify
   partial persistence (Call 1 saved, Call 3 marked failed) and that the UI
   degrades correctly.

**Scope discipline:** synchronous run + `router.refresh()` (no polling/workers),
whole-analysis re-run (no granular retry), computed score (no `overall_score`
column) — all unless Phase 0 finishes with time to spare.

---

## Open items to confirm before implementing

1. **Do the Supabase tables already exist?** (checklist item #0). The proposal
   doc says no; the read code assumes yes.
2. **Synchronous vs polling** (§7). Recommendation: synchronous + `router.refresh()`
   for the demo.
