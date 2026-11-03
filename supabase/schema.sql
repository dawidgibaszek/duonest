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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. PARTNERSHIPS TABLE
create table if not exists public.partnerships (
  id text primary key,
  partner1_id text not null,
  partner2_id text not null,
  nest_name text not null default 'Nasze Ciepłe Gniazdko',
  nest_level integer not null default 1,
  nest_points integer not null default 0,
  anniversary_date text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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
