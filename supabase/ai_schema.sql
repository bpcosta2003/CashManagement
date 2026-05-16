-- ─────────────────────────────────────────────────────────────────────────
-- Controle de Caixa — Schema da feature de Análise IA
--
-- Tabelas usadas pela Vercel Function /api/ai/analyze:
--   • ai_analysis_cache  → guarda a última análise gerada por (user, business, mês, ano)
--   • ai_usage           → log de uso pra rate limit (3 análises/mês) e kill switch global
--
-- Apply via Dashboard → SQL Editor (após aplicar schema.sql principal).
-- Re-running é seguro (usa IF NOT EXISTS / DROP IF EXISTS).
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Cache de análises ──────────────────────────────────────────────────
-- Uma linha por (user, business, mês, ano). Reaproveitada quando o
-- data_hash bate (nada mudou nos lançamentos do mês desde a última
-- análise). Cache hit não conta no rate limit.
create table if not exists public.ai_analysis_cache (
  user_id        uuid not null references auth.users(id) on delete cascade,
  business_id    text not null,
  mes            int  not null check (mes between 0 and 11),
  ano            int  not null check (ano between 2000 and 2100),
  data_hash      text not null,
  content        text not null,
  model          text not null,
  tokens_input   int  not null default 0,
  tokens_output  int  not null default 0,
  created_at     timestamptz not null default now(),
  primary key (user_id, business_id, mes, ano)
);

create index if not exists ai_analysis_cache_user_idx
  on public.ai_analysis_cache(user_id);

-- Lookup global por conteúdo: o handler de /api/ai/analyze busca por
-- data_hash isoladamente (cross-user) pra deduplicar análises de dados
-- idênticos — barra a abuso "criar N contas e importar o mesmo backup".
-- Pega a entrada mais recente, daí (data_hash, created_at desc).
create index if not exists ai_analysis_cache_hash_idx
  on public.ai_analysis_cache(data_hash, created_at desc);

alter table public.ai_analysis_cache enable row level security;

drop policy if exists "ai_cache_select_own" on public.ai_analysis_cache;
create policy "ai_cache_select_own"
  on public.ai_analysis_cache for select
  using (auth.uid() = user_id);

-- ─── Log de uso ─────────────────────────────────────────────────────────
-- Cada chamada real à API Anthropic gera uma linha aqui. Cache hits NÃO
-- entram. Usado pra:
--   1. Rate limit do usuário: COUNT(DISTINCT mes,ano) no mês corrente
--   2. Kill switch global: SUM(cost_cents) no mês corrente
create table if not exists public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  business_id   text not null,
  mes           int  not null,
  ano           int  not null,
  model         text not null,
  tokens_input  int  not null,
  tokens_output int  not null,
  cost_cents    int  not null,
  created_at    timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx
  on public.ai_usage(user_id, created_at desc);

create index if not exists ai_usage_global_created_idx
  on public.ai_usage(created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own"
  on public.ai_usage for select
  using (auth.uid() = user_id);

-- Backend usa a service role key, que ignora RLS. Mantemos as policies
-- pra defesa em profundidade (SELECTs futuros do frontend continuam seguros).
