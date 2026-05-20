-- ─────────────────────────────────────────────────────────────────────────
-- Controle de Caixa — Lista de interesse em planos pagos (Fase 0 monetização)
--
-- Coleta emails de quem clicou "Quero ser avisado" em cada tier na página
-- /pricing. Usado pra (a) validar demanda antes de construir Stripe e
-- (b) montar lista de waitlist pra lançamento beta.
--
-- Apply via Dashboard → SQL Editor (re-rodável: IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.pricing_interest (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  tier        text not null check (tier in ('pro', 'ultra')),
  source      text,         -- de onde a pessoa veio (ex.: "linkedin", "wa")
  user_agent  text,
  ip_address  text,
  created_at  timestamptz not null default now(),
  -- Mesmo email pode marcar interesse em Pro E Ultra — não bloqueamos. O
  -- que evitamos é spam: mesma combinação email+tier duplicada.
  unique (email, tier)
);

create index if not exists pricing_interest_tier_idx
  on public.pricing_interest(tier);

create index if not exists pricing_interest_created_idx
  on public.pricing_interest(created_at desc);

alter table public.pricing_interest enable row level security;

-- Frontend NÃO lê nem escreve direto. Só o backend (service role key)
-- toca essa tabela — passa pela validação do endpoint /api/pricing-interest.
-- Nenhuma policy de SELECT/INSERT pra anon ou authenticated, então RLS
-- bloqueia tudo por padrão. Mantemos a tabela com RLS ligada por defesa
-- em profundidade caso alguém esqueça e tente expor.
