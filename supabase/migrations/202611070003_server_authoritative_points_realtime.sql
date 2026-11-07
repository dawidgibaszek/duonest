alter table public.tasks
  add column if not exists points_awarded integer not null default 0;

alter table public.events
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by text,
  add column if not exists points_awarded integer not null default 0;

update public.tasks
set points_awarded = greatest(0, least(coalesce(points, 15), 100))
where is_completed = true
  and completed_by is not null
  and points_awarded = 0;

revoke update (points) on table public.profiles from authenticated;

create or replace function public.handle_task_point_award()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_profile_id text;
  award_amount integer;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    select p.id into actor_profile_id
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.partnership_id = new.partnership_id;

    if actor_profile_id is null then
      raise exception 'Partnership membership required.' using errcode = '42501';
    end if;
    if new.assigned_to is not null and not exists (
      select 1
      from public.profiles assignee
      where assignee.id = new.assigned_to
        and assignee.partnership_id = new.partnership_id
    ) then
      raise exception 'Task assignee must belong to this partnership.' using errcode = '22023';
    end if;
    if coalesce(new.is_completed, false) then
      raise exception 'Tasks must be completed through an update.' using errcode = '22023';
    end if;

    new.created_by := actor_profile_id;
    new.points := greatest(1, least(coalesce(new.points, 15), 100));
    new.completed_by := null;
    new.completed_at := null;
    new.points_awarded := 0;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.partnership_id is distinct from old.partnership_id then
    raise exception 'Task identity and partnership cannot be changed.' using errcode = '22023';
  end if;

  select p.id into actor_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.partnership_id = old.partnership_id;

  if actor_profile_id is null then
    raise exception 'Partnership membership required.' using errcode = '42501';
  end if;
  if new.assigned_to is not null and not exists (
    select 1
    from public.profiles assignee
    where assignee.id = new.assigned_to
      and assignee.partnership_id = new.partnership_id
  ) then
    raise exception 'Task assignee must belong to this partnership.' using errcode = '22023';
  end if;

  new.points := old.points;

  if coalesce(old.is_completed, false) is distinct from coalesce(new.is_completed, false) then
    if new.is_completed then
      if old.assigned_to is not null and old.assigned_to <> actor_profile_id then
        raise exception 'This task is assigned to another partnership member.' using errcode = '42501';
      end if;

      award_amount := new.points;
      new.completed_by := actor_profile_id;
      new.completed_at := pg_catalog.statement_timestamp();
      new.points_awarded := award_amount;

      update public.profiles
      set points = least(2147483647::bigint, greatest(0::bigint, coalesce(points, 0)::bigint + award_amount)::bigint)::integer,
          updated_at = pg_catalog.statement_timestamp()
      where id = actor_profile_id;
    else
      award_amount := greatest(0, coalesce(old.points_awarded, 0));
      if old.completed_by is not null and award_amount > 0 then
        update public.profiles
        set points = greatest(0, coalesce(points, 0) - award_amount),
            updated_at = pg_catalog.statement_timestamp()
        where id = old.completed_by;
      end if;

      new.completed_by := null;
      new.completed_at := null;
      new.points_awarded := 0;
    end if;
  else
    new.completed_by := old.completed_by;
    new.completed_at := old.completed_at;
    new.points_awarded := old.points_awarded;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_award_points on public.tasks;
create trigger tasks_award_points
before insert or update on public.tasks
for each row execute function public.handle_task_point_award();

