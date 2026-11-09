-- Last.fm integration for Spotify/Apple Music/YouTube Music presence
create table if not exists public.lastfm_connections (
  profile_id text primary key references public.profiles(id) on delete cascade,
  lastfm_username text not null,
  session_key text,
  music_service text not null default 'spotify',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration safety: ensure column exists if table was already created
alter table if exists public.lastfm_connections
  add column if not exists music_service text not null default 'spotify';

alter table public.lastfm_connections enable row level security;
revoke all on public.lastfm_connections from anon, authenticated;

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
