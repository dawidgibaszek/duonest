-- Last.fm integration for Spotify/Music presence
create table if not exists public.lastfm_connections (
  profile_id text primary key references public.profiles(id) on delete cascade,
  lastfm_username text not null,
  session_key text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lastfm_connections enable row level security;
revoke all on public.lastfm_connections from anon, authenticated;

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
