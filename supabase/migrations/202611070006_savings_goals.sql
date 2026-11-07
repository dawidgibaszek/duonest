-- ==========================================================
-- DUONEST MIGRATION: SAVINGS GOALS & CONTRIBUTIONS (WSPÓLNE SKARBONKI)
-- ==========================================================

-- 1. SAVINGS GOALS TABLE
create table if not exists public.savings_goals (
  id text primary key,
  partnership_id text not null references public.partnerships(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  category text not null default 'travel' check (category in ('travel', 'home', 'gadget', 'date', 'emergency', 'other')),
  target_amount numeric(12,2) not null check (target_amount > 0 and target_amount <= 999999999),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  currency text not null default 'PLN' check (currency in ('PLN', 'EUR', 'USD', 'GBP')),
  target_date text check (target_date is null or target_date ~ '^\d{4}-\d{2}-\d{2}$'),
  icon text not null default 'airplane' check (icon in ('airplane', 'home', 'gadget', 'date', 'shield', 'sparkles', 'car', 'gift')),
  color text not null default '#0f172a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. SAVINGS CONTRIBUTIONS TABLE
create table if not exists public.savings_contributions (
  id text primary key,
  goal_id text not null references public.savings_goals(id) on delete cascade,
  partnership_id text not null references public.partnerships(id) on delete cascade,
  user_id text references public.profiles(id) on delete set null,
  amount numeric(12,2) not null check (amount <> 0 and abs(amount) <= 999999999),
  note text check (note is null or length(trim(note)) <= 150),
  created_at timestamptz not null default now()
);

-- 3. INDEXES FOR PERFORMANCE
create index if not exists idx_savings_goals_partnership
  on public.savings_goals(partnership_id, created_at desc);

create index if not exists idx_savings_contributions_goal
  on public.savings_contributions(goal_id, created_at desc);

create index if not exists idx_savings_contributions_partnership
  on public.savings_contributions(partnership_id);

-- 4. ROW LEVEL SECURITY (RLS) & GRANTS
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;

revoke all on table public.savings_goals from public, anon;
revoke all on table public.savings_contributions from public, anon;

grant select, insert, update, delete on table public.savings_goals to authenticated;
grant select, insert, update, delete on table public.savings_contributions to authenticated;

-- Policies for savings_goals
drop policy if exists "savings_goals_member_select" on public.savings_goals;
create policy "savings_goals_member_select" on public.savings_goals
  for select to authenticated
  using (public.is_partnership_member(partnership_id));

drop policy if exists "savings_goals_member_insert" on public.savings_goals;
create policy "savings_goals_member_insert" on public.savings_goals
  for insert to authenticated
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "savings_goals_member_update" on public.savings_goals;
create policy "savings_goals_member_update" on public.savings_goals
  for update to authenticated
  using (public.is_partnership_member(partnership_id))
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "savings_goals_member_delete" on public.savings_goals;
create policy "savings_goals_member_delete" on public.savings_goals
  for delete to authenticated
  using (public.is_partnership_member(partnership_id));

-- Policies for savings_contributions
drop policy if exists "savings_contributions_member_select" on public.savings_contributions;
create policy "savings_contributions_member_select" on public.savings_contributions
  for select to authenticated
  using (public.is_partnership_member(partnership_id));

drop policy if exists "savings_contributions_member_insert" on public.savings_contributions;
create policy "savings_contributions_member_insert" on public.savings_contributions
  for insert to authenticated
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "savings_contributions_member_update" on public.savings_contributions;
create policy "savings_contributions_member_update" on public.savings_contributions
  for update to authenticated
  using (public.is_partnership_member(partnership_id))
  with check (public.is_partnership_member(partnership_id));

drop policy if exists "savings_contributions_member_delete" on public.savings_contributions;
create policy "savings_contributions_member_delete" on public.savings_contributions
  for delete to authenticated
  using (public.is_partnership_member(partnership_id));

-- 5. TRIGGER: SERVER-AUTHORITATIVE RECALCULATION OF GOAL CURRENT_AMOUNT & STATUS
create or replace function public.handle_savings_contribution_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_goal_id text;
  calculated_sum numeric(12,2);
  goal_target numeric(12,2);
  was_completed boolean;
  now_completed boolean;
begin
  target_goal_id := coalesce(new.goal_id, old.goal_id);

  select coalesce(sum(amount), 0) into calculated_sum
  from public.savings_contributions
  where goal_id = target_goal_id;

  select target_amount, is_completed into goal_target, was_completed
  from public.savings_goals
  where id = target_goal_id;

  if goal_target is not null then
    now_completed := (calculated_sum >= goal_target and goal_target > 0);

    update public.savings_goals
    set current_amount = greatest(0, calculated_sum),
        is_completed = now_completed,
        completed_at = case
          when now_completed and not coalesce(was_completed, false) then pg_catalog.statement_timestamp()
          when not now_completed then null
          else completed_at
        end,
        updated_at = pg_catalog.statement_timestamp()
    where id = target_goal_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists duonest_savings_contributions_trigger on public.savings_contributions;
create trigger duonest_savings_contributions_trigger
after insert or update or delete on public.savings_contributions
for each row execute function public.handle_savings_contribution_change();

-- 6. ENABLE SUPABASE REALTIME REPLICATION
do $$
begin
  alter publication supabase_realtime add table public.savings_goals;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.savings_contributions;
exception when others then null;
end $$;

