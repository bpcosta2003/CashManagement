# Controle de Caixa 💈

> Gestão financeira pensada para salões de beleza — rápido no celular, completo no desktop, seus dados sempre com você.

**App em produção:** https://cash-management-seven.vercel.app

---

## O que é

**Controle de Caixa** é uma aplicação web progressiva (PWA) para registro e análise dos lançamentos financeiros de um salão de beleza. Substitui planilhas manuais por uma interface moderna e responsiva que funciona offline e sincroniza automaticamente entre dispositivos.

Cada lançamento registra cliente, serviço, valor, forma de pagamento, parcelas, taxa da maquininha, custo extra, desconto e status de pagamento. O app calcula automaticamente o valor líquido, a margem real e projeta os recebimentos futuros das parcelas de crédito mês a mês.

---

## Funcionalidades

### Lançamentos financeiros

- Campos: **cliente**, **serviço**, **valor bruto**, **forma de pagamento** (Dinheiro, Pix, Débito, Crédito), **parcelas**, **taxa %**, **custo extra**, **desconto** e **status** (Pago / Pendente)
- Taxa da maquininha preenchida automaticamente conforme a forma e o número de parcelas:
  - Dinheiro / Pix → 0%
  - Débito → 1,5%
  - Crédito à vista → 2,9%
  - Crédito 2–6x → 3,9%
  - Crédito 7x+ → 4,9%
- Cálculo automático por lançamento:
  - **Valor efetivo** = Bruto − Desconto
  - **Taxa R$** = Valor efetivo × Taxa %
  - **Líquido** = Valor efetivo − Taxa − Custo
  - **Margem %** = Líquido / Bruto
- Edição inline na tabela desktop ou via painel deslizante no celular
- Navegação por mês/ano com seletor no cabeçalho

### Painel de resumo

- Cards de totais do mês: **Bruto**, **Descontos**, **Taxas**, **Custos** e **Líquido**
- Breakdown por forma de pagamento com valor e percentual de cada meio
- Indicador de recebíveis futuros (parcelas de crédito que ainda não caíram)

### Projeção de recebimentos

- Painel dedicado que distribui as parcelas de crédito nos meses futuros corretos
- Visualização mês a mês com total bruto e líquido projetado
- Detalhamento por cliente/serviço dentro de cada mês projetado

### Interface adaptativa

| Desktop | Mobile |
|---|---|
| Tabela completa com edição inline | Cards compactos por lançamento |
| Todas as colunas visíveis | Informações essenciais em destaque |
| Atalhos de teclado no formulário | FAB (+) para novo lançamento |
| — | Navegação por abas (Lançamentos / Projeção / Backup) |

### Backup e importação Excel

- Exportação dos dados para **arquivo `.xlsx`** com formatação monetária brasileira
- Importação de planilha Excel com dois modos:
  - **Mesclar**: mantém dados existentes e adiciona os importados
  - **Substituir**: substitui tudo pelos dados da planilha
- **Lembrete automático de backup**: banner amarelo após 7 dias sem backup, vermelho após 14 dias
- **Auto-backup silencioso**: exporta automaticamente ao abrir o app quando passaram mais de 14 dias (uma vez por sessão)

### Armazenamento e sincronização

| Camada | Como funciona |
|---|---|
| **Local (padrão)** | `localStorage` com versionamento — dados ficam no dispositivo, zero dependência de rede |
| **Persistência protegida** | `navigator.storage.persist()` — pede ao browser para não apagar os dados em situações de disco cheio |
| **Nuvem (opcional)** | Supabase — sincronização automática entre dispositivos, último-a-escrever-vence |

**Fluxo de sincronização na nuvem:**

1. Login com **magic link** (e-mail, sem senha)
2. Pull automático ao entrar — puxa o estado mais recente do servidor
3. Push debounced (3 segundos após qualquer alteração)
4. Reconciliação online/offline — detecta perda de rede e sincroniza ao reconectar
5. Pill de status no cabeçalho: `Sincronizado ✓` / `Sincronizando…` / `Offline` / `Erro`

### PWA — instalável como app nativo

- Funciona **completamente offline** após o primeiro acesso
- Instalável via banner nativo no Android/Chrome e "Adicionar à Tela Inicial" no iOS/Safari
- Ícones 192×512 px, tema escuro no splash, orientação portrait-primary
- Service Worker com Workbox pré-cacheando JS, CSS, HTML, fontes e imagens
- Atualização automática em background (`autoUpdate`) sem intervenção do usuário

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Estilos | CSS Modules + variáveis CSS (design tokens) |
| PWA | vite-plugin-pwa + Workbox |
| Backend / Auth | Supabase (PostgreSQL + RLS + Magic Link) |
| Excel | SheetJS (xlsx) — carregado dinamicamente (lazy) |
| Deploy | Vercel |

