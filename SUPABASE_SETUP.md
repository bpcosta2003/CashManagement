# Sincronização opcional com Supabase

O Controle de Caixa funciona **100% local por padrão** (tudo em localStorage,
sem servidor, sem login). Esta camada **opcional** liga sincronização entre
celular e notebook através do Supabase. Sem as variáveis de ambiente abaixo
o app continua funcionando exatamente como antes — o botão de login simplesmente
não aparece.

## 1. Criar projeto Supabase (grátis)

1. https://supabase.com → **New project**.
2. Escolha região São Paulo (`sa-east-1`) para latência baixa no Brasil.
3. Em **Project Settings → API** anote:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

## 2. Aplicar o schema

Abra **SQL Editor** no Dashboard do Supabase, cole o conteúdo de
[`supabase/schema.sql`](./supabase/schema.sql) e execute. Isso cria a tabela
`cash_state` e as políticas de Row-Level Security (cada usuária só lê/grava
o próprio documento).

## 3. Configurar e-mail (link mágico)

1. **Authentication → Providers → Email**: deixe ativado.
2. Marque **Enable email confirmations** = OFF (queremos OTP por link, não
   confirmação de cadastro).
3. **Authentication → URL Configuration**:
   - `Site URL` → URL de produção (ex.: `https://caixa.seudominio.com.br`)
   - `Redirect URLs` → adicione também `http://localhost:5173` para dev
4. (Opcional) **Authentication → Email Templates → Magic Link**:
   personalize o e-mail em português.

## 4. Variáveis de ambiente

Crie `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
```

Em produção (Vercel/Netlify), configure as duas variáveis no painel do host.

## 5. Pronto

`npm run dev` → o ícone de sincronização aparece no header. A primeira
usuária digita o e-mail → recebe link → clica → entra. Os dados que ela
já tinha localmente são enviados ao servidor; em outro aparelho, ao
entrar com o mesmo e-mail, tudo é puxado de volta.

## Como o sync funciona

- **Estratégia:** last-write-wins por documento. Cada usuária tem 1 linha
  na tabela `cash_state` com o `AppState` inteiro como JSONB.
- **No login:** pull. Se o servidor é mais novo, substitui o local;
  se o local é mais novo, empurra para o servidor.
- **A cada edição local:** push com debounce de 3 segundos.
- **Offline:** edições continuam acontecendo no localStorage. Quando a
  conexão volta, um pull-then-push reconcilia.
- **Conflito (rara, exigiria edição simultânea em 2 aparelhos):** vence
  o `lastModified` mais recente. Para uso típico (1 pessoa, 2 aparelhos
  alternados) isso é mais que suficiente. Se virar um problema real, a
  evolução natural é trocar para CRDT (Yjs/Automerge) ou Replicache —
  mas isso é outra ordem de complexidade.

## Custo

O free tier cobre 500 MB de banco e 50.000 usuárias ativas/mês. Como cada
usuária ocupa 1 linha JSON com poucos KB, dá tranquilamente para milhares
de salões antes de precisar pagar (~US$25/mês no Pro).

## Privacidade e segurança

- O documento é gravado como JSON cru no Supabase. Se isso for sensível,
  considere criptografia client-side (libsodium): cifrar `state` antes do
  push, decifrar depois do pull, com a chave derivada da senha da usuária
  (não fica no servidor). Fora do escopo deste esqueleto.
- RLS impede que uma usuária leia dados de outra mesmo se tentar.
- A `anon key` é pública e segura para expor no front — ela não bypassa RLS.
