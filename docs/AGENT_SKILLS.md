# Agent Skills — What the AI Can Do For This Project

This is a human-readable index of the skills installed for the AI agent working on PalmCare AI.
"Skills" are specialized playbooks the agent loads on demand to do a job the right way
(e.g. run an SEO audit, write a Word doc, debug systematically).

- **Global skills** live in `~/.agents/skills/` and apply to every project.
- **Cursor built-in skills** ship with Cursor and cover Cursor-specific workflows.
- **Project skills** live in `.cursor/skills/` inside this repo.

Last updated: 2026-06-23.

---

## Marketing (full set from coreyhaines31/marketingskills)

The complete marketing skill library is installed (45 skills). Reach for them by job:

**SEO & discovery**
| Skill | What it does | Used here |
|---|---|---|
| `seo-audit` | Technical + on-page + content SEO audits | Audited the marketing site |
| `ai-seo` | AEO/GEO/LLMO — get cited by ChatGPT/Perplexity/AI Overviews | `pricing.md`, landing answer block, comparison table |
| `schema` | Structured data (Article, FAQ, Product, Breadcrumb) | Fixed homepage Offer pricing; blog schema |
| `programmatic-seo` | SEO pages at scale from templates + data | Available for state/location pages |
| `site-architecture` | Page hierarchy, nav, URL structure, internal linking | Internal links on landing |
| `competitors` | Comparison / "vs" / alternative pages | Comparison blog post + table |

**Conversion & content**
| Skill | What it does |
|---|---|
| `cro` | Conversion optimization for any page/form |
| `copywriting` / `copy-editing` | Write / polish marketing copy |
| `content-strategy` | Decide what to write; topic clusters |
| `customer-research` | Synthesize voice-of-customer for copy |
| `offers` / `pricing` | Offer construction; pricing & packaging |
| `popups` / `signup` / `onboarding` / `paywalls` | Conversion moments across the funnel |

**Growth, retention & distribution**
`marketing-ideas`, `marketing-plan`, `marketing-psychology`, `launch`, `ads`, `ad-creative`,
`social`, `emails`, `cold-email`, `sms`, `referrals`, `churn-prevention`, `free-tools`,
`lead-magnets`, `co-marketing`, `community-marketing`, `public-relations`, `directory-submissions`,
`analytics`, `ab-testing`, `aso`, `revops`, `sales-enablement`, `prospecting`, `competitor-profiling`,
`product-marketing`, `image`, `video`.

**AEO rule of thumb (from `ai-seo` + Google's 2026 guidance):** AI Overviews use the *same quality
signals as normal SEO*. Don't write separate "AI content" or chunk pages into bait (risks scaled-content
spam). Do: lead sections with a 40–60 word answer, cite real stats/sources, keep content fresh, use
comparison tables (≈33% of AI citations), keep AI bots unblocked, and ship machine-readable files
(`llms.txt`, `pricing.md`) for non-Google engines and buying agents.

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