create or replace function public.handle_event_point_award()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_profile_id text;
  award_amount integer;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    select p.id into actor_profile_id
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.partnership_id = new.partnership_id;

    if actor_profile_id is null then
      raise exception 'Partnership membership required.' using errcode = '42501';
    end if;
    if coalesce(new.is_completed, false) then
      raise exception 'Events must be completed through an update.' using errcode = '22023';
    end if;

    new.created_by := actor_profile_id;
    new.completed_by := null;
    new.completed_at := null;
    new.points_awarded := 0;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.partnership_id is distinct from old.partnership_id then
    raise exception 'Event identity and partnership cannot be changed.' using errcode = '22023';
  end if;

  select p.id into actor_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.partnership_id = old.partnership_id;

  if actor_profile_id is null then
    raise exception 'Partnership membership required.' using errcode = '42501';
  end if;

  new.is_completed := coalesce(new.is_completed, false);

  if coalesce(old.is_completed, false) is distinct from coalesce(new.is_completed, false) then
    if new.is_completed then
      award_amount := 10;
      new.completed_by := actor_profile_id;
      new.completed_at := pg_catalog.statement_timestamp();
      new.points_awarded := award_amount;

      update public.profiles
      set points = least(2147483647::bigint, greatest(0::bigint, coalesce(points, 0)::bigint + award_amount)::bigint)::integer,
          updated_at = pg_catalog.statement_timestamp()
      where id = actor_profile_id;
    else
      award_amount := greatest(0, coalesce(old.points_awarded, 0));
      if old.completed_by is not null and award_amount > 0 then
        update public.profiles
        set points = greatest(0, coalesce(points, 0) - award_amount),
            updated_at = pg_catalog.statement_timestamp()
        where id = old.completed_by;
      end if;

      new.completed_by := null;
      new.completed_at := null;
      new.points_awarded := 0;
    end if;
  else
    new.completed_by := old.completed_by;
    new.completed_at := old.completed_at;
    new.points_awarded := old.points_awarded;
  end if;

  return new;
end;
$$;

drop trigger if exists events_award_points on public.events;
create trigger events_award_points
before insert or update on public.events
for each row execute function public.handle_event_point_award();

create or replace function public.handle_nudge_point_award()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  sender_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required.' using errcode = '42501';
  end if;

  select * into sender_profile
  from public.profiles p
  where p.auth_user_id = auth.uid()
  for update;

  if sender_profile.id is null
    or new.sender_id <> sender_profile.id
    or new.partnership_id is distinct from sender_profile.partnership_id
    or new.receiver_id = sender_profile.id
    or not exists (
      select 1
      from public.profiles receiver
      where receiver.id = new.receiver_id
        and receiver.partnership_id = sender_profile.partnership_id
    ) then
    raise exception 'Invalid nudge participants.' using errcode = '42501';
  end if;

  if coalesce(length(new.nudge_type), 0) < 1
    or length(new.nudge_type) > 32
    or length(coalesce(new.message, '')) > 500 then
    raise exception 'Invalid nudge payload.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(sender_profile.id), 2400);

  if exists (
    select 1
    from public.nudges n
    where n.sender_id = sender_profile.id
      and n.created_at > pg_catalog.statement_timestamp() - interval '24 hours'
  ) then
    raise exception 'Daily nudge cooldown is active.' using errcode = '23505';
  end if;

  new.created_at := pg_catalog.statement_timestamp();

  update public.profiles
  set points = least(2147483647::bigint, greatest(0::bigint, coalesce(points, 0)::bigint + 5)::bigint)::integer,
      updated_at = pg_catalog.statement_timestamp()
  where id = sender_profile.id;

  return new;
end;
$$;

drop trigger if exists nudges_award_points on public.nudges;
create trigger nudges_award_points
before insert on public.nudges
for each row execute function public.handle_nudge_point_award();

drop policy if exists "nudges_member_update" on public.nudges;
drop policy if exists "nudges_member_delete" on public.nudges;
revoke update, delete on table public.nudges from authenticated;

revoke all on function public.handle_task_point_award() from public, anon, authenticated;
revoke all on function public.handle_event_point_award() from public, anon, authenticated;
revoke all on function public.handle_nudge_point_award() from public, anon, authenticated;

create or replace function public.can_access_duonest_realtime_topic(requested_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or requested_topic is null then
    return false;
  end if;

  if left(requested_topic, 16) = 'duonest_channel_' then
    return public.is_partnership_member(substr(requested_topic, 17));
  end if;

  if left(requested_topic, 13) = 'duonest_pair_' then
    return exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.pairing_code = substr(requested_topic, 14)
    );
  end if;

  if left(requested_topic, 12) = 'duonest_sec_' then
    return exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.id = substr(requested_topic, 13)
    );
  end if;

  return false;
end;
$$;

revoke all on function public.can_access_duonest_realtime_topic(text) from public, anon;
grant execute on function public.can_access_duonest_realtime_topic(text) to authenticated;

drop policy if exists "duonest_private_topics_read" on realtime.messages;
create policy "duonest_private_topics_read" on realtime.messages
  for select to authenticated
  using (public.can_access_duonest_realtime_topic((select realtime.topic())));

drop policy if exists "duonest_private_topics_write" on realtime.messages;
create policy "duonest_private_topics_write" on realtime.messages
  for insert to authenticated
  with check (public.can_access_duonest_realtime_topic((select realtime.topic())));