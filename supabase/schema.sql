-- ==========================================================
-- DUONEST - POSTGRESQL SCHEMA WITH REALTIME & ROW LEVEL SECURITY
-- ==========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id text primary key,
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration safety for existing deployments
alter table if exists public.profiles add column if not exists points integer not null default 0;
alter table if exists public.profiles add column if not exists is_email_verified boolean default true;

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

-- Open policies for anon & authenticated couple access
drop policy if exists "Allow all on profiles" on public.profiles;
create policy "Allow all on profiles" on public.profiles for all using (true) with check (true);

drop policy if exists "Allow all on partnerships" on public.partnerships;
create policy "Allow all on partnerships" on public.partnerships for all using (true) with check (true);

drop policy if exists "Allow all on shopping_items" on public.shopping_items;
create policy "Allow all on shopping_items" on public.shopping_items for all using (true) with check (true);

drop policy if exists "Allow all on tasks" on public.tasks;
create policy "Allow all on tasks" on public.tasks for all using (true) with check (true);

drop policy if exists "Allow all on events" on public.events;
create policy "Allow all on events" on public.events for all using (true) with check (true);

drop policy if exists "Allow all on mood_logs" on public.mood_logs;
create policy "Allow all on mood_logs" on public.mood_logs for all using (true) with check (true);

drop policy if exists "Allow all on nudges" on public.nudges;
create policy "Allow all on nudges" on public.nudges for all using (true) with check (true);

drop policy if exists "Allow all on milestones" on public.milestones;
create policy "Allow all on milestones" on public.milestones for all using (true) with check (true);

drop policy if exists "Allow all on wishlist_items" on public.wishlist_items;
create policy "Allow all on wishlist_items" on public.wishlist_items for all using (true) with check (true);

drop policy if exists "Allow all on movies" on public.movies;
create policy "Allow all on movies" on public.movies for all using (true) with check (true);

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
drop policy if exists "Allow all on push_subscriptions" on public.push_subscriptions;
create policy "Allow all on push_subscriptions" on public.push_subscriptions for all using (true) with check (true);

-- ==========================================================
-- OPTIONAL HARDENED RLS POLICIES FOR STRICT PARTNERSHIP ISOLATION
-- (Uncomment when switching from anonymous pairing code auth to strict Supabase Auth UUIDs)
-- ==========================================================
-- create or replace function public.is_partnership_member(target_partnership_id text)
-- returns boolean security definer language sql as $$
--   select exists (
--     select 1 from public.partnerships
--     where id = target_partnership_id
--     and (partner1_id = auth.uid()::text or partner2_id = auth.uid()::text)
--   );
-- $$;


