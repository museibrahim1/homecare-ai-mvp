# Agent Skills — What the AI Can Do For This Project

This is a human-readable index of the skills installed for the AI agent working on PalmCare AI.
"Skills" are specialized playbooks the agent loads on demand to do a job the right way
(e.g. run an SEO audit, write a Word doc, debug systematically).

- **Global skills** live in `~/.agents/skills/` and apply to every project.
- **Cursor built-in skills** ship with Cursor and cover Cursor-specific workflows.
- **Project skills** live in `.cursor/skills/` inside this repo.

Last updated: 2026-06-23.

---

## Marketing, SEO & AEO

Use these to grow organic traffic and get cited by AI answer engines (ChatGPT, Perplexity, Google AI Overviews).

| Skill | What it does | Where it's been used here |
|---|---|---|
| `seo-audit` | Technical + on-page + content SEO audits; crawlability, metadata, schema, E-E-A-T | Audited the marketing site; drove the content + schema improvements below |
| `programmatic-seo` | Build SEO pages at scale from templates + data (location/comparison/use-case pages) | Available for future location/state pages |
| `copywriting` | Write/rewrite marketing copy for landing, pricing, feature, about pages | Brand-voice-aligned blog posts |
| `content-strategy` | Decide what to write; topic clusters; editorial planning | Picked the 3 new high-intent blog topics |
| `marketing-psychology` | Persuasion, mental models, behavioral science applied to copy/UX | Available for CRO + landing-page work |
| `marketing-ideas` | Growth/marketing strategies for SaaS | Campaign + channel ideation |

**AEO note (from Google's 2026 AEO/GEO guidance):** Don't over-engineer AI-specific schema or rely on `llms.txt`
for Google — AI Overviews use the *same quality signals as normal SEO*. The win is genuinely helpful,
question-targeted content + solid fundamentals. (`llms.txt` is still added here for non-Google engines.)

## Engineering Rigor (the "do it properly" skills)

| Skill | When the agent uses it |
|---|---|
| `brainstorming` | Before any creative/build work — clarify intent + requirements first |
| `writing-plans` | Turn a spec into a step-by-step plan before touching code |
| `test-driven-development` | Write tests before implementation for features/bugfixes |
| `systematic-debugging` | Any bug/test failure/unexpected behavior, before proposing fixes |
| `diagnosing-bugs` | Diagnosis loop for hard bugs + performance regressions |
| `verification-before-completion` | Before claiming "done" — run verification + confirm output |
| `improve-codebase-architecture` | Scan for architecture-deepening opportunities |

## Web / React / Next.js / Vercel

| Skill | When the agent uses it |
|---|---|
| `vercel-react-best-practices` | Writing/reviewing/refactoring React + Next.js for performance |
| `vercel-composition-patterns` | Component composition patterns |
| `vercel-optimize` | Vercel cost + performance optimization on deployed apps |
| `web-design-guidelines` | Review UI code for accessibility + web interface guidelines |
| `webapp-testing` | Playwright-based testing/debugging of local web apps |

## Backend & Database

| Skill | When the agent uses it |
|---|---|
| `supabase-postgres-best-practices` | Writing/reviewing/optimizing Postgres queries, schema, config |
| `claude-api` | Building against the Anthropic Claude API |

## Documents (generate real files)

| Skill | Produces |
|---|---|
| `docx` | Word documents (e.g. the kickoff PRD/TRD docs in `docs/kickoff/`) |
| `pdf` | Read/merge/split/watermark PDFs |
| `pptx` | PowerPoint decks / pitch decks |
| `xlsx` | Excel/CSV spreadsheets — read, edit, compute |

---

## Cursor Built-in Skills

These cover Cursor-specific workflows (available in this IDE session):

- `automate` — create Cursor Automations
- `babysit` — keep a PR merge-ready (triage comments, fix CI, resolve conflicts)
- `canvas` — live React canvas for analytical artifacts/dashboards
- `create-hook` / `create-rule` / `create-skill` — author Cursor hooks, rules, skills
- `loop` — run a prompt/skill on a recurring interval
- `review-bugbot` — review local changes with the Bugbot subagent
- `review-security` — review local changes with the Security Review subagent
- `sdk` — build on the Cursor SDK (TypeScript/Python)
- `split-to-prs` — split work into small reviewable PRs
- `statusline` / `update-cursor-settings` — CLI status line + editor settings

## Project Skill (this repo)

- `kling-remotion-nano-banana` — plan + execute AI marketing videos (Kling 3.0 via fal.ai, Remotion, Nano Banana assets)

---

## How to add more skills

Skills come from the [skills.sh](https://www.skills.sh) registry (and GitHub repos). Install globally with:

```bash
npx skills add <owner>/<repo> -g --copy -y -s <skill-name> -s <another-skill>
```

Marketing skills used here are from `coreyhaines31/marketingskills`. Engineering/web/docs skills are from
`anthropics`, `vercel-labs`, `supabase`, `obra`, and `mattpocock`.
