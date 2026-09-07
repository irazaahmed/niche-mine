-- NicheMine initial schema
-- Tables per CLAUDE.md section 4, RLS per section 3/6/7 (users see only
-- their own research; admins see everything).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- users (extends auth.users)
-- ---------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  plan text not null default 'free',
  status text not null default 'active' check (status in ('active', 'blocked')),
  ai_calls_count int not null default 0,
  ai_calls_limit int not null default 50,
  last_reset_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- niches
-- ---------------------------------------------------------------------
create table public.niches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  country text not null,
  status text not null default 'researching' check (status in ('researching', 'finalized', 'rejected')),
  created_at timestamptz not null default now()
);

create index niches_user_id_idx on public.niches (user_id);

-- ---------------------------------------------------------------------
-- seed_keyword_batches
-- ---------------------------------------------------------------------
create table public.seed_keyword_batches (
  id uuid primary key default gen_random_uuid(),
  niche_id uuid not null references public.niches (id) on delete cascade,
  ai_prompt_used text,
  filters_applied jsonb,
  csv_file_url text,
  parsed_data jsonb,
  created_at timestamptz not null default now()
);

create index seed_keyword_batches_niche_id_idx on public.seed_keyword_batches (niche_id);

-- ---------------------------------------------------------------------
-- selected_keywords
-- ---------------------------------------------------------------------
create table public.selected_keywords (
  id uuid primary key default gen_random_uuid(),
  seed_batch_id uuid not null references public.seed_keyword_batches (id) on delete cascade,
  keyword text not null,
  volume int,
  created_at timestamptz not null default now()
);

create index selected_keywords_seed_batch_id_idx on public.selected_keywords (seed_batch_id);

-- ---------------------------------------------------------------------
-- competitor_sites
-- ---------------------------------------------------------------------
create table public.competitor_sites (
  id uuid primary key default gen_random_uuid(),
  selected_keyword_id uuid not null references public.selected_keywords (id) on delete cascade,
  url text not null,
  dr int,
  created_at timestamptz not null default now()
);

create index competitor_sites_selected_keyword_id_idx on public.competitor_sites (selected_keyword_id);

-- ---------------------------------------------------------------------
-- reverse_engineered_data
-- ---------------------------------------------------------------------
create table public.reverse_engineered_data (
  id uuid primary key default gen_random_uuid(),
  competitor_site_id uuid not null references public.competitor_sites (id) on delete cascade,
  organic_traffic int,
  paid_traffic int,
  top_keywords jsonb,
  ai_analysis text,
  created_at timestamptz not null default now()
);

create index reverse_engineered_data_competitor_site_id_idx on public.reverse_engineered_data (competitor_site_id);

-- ---------------------------------------------------------------------
-- final_shortlist
-- ---------------------------------------------------------------------
create table public.final_shortlist (
  id uuid primary key default gen_random_uuid(),
  niche_id uuid not null references public.niches (id) on delete cascade,
  summary text,
  score numeric,
  created_at timestamptz not null default now()
);

create index final_shortlist_niche_id_idx on public.final_shortlist (niche_id);

-- ---------------------------------------------------------------------
-- activity_log
-- ---------------------------------------------------------------------
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_user_id_idx on public.activity_log (user_id);
create index activity_log_created_at_idx on public.activity_log (created_at);

-- ---------------------------------------------------------------------
-- auth.users -> public.users sync
-- ---------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- is_admin() helper — SECURITY DEFINER so RLS policies that call it don't
-- recursively re-evaluate users' own RLS (which only allows selecting your
-- own row) when checking whether *someone else* is an admin.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.niches enable row level security;
alter table public.seed_keyword_batches enable row level security;
alter table public.selected_keywords enable row level security;
alter table public.competitor_sites enable row level security;
alter table public.reverse_engineered_data enable row level security;
alter table public.final_shortlist enable row level security;
alter table public.activity_log enable row level security;

-- users: readable by self or admin. All writes (role/plan/limit changes,
-- signup row creation) go through the service-role client server-side, so
-- there are no INSERT/UPDATE policies for the authenticated role — that
-- also closes off privilege escalation via a self-update to role='admin'.
create policy "users select own or admin" on public.users
  for select using (id = auth.uid() or public.is_admin());

-- niches: fully owned by the researching user.
create policy "niches select own or admin" on public.niches
  for select using (user_id = auth.uid() or public.is_admin());
create policy "niches insert own" on public.niches
  for insert with check (user_id = auth.uid());
create policy "niches update own or admin" on public.niches
  for update using (user_id = auth.uid() or public.is_admin());
create policy "niches delete own or admin" on public.niches
  for delete using (user_id = auth.uid() or public.is_admin());

-- seed_keyword_batches: ownership via parent niche.
create policy "seed_keyword_batches select own or admin" on public.seed_keyword_batches
  for select using (
    exists (select 1 from public.niches n where n.id = niche_id and (n.user_id = auth.uid() or public.is_admin()))
  );
create policy "seed_keyword_batches insert own" on public.seed_keyword_batches
  for insert with check (
    exists (select 1 from public.niches n where n.id = niche_id and n.user_id = auth.uid())
  );
create policy "seed_keyword_batches update own or admin" on public.seed_keyword_batches
  for update using (
    exists (select 1 from public.niches n where n.id = niche_id and (n.user_id = auth.uid() or public.is_admin()))
  );
