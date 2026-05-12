# Controle de Caixa 🗄️

> Controle financeiro premium pro seu negócio — rápido no celular, completo no desktop, seus dados sempre com você.

**App em produção:** https://cash-management-seven.vercel.app

---

## O que é

**Controle de Caixa** é uma aplicação web progressiva (PWA) para registro e análise dos lançamentos financeiros do dia-a-dia de qualquer empreendimento — salão de beleza, restaurante, comércio, prestador de serviços, freelancer. Substitui planilhas manuais por uma interface moderna e responsiva que funciona offline e sincroniza entre dispositivos.

Cada lançamento registra cliente, serviço, valor, forma de pagamento, parcelas, taxa da maquininha, custo extra, desconto e status. O app calcula valor líquido, margem real e projeta os recebimentos futuros mês a mês.

---

## Funcionalidades

### Onboarding personalizado
- Na primeira vez, pede o nome do empreendimento e o tipo (salão, restaurante, comércio, serviços, freelancer, outro)
- Brand do header passa a exibir o nome do empreendimento abaixo de "Controle de Caixa"

### Lançamentos financeiros
- Campos: **cliente** (obrigatório), serviço, **valor** (obrigatório), forma de pagamento (Dinheiro / Pix / Débito / Crédito), parcelas, taxa, custo extra, desconto e status (Pago / Pendente)
- Taxa da maquininha preenchida automaticamente (Pix/Dinheiro = 0%, Débito = 1,5%, Crédito 1x = 2,9%, 2-6x = 3,9%, 7+x = 4,9%)
- Cálculo automático de valor efetivo, taxa em R$, líquido e margem por lançamento
- Validação inline — não permite salvar lançamento sem cliente e valor > 0
- Clique no card abre a edição; ícone de lixeira direto no card para remover rápido

### Painel de resumo
- **Hero card escuro** com lucro líquido do mês em destaque
- Comparação com mês anterior (↑/↓ X,X%) quando há base de dados
- KPIs Bruto, A receber, Margem em cards limpos
- Auto-shrink dos valores muito longos pra nunca ultrapassar o card

### Tendência + Composição
- Sparkline dos últimos 6 meses de lucro líquido
- Barra de distribuição por forma de pagamento (Dinheiro/Pix/Débito/Crédito)
- Legenda com percentual de cada forma

### Projeção de recebimentos
- Parcelas futuras de cartão distribuídas mês a mês
- Total bruto e líquido projetado por mês
- Detalhamento por cliente/serviço

### Interface adaptativa premium

| Desktop | Mobile |
|---|---|
| Cards em layout largo, hover refinado | Cards otimizados pra toque |
| Header com brand + ações inline | Header compacto |
| Modais centralizados | Modais centralizados (não drawer) |
| FAB ausente (botão "Novo" inline) | FAB inteligente — aparece só quando o botão "Novo" sai da tela |

### Backup e importação Excel
- Exportação `.xlsx` em 3 abas: Lançamentos, Resumo Mensal, Projeção Futura
- Importação com modo **mesclar** ou **substituir**
- **Lembrete inteligente**: banner amarelo após 7 dias, vermelho urgente após 14
- **Auto-backup opt-in**: na primeira vez que o lembrete dispara, o app pergunta se você quer backup automático a cada 14 dias. Sem o seu "sim", nunca baixa nada sozinho.

### Armazenamento e sincronização

| Camada | Como funciona |
|---|---|
| **Local (padrão)** | `localStorage` com versionamento — dados ficam no dispositivo, zero dependência de rede |
| **Persistência protegida** | `navigator.storage.persist()` — pede ao browser para não apagar os dados em situações de disco cheio |
| **Nuvem (opcional)** | Supabase — sincronização automática entre dispositivos, último-a-escrever-vence |

**Fluxo de sincronização:**
1. Login com **magic link** (e-mail, sem senha) — em português
2. Pull automático ao entrar
3. Push debounced (3 segundos) após qualquer alteração
4. Reconciliação online/offline ao reconectar
5. Pill de status no header: `Sincronizado ✓` / `Sincronizando…` / `Offline` / `Erro`

### PWA — instalável como app nativo
- Funciona **completamente offline** após o primeiro acesso
- Instalável no Android/Chrome (banner nativo) e iOS/Safari ("Adicionar à Tela Inicial")
- Tema claro + dark mode com toggle no header (preferência salva)
- Service Worker com Workbox + atualização automática

### Acessibilidade e qualidade
- ErrorBoundary com fallback útil (botão "Limpar cache e recarregar")
- Mensagens de erro do Supabase traduzidas para PT-BR
- Contraste AA em todos os textos
- Focus ring visível em todos os elementos interativos
- Microinterações 150-250ms com `cubic-bezier(0.4, 0, 0.2, 1)`

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
| Excel | SheetJS (xlsx) — lazy-loaded sob demanda |
| Deploy | Vercel |

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
3. **(Opcional)** Cole [`docs/email-template-magic-link.html`](./docs/email-template-magic-link.html) em Auth → Email Templates → Magic Link → Message (HTML) — template premium com a identidade visual do Controle de Caixa
4. Execute `bash scripts/deploy.sh` com `VERCEL_TOKEN` definido

---

## Segurança

- **Anon key pública por design** — segurança vem do RLS no banco
- **Sem senhas** — autenticação só via magic link OTP
- **Isolamento total por usuário** — políticas RLS impedem qualquer cross-access
- **`.env.local` no .gitignore** — credenciais nunca entram no repo

---

## Licença

Projeto privado — todos os direitos reservados.
