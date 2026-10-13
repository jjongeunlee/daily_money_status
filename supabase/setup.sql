-- Run once in Supabase SQL Editor. Does not import or delete existing local records.
create table if not exists public.money_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.money_accounts enable row level security;
revoke all on public.money_accounts from anon, authenticated;
grant select on public.money_accounts to authenticated;
drop policy if exists own_money_read on public.money_accounts;
create policy own_money_read on public.money_accounts for select to authenticated using ((select auth.uid()) = user_id);
create or replace function public.save_money(payload jsonb, expected_revision integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare next_revision integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if payload->>'version' is distinct from '1' or jsonb_typeof(payload->'expenses') is distinct from 'array' or jsonb_typeof(payload->'budgets') is distinct from 'object' then raise exception 'invalid_data'; end if;
  if expected_revision = 0 then
    insert into public.money_accounts(user_id, data, revision) values(auth.uid(), payload, 1)
    on conflict do nothing returning revision into next_revision;
  else
    update public.money_accounts set data = payload, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and revision = expected_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'revision_conflict'; end if;
  return next_revision;
end $$;
revoke all on function public.save_money(jsonb, integer) from public, anon;
grant execute on function public.save_money(jsonb, integer) to authenticated;
