-- Spotify credentials are server-only data. RLS is intentionally fail-closed;
-- Netlify functions use the service role after authenticating the caller.
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

-- No client role receives access. The service role is used only by authenticated
-- Netlify functions, so tokens can never be selected through the Data API.
revoke all on public.spotify_connections from anon, authenticated;
revoke all on public.spotify_oauth_states from anon, authenticated;
revoke all on public.spotify_presence from anon, authenticated;
