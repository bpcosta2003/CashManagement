<img width="1395" height="584" alt="image" src="https://github.com/user-attachments/assets/b6162353-6f89-48cf-a25e-9c313faa2367" />

# Controle de Caixa 🗄️

> Controle financeiro premium pro seu negócio — rápido no celular, completo no desktop, seus dados sempre com você.

**App em produção:** https://mycashmanagement.app
**Contato:** contact@mycashmanagement.app

---

## O que é

**Controle de Caixa** é uma aplicação web progressiva (PWA) para gestão financeira do dia-a-dia de qualquer empreendimento — salão de beleza, restaurante, comércio, prestador de serviços, freelancer. Substitui planilhas manuais por uma interface moderna e responsiva que funciona offline, sincroniza entre dispositivos e oferece insights automáticos e análise por IA.

Cada lançamento registra cliente, serviço, valor, forma de pagamento, parcelas, taxa da maquininha, custo, desconto e status. O app calcula valor líquido, margem real, acompanha metas mensais e projeta os recebimentos futuros mês a mês.

---

## Funcionalidades

### Multi-empreendimento
- Gerencie vários negócios na mesma conta (ex.: salão + freelance + comércio)
- Cada empreendimento tem seu próprio caixa, clientes, catálogo, metas e taxas
- Switcher no header com mini-KPIs do mês por negócio + visão consolidada
- Logo customizada por empreendimento (PNG/JPG ~256x256)

### Onboarding personalizado
- Na primeira vez, pede o nome e o tipo do empreendimento (salão, restaurante, comércio, serviços, freelancer, outro)
- Tour guiado opcional com **dados de exemplo realistas** que mostram todas as features funcionando antes de você cadastrar qualquer coisa real
- Os dados de exemplo são descartados ao final — seus dados reais ficam intactos

### Lançamentos financeiros
- Campos: **cliente** (obrigatório, com autocompletar), **serviço** (autocompletar do catálogo), **valor** (obrigatório), forma de pagamento (Dinheiro / Pix / Débito / Crédito), parcelas, taxa, custo, desconto e status (Pago / Pendente)
- Taxa da maquininha preenchida automaticamente — configurável na barra de taxas
- Cálculo automático de valor efetivo, taxa em R$, líquido e margem por lançamento
- Validação inline + auto-shrink em valores muito longos
- Clique no card abre edição; lixeira inline para remover rápido
- Sugestão de preço: ao selecionar um serviço no catálogo, o valor padrão vem preenchido

### Painel de resumo
- **Hero card escuro** com lucro líquido do mês em destaque
- Comparação com mês anterior (↑/↓ X,X%) quando há base de dados
- KPIs Bruto / A receber / Margem em cards limpos e clicáveis
- Detalhes ao clicar: por cliente, por forma de pagamento, ticket médio, top serviços

### Metas mensais
- Defina uma meta de faturamento bruto por mês e empreendimento
- Barra de progresso com status colorido: vermelho < 50%, amarelo < 90%, verde 90-100%, dourado quando bate ou excede
- "Faltam R$ X" ou "Meta batida! +R$ Y acima" em tempo real

### Insights automáticos
- Heurísticas que detectam padrões e avisam sem ruído:
  - Queda de faturamento vs. mês anterior
  - Pagamentos pendentes acumulando
  - Concentração de receita em um único cliente
  - Margem caindo
  - Novo recorde do ano
- Banner expansível: 2 visíveis + "ver mais X insights"

### Análise por IA (Claude)
- Análise inteligente do mês com comparações, ações práticas e tendências
- Usa Claude Haiku 4.5 da Anthropic
- Cache por hash dos dados — não cobra de novo enquanto os dados não mudam
- Quota de 3 análises por usuário/mês (rate limit por JWT do Supabase)
- Recomenda gerar no último dia útil; permite gerar antes com aviso

