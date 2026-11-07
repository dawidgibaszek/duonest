create extension if not exists pgcrypto with schema extensions;

create or replace function public.auth_email_is_confirmed(auth_user_row jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    nullif(auth_user_row ->> 'email_confirmed_at', '')::timestamptz,
    nullif(auth_user_row ->> 'confirmed_at', '')::timestamptz
  ) is not null
$$;

alter table public.profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists idx_profiles_auth_user_id
  on public.profiles(auth_user_id)
  where auth_user_id is not null;

-- Link only unambiguous existing email matches. Keep profile IDs unchanged so
-- all existing partnership and content references remain valid.
with unique_matches as (
  select p.id as profile_id, u.id as auth_user_id
  from public.profiles p
  join auth.users u on lower(u.email) = lower(p.email)
  where p.auth_user_id is null
    and public.auth_email_is_confirmed(to_jsonb(u))
    and (select count(*) from public.profiles p2 where lower(p2.email) = lower(p.email)) = 1
    and (select count(*) from auth.users u2 where lower(u2.email) = lower(u.email)) = 1
)
update public.profiles p
set auth_user_id = m.auth_user_id,
  is_email_verified = public.auth_email_is_confirmed(to_jsonb(u)),
    updated_at = now()
from unique_matches m
join auth.users u on u.id = m.auth_user_id
where p.id = m.profile_id;

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  matched_profile_id text;
  match_count integer;
  email_profile_count integer;
  generated_code text;
  email_confirmed boolean := public.auth_email_is_confirmed(to_jsonb(new));
begin
  if new.email is null then
    return new;
  end if;

  select count(*), min(p.id)
  into match_count, matched_profile_id
  from public.profiles p
  where lower(p.email) = lower(new.email)
    and (p.auth_user_id is null or p.auth_user_id = new.id);

  if match_count = 1 then
    if not email_confirmed then
      return new;
    end if;

    update public.profiles
    set auth_user_id = new.id,
      is_email_verified = email_confirmed,
        updated_at = now()
    where id = matched_profile_id;
    return new;
  elsif match_count > 1 then
    return new;
  end if;

  select count(*) into email_profile_count
  from public.profiles p
  where lower(p.email) = lower(new.email);
  if email_profile_count > 0 then
    return new;
  end if;

  loop
    generated_code := 'DN-' || upper(encode(extensions.gen_random_bytes(4), 'hex'));
    exit when not exists (select 1 from public.profiles where pairing_code = generated_code);
  end loop;

  insert into public.profiles (
    id, auth_user_id, email, name, pairing_code, is_email_verified,
    avatar_color, current_mood, love_note, favorite_drink, favorite_treat
  ) values (
    new.id::text,
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Użytkownik'),
    generated_code,
    email_confirmed,
    '#0284c7',
    'happy',
    '',
    '',
    ''
  );

  return new;
end;
$$;

drop trigger if exists duonest_auth_user_profile_created on auth.users;
create trigger duonest_auth_user_profile_created
after insert on auth.users
for each row execute function public.handle_auth_user_profile();

create or replace function public.handle_auth_user_profile_updated()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  matched_profile_id text;
  profile_match_count integer;
  auth_match_count integer;
  generated_code text;
  new_email text := lower(coalesce(new.email, ''));
  old_email text := lower(coalesce(old.email, ''));
  email_confirmed boolean := public.auth_email_is_confirmed(to_jsonb(new));
