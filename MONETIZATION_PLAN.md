# Plano de Monetização — Controle de Caixa

> Estratégia em 5 fases pra transformar o app gratuito em SaaS pago sem queimar o trust de quem está no beta.

> **Manutenção:** este doc é a fonte de verdade da estratégia e anda junto da landing `/pricing` (`src/pages/PricingPage.tsx`). Toda mudança de preço, tier, feature por plano ou posicionamento na landing deve ser refletida aqui — e vice-versa.

**Status atual:** Fase 0 — landing `/pricing` capturando interesse em Pro e Ultra. Nenhum pagamento processado ainda. App inteiro é grátis pra qualquer usuário cadastrado.

**Princípio geral:** quem entra no beta e marca interesse trava desconto vitalício. Features marcadas como `Por tempo limitado no Free` no pricing page hoje migram pro Pro no lançamento — usuário sabe disso de antemão, sem retirada surpresa.

**Público-alvo (dois perfis):** o app não é só pro **dono** do negócio — serve também pro **profissional que atende por conta** dentro de um estabelecimento (cabeleireiro/barbeiro que aluga a cadeira, manicure, vendedor comissionado, freelancer). Esse segundo perfil precisa controlar as próprias vendas e saber quanto fica com ele depois do repasse pro estabelecimento — exatamente o que a **taxa do negócio por lançamento** resolve. Implicações de monetização:
- O profissional costuma ser usuário **Free** (1 empreendimento = o controle dele), então a taxa do negócio/auxiliar precisa continuar gratuita — é o gancho de aquisição desse público.
- O **dono** é quem converte pra **Pro/Ultra** (multi-negócio, IA, relatórios, automação fiscal).
- A landing `/pricing` fala com os dois perfis explicitamente (hero, dores, FAQ "trabalho por comissão / alugo a cadeira").

---

## Estado atual (pré-Fase 1)

Tudo grátis. Os limites abaixo já existem mas não geram paywall ainda.

### Disponível no Free hoje

| Funcionalidade | Limite atual | Migração |
|---|---|---|
| **Seu empreendimento** (multi-negócio com switcher, KPIs por negócio, logo customizada) | Ilimitado | → Pro (5) / Ultra (∞) na Fase 1 |
| **Sincronização na nuvem** (Supabase, magic link) | Ilimitado | Permanece Free |
| **Preferências** (tema, cor, lembretes, PWA install, tour, contato) | — | Permanece Free |
| **Taxa do cartão, do negócio e auxiliar** (por lançamento — repasse pra cadeira/comissão, custo, auxiliar) | — | Permanece Free (gancho de aquisição do profissional que atende por conta) |
| **Mês e ano em foco** (toggle Mês/Ano, gráfico 12 meses, timeline) | — | Permanece Free |
| **Resumo do mês** (bruto, líquido, margem, drill-down) | — | Permanece Free |
| **Meta mensal** (barra colorida, "faltam R$ X") | 1 meta por mês por negócio | Permanece Free |
| **Alertas automáticos** (queda, pendência, concentração, novo recorde) | Heurísticas básicas | Permanece Free. Pro/Ultra ganham "insights com IA" na Fase 2 |
| **Análise por IA (Claude)** | 3/mês por usuário | → Free 1/mês (2 no 1º mês), Pro 30/mês — Fase 1 |
| **Lançamentos do mês** | Ilimitados | Permanece Free |
| **Projeção futura** (parcelas de cartão mês a mês) | — | Permanece Free |
| **Clientes e LTV** | Ilimitado | Permanece Free |
| **Catálogo de serviços/produtos** | Ilimitado | Permanece Free |
| **Backup e restauração Excel** (5 abas, mesclar/substituir, auto-backup 14d) | Ilimitado | Manual permanece Free. Export automático pro contador vira Pro na Fase 2. |
| **PDF anual e mensal** | Disponível | → Pro na Fase 1 |
| **Lembretes in-app + notificações por email** (resumo último dia útil + lembrete de meta no 1º) | Disponível | Permanece Free. Lembrete diário por email e WhatsApp viram Pro na Fase 2 |

---

## Fase 1 — Lançamento do Pro

**Objetivo:** validar willingness-to-pay e gerar primeira receita recorrente.

**Quando:** assim que tiver ≥ 50 interessados no Pro pela landing `/pricing`.

### Free (com paywalls ativados)

