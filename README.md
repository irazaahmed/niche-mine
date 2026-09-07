# NicheMine

A Cybrum Solutions product. A structured workflow tool for finding low-competition, high-volume, profitable niches using Ahrefs (manual research) combined with AI for prompt generation, analysis, and next-step suggestions. See `CLAUDE.md` for the full product spec.

## Stack

- Next.js (App Router) + Tailwind v4
- Supabase (Postgres + Auth + Storage)
- OpenAI API (`gpt-4o-mini` for suggestions, `gpt-4o` for final niche scoring)

## Getting started

1. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from a Supabase project (use `nichemine-dev` for local work)
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)
2. Apply the database schema: run the SQL in `supabase/migrations/0001_init.sql` then `0002_storage.sql` against your Supabase project (via the SQL editor, or `supabase db push` if you have the CLI linked).
3. In the Supabase dashboard, enable the Google OAuth provider under Authentication if you want Google sign-in, and add `${NEXT_PUBLIC_APP_URL}/auth/callback` as a redirect URL.
4. `npm install`
5. `npm run dev` and open [http://localhost:3000](http://localhost:3000)

## Making a user an admin

New signups default to `role = 'user'`. To promote the first admin, run in the Supabase SQL editor:

```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

## Deploy

Deploys to Vercel with the same env vars. No code hardcodes a domain — everything reads `NEXT_PUBLIC_APP_URL` — so it's portable to a VPS later without changes beyond env vars and swapping the Vercel-specific bits (there aren't any: file storage is Supabase Storage, not Vercel Blob).