### Tendência e composição
- Sparkline dos últimos 6 meses de lucro líquido
- Barra de distribuição por forma de pagamento (Dinheiro/Pix/Débito/Crédito)
- Legenda com percentual de cada forma

### Projeção de recebimentos
- Parcelas futuras de cartão de crédito distribuídas mês a mês
- Total bruto e líquido projetado por mês
- Drill-down por cliente/serviço/parcela
- Mostra Outubro recebe Novembro/Dezembro/Janeiro etc. para cada venda parcelada

### Visão anual consolidada
- Toggle Mês/Ano no header
- Gráfico de barras dos 12 meses do ano
- Histórico de atividade (timeline)
- Comparativo entre empreendimentos
- Top serviços anuais
- Métricas por cliente (LTV, frequência, último uso)

### Clientes (LTV)
- Lista todos os clientes com faturamento total, ticket médio, última visita e telefone
- Identifica seus melhores clientes e quem está sumindo
- Edição inline + cadastro via formulário
- Telefone com máscara BR e link `tel:` clicável

### Catálogo de serviços/produtos
- Cada empreendimento tem seu catálogo de itens com valor sugerido
- Alimentado automaticamente pelos lançamentos + CRUD manual em Preferências
- Quando você seleciona um item no formulário, o valor vem preenchido (acelera o lançamento)

### Lembretes e notificações
- **Lembrete diário in-app** (opt-in): aviso sutil quando o app é aberto após 24h sem lançamentos
- **Notificações por email** (opt-in, requer login):
  - 1º dia do mês: lembrete pra cadastrar a meta
  - Último dia útil do mês: resumo com pendências e insights
- Enviadas via cron do Vercel + Resend, usando template HTML premium

### Backup e restauração (Excel)
- Exportação `.xlsx` em 5 abas: Lançamentos, Resumo Mensal, Projeção Futura, Clientes, Catálogo
- Importação com modo **mesclar** ou **substituir**
- Preview antes de aplicar (mostra quantos lançamentos/clientes/itens serão importados)
- **Lembrete inteligente**: banner amarelo após 7 dias, vermelho urgente após 14
- **Auto-backup opt-in**: na primeira vez, pergunta se você quer backup automático a cada 14 dias. Sem o "sim", nunca baixa nada sozinho
- Apagar tudo (zona de perigo): limpa lançamentos + clientes + catálogo (do empreendimento ativo)

### Sincronização e armazenamento

| Camada | Como funciona |
|---|---|
| **Local (padrão)** | `localStorage` com migração versionada — dados ficam no dispositivo, zero dependência de rede |
| **Persistência protegida** | `navigator.storage.persist()` — pede ao browser pra não apagar os dados em situações de disco cheio |
| **Nuvem (opcional)** | Supabase — sincronização automática entre dispositivos, último-a-escrever-vence |

**Fluxo de sincronização:**
1. Login com **magic link** (email, sem senha) — UI em português, template HTML premium
2. Pull automático ao entrar
3. Push debounced (3s) após qualquer alteração
4. Reconciliação online/offline ao reconectar
5. Pill de status no header: `Sincronizado ✓` / `Sincronizando…` / `Offline` / `Erro`

### PWA — instalável como app nativo
- Funciona **completamente offline** após o primeiro acesso
- Instalável no Android/Chrome (banner nativo) e iOS/Safari ("Adicionar à Tela Inicial")
- Botão "Instalar app" nas Preferências
- Service Worker com Workbox + atualização automática
- Cache imutável para assets versionados, cache curto para HTML

### Aparência personalizável
- **Tema claro** ou **escuro** (preferência salva)
- **12 cores de destaque**: bordô, rosa, pêssego, terracota, ouro, sálvia, esmeralda, oceano, cobalto, índigo, lavanda, grafite
- Aplica em botões, links, gráficos, barras de progresso e elementos principais
- Paleta boutique base: bordô + champagne + creme

### Interface adaptativa