Permanece grátis pra sempre:
- Lançamentos ilimitados, mesmo offline
- Sincronização entre dispositivos (login mágico)
- Mês e ano lado a lado, gráfico de 12 meses, timeline
- Resumo do mês: bruto, líquido, margem, ticket médio, top serviços
- Projeção de recebimentos futuros mês a mês
- Alertas automáticos (heurísticas básicas)
- Clientes com LTV
- Catálogo de serviços
- Backup e restore Excel manual
- Meta mensal
- Taxa do cartão, do negócio e auxiliar por lançamento (separa o que é seu do repasse — chave pro profissional que atende por conta)
- Tema, cor, instala como app (PWA)
- Lembretes in-app + notificações por email (resumo último dia útil + lembrete de meta no 1º)

Restrito (era ilimitado, vira limitado):
- **1 empreendimento** (era ilimitado)
- **1 análise por IA por mês** (2 no 1º mês como bônus de onboarding)

Removido do Free:
- PDF anual e mensal completos → Pro

### Pro — R$ 29/mês

Tudo do Free, mais:
- Até 5 empreendimentos, troca em 1 toque
- 30 análises por IA por mês
- PDF anual e mensal completos
- **Insights com IA** (pendências + sugestões de ação — Fase 2)
- **Lembrete diário por email e WhatsApp** (Fase 2)
- **Export automático pro contador, todo dia 5** (Fase 2)

### Checklist de implementação Fase 1

- [ ] Tabela `subscriptions` no Supabase (user_id, tier, status, started_at, expires_at, stripe_customer_id, stripe_subscription_id)
- [ ] Integração com Stripe (Checkout + Webhook)
- [ ] RLS na tabela `subscriptions`
- [ ] Helper `getCurrentTier(userId)` cacheado por 5min
- [ ] Hook `useTier()` no frontend que lê o tier ativo
- [ ] Componente `<TierGate>` que esconde/mostra UI por tier
- [ ] Componente `<UpgradeModal>` reutilizável
- [ ] Backend: `/api/ai/analyze` valida quota por tier (1 Free, 30 Pro) — atualizar `aiContextServer.ts`
- [ ] Frontend: bloquear criação do 2º empreendimento no Free, mostrar `<UpgradeModal>`
- [ ] PDF generators (`/lib/pdf.ts`) só pra Pro+ — botão escondido no Free
- [ ] Email cron (`/api/cron/email-reminders`) só dispara pra Pro+
- [ ] Migrar usuários beta atuais: snapshot dos que estão no banco antes do dia X, marcar `legacy: true`, dar 1 mês de Pro grátis
- [ ] Página `/conta` mostrando plano atual, próxima cobrança, opção de cancelar
- [ ] Pricing page: trocar CTA "Quero ser avisado" por "Assinar Pro" (Stripe Checkout)
- [ ] Banner global após login se ainda no Free explicando os limites novos

---

## Fase 2 — Retenção do Pro

**Objetivo:** quem assinou na Fase 1 não cancela. Cada feature aqui é "esses R$ 29/mês justificam o investimento".

**Quando:** 30-60 dias depois da Fase 1, com base no churn.

### Adicionado ao Pro

- **Lembrete diário automático por email** — "Lançou hoje? 23 lançamentos esse mês". Email leve, customizável (escolhe horário). Reforça hábito sem virar spam.
- **Export automático pro contador** — todo dia 5, envia Excel pro email do contador cadastrado no perfil. Remove a fricção mensal de "mandar a planilha".
- **Insights aprimorados com IA cheap** — `Pendências de mais de 14 dias` enriquecida com sugestão de ação ("Ligar pro cliente X, valor R$ 480, último contato 21 dias atrás"). Roda em Claude Haiku, custo ~R$ 0,001/análise.
- **Lembrete diário via WhatsApp** — opcional, opt-in. Via API oficial Meta (preferível) ou Z-API (mais barato). Converte muito no Brasil — usuário lê WhatsApp; email às vezes não.

### Checklist Fase 2

- [ ] Cron `/api/cron/email-daily-reminder` (consulta tier, lançamentos do dia, dispara via Resend)
- [ ] Campo `accountant_email` no perfil + UI em Preferências
- [ ] Cron `/api/cron/accountant-export` (dia 5 do mês, monta XLSX, anexa, envia)
- [ ] Endpoint `/api/ai/insights-enrich` que enriquece insights heurísticos com Haiku
- [ ] Cache de 24h por insight (mesmo hash de dados → não cobra de novo)
- [ ] Integração WhatsApp (Z-API tem trial grátis pra validar; Meta oficial pra produção)
- [ ] UI de opt-in WhatsApp em Preferências (telefone + verificação por código)
- [ ] Painel admin pra acompanhar custo de IA + WhatsApp por usuário

