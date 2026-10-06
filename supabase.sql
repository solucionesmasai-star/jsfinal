-- ============================================================
-- JS TURNOS - SUPABASE
-- Esquema alineado con app.js
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.js_schedule_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  cycle_start date not null,
  js_names jsonb not null default '["JS 1","JS 2","JS 3"]'::jsonb,
  schedule jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint js_schedule_months_month_key_format
    check (month_key ~ '^\\d{4}-(0[1-9]|1[0-2])$'),
  constraint js_schedule_months_js_names_array
    check (jsonb_typeof(js_names) = 'array'),
  constraint js_schedule_months_schedule_array
    check (jsonb_typeof(schedule) = 'array'),
  constraint js_schedule_months_user_month_unique
    unique (user_id, month_key)
);

create index if not exists js_schedule_months_user_idx
  on public.js_schedule_months (user_id);

create index if not exists js_schedule_months_month_idx
  on public.js_schedule_months (month_key desc);

create or replace function public.set_js_schedule_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_js_schedule_updated_at on public.js_schedule_months;
create trigger trg_js_schedule_updated_at
before update on public.js_schedule_months
for each row execute function public.set_js_schedule_updated_at();

alter table public.js_schedule_months enable row level security;

drop policy if exists "js_schedule_select_own" on public.js_schedule_months;
drop policy if exists "js_schedule_insert_own" on public.js_schedule_months;
drop policy if exists "js_schedule_update_own" on public.js_schedule_months;
drop policy if exists "js_schedule_delete_own" on public.js_schedule_months;

create policy "js_schedule_select_own"
on public.js_schedule_months
for select
to authenticated
using (auth.uid() = user_id);

create policy "js_schedule_insert_own"
on public.js_schedule_months
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "js_schedule_update_own"
on public.js_schedule_months
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "js_schedule_delete_own"
on public.js_schedule_months
for delete
to authenticated
using (auth.uid() = user_id);

revoke all on table public.js_schedule_months from anon;
grant select, insert, update, delete on table public.js_schedule_months to authenticated;

-- Verificación rápida
-- select schemaname, tablename, rowsecurity
-- from pg_tables
-- where schemaname='public' and tablename='js_schedule_months';
--
-- select policyname, cmd, roles
-- from pg_policies
-- where schemaname='public' and tablename='js_schedule_months';
