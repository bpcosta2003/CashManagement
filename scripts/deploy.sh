#!/usr/bin/env bash
# Deploy do Controle de Caixa para o Vercel.
#
# Uso:
#   1. Certifique-se de ter um arquivo .env.local na raiz com:
#        VITE_SUPABASE_URL=...
#        VITE_SUPABASE_ANON_KEY=...
#   2. Defina VERCEL_TOKEN como variável de ambiente, OU rode `npx vercel login`
#      antes (deixa o token em ~/.local/share/com.vercel.cli):
#        export VERCEL_TOKEN="vcp_..."
#   3. Rode este script:
#        bash scripts/deploy.sh
#
# O que ele faz:
#   - Linka (ou cria) o projeto Vercel "cash-management"
#   - Sobe VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY como env vars de
#     production/preview/development
#   - Faz deploy de produção
#
# Idempotente: pode rodar várias vezes — vai atualizar valores em vez de
# duplicar.

set -euo pipefail

PROJECT_NAME="${VERCEL_PROJECT_NAME:-cash-management}"

if [ ! -f .env.local ]; then
  echo "ERRO: .env.local não encontrado. Copie de .env.local.example e preencha." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; . ./.env.local; set +a

if [ -z "${VITE_SUPABASE_URL:-}" ] || [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
  echo "ERRO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes em .env.local." >&2
  exit 1
fi

VC=(npx --yes vercel@latest)
TOKEN_ARG=()
if [ -n "${VERCEL_TOKEN:-}" ]; then
  TOKEN_ARG=(--token "$VERCEL_TOKEN")
fi

echo "==> Linkando projeto $PROJECT_NAME"
"${VC[@]}" "${TOKEN_ARG[@]}" link --yes --project "$PROJECT_NAME" >/dev/null

upsert_env() {
  local key="$1" value="$2"
  for target in production preview development; do
    "${VC[@]}" "${TOKEN_ARG[@]}" env rm "$key" "$target" --yes >/dev/null 2>&1 || true
    # Two newlines: first answers the value prompt, second answers the
    # "Add to which Git branch?" prompt that only appears for `preview`
    # (empty = all preview branches). The extra newline is ignored on
    # production/development where there is no second prompt.
    printf '%s\n\n' "$value" | "${VC[@]}" "${TOKEN_ARG[@]}" env add "$key" "$target" >/dev/null
    echo "    set $key for $target"
  done
}

echo "==> Configurando env vars no Vercel"
upsert_env VITE_SUPABASE_URL "$VITE_SUPABASE_URL"
upsert_env VITE_SUPABASE_ANON_KEY "$VITE_SUPABASE_ANON_KEY"

echo "==> Deploy de produção"
"${VC[@]}" "${TOKEN_ARG[@]}" --prod