---

## Fase 3 — IA por item do catálogo (Ultra-exclusive)

**Objetivo:** inteligência de catálogo como diferencial high-ticket. Junto do comparativo público de preço (Fase 5), forma a camada de "inteligência de preço/produto" exclusiva do Ultra.

**Quando:** Pro estável (MRR ≥ R$ 1.500), churn < 8%/mês.

### Ultra ganha:

- Botão **"Analisar com IA"** em cada item do catálogo
- IA recebe nome do item + histórico de vendas (frequência, ticket médio, sazonalidade)
- Retorna: resumo, público-alvo, copy de venda, objeções comuns, sugestão de preço de venda
- Cache de 30 dias por SKU (mesmo item não cobra de novo nesse período)

### Limites:

- **Free / Pro:** sem acesso
- **Ultra:** ilimitado

### Por que essa fase importa?

É a IA POR PRODUTO — útil pra qualquer tipo de negócio (não só e-commerce). Consolidada no Ultra junto do comparativo público de preço (#29) e dos marketplaces, vira uma frente única de "inteligência de preço" que justifica o high-ticket: quem vende online e quer otimizar catálogo vai Ultra.

### Checklist Fase 3

- [ ] Endpoint `/api/ai/catalog-analyze` (recebe `catalog_item_id`, monta contexto do produto, chama Claude)
- [ ] Tabela `catalog_ai_analysis` (sku_hash, user_id, analysis_jsonb, created_at, expires_at)
- [ ] Cache lookup antes de chamar API (TTL 30 dias)
- [ ] Quota separada da análise mensal (campo `catalog_ai_quota_used` em `subscriptions` ou usage)
- [ ] UI: botão "🤖 Analisar com IA" em cada card de catálogo
- [ ] Modal de exibição da análise + botão de re-analisar (consome quota)

---

## Fase 4 — Lançamento do Ultra

**Objetivo:** primeira oferta high-ticket. Margem >R$ 70 por usuário.

**Quando:** Fase 3 validou que IA contextual gera engajamento (>40% dos Pro usaram catalog-analyze no mês).

### Ultra — R$ 119/mês

Tudo do Pro, mais:

- **Consultor IA com onboarding estruturado** — 8 perguntas iniciais ("qual seu desafio?", "qual segmento?", "quanto tempo de negócio?", etc.) montam o perfil do dono.
- **Plano de 30 dias com 4 metas semanais** — gerado pela IA pós-onboarding, ajustado ao perfil real.
- **Check-in diário via push/email** — 1 linha de feedback do usuário ("hoje fiz X", "estou travado em Y"), IA acompanha.
- **Análise semanal + replanejamento mensal** — IA recompõe o plano com base no que foi (e não foi) executado.
- **Análises por IA ilimitadas** (mensal + catálogo)
- **Empreendimentos ilimitados**
- **Análise de catálogo por IA + comparativo público de preço + alerta de estoque** (Fases 3 e 5 — Em breve)
- **Integração com Mercado Livre, Shopee e Amazon** (Fase 5 — Em breve)
- **DAS/DARF completo: cálculo, PDF e agendamento via PIX** (Fase 4.5 — Em breve)

### Custo real por usuário Ultra

- Onboarding: ~R$ 0,30 (Claude Sonnet, 1x)
- Check-in diário: ~R$ 0,02 × 30 dias = R$ 0,60
- Análise semanal: ~R$ 0,08 × 4 = R$ 0,32
- Replanejamento mensal: ~R$ 0,15

**Total: ~R$ 1,37/mês por usuário ativo. Margem ~R$ 117,63 / 98,8%.**

### Checklist Fase 4

- [ ] Tabela `consultor_profiles` (user_id, onboarding_answers jsonb, created_at)
- [ ] Tabela `consultor_plans` (user_id, plan_jsonb, week_goals, started_at, expires_at)
- [ ] Tabela `consultor_checkins` (user_id, day, user_input, ai_response, created_at)
- [ ] Endpoint `/api/consultor/onboarding` (8 perguntas → gera plano inicial)
- [ ] Endpoint `/api/consultor/checkin` (recebe feedback do dia, gera resposta curta)
- [ ] Cron `/api/cron/consultor-weekly-analysis` (sextas)
- [ ] Cron `/api/cron/consultor-monthly-replan` (último dia do mês)
- [ ] Push notification (via service worker, web push) — Ultra-only
- [ ] UI dedicada `/consultor` (chat-style, histórico de check-ins, plano semanal visível)
- [ ] Trocar Stripe Checkout pra incluir SKU do Ultra

---

## Fase 4.5 — DARF / DAS Simples Nacional

**Objetivo:** transformar a dor "quanto pago de imposto este mês?" em
diferenciação high-ticket. MEI/Simples paga DARF/DAS todo mês 20 — todo
mundo erra ou esquece. A automação fiscal inteira (do cálculo ao
pagamento) é **exclusividade Ultra**: é trabalho real, recorrente e que
muita gente paga contador pra fazer — exatamente o tipo de dor que
sustenta o preço do Ultra.

**Quando:** depois da Fase 4 estabilizar (≥ 100 Ultra ativos). Antes
disso, valida com waitlist pra ver se o pedido aparece organicamente.

### Ultra — Automação fiscal completa (Em breve)

Recurso fiscal inteiro num plano só. Três camadas, todas no Ultra:

**1. Cálculo automático do imposto**
- Lê o bruto do mês (faturamento) + tipo de regime tributário
  (MEI / Simples Nacional anexos I-V) do empreendimento
- Calcula a alíquota efetiva: tabela do Simples 2024 com fator R
  pra anexo III/V; DAS fixo pra MEI por categoria (comércio,
  serviços, ambos)
- Mostra "Você deve aproximadamente R$ X em DAS/DARF este mês,
  vencimento dia 20"

**2. PDF da guia pronta pra pagar**
- Geração do **PDF da guia DAS/DARF** com código de barras válido,
  pronto pra pagar no banco — elimina o passo "ir no Simples
  Nacional/Receita pra emitir"
- Histórico anual: tabela de meses com valor pago + status
  (em aberto / pago / atrasado)
- Lembrete por email 3 dias antes do vencimento
- Junto da exportação de PDF mês/ano — fluxo "fechar o mês"
  vira: PDF do mês + PDF da DARF, dois cliques

**3. Geração + agendamento automático**
- **Agendamento automático** no dia do vencimento, com PIX QR Code
  pronto pra pagar (via Open Finance)
- Pagamento agendado via integração com banco (PJ Pix Cobrança)
  — opcional, com aprovação manual da primeira vez
- Conciliação automática: marca como "pago" quando o débito cai
  na conta vinculada
- Aviso fiscal pré-mensal: "seu faturamento de [mês] está em
  R$ X, projetando R$ Y no fim do mês. Seu DAS estimado é R$ Z."

### Por que essa fase importa?

Esse é o **feature de produto que justifica pagamento sozinho** pro
dono pequeno (e pro profissional MEI que atende por conta) — todo
MEI/Simples gasta 1-3h por mês com isso e muita gente paga R$ 50-100
pro contador só pra emitir guia. Como diferencial Ultra, ancora o
high-ticket: quem quer "nunca mais pensar no imposto" vai Ultra.

**Tradeoff aceito:** ao não liberar nem o cálculo no Free, abrimos mão
do gancho de SEO ("calcular DAS MEI", "gerar DARF online") em troca de
preservar a automação fiscal inteira como alavanca de conversão pro
Ultra. Se o SEO se mostrar crítico na validação, reavaliar liberar só
o número (sem PDF) no Free numa fase futura.

### Riscos regulatórios

- Geração de guia DARF tem requisitos da Receita (não pode inventar
  código de barras). Solução: usar API oficial do Simples Nacional
  (existe pra contadores via convênio) OU parceria com `e-financeira`
  / serviço terceiro.
- Pagamento automático precisa de Open Finance ou banco PJ parceiro.
  Começar só com PIX Cobrança gerado pelo nosso lado, usuário escaneia
  e paga — sem débito automático no MVP.

### Checklist Fase 4.5

- [ ] Campo `regimeTributario` em `Business` (MEI / Simples I-V)
- [ ] Função `calcDarfMes(rows, regime, mes, ano)` em `src/lib/tax.ts` — Ultra-gated
- [ ] UI no resumo mensal: card "Imposto estimado · R$ X" (Ultra)
- [ ] Endpoint `/api/tax/generate-darf-pdf` (Ultra) — Receita ou parceiro
- [ ] Tabela `darf_history` (user_id, mes, ano, valor, status, paid_at)
- [ ] Cron `/api/cron/darf-reminder-email` (3 dias antes do dia 20)
- [ ] Integração PIX Cobrança via PSP (Asaas/Cora/Inter)
- [ ] Conciliação automática com extrato vinculado

---

## Fase 5 — Marketplaces (Ultra-exclusive)

**Objetivo:** ser o app de gestão pra quem vende online no Brasil. Diferenciador vs ContaAzul/ZeroPaper/Bling — eles têm marketplace mas falta o lado "operacional/dono".

**Quando:** Fase 4 com pelo menos 30 usuários Ultra ativos (sinal de demanda real).

### Roadmap

1. **Mercado Livre (5-7 dias)** — 70% do mercado BR, API mais simples. OAuth 2.0, lê vendas, repassa pro lançamento automaticamente com taxa e custo já preenchidos.
2. **Catálogo Camada 2 (3 dias)** — endpoint público do ML retorna preço médio de produtos similares. Inteligência de catálogo passa a sugerir "seu preço está 18% abaixo do mercado, considere aumentar".
3. **Alertas de estoque (3 dias)** — calcula runway (estoque ÷ velocidade de venda) e reorder point. Notifica via email/push quando entra em alerta.
4. **Shopee (7-10 dias)** — segue padrão do ML (OAuth + REST). Menos crítico que ML mas relevante.
5. **Amazon SP-API (14+ dias)** — só implementa se houver demanda explícita de cliente (Ultra que vende lá). API complexa, certificação anual.

### Checklist Fase 5

- [ ] OAuth 2.0 flow pra Mercado Livre (callback URL na Vercel, refresh tokens)
- [ ] Tabela `marketplace_connections` (user_id, marketplace, access_token, refresh_token, expires_at)
- [ ] Job `/api/marketplaces/sync-ml` que puxa vendas novas a cada hora
- [ ] Mapper ML → Row do app (preencher cliente, serviço, valor, taxa do ML, parcelas)
- [ ] UI em Preferências: "Conectar Mercado Livre" → OAuth
- [ ] Tabela `inventory` (user_id, sku, quantity, last_movement_at, alert_threshold)
- [ ] Endpoint `/api/inventory/check-runway` (cron diário, dispara alertas)
- [ ] Comparativo de preço: chamada ao ML público, cache 7 dias
- [ ] Mesma estrutura pra Shopee (OAuth + sync)

---

## Migração de quem está no beta

**Princípio:** ninguém perde acesso sem aviso. Quem está no beta hoje tem vantagem.

### Política

1. **Aviso prévio de 30 dias** antes de qualquer feature do Free virar Pro. Email + banner in-app.
2. **Trial Pro grátis de 30 dias** pra todos os usuários ativos (≥ 1 lançamento nos últimos 60 dias) no momento da Fase 1.
3. **Desconto vitalício de 20%** pra quem marcou interesse na landing `/pricing` antes da Fase 1.
4. **Cupom específico** pra quem assina nos primeiros 7 dias do lançamento (`BETA50`, 50% off no 1º ano).
5. **Os 100 primeiros Pro** ganham um título "Founding Pro" + badge na UI + voto em features.

### Mensagem-template pro email de Fase 1

```
Assunto: Os planos chegaram. Quem está aqui desde o começo tem prioridade.

Oi [nome],

Você usa o Controle de Caixa há [X] dias. Obrigado por ter entrado cedo.

A partir de [data], o app ganha planos pagos (Pro R$ 29/mês). Algumas coisas que hoje estão no Free vão pro Pro:
- Mais de 1 empreendimento (Pro: até 5)
- Análises por IA além de 1/mês (Pro: 30/mês)
- PDF anual e mensal

**Você tem 3 caminhos:**

1. **Continuar no Free.** Não muda nada, exceto os itens acima — você vai precisar escolher 1 empreendimento se tiver mais. 30 dias pra escolher.

2. **Pro grátis por 30 dias.** Já está liberado pra você. Sem cobrar nada agora. Cancele a qualquer hora.

3. **Pro com 20% off pra sempre.** Porque você marcou interesse na landing. Cupom `BETA20`. Vale enquanto continuar assinando.

Qualquer dúvida, responde esse email. Eu leio cada um.

— Controle de Caixa
```

---

## Métricas pra acompanhar

| Métrica | Onde | Meta inicial |
|---|---|---|
| **MRR** (Monthly Recurring Revenue) | Stripe Dashboard | R$ 500 no mês 1 da Fase 1 |
| **Conversão Free → Pro** | Mixpanel/PostHog ou query Supabase | ≥ 4% nos primeiros 90 dias |
| **Churn mensal** | Stripe | ≤ 8% nos 6 primeiros meses |
| **DAU/MAU** (proxy de stickiness) | Supabase (last_active_at) | ≥ 40% |
| **Custo por usuário IA** | Anthropic dashboard | ≤ 10% do MRR do usuário |
| **NPS** | Survey in-app trimestral | ≥ 50 |
| **Taxa de uso do consultor (Ultra)** | Supabase (checkins por mês) | ≥ 15 check-ins/mês por user ativo |

---

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Usuário do beta se sente traído com paywall | Alta | Alta | Aviso 30d antes + trial 30d + desconto vitalício 20% |
| Churn alto no Pro por falta de feature post-launch | Média | Alta | Fase 2 já mapeada pra rodar em 60d após Fase 1 |
| Custo de IA estourando margem | Baixa | Média | Cache agressivo (por data_hash mensal, por sku no catálogo); quota rígida; downgrade automático pra Haiku quando possível |
| Stripe bloqueio (jurisdiction) | Baixa | Alta | Backup com Pagar.me (PIX nativo) — implementar em paralelo na Fase 1 |
| Marketplaces API mudam | Média | Média | Camada de abstração `MarketplaceAdapter` por marketplace; testes de integração rodando diário |

---

## Tags de feature na landing `/pricing`

Pra manter a comunicação coerente na página de preço, há 2 tags possíveis em cada feature:

| Tag | Quando aparece | Visual |
|---|---|---|
| `Por tempo limitado no Free` | Feature que **existe e funciona no Free hoje** mas que **migra pro Pro** quando o plano lançar. Cria urgência sem retirar acesso. | Pill sólido (accent bg + accent-on text + shadow) |
| `Em breve` | Feature **ainda não construída**, sai em fase futura (2-5). Sinaliza roadmap. | Pill suave (accent-soft bg + accent text) |

Hierarquia visual: `Por tempo limitado no Free` POP mais que `Em breve` — uma é "use agora antes que vá", a outra é "vem aí".

---

## Decisões já fixadas

- **Suporte por email não é diferencial pago.** Qualquer um manda email pra `contact@mycashmanagement.app`. Foi removido da pricing page.
- **Sync na nuvem é Free pra sempre.** Hoje é opt-in via login mágico, custo no Supabase é desprezível, e ter no Free aumenta retenção e força adoção multi-device.
- **Backup Excel manual é Free pra sempre.** O que vira Pro é o export AUTOMÁTICO pro contador (dia 5 do mês, anexo no email do contador) — feature nova, fase 2.
- **PDF anual e mensal migram pro Pro** porque são percebidos como features "premium de relatório", e historicamente é o gatilho de compra pra quem precisa entregar pro contador/banco/sócio.
- **Análise por IA mensal hoje tem 3/mês.** Vira 1/mês no Free (2 no 1º mês como bônus de onboarding), 30/mês no Pro e ilimitada no Ultra. Limite atual do Anthropic + cache por data_hash já cobre o custo do Free.
- **Empreendimentos:** Free 1 · Pro até 5 · Ultra ilimitado. Multi-empreendimento é a alavanca principal de conversão do dono.
- **Insights viram escada.** Free tem **alertas automáticos** (heurística: queda, pendência, concentração). Pro/Ultra ganham **insights com IA** (pendências enriquecidas + sugestões de ação). A diferença verbal "alertas" × "insights" reforça o upgrade.
- **Lembretes/notificações viram escada.** Free tem in-app + email básico (resumo do mês + meta) — permanece grátis. Pro ganha **lembrete diário por email e WhatsApp** (Fase 2). Email básico deixou de ser "por tempo limitado".
- **Análise de catálogo por IA e comparativo público de preço são Ultra**, não Pro. Consolidados junto dos marketplaces numa frente única de "inteligência de preço/produto".
- **DAS/DARF inteiro (cálculo, PDF e agendamento PIX) é exclusividade Ultra.** Abrimos mão do gancho de SEO-via-Free em troca de preservar a automação fiscal como alavanca de conversão high-ticket.
- **Marketplaces ficam todas no Ultra**, não distribuídas entre Pro e Ultra. Mensagem fica simples: "quem vende online vai Ultra".

---

> Última atualização: 2026-05-25. Mantenha esse arquivo sincronizado com a `PricingPage.tsx` e com o roadmap real conforme cada fase fechar.
