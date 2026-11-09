-- ==========================================================
-- 202611090003_music_integration.sql
-- Transition from Spotify/Last.fm legacy tables to unified music_presence and music_connections
-- ==========================================================

-- 1. Create music_presence table
create table if not exists public.music_presence (
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

-- 2. Create music_connections table
create table if not exists public.music_connections (
  profile_id text primary key references public.profiles(id) on delete cascade,
  service_username text not null,
  session_key text,
  music_service text not null default 'spotify',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Automatic data migration from legacy tables if they exist
do $$
begin
  -- Copy presence from spotify_presence
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'spotify_presence') then
    insert into public.music_presence (profile_id, partnership_id, is_visible, track, is_playing, progress_ms, duration_ms, fetched_at, updated_at)
    select profile_id, partnership_id, is_visible, track, is_playing, progress_ms, duration_ms, fetched_at, updated_at
    from public.spotify_presence
    on conflict (profile_id) do update set
      track = excluded.track,
      is_playing = excluded.is_playing,
      progress_ms = excluded.progress_ms,
      duration_ms = excluded.duration_ms,
      fetched_at = excluded.fetched_at,
      updated_at = excluded.updated_at;
  end if;

  -- Copy connections from lastfm_connections
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'lastfm_connections') then
    insert into public.music_connections (profile_id, service_username, session_key, music_service, connected_at, updated_at)
    select profile_id, lastfm_username, session_key, coalesce(music_service, 'spotify'), connected_at, updated_at
    from public.lastfm_connections
    on conflict (profile_id) do update set
      service_username = excluded.service_username,
      session_key = excluded.session_key,
      music_service = excluded.music_service,
      updated_at = excluded.updated_at;
  end if;

  -- Copy connections from spotify_connections if lastfm: nick exists
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'spotify_connections') then
    insert into public.music_connections (profile_id, service_username, session_key, music_service, connected_at, updated_at)
    select 
      profile_id,
      case when spotify_user_id like 'lastfm:%' then substring(spotify_user_id from 8) else spotify_user_id end,
      access_token,
      'spotify',
      connected_at,
      updated_at
    from public.spotify_connections
    on conflict (profile_id) do nothing;
  end if;
end $$;

-- 4. Indexes & RLS
create index if not exists idx_music_presence_partnership
  on public.music_presence(partnership_id);

alter table public.music_presence enable row level security;
alter table public.music_connections enable row level security;

revoke all on public.music_presence from anon, authenticated;
revoke all on public.music_connections from anon, authenticated;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