### Arquitetura de chunks

O build separa o código em chunks paralelos para carregamento otimizado:

```
app code        ~51 KB  (16 KB gzipped)   — carrega primeiro
react           ~45 KB  (14 KB gzipped)   — paralelo
supabase       ~207 KB  (53 KB gzipped)   — paralelo, só se configurado
excel          ~428 KB  (lazy)            — carregado só ao abrir o painel de backup
```

### Banco de dados (Supabase)

Tabela única `cash_state` — um documento JSON por usuário:

```sql
create table public.cash_state (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  state         jsonb not null,         -- AppState completo serializado
  last_modified timestamptz not null,   -- timestamp do cliente (controla last-write-wins)
  updated_at    timestamptz not null    -- atualizado automaticamente por trigger
);
```

Row-Level Security garante que cada usuário acessa **apenas seus próprios dados** — 4 políticas (select / insert / update / delete) usando `auth.uid() = user_id`.

---

## Estrutura do projeto

```
├── src/
│   ├── components/
│   │   ├── auth/          # LoginPanel, SyncStatus
│   │   ├── backup/        # BackupPanel (export/import Excel)
│   │   ├── feedback/      # BackupReminder, Toaster
│   │   ├── forms/         # EntryForm, Sheet (painel deslizante)
│   │   ├── layout/        # Header, BottomNav, TaxBar, InstallBanner
│   │   ├── mobile/        # MobileCard, MobileCardList, FAB
│   │   ├── onboarding/    # FirstUseModal
│   │   ├── projection/    # ProjectionSection
│   │   ├── summary/       # SummaryCards, PaymentBreakdown
│   │   └── table/         # DesktopTable, TotalsRow
│   ├── hooks/
│   │   ├── useAuth.ts     # Estado de autenticação Supabase
│   │   ├── useBreakpoint.ts
│   │   ├── useCalc.ts     # Derivações: summary, breakdown, projeção
│   │   ├── useStorage.ts  # Estado principal + persistência local
│   │   └── useSync.ts     # Orquestração pull/push com debounce
│   ├── lib/
│   │   ├── calc.ts        # Funções puras de cálculo financeiro
│   │   ├── excel.ts       # Export/import via SheetJS
│   │   ├── storage.ts     # localStorage + persistent storage + backup helpers
│   │   ├── supabase.ts    # Singleton do cliente Supabase
│   │   └── sync.ts        # pullState / pushState (last-write-wins)
│   ├── styles/
│   │   ├── global.css
│   │   └── tokens.css     # Design tokens (cores, espaçamentos, tipografia)
│   ├── types.ts
│   ├── constants.ts
│   └── App.tsx
├── supabase/
│   └── schema.sql         # Schema completo — aplique no Supabase Dashboard
├── scripts/
│   └── deploy.sh          # Deploy idempotente para o Vercel
├── public/                # Ícones PWA, favicon
├── vercel.json            # SPA rewrite + cache headers
├── vite.config.ts
└── DEPLOY.md              # Guia passo-a-passo de deploy
```

---

## Rodando localmente

**Pré-requisito:** Node.js 18+

```bash
# 1. Clone o repositório
git clone https://github.com/bpcosta2003/CashManagement.git
cd CashManagement

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com as credenciais do seu projeto Supabase:
#   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
#   VITE_SUPABASE_ANON_KEY=eyJ...

# 4. Inicie o servidor de desenvolvimento
npm run dev
# → http://localhost:5173
```

> O app funciona sem Supabase configurado — nesse modo opera 100% offline com localStorage.

### Comandos disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot-reload |
| `npm run build` | Build de produção em `/dist` |
| `npm run preview` | Serve o `/dist` localmente |
| `npm run typecheck` | Verifica tipos sem gerar arquivos |

---

## Deploy

Veja o guia completo em [`DEPLOY.md`](./DEPLOY.md). Resumo:

1. Aplique `supabase/schema.sql` no SQL Editor do Supabase Dashboard
2. Configure Auth → desative "Enable email confirmations", adicione as Redirect URLs
3. Execute `bash scripts/deploy.sh` com `VERCEL_TOKEN` definido

O script é idempotente — pode rodar várias vezes e vai atualizar as env vars sem duplicar.

---

## Segurança

- **Anon key pública por design**: exposta no bundle JS, segura porque a proteção real vem das políticas RLS do PostgreSQL
- **Sem senhas**: autenticação exclusivamente via magic link (OTP por e-mail)
- **Isolamento total por usuário**: RLS impede qualquer acesso cruzado entre contas
- **`.env.local` ignorado pelo git**: credenciais nunca entram no repositório

---

## Licença

Projeto privado — todos os direitos reservados.
