-- ==========================================================
-- DUONEST MIGRATION: PARTNERSHIP DOODLES (WSPÓLNA TABLICA / KARTECZKA NA LODÓWCE)
-- ==========================================================

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

revoke all on table public.partnership_doodles from public, anon;
grant select, insert, update, delete on table public.partnership_doodles to authenticated;

drop policy if exists "doodles_member_select" on public.partnership_doodles;
create policy "doodles_member_select" on public.partnership_doodles
  for select to authenticated
  using (public.is_partnership_member(partnership_id));

drop policy if exists "doodles_member_insert" on public.partnership_doodles;
create policy "doodles_member_insert" on public.partnership_doodles
  for insert to authenticated
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "doodles_member_update" on public.partnership_doodles;
create policy "doodles_member_update" on public.partnership_doodles
  for update to authenticated
  using (public.is_partnership_member(partnership_id))
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "doodles_member_delete" on public.partnership_doodles;
create policy "doodles_member_delete" on public.partnership_doodles
  for delete to authenticated
  using (public.is_partnership_member(partnership_id));

do $$
begin
  alter publication supabase_realtime add table public.partnership_doodles;
exception when others then null;
end $$;
