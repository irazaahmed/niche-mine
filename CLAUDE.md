# NicheMine

**Product of Cybrum Solutions**

This is a Cybrum Solutions product, so it must follow Cybrum Solutions' brand and UI theme (colors, typography, layout patterns, component style). Reference folders for the Cybrum Solutions brand and an existing Cybrum Solutions product (chatbot) will be provided separately — study those first to match the theme before building any UI.

Deployment target: Vercel initially, portable to a VPS later (no code should hardcode any specific domain — use an env var for the app URL).

## 1. What This Tool Does

NicheMine is a structured workflow tool that helps a user find low-competition, high-volume, profitable niches using Ahrefs (manual, human-driven research) combined with AI (OpenAI API) for prompt generation, analysis, and next-step suggestions.

The tool does **not** automate Ahrefs itself (no scraping, no Ahrefs API — too expensive). The human does the Ahrefs work manually. NicheMine's job is to:
- Structure the workflow into clear steps
- Store all data at every step (seed keywords, selected keyword, competitors, reverse-engineered data)
- Use AI to generate seed keyword prompts, analyze data, and suggest next steps
- Auto-build a final shortlist of validated niches
- Track usage per user and give admin full visibility and control

## 2. Tech Stack

- **Framework:** Next.js (App Router, latest stable version)
- **Auth:** Supabase Auth — email/password + Google OAuth
- **Database:** Supabase (Postgres), cloud-hosted (not self-hosted on VPS)
  - Use 2 separate Supabase projects: `nichemine-dev` and `nichemine-prod`
  - Local dev connects to `nichemine-dev` via `.env.local`
- **File storage:** Supabase Storage (for uploaded CSV files) — not Vercel Blob, to stay hosting-independent
- **AI:** OpenAI API
  - `gpt-4o-mini` for lightweight tasks (seed keyword prompt generation, quick suggestions)
  - Larger model (`gpt-4o` or current equivalent) only for final niche scoring/analysis
- **CSV parsing:** Reuse the existing sheet parser tool. User will provide the folder path/link for this codebase — read and adapt it, do not rebuild from scratch.
- **Deployment:** Vercel (initial), designed to be portable to a VPS later with no code changes beyond env vars (avoid any Vercel-specific services like Vercel KV/Blob).

## 3. User Roles

- **user** — normal account, does niche research
- **admin** — full visibility and control (see Section 6)

Every user row must have a `role` field (`user` | `admin`), a `plan`/`subscription_status` field (default `free` for now, structure ready for future paid tiers), and usage-tracking fields (see Section 5).

## 4. Database Schema (Supabase / Postgres)

### `users` (extends Supabase auth.users)
| field | type | notes |
|---|---|---|
| id | uuid | FK to auth.users |
| email | text | |
| role | text | `user` \| `admin`, default `user` |
| plan | text | `free` \| future paid tiers |
| status | text | `active` \| `blocked` |
| ai_calls_count | int | resets on `last_reset_date` |
| ai_calls_limit | int | daily or monthly cap, admin-configurable |
| last_reset_date | date | for usage limit reset |
| created_at | timestamp | |

### `niches`
| field | type | notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK |
| country | text | target country selected in Ahrefs |
| status | text | `researching` \| `finalized` \| `rejected` |
| created_at | timestamp | |

### `seed_keyword_batches`
| field | type | notes |
|---|---|---|
| id | uuid | |
| niche_id | uuid | FK |
| ai_prompt_used | text | the prompt AI generated/used to produce seed words |
| filters_applied | jsonb | e.g. `{dr_top10_max: 20, min_volume: 10000, include_text: "AI"}` |
| csv_file_url | text | Supabase Storage link to uploaded export |
| parsed_data | jsonb | parsed CSV rows |
| created_at | timestamp | |

### `selected_keywords`
| field | type | notes |
|---|---|---|
| id | uuid | |
| seed_batch_id | uuid | FK |
| keyword | text | the one keyword user picked to pursue |
| volume | int | user-entered, from Google/Ahrefs |
| created_at | timestamp | |

### `competitor_sites`
| field | type | notes |
|---|---|---|
| id | uuid | |
| selected_keyword_id | uuid | FK |
| url | text | SERP result link (lowest DR sites, 1–3 per keyword) |
| dr | int | |
| created_at | timestamp | |