begin
  if new_email = '' then
    return new;
  end if;

  if new_email = old_email
    and public.auth_email_is_confirmed(to_jsonb(old)) = email_confirmed then
    return new;
  end if;

  update public.profiles
  set email = new_email,
      is_email_verified = email_confirmed,
      updated_at = now()
  where auth_user_id = new.id;

  if found or not email_confirmed then
    return new;
  end if;

  select count(*), min(p.id)
  into profile_match_count, matched_profile_id
  from public.profiles p
  where lower(p.email) = new_email
    and p.auth_user_id is null;

  select count(*) into auth_match_count
  from auth.users u
  where lower(u.email) = new_email;

  if profile_match_count = 1 and auth_match_count = 1 then
    update public.profiles
    set auth_user_id = new.id,
        is_email_verified = true,
        updated_at = now()
    where id = matched_profile_id and auth_user_id is null;
    return new;
  end if;

  if profile_match_count > 0 then
    return new;
  end if;

  loop
    generated_code := 'DN-' || upper(encode(extensions.gen_random_bytes(4), 'hex'));
    exit when not exists (select 1 from public.profiles where pairing_code = generated_code);
  end loop;

  insert into public.profiles (
    id, auth_user_id, email, name, pairing_code, is_email_verified,
    avatar_color, current_mood, love_note, favorite_drink, favorite_treat
  ) values (
    new.id::text,
    new.id,
    new_email,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Użytkownik'),
    generated_code,
    true,
    '#0284c7',
    'happy',
    '',
    '',
    ''
  );

  return new;
end;
$$;

drop trigger if exists duonest_auth_user_profile_updated on auth.users;
create trigger duonest_auth_user_profile_updated
after update on auth.users
for each row execute function public.handle_auth_user_profile_updated();

create or replace function public.my_profile_id()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id from public.profiles p where p.auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_partnership_member(requested_partnership_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.partnership_id = requested_partnership_id
  )
$$;

create or replace function public.link_profile_to_auth()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  user_email text := '';
  confirmed boolean := false;
  matches integer;
begin
  select lower(u.email), public.auth_email_is_confirmed(to_jsonb(u))
  into user_email, confirmed
  from auth.users u
  where u.id = auth.uid();
  if auth.uid() is null or user_email = '' or not confirmed then
    return false;
  end if;

  select count(*) into matches
  from public.profiles p
  where lower(p.email) = user_email
    and (p.auth_user_id is null or p.auth_user_id = auth.uid());

  if matches <> 1 then
    return false;
  end if;

  update public.profiles
  set auth_user_id = auth.uid(), is_email_verified = true, updated_at = now()
  where lower(email) = user_email
    and (auth_user_id is null or auth_user_id = auth.uid());
  return found;
end;
$$;

create or replace function public.get_my_pairing_code()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.pairing_code from public.profiles p where p.auth_user_id = auth.uid() limit 1
$$;

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
  normalized_input text := upper(regexp_replace(trim(coalesce(pairing_input, '')), '[^A-Z0-9@._+-]', '', 'g'));
  target_email boolean;
  partner_code text;
  auth_email_confirmed boolean := false;
