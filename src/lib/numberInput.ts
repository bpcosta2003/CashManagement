/**
 * Helpers de input numérico pt-BR. Usados em campos onde o usuário
 * digita valores decimais com vírgula (taxa, custo, percentual, etc.).
 *
 * Por que existe: `<input type="number">` quebra acentos em alguns
 * browsers + dispara teclados internacionais. Em vez disso, mantemos
 * `<input type="text" inputMode="decimal">` e tratamos o texto
 * manualmente — com regras claras pra evitar inputs inválidos como
 * "1,,5" ou "1,5,3".
 */

/** Limpa o texto digitado mantendo só dígitos e uma única vírgula.
 *
 * Regras:
 *  - Só aceita dígitos, vírgula e ponto
 *  - Ponto vira vírgula (visual pt-BR consistente)
 *  - Só uma vírgula sobrevive (a primeira). As demais são removidas.
 *
 * NÃO faz parse — preserva o texto mid-digitação ("1,", ",5" são
 * estados válidos enquanto o usuário compõe o número).
 */
export function sanitizeDecimalText(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/[^0-9.,]/g, "");
  s = s.replace(/\./g, ",");
  const firstComma = s.indexOf(",");
  if (firstComma >= 0) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, "");
  }
  return s;
}

/** Faz parse de input pt-BR pra número. Aceita vírgula ou ponto. */
export function parseDecimalBR(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(",", ".").replace(/[^0-9.]/g, "");
  if (!cleaned || cleaned === ".") return 0;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Formata um número pra exibição em input pt-BR (vírgula, sem casas
 *  extras). Vazio quando 0/NaN — assim o placeholder aparece. */
export function formatDecimalBR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return String(n).replace(".", ",");
}