create policy "seed_keyword_batches delete own or admin" on public.seed_keyword_batches
  for delete using (
    exists (select 1 from public.niches n where n.id = niche_id and (n.user_id = auth.uid() or public.is_admin()))
  );

-- selected_keywords: ownership via seed_keyword_batches -> niches.
create policy "selected_keywords select own or admin" on public.selected_keywords
  for select using (
    exists (
      select 1 from public.seed_keyword_batches b join public.niches n on n.id = b.niche_id
      where b.id = seed_batch_id and (n.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "selected_keywords insert own" on public.selected_keywords
  for insert with check (
    exists (
      select 1 from public.seed_keyword_batches b join public.niches n on n.id = b.niche_id
      where b.id = seed_batch_id and n.user_id = auth.uid()
    )
  );
create policy "selected_keywords update own or admin" on public.selected_keywords
  for update using (
    exists (
      select 1 from public.seed_keyword_batches b join public.niches n on n.id = b.niche_id
      where b.id = seed_batch_id and (n.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "selected_keywords delete own or admin" on public.selected_keywords
  for delete using (
    exists (
      select 1 from public.seed_keyword_batches b join public.niches n on n.id = b.niche_id
      where b.id = seed_batch_id and (n.user_id = auth.uid() or public.is_admin())
    )
  );

-- competitor_sites: ownership via selected_keywords -> seed_keyword_batches -> niches.
create policy "competitor_sites select own or admin" on public.competitor_sites
  for select using (
    exists (
      select 1 from public.selected_keywords k
        join public.seed_keyword_batches b on b.id = k.seed_batch_id
        join public.niches n on n.id = b.niche_id
      where k.id = selected_keyword_id and (n.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "competitor_sites insert own" on public.competitor_sites
  for insert with check (
    exists (
      select 1 from public.selected_keywords k
        join public.seed_keyword_batches b on b.id = k.seed_batch_id
        join public.niches n on n.id = b.niche_id
      where k.id = selected_keyword_id and n.user_id = auth.uid()
    )
  );
create policy "competitor_sites update own or admin" on public.competitor_sites
  for update using (
    exists (
      select 1 from public.selected_keywords k
        join public.seed_keyword_batches b on b.id = k.seed_batch_id
        join public.niches n on n.id = b.niche_id
      where k.id = selected_keyword_id and (n.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "competitor_sites delete own or admin" on public.competitor_sites
  for delete using (
    exists (
      select 1 from public.selected_keywords k
        join public.seed_keyword_batches b on b.id = k.seed_batch_id
        join public.niches n on n.id = b.niche_id
      where k.id = selected_keyword_id and (n.user_id = auth.uid() or public.is_admin())
    )
  );

-- reverse_engineered_data: ownership via competitor_sites -> ... -> niches.
create policy "reverse_engineered_data select own or admin" on public.reverse_engineered_data
  for select using (
    exists (
      select 1 from public.competitor_sites c
        join public.selected_keywords k on k.id = c.selected_keyword_id
        join public.seed_keyword_batches b on b.id = k.seed_batch_id
        join public.niches n on n.id = b.niche_id
      where c.id = competitor_site_id and (n.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "reverse_engineered_data insert own" on public.reverse_engineered_data
  for insert with check (
    exists (
      select 1 from public.competitor_sites c
        join public.selected_keywords k on k.id = c.selected_keyword_id
        join public.seed_keyword_batches b on b.id = k.seed_batch_id
        join public.niches n on n.id = b.niche_id
      where c.id = competitor_site_id and n.user_id = auth.uid()
    )
  );
create policy "reverse_engineered_data update own or admin" on public.reverse_engineered_data
  for update using (
    exists (
      select 1 from public.competitor_sites c
        join public.selected_keywords k on k.id = c.selected_keyword_id
        join public.seed_keyword_batches b on b.id = k.seed_batch_id
        join public.niches n on n.id = b.niche_id
      where c.id = competitor_site_id and (n.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "reverse_engineered_data delete own or admin" on public.reverse_engineered_data
  for delete using (
    exists (
      select 1 from public.competitor_sites c
        join public.selected_keywords k on k.id = c.selected_keyword_id
        join public.seed_keyword_batches b on b.id = k.seed_batch_id
        join public.niches n on n.id = b.niche_id
      where c.id = competitor_site_id and (n.user_id = auth.uid() or public.is_admin())
    )
  );

-- final_shortlist: ownership via parent niche.
create policy "final_shortlist select own or admin" on public.final_shortlist
  for select using (
    exists (select 1 from public.niches n where n.id = niche_id and (n.user_id = auth.uid() or public.is_admin()))
  );
create policy "final_shortlist insert own" on public.final_shortlist
  for insert with check (
    exists (select 1 from public.niches n where n.id = niche_id and n.user_id = auth.uid())
  );
create policy "final_shortlist update own or admin" on public.final_shortlist
  for update using (
    exists (select 1 from public.niches n where n.id = niche_id and (n.user_id = auth.uid() or public.is_admin()))
  );

-- activity_log: readable by self or admin. Writes go through the
-- service-role client server-side only (so a client can't forge log
-- entries or inflate/spoof another user's activity history).
create policy "activity_log select own or admin" on public.activity_log
  for select using (user_id = auth.uid() or public.is_admin());
