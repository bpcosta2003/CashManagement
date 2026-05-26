-- ─────────────────────────────────────────────────────────────────────────
-- Controle de Caixa — Leitura e exportação da lista de interesse (waitlist)
--
-- Consultas pra inspecionar e exportar quem marcou interesse nos planos pagos
-- em /pricing. A tabela public.pricing_interest tem RLS ligada SEM policies,
-- então nem `anon` nem usuários logados conseguem ler — só o backend (service
-- role) e VOCÊ pelo SQL Editor do dashboard (role owner). Acesso restrito por
-- definição: precisa estar logado no projeto Supabase.
--
-- Como usar:
--  1. Cole cada bloco no Dashboard → SQL Editor (ou salve como query nomeada).
--  2. Rode a query.
--  3. Pra exportar: botão "Export" no painel de resultados → CSV ou JSON.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Listagem completa (mais recentes primeiro) ──────────────────────────
-- Esta é a query principal de leitura/exportação. Rode e use "Export → CSV".
select
  created_at,
  email,
  tier,
  source,
  ip_address,
  user_agent
from public.pricing_interest
order by created_at desc;


-- ── 2) Resumo por plano ─────────────────────────────────────────────────────
-- Quantos interessados em cada tier, com primeiro e último cadastro.
select
  tier,
  count(*)            as total,
  count(distinct email) as emails_unicos,
  min(created_at)     as primeiro,
  max(created_at)     as ultimo
from public.pricing_interest
group by tier
order by total desc;


-- ── 3) Resumo por origem (de onde a pessoa veio) ────────────────────────────
-- Útil pra ver qual canal (linkedin, wa, etc.) traz mais interesse.
-- `source` nulo = veio direto, sem parâmetro ?src= / ?utm_source=.
select
  coalesce(source, '(direto)') as origem,
  count(*)                     as total
from public.pricing_interest
group by source
order by total desc;


-- ── 4) Emails únicos pra disparo de aviso de lançamento ─────────────────────
-- Lista deduplicada (o mesmo email pode aparecer em Pro E Ultra). Em quais
-- tiers cada pessoa marcou interesse e quando entrou na lista pela 1ª vez.
select
  email,
  array_agg(distinct tier order by tier) as tiers,
  min(created_at)                        as entrou_em
from public.pricing_interest
group by email
order by entrou_em desc;
