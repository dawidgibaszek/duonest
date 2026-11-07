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