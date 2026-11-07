create table if not exists public.calendar_event_cancellations (
  event_id text primary key,
  partnership_id text not null,
  cancelled_at timestamptz not null default pg_catalog.statement_timestamp()
);

create index if not exists idx_calendar_event_cancellations_partnership
  on public.calendar_event_cancellations (partnership_id, cancelled_at);

alter table public.calendar_event_cancellations enable row level security;
revoke all on table public.calendar_event_cancellations from public, anon, authenticated;
grant select on table public.calendar_event_cancellations to service_role;

create or replace function public.track_calendar_event_cancellation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.calendar_event_cancellations (event_id, partnership_id, cancelled_at)
    values (old.id, old.partnership_id, pg_catalog.statement_timestamp())
    on conflict (event_id) do update
      set partnership_id = excluded.partnership_id,
          cancelled_at = excluded.cancelled_at;
    return old;
  end if;

  delete from public.calendar_event_cancellations
  where event_id = new.id;
  return new;
end;
$$;

revoke all on function public.track_calendar_event_cancellation() from public, anon, authenticated;

drop trigger if exists events_track_calendar_cancellation on public.events;
create trigger events_track_calendar_cancellation
after insert or delete on public.events
for each row execute function public.track_calendar_event_cancellation();