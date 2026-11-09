-- ==========================================================
-- DUONEST - POSTGRESQL SCHEMA WITH REALTIME & ROW LEVEL SECURITY
-- ==========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text,
  name text not null default 'Użytkownik',
  avatar_url text,
  avatar_color text default '#0284c7',
  pairing_code text unique not null,
  partnership_id text,
  current_mood text default 'happy',
  mood_note text,
  mood_updated_at timestamptz default now(),
  love_note text default 'Budujemy nasze wspólne gniazdko!',
  favorite_drink text default 'Kawa z mlekiem',
  favorite_treat text default 'Czekolada',
  points integer not null default 0,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration safety for existing deployments
alter table if exists public.profiles add column if not exists points integer not null default 0;
alter table if exists public.profiles add column if not exists is_email_verified boolean default true;
alter table if exists public.profiles add column if not exists last_seen_at timestamptz default now();

-- 2. PARTNERSHIPS TABLE
create table if not exists public.partnerships (
  id text primary key,
  partner1_id text not null,
  partner2_id text not null,
  nest_name text not null default 'Nasze Ciepłe Gniazdko',
  nest_level integer not null default 1,
  anniversary_date text,
  pet_id text default null,
  pet_name text default null,
  pet_xp integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration safety: Drop unused nest_points column (common points are dynamically computed from profiles.points)
alter table if exists public.partnerships drop column if exists nest_points;

-- 3. SHOPPING ITEMS (Realtime Shared Shopping List)
create table if not exists public.shopping_items (
  id text primary key,
  partnership_id text not null,
  title text not null,
  category text not null default 'Spożywcze',
  quantity text,
  is_completed boolean not null default false,
  added_by text,
  completed_by text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- 4. TASKS (Chores & Shared To-Do with gamification)
create table if not exists public.tasks (
  id text primary key,
  partnership_id text not null,
  title text not null,
  description text,
  assigned_to text,
  due_date timestamptz,
  is_recurring boolean not null default false,
  recurrence_interval text default 'none',
  is_completed boolean not null default false,
  points integer not null default 15,
  created_by text,
  completed_by text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- 5. EVENTS (Shared Couple Calendar)
create table if not exists public.events (
  id text primary key,
  partnership_id text not null,
  title text not null,
  description text,
  location text,
  start_time timestamptz not null,
  end_time timestamptz,
  category text not null default 'date',
  is_completed boolean default false,
  is_surprise boolean default false,
  planner_name text,
  created_by text,
  created_at timestamptz default now()
);

-- 6. MOOD LOGS (History of partner moods)
create table if not exists public.mood_logs (
  id text primary key,
  partnership_id text not null,
  user_id text not null,
  mood text not null,
  note text,
  created_at timestamptz default now()
);

-- 7. NUDGES (Codzienne puknięcie / Drobne gesty)
create table if not exists public.nudges (
  id text primary key,
  partnership_id text not null,
  sender_id text not null,
  receiver_id text not null,
  nudge_type text not null,
  message text,
  created_at timestamptz default now()
);

-- 8. MILESTONES (Wspólne cele & Nagrody za punkty)
create table if not exists public.milestones (
  id text primary key,
  partnership_id text not null,
  title text not null,
  description text,
  target_points integer not null default 100,
  assigned_to text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_by text,
  created_at timestamptz default now()
);

-- 9. WISHLIST ITEMS (Wishlista & Pomysły na prezenty)
create table if not exists public.wishlist_items (
  id text primary key,
  partnership_id text not null,
  created_by text not null,
  for_user_id text,
  title text not null,
  url text,
  image_url text,
  price text,
  currency text default 'PLN',
  site_name text,
  note text,
  is_visible_to_partner boolean not null default true,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 10. MOVIES & SERIES (Wspólna lista filmów, seriali i anime z recenzjami)
create table if not exists public.movies (
  id text primary key,
  partnership_id text not null,
  tmdb_id integer,
  title text not null,
  original_title text,
  media_type text not null default 'movie', -- 'movie' | 'tv' | 'anime'
  poster_path text,
  backdrop_path text,
  release_year text,
  genres text[],
  overview text,
  vote_average numeric,
  status text not null default 'planned', -- 'planned' | 'watching' | 'watched'
  target_date text,
  added_by text,
  watched_at timestamptz,
  reviews jsonb default '{}'::jsonb,
  last_watched_season integer default 1,
  last_watched_episode integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.movies add column if not exists last_watched_season integer default 1;
alter table public.movies add column if not exists last_watched_episode integer default 1;

-- ==========================================================
-- INDEXES FOR FAST REALTIME QUERIES
-- ==========================================================
create index if not exists idx_profiles_email on public.profiles(lower(email));
create index if not exists idx_profiles_pairing_code on public.profiles(pairing_code);
create index if not exists idx_profiles_partnership on public.profiles(partnership_id);
create index if not exists idx_shopping_partnership on public.shopping_items(partnership_id);
create index if not exists idx_tasks_partnership on public.tasks(partnership_id);
create index if not exists idx_events_partnership on public.events(partnership_id);
create index if not exists idx_moods_partnership on public.mood_logs(partnership_id);
create index if not exists idx_nudges_partnership on public.nudges(partnership_id);
create index if not exists idx_milestones_partnership on public.milestones(partnership_id);
create index if not exists idx_wishlist_partnership on public.wishlist_items(partnership_id);
create index if not exists idx_movies_partnership on public.movies(partnership_id);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
alter table public.profiles enable row level security;
alter table public.partnerships enable row level security;
alter table public.shopping_items enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.mood_logs enable row level security;
alter table public.nudges enable row level security;
alter table public.milestones enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.movies enable row level security;

-- Fail closed until the auth/RLS migration installs ownership-aware policies.
drop policy if exists "Allow all on profiles" on public.profiles;

drop policy if exists "Allow all on partnerships" on public.partnerships;

drop policy if exists "Allow all on shopping_items" on public.shopping_items;

drop policy if exists "Allow all on tasks" on public.tasks;

drop policy if exists "Allow all on events" on public.events;

drop policy if exists "Allow all on mood_logs" on public.mood_logs;

drop policy if exists "Allow all on nudges" on public.nudges;

drop policy if exists "Allow all on milestones" on public.milestones;

drop policy if exists "Allow all on wishlist_items" on public.wishlist_items;

drop policy if exists "Allow all on movies" on public.movies;

-- ==========================================================
-- ENABLE REALTIME REPLICATION ON ALL TABLES
-- ==========================================================
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.partnerships;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shopping_items;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.events;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.mood_logs;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.nudges;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.milestones;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.wishlist_items;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.movies;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.meals;
exception when others then null;
end $$;

-- ==========================================================
-- 8. PUSH NOTIFICATION SUBSCRIPTIONS (Web Push API)
-- ==========================================================
create table if not exists public.push_subscriptions (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  partnership_id text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_push_user on public.push_subscriptions(user_id);
create index if not exists idx_push_partnership on public.push_subscriptions(partnership_id);

alter table public.push_subscriptions enable row level security;

-- Partnerships Pet Migration
alter table public.partnerships add column if not exists pet_id text default null;
alter table public.partnerships add column if not exists pet_name text default null;
alter table public.partnerships add column if not exists pet_xp integer default 0;
-- Security Hardening: Revoke public anon and authenticated access to push_subscriptions
-- Endpoints and cryptographic keys (p256dh, auth) must only be queried by backend service role
revoke all on table public.push_subscriptions from anon, authenticated;
grant all on table public.push_subscriptions to service_role;
drop policy if exists "Allow all on push_subscriptions" on public.push_subscriptions;
drop policy if exists "Service role only on push_subscriptions" on public.push_subscriptions;
create policy "Service role only on push_subscriptions" on public.push_subscriptions
  for all to service_role using (true) with check (true);

-- ==========================================================
-- 11. MEALS & DINNER PLANNER (Wspólny planer obiadów i posiłków)
-- ==========================================================
create table if not exists public.meals (
  id text primary key,
  partnership_id text not null,
  date text not null, -- 'YYYY-MM-DD'
  day_name text, -- 'Poniedziałek', 'Wtorek', itp.
  title text not null,
  category text,
  area text,
  cook_id text, -- 'me' | 'partner' | 'both' | 'restaurant' | 'takeout' | user_id
  image_url text,
  source text default 'custom', -- 'custom' | 'api'
  api_id text,
  ingredients jsonb default '[]'::jsonb,
  instructions text,
  youtube_url text,
  recipe_url text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_meals_partnership on public.meals(partnership_id);
create index if not exists idx_meals_date on public.meals(date);

alter table public.meals enable row level security;
alter table if exists public.meals alter column date drop not null;
alter table if exists public.meals alter column date set default '';
drop policy if exists "Allow all on meals" on public.meals;
drop policy if exists "Meals fail closed until auth migration" on public.meals;
create policy "Meals fail closed until auth migration" on public.meals for all using (false) with check (false);

create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

drop policy if exists "Service role only on api_rate_limits" on public.api_rate_limits;
create policy "Service role only on api_rate_limits" on public.api_rate_limits
  for all to service_role using (true) with check (true);

create or replace function public.consume_api_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_window timestamptz;
  current_count integer;
begin
  if p_bucket_key is null or length(p_bucket_key) > 160
    or p_limit < 1 or p_limit > 10000
    or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.api_rate_limits as limits (bucket_key, window_started_at, request_count)
  values (p_bucket_key, pg_catalog.statement_timestamp(), 1)
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when limits.window_started_at + pg_catalog.make_interval(secs => p_window_seconds) <= pg_catalog.statement_timestamp()
        then pg_catalog.statement_timestamp()
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at + pg_catalog.make_interval(secs => p_window_seconds) <= pg_catalog.statement_timestamp()
        then 1
      when limits.request_count < p_limit + 1 then limits.request_count + 1
      else p_limit + 1
    end
  returning limits.window_started_at, limits.request_count
  into current_window, current_count;

  if pg_catalog.mod(pg_catalog.hashtext(p_bucket_key)::bigint, 100) = 0 then
    delete from public.api_rate_limits
    where window_started_at < pg_catalog.statement_timestamp() - interval '1 day';
  end if;

  return query
  select
    current_count <= p_limit,
    case
      when pg_catalog.ceil(extract(epoch from (
        current_window + pg_catalog.make_interval(secs => p_window_seconds) - pg_catalog.statement_timestamp()
      )))::integer < 1 then 1
      else pg_catalog.ceil(extract(epoch from (
        current_window + pg_catalog.make_interval(secs => p_window_seconds) - pg_catalog.statement_timestamp()
      )))::integer
    end;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

-- 14. SAVINGS GOALS & CONTRIBUTIONS (Wspólne Skarbonki)
create table if not exists public.savings_goals (
  id text primary key,
  partnership_id text not null references public.partnerships(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  category text not null default 'travel' check (category in ('travel', 'home', 'gadget', 'date', 'emergency', 'other')),
  target_amount numeric(12,2) not null check (target_amount > 0 and target_amount <= 999999999),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  currency text not null default 'PLN' check (currency in ('PLN', 'EUR', 'USD', 'GBP')),
  target_date text check (target_date is null or target_date ~ '^\d{4}-\d{2}-\d{2}$'),
  icon text not null default 'airplane' check (icon in ('airplane', 'home', 'gadget', 'date', 'shield', 'sparkles', 'car', 'gift')),
  color text not null default '#0f172a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_contributions (
  id text primary key,
  goal_id text not null references public.savings_goals(id) on delete cascade,
  partnership_id text not null references public.partnerships(id) on delete cascade,
  user_id text references public.profiles(id) on delete set null,
  amount numeric(12,2) not null check (amount <> 0 and abs(amount) <= 999999999),
  note text check (note is null or length(trim(note)) <= 150),
  created_at timestamptz not null default now()
);

alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;

revoke all on table public.savings_goals from public, anon;
revoke all on table public.savings_contributions from public, anon;

grant select, insert, update, delete on table public.savings_goals to authenticated;
grant select, insert, update, delete on table public.savings_contributions to authenticated;

drop policy if exists "savings_goals_member_select" on public.savings_goals;
create policy "savings_goals_member_select" on public.savings_goals
  for select to authenticated
  using (public.is_partnership_member(partnership_id));

drop policy if exists "savings_goals_member_insert" on public.savings_goals;
create policy "savings_goals_member_insert" on public.savings_goals
  for insert to authenticated
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "savings_goals_member_update" on public.savings_goals;
create policy "savings_goals_member_update" on public.savings_goals
  for update to authenticated
  using (public.is_partnership_member(partnership_id))
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "savings_goals_member_delete" on public.savings_goals;
create policy "savings_goals_member_delete" on public.savings_goals
  for delete to authenticated
  using (public.is_partnership_member(partnership_id));

drop policy if exists "savings_contributions_member_select" on public.savings_contributions;
create policy "savings_contributions_member_select" on public.savings_contributions
  for select to authenticated
  using (public.is_partnership_member(partnership_id));

drop policy if exists "savings_contributions_member_insert" on public.savings_contributions;
create policy "savings_contributions_member_insert" on public.savings_contributions
  for insert to authenticated
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "savings_contributions_member_update" on public.savings_contributions;
create policy "savings_contributions_member_update" on public.savings_contributions
  for update to authenticated
  using (public.is_partnership_member(partnership_id))
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "savings_contributions_member_delete" on public.savings_contributions;
create policy "savings_contributions_member_delete" on public.savings_contributions
  for delete to authenticated
  using (public.is_partnership_member(partnership_id));

-- Server-authoritative recalculation of goal current_amount and completion
create or replace function public.handle_savings_contribution_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_goal_id text;
  calculated_sum numeric(12,2);
  goal_target numeric(12,2);
  was_completed boolean;
  now_completed boolean;
begin
  target_goal_id := coalesce(new.goal_id, old.goal_id);

  select coalesce(sum(amount), 0) into calculated_sum
  from public.savings_contributions
  where goal_id = target_goal_id;

  select target_amount, is_completed into goal_target, was_completed
  from public.savings_goals
  where id = target_goal_id;

  if goal_target is not null then
    now_completed := (calculated_sum >= goal_target and goal_target > 0);

    update public.savings_goals
    set current_amount = greatest(0, calculated_sum),
        is_completed = now_completed,
        completed_at = case
          when now_completed and not coalesce(was_completed, false) then pg_catalog.statement_timestamp()
          when not now_completed then null
          else completed_at
        end,
        updated_at = pg_catalog.statement_timestamp()
    where id = target_goal_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists duonest_savings_contributions_trigger on public.savings_contributions;
create trigger duonest_savings_contributions_trigger
after insert or update or delete on public.savings_contributions
for each row execute function public.handle_savings_contribution_change();

-- Realtime replication
do $$
begin
  alter publication supabase_realtime add table public.savings_goals;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.savings_contributions;
exception when others then null;
end $$;

-- 12. PARTNERSHIP DOODLES (Wspólna Tablica / Karteczka na lodówce)
create table if not exists public.partnership_doodles (
  id text primary key,
  partnership_id text not null references public.partnerships(id) on delete cascade,
  strokes jsonb not null default '[]'::jsonb,
  preview_svg text,
  author_id text references public.profiles(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_doodles_partnership on public.partnership_doodles(partnership_id, updated_at desc);

alter table public.partnership_doodles enable row level security;

do $$
begin
  alter publication supabase_realtime add table public.partnership_doodles;
exception when others then null;
end $$;

-- 13. SPOTIFY INTEGRATION
-- Spotify credentials and OAuth state are server-only data. Access is
-- intentionally fail-closed; Netlify functions use the service role.
create table if not exists public.spotify_connections (
  profile_id text primary key references public.profiles(id) on delete cascade,
  spotify_user_id text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spotify_oauth_states (
  state text primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.spotify_presence (
  profile_id text primary key references public.profiles(id) on delete cascade,
  partnership_id text,
  is_visible boolean not null default true,
  track jsonb,
  is_playing boolean not null default false,
  progress_ms integer not null default 0,
  duration_ms integer not null default 0,
  fetched_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_spotify_presence_partnership
  on public.spotify_presence(partnership_id);
create index if not exists idx_spotify_oauth_states_expiry
  on public.spotify_oauth_states(expires_at);

alter table public.spotify_connections enable row level security;
alter table public.spotify_oauth_states enable row level security;
alter table public.spotify_presence enable row level security;

revoke all on public.spotify_connections from anon, authenticated;
revoke all on public.spotify_oauth_states from anon, authenticated;
revoke all on public.spotify_presence from anon, authenticated;

-- Refresh PostgREST's schema cache after running this script in SQL Editor.
notify pgrst, 'reload schema';



