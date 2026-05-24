# DB Schema Proposal — Phase 0

Read `CLAUDE.md`, `docs/architecture.md`, and `docs/llm-pipeline.md` first.

This is a **proposal**, not a migration. No tables exist on Supabase yet.
Awaiting approval before running any `CREATE TABLE` via the Supabase MCP.

Scope: **Phase 0 only.** No `pgvector`, no embeddings, no chunk storage.
Those tables come in Phase 1 and are explicitly out of scope here.

---

## Guiding principles

1. **One row per logical thing**, not one row per screen. The dashboard
   reads from many tables; the table layout reflects the data, not the UI.
2. **Structured columns where the shape is stable, JSONB where the LLM
   defines the shape.** Specifically: the *outputs* of the 3 analysis
   calls are JSONB because their schemas are TBD (per `llm-pipeline.md`)
   and may evolve. The *inputs* (CV parsed data, survey) are also JSONB
   for the same reason — the JSON schema "is not defined yet" per
   `CLAUDE.md`.
3. **Each analysis call output is its own row.** Per `llm-pipeline.md`:
   "Each call saves its output independently to Postgres" so partial
   results are possible if one call fails.
4. **No auth, no `auth.users`.** Per `CLAUDE.md`: "No authentication of
   any kind". `profile.id` is a free-standing PK. We will still enable
   RLS but with permissive policies (anon role can read/write everything)
   so the demo works without a session.
5. **Timestamps everywhere.** `created_at` on every table, `updated_at`
   where rows mutate.
6. **UUIDs as PKs.** Generated server-side via `gen_random_uuid()`. The
   string IDs in `mock-data.ts` ("marco", "cv-marco-3") are seed-only
   conveniences — see "Open decisions" below.

---

## Tables

### `profiles`

The active persona. The dropdown switches `current_profile_id` on the
client; the server reads everything else by joining on this ID.

| Column         | Type          | Notes                                                       |
| -------------- | ------------- | ----------------------------------------------------------- |
| `id`           | `uuid` PK     | `default gen_random_uuid()`                                 |
| `slug`         | `text` UNIQUE | Stable human-readable handle for seeds (`marco`, `laura`)   |
| `name`         | `text`        | "Marco Rossi"                                               |
| `avatar`       | `text`        | Initials, e.g. "MR" (current mock uses initials, not URLs)  |
| `university`   | `text`        |                                                             |
| `course`       | `text`        |                                                             |
| `year`         | `text`        | Free text — "3rd year", "Final year"                        |
| `target_role`  | `text`        | "Data Analyst", "Consulting" — see open decision #2         |
| `created_at`   | `timestamptz` | `default now()`                                             |
| `updated_at`   | `timestamptz` | `default now()`                                             |

Why these columns and not more: the *derived* career score, breakdown,
strengths, gaps, scoreHistory etc. that live on the mock `Profile` are
computed from the latest analysis — they belong on `analyses`, not here.

### `cvs`

One row per uploaded CV. Both seeded mock CVs and user-uploaded ones
during the demo land here.

