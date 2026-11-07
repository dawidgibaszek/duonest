-- Migration: 202611070007_get_my_profile.sql
-- Description: Provide an atomic, security-definer get_my_profile RPC and ensure column permissions

create or replace function public.get_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid;
  u_email text;
  p record;
begin
  uid := auth.uid();
  if uid is null then
    return null;
  end if;

  -- 1. Try to find profile by auth_user_id
  select * into p from public.profiles where auth_user_id = uid limit 1;

  -- 2. If not found by auth_user_id, try to link by confirmed email in auth.users
  if p.id is null then
    select lower(email) into u_email from auth.users where id = uid;
    if u_email is not null and u_email <> '' then
      update public.profiles
      set auth_user_id = uid, is_email_verified = true, updated_at = now()
      where lower(email) = u_email and (auth_user_id is null or auth_user_id = uid);

      select * into p from public.profiles where auth_user_id = uid limit 1;
    end if;
  end if;

  if p.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'email', p.email,
    'avatar_url', p.avatar_url,
    'avatar_color', p.avatar_color,
    'pairing_code', p.pairing_code,
    'partnership_id', p.partnership_id,
    'current_mood', p.current_mood,
    'mood_note', p.mood_note,
    'mood_updated_at', p.mood_updated_at,
    'love_note', p.love_note,
    'favorite_drink', p.favorite_drink,
    'favorite_treat', p.favorite_treat,
    'points', coalesce(p.points, 0),
    'last_seen_at', p.last_seen_at,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  );
end;
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated, service_role;

-- Grant select on auth_user_id, pairing_code, is_email_verified to authenticated
grant select (auth_user_id, pairing_code, is_email_verified) on public.profiles to authenticated;