begin
  select public.auth_email_is_confirmed(to_jsonb(u))
  into auth_email_confirmed
  from auth.users u
  where u.id = auth.uid();
  if auth.uid() is null or not coalesce(auth_email_confirmed, false) then
    raise exception 'Verified authentication is required.' using errcode = '42501';
  end if;

  select * into me from public.profiles where auth_user_id = auth.uid() for update;
  if me.id is null then
    perform public.link_profile_to_auth();
    select * into me from public.profiles where auth_user_id = auth.uid() for update;
  end if;
  if me.id is null then
    raise exception 'No profile is linked to this account.' using errcode = 'P0002';
  end if;

  target_email := position('@' in normalized_input) > 0;
  if target_email then
    select * into partner from public.profiles
    where lower(email) = lower(normalized_input)
      and is_email_verified = true
      and auth_user_id is not null
    order by created_at asc limit 1;
  else
    normalized_input := regexp_replace(normalized_input, '-', '', 'g');
    if normalized_input !~ '^(DN)?[A-Z0-9]{6,12}$' then
      raise exception 'Invalid pairing code.' using errcode = '22023';
    end if;
    if left(normalized_input, 2) <> 'DN' then
      normalized_input := 'DN-' || normalized_input;
    else
      normalized_input := 'DN-' || substring(normalized_input from 3);
    end if;
    select * into partner from public.profiles
    where pairing_code = normalized_input
      and is_email_verified = true
      and auth_user_id is not null
    limit 1;
  end if;

  if partner.id is null or partner.id = me.id then
    raise exception 'Partner not found.' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    least(pg_catalog.hashtext(me.id), pg_catalog.hashtext(partner.id)),
    greatest(pg_catalog.hashtext(me.id), pg_catalog.hashtext(partner.id))
  );

  select * into me from public.profiles where id = me.id for update;
  select * into partner from public.profiles where id = partner.id for update;

  if me.partnership_id is not null or partner.partnership_id is not null then
    if me.partnership_id is not null and me.partnership_id = partner.partnership_id then
      select * into created_partnership from public.partnerships where id = me.partnership_id;
      return jsonb_build_object(
        'partnership', to_jsonb(created_partnership),
        'partner', jsonb_build_object('id', partner.id, 'name', partner.name, 'avatar_url', partner.avatar_url, 'avatar_color', partner.avatar_color, 'partnership_id', partner.partnership_id, 'points', partner.points),
        'partner_pairing_code', partner.pairing_code
      );
    end if;
    raise exception 'One of the accounts is already paired.' using errcode = '23505';
  end if;

  insert into public.partnerships (id, partner1_id, partner2_id, nest_name, nest_level, anniversary_date, created_at)
  values (
    'part_' || encode(extensions.gen_random_bytes(12), 'hex'),
    me.id,
    partner.id,
    'Nasze Ciepłe Gniazdko',
    1,
    current_date::text,
    now()
  ) returning * into created_partnership;

  update public.profiles set partnership_id = created_partnership.id, updated_at = now() where id in (me.id, partner.id);

  if nullif(trim(display_name), '') is not null then
    update public.profiles set name = left(trim(display_name), 80) where id = me.id;
  end if;

  select * into partner from public.profiles where id = partner.id;
  return jsonb_build_object(
    'partnership', to_jsonb(created_partnership),
    'partner', jsonb_build_object('id', partner.id, 'name', partner.name, 'avatar_url', partner.avatar_url, 'avatar_color', partner.avatar_color, 'partnership_id', partner.partnership_id, 'points', partner.points),
    'partner_pairing_code', partner.pairing_code
  );
end;
$$;

create or replace function public.disconnect_my_partnership()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  my_partnership_id text;
  member_profile_id text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  select partnership_id into my_partnership_id from public.profiles where auth_user_id = auth.uid() for update;
  if my_partnership_id is null then return false; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(my_partnership_id), 0);
  for member_profile_id in
    select id from public.profiles where partnership_id = my_partnership_id order by id for update
  loop
    null;
  end loop;

  update public.profiles set partnership_id = null, updated_at = now() where partnership_id = my_partnership_id;
  delete from public.partnerships where id = my_partnership_id;
  return true;
end;
$$;

revoke all on function public.my_profile_id() from public, anon;
revoke all on function public.is_partnership_member(text) from public, anon;
revoke all on function public.link_profile_to_auth() from public, anon;
revoke all on function public.get_my_pairing_code() from public, anon;
revoke all on function public.pair_with_code(text, text) from public, anon;
revoke all on function public.disconnect_my_partnership() from public, anon;
grant execute on function public.my_profile_id() to authenticated, service_role;
grant execute on function public.is_partnership_member(text) to authenticated, service_role;
grant execute on function public.link_profile_to_auth() to authenticated;
grant execute on function public.get_my_pairing_code() to authenticated;
grant execute on function public.pair_with_code(text, text) to authenticated;
grant execute on function public.disconnect_my_partnership() to authenticated;