### `reverse_engineered_data`
| field | type | notes |
|---|---|---|
| id | uuid | |
| competitor_site_id | uuid | FK |
| organic_traffic | int | |
| paid_traffic | int | |
| top_keywords | jsonb | list of `{keyword, volume}` driving traffic |
| ai_analysis | text | AI's read on whether this is a good lead |
| created_at | timestamp | |

### `final_shortlist`
| field | type | notes |
|---|---|---|
| id | uuid | |
| niche_id | uuid | FK |
| summary | text | AI-generated final niche summary |
| score | numeric | AI-assigned confidence/quality score |
| created_at | timestamp | |

### `activity_log`
| field | type | notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK |
| action | text | e.g. `"uploaded_csv"`, `"selected_keyword"`, `"ai_call"`, `"login"` |
| metadata | jsonb | contextual details |
| created_at | timestamp | |

## 5. AI Usage & Cost Control

- Every AI call must be logged in `activity_log` with token count if available, and increment `users.ai_calls_count`.
- Before any AI call, check `ai_calls_count` against `ai_calls_limit`. If exceeded, block the call and show a clear message in the UI ("Daily AI limit reached, resets at [time]").
- Admin can configure `ai_calls_limit` per user or globally.
- Default model: `gpt-4o-mini` for all suggestion/prompt-generation calls. Only use a larger model for final shortlist scoring, and only on explicit user action (e.g. "Finalize this niche" button), not automatically.

## 6. Core User Workflow (must match exactly)

1. User logs in (Supabase Auth: email/password or Google).
2. Dashboard shown — list of user's niches (researching/finalized/rejected), + "Start New Niche Research" button.
3. User selects a country → creates a new `niches` row.
4. User asks NicheMine's AI to generate a seed-keyword-hunting prompt for use in Ahrefs Keywords Explorer (based on user's rough idea, e.g. "AI [Keyword]"). AI returns a short prompt as per the format the user already uses.
5. User manually runs this in Ahrefs/ChatGPT, applies filters manually in Ahrefs (DR top 10, min volume, include text), exports CSV.
6. User uploads CSV into NicheMine → parsed via the reused sheet parser → shown as an interactive table (`seed_keyword_batches`).
7. AI (or user) picks/suggests the most promising keyword from the table.
8. User manually googles that keyword, notes down actual Volume → enters it into NicheMine (`selected_keywords`).
9. User manually finds the lowest-DR site(s) in that keyword's SERP (1–3 sites) → pastes their links into NicheMine (`competitor_sites`).
10. For each site, user manually checks in Ahrefs: DR, organic traffic, paid traffic, top ranking keywords, and those keywords' actual volume → enters this into NicheMine (`reverse_engineered_data`).
11. AI analyzes this reverse-engineered data and gives a recommendation: is this niche worth pursuing, and why.
12. If the niche passes, it's auto-added to `final_shortlist` with an AI-generated summary and score.
13. All of this is tracked per niche, so a user can leave and resume research at any step.

## 7. Admin Panel (full control)

- List of all users: email, role, plan, status, signup date, last active
- Block / unblock / delete any user
- Per-user activity log (full detail, from `activity_log`)
- Per-user AI usage stats (calls made, tokens used, cost estimate)
- Global dashboard: total users, total niches researched, total niches finalized, total AI cost this month
- Ability to change any user's `ai_calls_limit` and `plan`

## 8. Non-Goals (do not build these)

- No Ahrefs API integration or scraping — everything Ahrefs-related stays manual/human-driven
- No automatic SERP scraping
- No payment/subscription billing logic yet — just the `plan`/`status` fields ready for it later
- No multi-language UI for now — English only

## 9. Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## 10. Reused Code & Brand Reference

- **CSV/sheet parser:** The user has an existing CSV/sheet parser tool. Its folder will be linked separately in the prompt to Claude Code — read and adapt its logic for CSV upload/parsing in Step 6 rather than rebuilding it from scratch.
- **Brand/theme reference:** Folders for the Cybrum Solutions brand assets and the existing Cybrum Solutions chatbot product will also be linked separately. Read these to understand the color palette, typography, layout style, and component patterns, and apply the same theme consistently across NicheMine's UI — this is not a from-scratch design, it must feel like the same product family.