| Desktop | Mobile |
|---|---|
| Cards em layout largo, hover refinado | Cards otimizados pra toque |
| Header com brand + ações inline | Header compacto + bottom nav |
| Modais centralizados | Modais centralizados |
| Botão "Novo" inline | FAB inteligente — aparece quando o botão "Novo" sai da tela |

### Configurações e suporte
- Preferências em modal dedicado: tema, cor, lembretes, backup automático, notificações por email, instalação PWA, refazer tour
- Seção de **Contato e suporte** com link mailto direto pra `contact@mycashmanagement.app`

### Acessibilidade e qualidade
- ErrorBoundary com fallback útil (botão "Limpar cache e recarregar")
- Mensagens de erro do Supabase traduzidas pra PT-BR
- Contraste AA em todos os textos
- Focus ring visível em todos os elementos interativos
- Microinterações 150-250ms com `cubic-bezier(0.4, 0, 0.2, 1)`
- TypeScript estrito em todo o código

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Estilos | CSS Modules + variáveis CSS (design tokens) |
| Tipografia | Inter (display + sans) + JetBrains Mono |
| PWA | vite-plugin-pwa + Workbox |
| Backend / Auth | Supabase (PostgreSQL + RLS + Magic Link) |
| Emails transacionais | Resend (SMTP customizado pro Supabase + API pros lembretes do cron) |
| IA | Anthropic Claude Haiku 4.5 (`@anthropic-ai/sdk`) |
| Tour guiado | driver.js + dados mockados |
| Excel | SheetJS (xlsx) — lazy-loaded sob demanda |
| Hospedagem | Vercel (web + serverless functions + cron) |
| DNS / Email Routing | Cloudflare |
| Domínio | mycashmanagement.app |

### Banco de dados (Supabase)

```sql
create table public.cash_state (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  state         jsonb not null,         -- AppState completo serializado
  last_modified timestamptz not null,
  updated_at    timestamptz not null
);
```

Row-Level Security garante que cada usuário acessa apenas seus próprios dados.

---

## Rodando localmente

**Pré-requisito:** Node.js 18+

```bash
git clone https://github.com/bpcosta2003/CashManagement.git
cd CashManagement
npm install

cp .env.local.example .env.local
# Edite com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

npm run dev
# → http://localhost:5173
```

### Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot-reload |
| `npm run build` | Build de produção em `/dist` |
| `npm run preview` | Serve o `/dist` localmente |
| `npm run typecheck` | Verifica tipos sem gerar arquivos |

---

## Deploy

Veja [`DEPLOY.md`](./DEPLOY.md). Em resumo:

1. Aplique `supabase/schema.sql` no SQL Editor do Supabase
2. Configure Auth → desative "Enable email confirmations", adicione Redirect URLs
3. Configure SMTP custom no Supabase Auth com credenciais do Resend (envia magic link pelo domínio próprio)
4. Cole [`docs/email-template-magic-link.html`](./docs/email-template-magic-link.html) em Auth → Email Templates → Magic Link — template premium com a identidade visual do app
5. Configure as env vars na Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `APP_URL`, `FROM_EMAIL`, `SUPPORT_EMAIL`, `CRON_SECRET`
6. Configure DNS no Cloudflare (Vercel + Resend + Email Routing)

---

## Segurança

- **Anon key pública por design** — segurança vem do RLS no banco
- **Sem senhas** — autenticação só via magic link OTP
- **Isolamento total por usuário** — políticas RLS impedem qualquer cross-access
- **JWT validado em todos os endpoints** — `/api/ai/*` e `/api/admin/*` exigem token válido
- **Rate limit de IA por usuário** — 3 análises/mês, controlado pelo JWT
- **`.env.local` no .gitignore** — credenciais nunca entram no repo
- **WHOIS privacy** + DNSSEC habilitados no domínio

---

## Licença

Projeto privado — todos os direitos reservados.
