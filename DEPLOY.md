# Deploy passo-a-passo

> Setup específico para o projeto Supabase **CashManagement**
> (`nqgqvsuaikmkvduiinir.supabase.co`).

São 4 passos. Tempo total: ~5 minutos.

---

## Passo 1 — Aplicar o schema no Supabase (2 min)

A API do Supabase e a porta Postgres não estão acessíveis a partir do
ambiente de desenvolvimento usado para gerar este código, então este
passo precisa ser feito manualmente. Felizmente é simples:

1. Abra https://supabase.com/dashboard/project/nqgqvsuaikmkvduiinir/sql/new
2. Cole o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql)
3. Clique em **Run** (Ctrl/Cmd+Enter)
4. Confira que aparece "Success. No rows returned"

Para verificar que ficou tudo certo, rode no SQL Editor:

```sql
select count(*) from cash_state;            -- deve retornar 0
select policyname from pg_policies where tablename = 'cash_state';
-- deve retornar 4 políticas: select / insert / update / delete
```

---

## Passo 2 — Configurar autenticação por e-mail (1 min)

1. https://supabase.com/dashboard/project/nqgqvsuaikmkvduiinir/auth/providers
   - **Email** está ativado por padrão. Em **Email Auth Settings**:
     - Desligue **Enable email confirmations** (queremos OTP/magic link
       sem confirmação prévia de cadastro).
     - **Save**.

2. https://supabase.com/dashboard/project/nqgqvsuaikmkvduiinir/auth/url-configuration
   - **Site URL**: deixe em branco por enquanto (vai voltar depois do
     deploy para colocar a URL final do Vercel).
   - Em **Redirect URLs**, adicione:
     - `http://localhost:5173` (para `npm run dev`)
     - Depois do passo 3, adicione também a URL do Vercel.

---

## Passo 3 — Deploy no Vercel (2 min)

A partir da raiz do repositório, num computador com Node.js instalado:

```bash
# Cole aqui o token Vercel que você criou. Não comite este valor!
export VERCEL_TOKEN="vcp_..."

# Garante que .env.local existe (já criado por você localmente).
# Se não, copie de .env.local.example e preencha.

bash scripts/deploy.sh
```

Saída esperada:

```
==> Linkando projeto cash-management
==> Configurando env vars no Vercel
    set VITE_SUPABASE_URL for production
    set VITE_SUPABASE_URL for preview
    set VITE_SUPABASE_URL for development
    set VITE_SUPABASE_ANON_KEY for production
    ...
==> Deploy de produção
🔍  Inspect: https://vercel.com/...
✅  Production: https://cash-management.vercel.app  [copied to clipboard] [N seg]
```

Anote a URL de produção que apareceu. Vamos chamar ela de `$PROD_URL`.

---

## Passo 4 — Adicionar a URL de produção no Supabase Auth

Volte para
https://supabase.com/dashboard/project/nqgqvsuaikmkvduiinir/auth/url-configuration

- **Site URL**: cole `$PROD_URL` (a URL final do Vercel, ex.
  `https://cash-management.vercel.app`).
- **Redirect URLs**: adicione `$PROD_URL` na lista (mantém o
  `http://localhost:5173`).
- **Save**.

Pronto. Abra `$PROD_URL` no celular, instale o PWA, faça login com seu
e-mail, abra também no notebook com o mesmo e-mail — os lançamentos
aparecem nos dois lados.

---

## Higiene de credenciais (depois de tudo funcionar)

1. **Rotacionar a senha do banco** (a connection string compartilhada
   nesta conversa pode ficar exposta no histórico do navegador):
   https://supabase.com/dashboard/project/nqgqvsuaikmkvduiinir/settings/database
   → "Reset database password". Você não precisa atualizar nada porque
   o app não usa a senha do DB — só anon key.

2. **Revogar o token do Vercel** após o primeiro deploy bem-sucedido:
   https://vercel.com/account/tokens. Crie um novo se precisar fazer
   deploy de novo (ou ligue o auto-deploy via GitHub: Vercel →
   Project → Settings → Git → Connect Git Repository).

---

## Auto-deploy via GitHub (recomendado depois)

Em vez de rodar `bash scripts/deploy.sh` toda vez, conecte o repo:

1. Vercel Dashboard → Project `cash-management` → **Settings → Git** →
   **Connect Git Repository** → escolha
   `bpcosta2003/CashManagement` → branch `main`.
2. A partir daí, todo `git push` para `main` dispara um deploy
   automático. Branches viram preview URLs.

Não precisa mais do token. Pode revogar.