| Column          | Type                      | Notes                                                   |
| --------------- | ------------------------- | ------------------------------------------------------- |
| `id`            | `uuid` PK                 |                                                         |
| `profile_id`    | `uuid` FK → `profiles.id` | `on delete cascade`                                     |
| `version`       | `int`                     | 1, 2, 3 — unique per `(profile_id, version)`            |
| `status`        | `text`                    | `'active' \| 'archived'` — CHECK constraint             |
| `target_role`   | `text`                    | The role this CV was tailored to (may differ from profile's current target) |
| `file_path`     | `text` NULLABLE           | Supabase Storage path; NULL for seeded CVs without a real PDF |
| `raw_text`      | `text` NULLABLE           | Output of phase 1 extraction (`pdf-parse`)              |
| `parsed_data`   | `jsonb`                   | Output of phase 2 structuring (name/email/experiences/education/skills) — shape TBD |
| `uploaded_at`   | `timestamptz`             | `default now()` — shown as "uploadDate" in UI           |
| `created_at`    | `timestamptz`             | `default now()`                                         |
| `updated_at`    | `timestamptz`             | `default now()`                                         |

Notes:
- `raw_text` is kept so the structuring call can be re-run without
  re-extracting from the PDF.
- The mock `CV.score` and `CV.evaluation`/`CV.roleMatch` live on
  `analyses` (one analysis per CV), not here. Keeping them on `cvs` would
  duplicate state and make re-analysis awkward.
- Exactly one `active` CV per profile is a *UI convention*, not a DB
  constraint — easy to enforce in code; a partial unique index is
  possible but probably overkill for the demo.

### `surveys`

One row per profile (1:1). Kept as its own table rather than columns on
`profiles` because (a) the survey is conceptually a separate artifact
the user fills out, (b) the JSON shape is large and irregular (nested
objects, arrays), and (c) it will likely be edited as a whole.

| Column        | Type                              | Notes                                  |
| ------------- | --------------------------------- | -------------------------------------- |
| `id`          | `uuid` PK                         |                                        |
| `profile_id`  | `uuid` UNIQUE FK → `profiles.id`  | `on delete cascade` — UNIQUE enforces 1:1 |
| `data`        | `jsonb`                           | Full survey: education, industryInterests, careerGoals, constraints, preferences |
| `created_at`  | `timestamptz`                     | `default now()`                        |
| `updated_at`  | `timestamptz`                     | `default now()`                        |

The TypeScript `SurveyData` type in `lib/mock-data.ts` is the de-facto
schema for `data`; we can mirror it with a Zod schema in the app layer
without locking it into Postgres column shapes.

### `analyses`

One row per analysis run (i.e. per CV evaluation pass). Created when an
analysis pipeline starts; the 3 outputs are stored as **separate
nullable columns** that fill in as each call completes. This makes
partial results trivially representable.

| Column                  | Type                       | Notes                                       |
| ----------------------- | -------------------------- | ------------------------------------------- |
| `id`                    | `uuid` PK                  |                                             |
| `profile_id`            | `uuid` FK → `profiles.id`  | `on delete cascade` (denormalized for query convenience — see below) |
| `cv_id`                 | `uuid` FK → `cvs.id`       | `on delete cascade`                         |
| `target_role`           | `text`                     | Snapshot of the role at analysis time       |
| `formal_evaluation`     | `jsonb` NULLABLE           | Call 1 output. NULL until call completes / NULL if failed |
| `gap_analysis`          | `jsonb` NULLABLE           | Call 2 output                               |
| `learning_path`         | `jsonb` NULLABLE           | Call 3 output                               |
| `formal_evaluation_status` | `text`                  | `'pending' \| 'success' \| 'failed'` — CHECK constraint |
| `gap_analysis_status`   | `text`                     | same                                        |
| `learning_path_status`  | `text`                     | same                                        |
| `created_at`            | `timestamptz`              | `default now()`                             |
| `updated_at`            | `timestamptz`              | `default now()`                             |

Why per-call `*_status` columns instead of a single state field: the 3
calls are independent (per `llm-pipeline.md`) and a single status would
have to encode all combinations. Three small fields are clearer and let
the UI render "Step 2 done, Step 3 failed" directly.

Why `profile_id` *and* `cv_id`: avoids a join when the dashboard asks
"latest analysis for this profile across any CV". Denormalizing one FK
is a fair trade for the most common read pattern.

Alternative considered & rejected: one row per call (3 rows per
analysis with a `call_type` discriminator). More normalized but every
query has to pivot 3 rows back into one analysis object — net friction
for no real benefit at this scale.

### `mentor_conversations`

A logical thread (the items in the mentor sidebar grouped by date).

| Column         | Type                       | Notes                                              |
| -------------- | -------------------------- | -------------------------------------------------- |
| `id`           | `uuid` PK                  |                                                    |
| `profile_id`   | `uuid` FK → `profiles.id`  | `on delete cascade`                                |
| `label`        | `text`                     | "TIM interview prep" — auto-generated or user-set; see open decision #4 |
| `created_at`   | `timestamptz`              | `default now()` — used for the Today/Yesterday/This week grouping |
| `updated_at`   | `timestamptz`              | `default now()` — bumped on each new message       |

### `mentor_messages`

One row per turn in a conversation.

| Column             | Type                                    | Notes                                |
| ------------------ | --------------------------------------- | ------------------------------------ |
| `id`               | `uuid` PK                               |                                      |
| `conversation_id`  | `uuid` FK → `mentor_conversations.id`   | `on delete cascade`                  |
| `role`             | `text`                                  | `'user' \| 'mentor'` — CHECK constraint |
| `content`          | `text`                                  | Markdown allowed                     |
| `is_bookmarked`    | `boolean`                               | `default false` — see note below     |
| `bookmark_label`   | `text` NULLABLE                         | Short label shown in the sidebar bookmarks list |
| `created_at`       | `timestamptz`                           | `default now()`                      |

**Bookmark model decision:** the spec says "users can save individual
mentor messages with a short label" → bookmarks attach to **messages**,
not conversations. The current mock has `isBookmarked` on the
conversation, which is a *UI shortcut* (a conversation appears bookmarked
if it contains any bookmarked message). Storing it on the message is
correct per the spec; the conversation-level flag can be derived.

---

## Relationships

```
profiles (1) ──┬── (1)   surveys
               ├── (N)   cvs ──── (N) analyses
               ├── (N)   analyses          [also linked directly for query convenience]
               └── (N)   mentor_conversations ── (N) mentor_messages
```

All FKs use `ON DELETE CASCADE`. Deleting a profile wipes everything
under it — appropriate for demo seed/reset flows.

---

## Indexes

Beyond the implicit PK/UNIQUE indexes:

| Table | Index | Why |
| ----- | ----- | --- |
| `cvs` | `(profile_id, uploaded_at DESC)` | "List CVs for active profile, newest first" — the My CVs screen |
| `cvs` | UNIQUE `(profile_id, version)` | Prevents two CVs claiming the same version per profile |
| `analyses` | `(cv_id, created_at DESC)` | "Latest analysis for this CV" |
| `analyses` | `(profile_id, created_at DESC)` | "Latest analysis for the dashboard" without joining `cvs` |
| `mentor_conversations` | `(profile_id, updated_at DESC)` | Sidebar grouping uses recency |
| `mentor_messages` | `(conversation_id, created_at)` | Loading a thread in order |
| `mentor_messages` | `(conversation_id) WHERE is_bookmarked` | Partial index for the bookmarks panel — small but the query is frequent |

Not adding GIN indexes on `jsonb` columns. We don't query inside the
JSON for Phase 0; we always fetch the full blob by row ID.

---

## Conventions

- **Naming:** `snake_case` columns, plural table names.
- **`updated_at`:** maintained via a single trigger function applied to
  each mutable table. Standard Supabase pattern.
- **RLS:** enabled on every table, with permissive policies for `anon`
  (full read/write). This is the "no auth" stance from `CLAUDE.md`; we
  enable RLS so the table doesn't show up as an exposed risk in
  Supabase's lints, but the policy is open.

---

## Open decisions — please clarify

These are the calls I'd like you to make before I write the migration.

**1. Seeding strategy for mock profiles.** Two options:

   - **(a)** Hard-code 3-4 UUIDs in a seed SQL file. The client knows
     these UUIDs and uses them in the dropdown. Lets the dropdown switch
     by ID directly.
   - **(b)** Use the `slug` column ("marco", "laura") as the dropdown
     identifier; UUIDs are internal. Slightly more code on the client to
     resolve slug → UUID, but seeds are readable and don't depend on
     UUIDs being stable across re-seeds.

   My recommendation: **(b)**. Seeds become easier to re-run.

**2. `target_role`: free text or enum?** Currently mock data has
   "Data Analyst", "Consulting", "Management Consultant" (note the
   mismatch on Laura's profile vs CV). For the demo, free text is fine.
   For Phase 1 RAG, role descriptions in pgvector would benefit from a
   canonical list. Stay free text now?

**3. CV upload during the demo — what does "real parsing" produce?**
   When a juror uploads a PDF, do we want to also store the parsed
   `formal_evaluation` synchronously, or just persist the CV row and
   kick off the analysis pipeline async? Either works with this schema;
   it changes how `analyses` rows get created (eagerly on CV upload vs.
   on explicit "Analyze" action).

**4. Conversation labels.** Are labels:
   - (a) auto-generated from the first user message (LLM summary call)?
   - (b) manually entered by the user?
   - (c) hard-coded for seeded conversations and absent for new ones?

   Affects whether `label` is `NOT NULL`.

**5. `recent_activity` and `next_actions`** from the mock `Profile` —
   I've **left these out**. Activity can be reconstructed from the
   timestamps on `cvs`, `analyses`, `mentor_messages` (a view, if we
   want). Next actions feel like a UI affordance derived from the
   latest `learning_path`. Confirm this is the right call, or should I
   add explicit tables for either?

**6. Score history.** The dashboard shows `scoreHistory` as a line
   chart across CV versions. With one analysis per CV, this is just
   `SELECT version, formal_evaluation->'overallScore' FROM cvs JOIN
   analyses ... ORDER BY version`. No dedicated table needed —
   confirm?

---

## Out of scope (Phase 1)

For the record, when we get there:
- `document_chunks (id, source_type, source_id, content, embedding vector(1536), metadata jsonb)` for the ESCO taxonomy + synthetic job ads corpus.
- `pgvector` extension + IVFFlat/HNSW index on `embedding`.
- A `retrieval_log` table is *not* needed for the demo.