-- Remove the permissive bootstrap policies and reset table grants.
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array['profiles','partnerships','shopping_items','tasks','events','mood_logs','nudges','milestones','wishlist_items','movies','meals'] loop
    for policy_name in
      select polname from pg_policy where polrelid = format('public.%I', table_name)::regclass
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.partnerships enable row level security;
alter table public.push_subscriptions enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select (
  id, name, avatar_url, avatar_color, partnership_id, current_mood, mood_note,
  mood_updated_at, love_note, favorite_drink, favorite_treat, points,
  last_seen_at, created_at, updated_at
) on public.profiles to authenticated;
grant update (
  name, avatar_url, avatar_color, current_mood, mood_note, mood_updated_at,
  love_note, favorite_drink, favorite_treat, points, last_seen_at, updated_at
) on public.profiles to authenticated;

drop policy if exists "profiles_read_self_or_partner" on public.profiles;
create policy "profiles_read_self_or_partner" on public.profiles
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or (partnership_id is not null and public.is_partnership_member(partnership_id))
  );
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array['shopping_items','tasks','events','mood_logs','nudges','milestones','wishlist_items','movies','meals'] loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_member_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_member_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_member_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_member_delete', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_partnership_member(partnership_id))', table_name || '_member_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_partnership_member(partnership_id))', table_name || '_member_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_partnership_member(partnership_id)) with check (public.is_partnership_member(partnership_id))', table_name || '_member_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_partnership_member(partnership_id))', table_name || '_member_delete', table_name);
  end loop;
end;
$$;

revoke all on public.partnerships from public, anon, authenticated;
grant select on public.partnerships to authenticated;
grant update (nest_name, nest_level, anniversary_date, pet_id, pet_name, pet_xp, updated_at) on public.partnerships to authenticated;
drop policy if exists "partnerships_member_select" on public.partnerships;
drop policy if exists "partnerships_member_update" on public.partnerships;
create policy "partnerships_member_select" on public.partnerships
  for select to authenticated using (public.is_partnership_member(id));
create policy "partnerships_member_update" on public.partnerships
  for update to authenticated using (public.is_partnership_member(id)) with check (public.is_partnership_member(id));

-- A surprise is private to its creator until explicitly made visible.
drop policy if exists "wishlist_items_member_select" on public.wishlist_items;
create policy "wishlist_items_visible_or_owner_select" on public.wishlist_items
  for select to authenticated
  using (
    public.is_partnership_member(partnership_id)
    and (is_visible_to_partner or created_by = public.my_profile_id())
  );
drop policy if exists "wishlist_items_member_insert" on public.wishlist_items;
create policy "wishlist_items_owner_insert" on public.wishlist_items
  for insert to authenticated
  with check (public.is_partnership_member(partnership_id) and created_by = public.my_profile_id());
drop policy if exists "wishlist_items_member_update" on public.wishlist_items;
create policy "wishlist_items_visible_or_owner_update" on public.wishlist_items
  for update to authenticated
  using (public.is_partnership_member(partnership_id) and (is_visible_to_partner or created_by = public.my_profile_id()))
  with check (public.is_partnership_member(partnership_id) and (is_visible_to_partner or created_by = public.my_profile_id()));
drop policy if exists "wishlist_items_member_delete" on public.wishlist_items;
create policy "wishlist_items_owner_delete" on public.wishlist_items
  for delete to authenticated
  using (public.is_partnership_member(partnership_id) and created_by = public.my_profile_id());
revoke update (partnership_id, created_by) on public.wishlist_items from authenticated;

drop policy if exists "nudges_member_insert" on public.nudges;
create policy "nudges_sender_insert" on public.nudges
  for insert to authenticated
  with check (
    public.is_partnership_member(partnership_id)
    and sender_id = public.my_profile_id()
    and receiver_id <> sender_id
  );

drop policy if exists "mood_logs_member_insert" on public.mood_logs;
create policy "mood_logs_owner_insert" on public.mood_logs
  for insert to authenticated
  with check (public.is_partnership_member(partnership_id) and user_id = public.my_profile_id());

revoke all on public.push_subscriptions from public, anon, authenticated;
grant all on public.push_subscriptions to service_role;

-- Keep email and pairing codes private from normal PostgREST profile reads.
revoke select (email, pairing_code, is_email_verified, auth_user_id) on public.profiles from authenticated;