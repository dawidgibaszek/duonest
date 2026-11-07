create table if not exists public.pairing_attempt_limits (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  attempt_count integer not null check (attempt_count between 1 and 6)
);

alter table public.pairing_attempt_limits enable row level security;
revoke all on table public.pairing_attempt_limits from public, anon, authenticated;

create or replace function public.pair_with_code(pairing_input text, display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  me public.profiles%rowtype;
  partner public.profiles%rowtype;
  created_partnership public.partnerships%rowtype;
  normalized_input text;
  target_email boolean;
  auth_email_confirmed boolean := false;
  attempt_count integer;
  attempt_window_started_at timestamptz;
  attempt_window interval := interval '15 minutes';
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'verified_authentication_required');
  end if;

  select public.auth_email_is_confirmed(to_jsonb(u))
  into auth_email_confirmed
  from auth.users u
  where u.id = auth.uid();
  if not coalesce(auth_email_confirmed, false) then
    return jsonb_build_object('error', 'verified_authentication_required');
  end if;

  insert into public.pairing_attempt_limits as limits (auth_user_id, window_started_at, attempt_count)
  values (auth.uid(), pg_catalog.statement_timestamp(), 1)
  on conflict (auth_user_id) do update
  set
    window_started_at = case
      when limits.window_started_at + attempt_window <= pg_catalog.statement_timestamp()
        then pg_catalog.statement_timestamp()
      else limits.window_started_at
    end,
    attempt_count = case
      when limits.window_started_at + attempt_window <= pg_catalog.statement_timestamp()
        then 1
      else least(limits.attempt_count + 1, 6)
    end
  returning limits.attempt_count, limits.window_started_at
  into attempt_count, attempt_window_started_at;

  if attempt_count > 5 then
    return jsonb_build_object(
      'error', 'pairing_rate_limited',
      'retry_after_seconds', greatest(1, pg_catalog.ceil(extract(epoch from (
        attempt_window_started_at + attempt_window - pg_catalog.statement_timestamp()
      )))::integer)
    );
  end if;

  if length(trim(coalesce(pairing_input, ''))) > 320 then
    return jsonb_build_object('error', 'invalid_pairing_input');
  end if;

  normalized_input := upper(regexp_replace(trim(coalesce(pairing_input, '')), '[^A-Z0-9@._+-]', '', 'g'));
  if normalized_input = '' then
    return jsonb_build_object('error', 'invalid_pairing_input');
  end if;

  select * into me
  from public.profiles
  where auth_user_id = auth.uid()
  for update;
  if me.id is null then
    perform public.link_profile_to_auth();
    select * into me
    from public.profiles
    where auth_user_id = auth.uid()
    for update;
  end if;
  if me.id is null then
    return jsonb_build_object('error', 'profile_not_linked');
  end if;

  target_email := position('@' in normalized_input) > 0;
  if target_email then
    select * into partner
    from public.profiles
    where lower(email) = lower(normalized_input)
      and is_email_verified = true
      and auth_user_id is not null
    order by created_at asc
    limit 1;
  else
    normalized_input := regexp_replace(normalized_input, '-', '', 'g');
    if normalized_input !~ '^(DN)?[A-Z0-9]{6,12}$' then
      return jsonb_build_object('error', 'invalid_pairing_input');
    end if;
    if left(normalized_input, 2) <> 'DN' then
      normalized_input := 'DN-' || normalized_input;
    else
      normalized_input := 'DN-' || substring(normalized_input from 3);
    end if;
    select * into partner
    from public.profiles
    where pairing_code = normalized_input
      and is_email_verified = true
      and auth_user_id is not null
    limit 1;
  end if;

  if partner.id is null or partner.id = me.id then
    return jsonb_build_object('error', 'partner_unavailable');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    least(pg_catalog.hashtext(me.id), pg_catalog.hashtext(partner.id)),
    greatest(pg_catalog.hashtext(me.id), pg_catalog.hashtext(partner.id))
  );

  select * into me from public.profiles where id = me.id for update;
  select * into partner from public.profiles where id = partner.id for update;

  if me.partnership_id is not null or partner.partnership_id is not null then
    if me.partnership_id is not null and me.partnership_id = partner.partnership_id then
      select * into created_partnership
      from public.partnerships
      where id = me.partnership_id;
      return jsonb_build_object(
        'partnership', to_jsonb(created_partnership),
        'partner', jsonb_build_object('id', partner.id, 'name', partner.name, 'avatar_url', partner.avatar_url, 'avatar_color', partner.avatar_color, 'partnership_id', partner.partnership_id, 'points', partner.points),
        'partner_pairing_code', partner.pairing_code
      );
    end if;
    return jsonb_build_object('error', 'partner_unavailable');
  end if;

  insert into public.partnerships (id, partner1_id, partner2_id, nest_name, nest_level, anniversary_date, created_at)
  values (
    'part_' || encode(extensions.gen_random_bytes(12), 'hex'),
    me.id,
    partner.id,
    'Nasze Ciepłe Gniazdko',
    1,
    current_date::text,
    pg_catalog.statement_timestamp()
  ) returning * into created_partnership;

  update public.profiles
  set partnership_id = created_partnership.id,
      updated_at = pg_catalog.statement_timestamp()
  where id in (me.id, partner.id);

  if nullif(trim(display_name), '') is not null then
    update public.profiles
    set name = left(trim(display_name), 80)
    where id = me.id;
  end if;

  select * into partner from public.profiles where id = partner.id;
  return jsonb_build_object(
    'partnership', to_jsonb(created_partnership),
    'partner', jsonb_build_object('id', partner.id, 'name', partner.name, 'avatar_url', partner.avatar_url, 'avatar_color', partner.avatar_color, 'partnership_id', partner.partnership_id, 'points', partner.points),
    'partner_pairing_code', partner.pairing_code
  );
end;
$$;

revoke all on function public.pair_with_code(text, text) from public, anon;
grant execute on function public.pair_with_code(text, text) to authenticated;