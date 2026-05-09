-- ─────────────────────────────────────────────────────────────────────────
-- Controle de Caixa — Supabase schema
--
-- Apply via Dashboard → SQL Editor, or `supabase db push` if using the CLI.
-- Re-running is safe (uses IF NOT EXISTS / DROP IF EXISTS).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.cash_state (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  state         jsonb not null,
  last_modified timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Updated_at maintained automatically.
create or replace function public.cash_state_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cash_state_updated_at on public.cash_state;
create trigger trg_cash_state_updated_at
  before update on public.cash_state
  for each row execute function public.cash_state_set_updated_at();

-- Row-Level Security: each user can only see and write their own document.
alter table public.cash_state enable row level security;

drop policy if exists "Users see only their own state"   on public.cash_state;
drop policy if exists "Users insert only their own state" on public.cash_state;
drop policy if exists "Users update only their own state" on public.cash_state;
drop policy if exists "Users delete only their own state" on public.cash_state;

create policy "Users see only their own state"
  on public.cash_state for select
  using (auth.uid() = user_id);

create policy "Users insert only their own state"
  on public.cash_state for insert
  with check (auth.uid() = user_id);

create policy "Users update only their own state"
  on public.cash_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete only their own state"
  on public.cash_state for delete
  using (auth.uid() = user_id);
