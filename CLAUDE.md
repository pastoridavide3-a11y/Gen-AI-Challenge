# Evolution Partner

NTT Data hackathon prototype. Runs locally on the developer's laptop during
the pitch, with a pre-recorded video backup.

---

## What the app does

A web platform that uses LLMs to help university students navigate their
career: CV analysis, gap analysis against a target role, personalized
learning path, and a long-term conversational mentor.

---

## How the demo works

- **No authentication.** A dropdown at the top switches between 3-4
  pre-seeded mock profiles.
- Each profile has its own data: some have 1 uploaded CV, others 2-3
  versions; each has its own survey, analysis, and mentor chat history.
- Switching profiles instantly updates all pages.
- The user (or a juror trying it out) can **upload a new CV** under the
  active profile: parsing and analysis are real.
- All LLM calls are real (OpenAI). Mock profiles' analyses are
  pre-computed and seeded, so profile switching is instant.

---

## The 4 screens

1. **Dashboard** — the user's home. Career score, breakdown by dimension,
   score evolution across CV versions, top 3 strengths + top 3 gaps, next
   suggested actions, recent activity timeline.

2. **My CVs** — list of uploaded CVs for the active profile. Clicking a CV
   opens the detail view: formal evaluation, match with target role, parsed
   CV data (editable). Option to compare two versions in a diff view.

3. **Profile** — survey data in collapsible accordion sections: education,
   industry interests, career goals, constraints, preferences. Inline
   editable.

4. **Mentor** — conversational chatbot. Sidebar with bookmarked moments and
   recent chats grouped by date. Main thread with user/mentor messages.
   Input at the bottom. The mentor opens proactively with a message that
   references the specific profile.

Persistent left sidebar navigates between the 4 screens. Top bar: logo +
profile dropdown. Bottom of sidebar: active profile's career score as a
persistent visual anchor.

---

## CV parsing (real, not simulated)

Two consecutive phases:

1. **Text extraction** — local library (e.g. `pdf-parse` in Node) reads the
   PDF and returns a raw string. Fast, free, deterministic. Scanned CVs or
   complex layouts need a fallback (multimodal LLM, e.g. GPT-4o vision).

2. **Structuring** — GPT-4.1 call with structured outputs: takes the raw
   text and returns a typed JSON (personal info, experiences, education,
   skills, etc).

The exact JSON schema is not defined yet — to be decided together with the
DB schema.

---

## Mock profiles

3-4 curated personas, each with realistic and distinct data:
- Different universities, different years
- Different target roles (ideas: Data Analyst, Consulting, Digital
  Marketing, Product Manager — to be finalized)
- One persona with 3 CV versions, others with 1
- Different survey answers
- Pre-populated mentor chat histories, plausible and consistent with each
  profile

All content is in Italian and should feel real — a reviewer scrolling
through should think "yes, this is what students actually deal with."

---

## Stack

- **Next.js 14** (App Router) + TypeScript — single repo for frontend and
  API routes
- **Tailwind + shadcn/ui + lucide-react + recharts**
- **Supabase** (Postgres) for data persistence
- **OpenAI**: GPT-4.1 for pipeline + parsing, GPT-4.1-mini for mentor chat
- **pgvector + LangChain** (Phase 1, optional — see `docs/architecture.md`)

Single developer, one week. No separate FastAPI service: one repo, one
`pnpm dev`, no CORS, no separate deploys. Supabase gives managed Postgres +
file storage + pgvector ready for Phase 1, EU region.

---

## What NOT to build

- Authentication of any kind
- Any cloud file storage other than Supabase Storage
- Any vector DB other than Supabase pgvector
- Any feature from the future roadmap (v1/v2/v3) — those are for the pitch
  narrative, not the codebase

If a task seems to push beyond these boundaries, **ask before building**.

---

## Further reading

- `docs/architecture.md` — Phase 0 (LLM-only) vs Phase 1 (RAG), and how
  the code is structured so the transition is painless
- `docs/llm-pipeline.md` — the 3 LLM analysis calls + how the mentor works

DB and JSON schemas are not defined in any document yet — that's the next
thing to decide with the developer.

---

## Working in this repo

### Commands

- `pnpm dev` — Next.js dev server
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — ESLint over the repo
- No test script is defined.

Package manager is **pnpm** (lockfile + `pnpm-workspace.yaml` present).
The workspace file only sets `allowBuilds: sharp: true` — this is a
single-package repo, not a monorepo.

### Current scaffold vs. target

The spec above describes the destination. The code today is the starting
line: **UI-only, hard-coded mock data, no backend wiring**.

- `lib/mock-data.ts` (~34KB) holds all 3-4 profiles inline, with every
  field the screens need (CVs, evaluations, survey, mentor history,
  activity).
- `lib/profile-context.tsx` is the React context that swaps the active
  profile — this is where the "profile dropdown" plumbing lives.
- **Not yet present**: no Supabase client, no OpenAI calls, no `app/api`
  routes, no `lib/db` or `lib/llm`. When you add them, do so behind the
  `gatherContext(...)` abstraction described in `docs/architecture.md`.

### Where the 4 screens live

Routing is trivial — each `app/<route>/page.tsx` renders a single component:

- `app/page.tsx` → `components/dashboard.tsx`
- `app/cvs/page.tsx` → `components/cvs-page.tsx`
- `app/mentor/page.tsx` → `components/mentor-page.tsx`
- `app/profile/page.tsx` → `components/profile-page.tsx`

The screen components are the real surface area; the route files are
one-liners.

### Layout shell

`components/app-shell.tsx` wraps everything in `<ProfileProvider>` plus a
fixed `Sidebar` (left, `w-64`) and `Header` (top). All pages render inside
`<main className="ml-64 pt-16">`. The sidebar's bottom slot is meant for
the persistent career-score anchor (see screen spec above).

### UI conventions

- **shadcn/ui** (`new-york` style, `neutral` base) in `components/ui/`.
  Most Radix primitives are already wired up.
- `@/*` path alias → repo root (see `tsconfig.json`).
- Icons: `lucide-react`. Charts: `recharts`. Toasts: `sonner`.
- **Tailwind v4** via `@tailwindcss/postcss` — config lives in
  `app/globals.css`, not a `tailwind.config.*` file.
- React 19, Next.js 16 (App Router), TypeScript strict mode.

### Other

- `.mcp.json` is present but untracked (per `git status`).
