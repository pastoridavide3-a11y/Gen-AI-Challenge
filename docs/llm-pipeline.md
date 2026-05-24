# LLM Pipeline

Read `CLAUDE.md` and `docs/architecture.md` first.

Exact JSON schemas for inputs and outputs are not defined here — to be
decided when writing the code and the DB schema.

---

## Call 1 — Formal CV evaluation

**What it does**: evaluates the CV on its own merits, independent of any
target role. Cleanliness, completeness, writing quality, presence of
quantitative metrics, use of action verbs.

**Input**: structured CV + a static evaluation rubric (criteria file in
the repo).

**Uses retrieval?** No, not in Phase 0 or Phase 1. The rubric is enough.

**Output**: scores per rubric dimension, list of strengths, actionable
improvement suggestions. Exact shape TBD.

---

## Call 2 — Gap analysis vs target role

**What it does**: compares the CV against the requirements of the target
role. Identifies relevant skills the user already has, missing skills with
priority levels, and experiences that could be better reframed.

**Input**: structured CV + survey + user-selected target role.

**Uses retrieval?**
- Phase 0: no. Knowledge about the target role lives in the system prompt
  as curated static text.
- Phase 1: yes. The backend queries pgvector for role descriptions,
  representative job ads, and CV benchmarks, and adds them to the call's
  context.

**Output**: match score, possessed skills, prioritized gaps, reframing
suggestions. Exact shape TBD.

---

## Call 3 — Learning path generation

**What it does**: translates the identified gaps into a concrete training
path with progressive milestones and specific resources.

**Input**: output of Call 2 (gaps) + survey (available hours, budget,
constraints).

**Uses retrieval?**
- Phase 0: no. The LLM suggests well-known resources (Coursera, edX,
  common certifications) from its internal knowledge.
- Phase 1: yes. The backend queries pgvector for learning resources
  relevant to the high-priority gaps.

**Output**: milestones with objectives, skills addressed, recommended
resources, and a way to verify progress. Exact shape TBD.

---

## Implementation notes (all 3 calls)

- Use OpenAI **structured outputs** (`response_format: json_schema`) to
  guarantee schema-conformant responses. No manual JSON parsing, no retry
  logic for malformed output.
- Model: **GPT-4.1** for all 3 calls.
- Show progressive feedback in the UI: "Step 1/3", "Step 2/3", etc.
  Total pipeline latency is ~20-30s.
- If a call fails: retry once, then return partial results. Never block
  the full UI on one failed call. Each call saves its output independently
  to Postgres.

---

## Mentor chatbot

A conversational chat, but different from a generic chatbot: it knows who
the user is, remembers past conversations, and references specific details
from their CV and goals.

### Two sources of context

1. **Fixed context** (always in the prompt, regardless of the question):
   user profile, structured CV, survey, latest analysis, last N chat turns.

2. **Dynamic retrieval** (Phase 1 only): if the user asks something that
   benefits from external knowledge, the backend queries pgvector and adds
   relevant chunks to that specific turn's context.

In Phase 0 only the first source exists.

### Model

**GPT-4.1-mini.** Excellent quality for chat with rich context, much
cheaper than the full model.

### Prompt caching

The system prompt is long (3-5k tokens: profile + survey + analysis +
guidelines). OpenAI applies automatic caching on prompts ≥1024 tokens —
cached input tokens cost 50% less. To benefit: keep the static portion of
the system prompt at the top and identical across turns; append dynamic
content (retrieved chunks, new user message) at the end.

### Streaming

Use OpenAI streaming + Next.js `ReadableStream`. Token-by-token rendering
on the client. Makes a significant difference to how responsive the demo
feels.

### Required features

- **Proactive opening message**: when the mentor is opened, it starts with
  a pre-seeded message that references the specific profile (e.g. "Hi
  Marco, I noticed a new Data Analyst opening at TIM that matches 6 of
  your 8 skills — want to talk about it?"). One per mock profile.
- **Bookmarks**: users can save individual mentor messages with a short
  label. Stored in the DB, shown in the sidebar.
- **Date grouping** in the sidebar: Today, Yesterday, This week.
