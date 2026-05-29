# Navis

NTT Data hackathon prototype — a web platform that uses LLMs to help
university students navigate their career (CV analysis, gap analysis,
learning path, conversational mentor). Next.js 16 + TypeScript, runs
locally.

## Prerequisites

- **Node.js 20+** — download the LTS installer from
  [nodejs.org](https://nodejs.org). This also installs `npm` (used in the
  next step). Check it worked with `node -v`.
- **pnpm** — this project uses pnpm (it ships a `pnpm-lock.yaml`). Once
  Node is installed, get pnpm with:
  ```bash
  npm install -g pnpm
  ```
- **Git** — needed to download the project (see below). Check with
  `git -v`; if missing, get it from [git-scm.com](https://git-scm.com).

## Get the project

Open a terminal, move into the folder where you want the project to live,
then clone the repo from GitHub:

```bash
cd path/to/your/folder
git clone <github-repo-url>
cd <project-folder>
```

`git clone` creates a new subfolder with all the code. The `<project-folder>`
is the one it just created — `cd` into it before running the commands below.

## Setup

```bash
pnpm install
```

### Environment variables

The app needs secret keys that are **not** in the repo: `.env.local` is
git-ignored and never pushed. **Ask the project owner for the keys** before
running, then create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=<ask owner>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask owner>
GROQ_API_KEY=<ask owner>
```

Without these, the Supabase connection and all LLM features won't work.

## Run

```bash
pnpm dev
```

Open http://localhost:3000.

Other commands: `pnpm build` (production build), `pnpm start` (serve the
build).
