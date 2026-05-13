/**
 * Formata um telefone brasileiro conforme o usuário digita.
 *
 * Suporta:
 *   - Celular: (11) 91234-5678   → 11 dígitos
 *   - Fixo:    (11) 1234-5678    → 10 dígitos
 *
 * Durante digitação parcial, formata o que tiver:
 *   "1"     → "1"
 *   "11"    → "(11) "
 *   "1198"  → "(11) 98"
 *   "11987" → "(11) 987"
 *   …
 *
 * Aceita qualquer string de entrada — extrai só dígitos e remonta.
 * Limite máximo de 11 dígitos (descarta excedente).
 */
export function formatPhoneBR(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    // Fixo: (11) 1234-5678
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Celular: (11) 91234-5678
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Devolve só os dígitos do telefone (usado pra armazenar normalizado). */
export function rawDigits(phone: string | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}
