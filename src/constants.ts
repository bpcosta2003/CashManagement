export const MESES_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const MESES_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export const FORMAS_PAGAMENTO = ["Dinheiro", "Pix", "Débito", "Crédito"] as const;

export const STATUS_OPTIONS = ["Pago", "Pendente"] as const;

export const TAXA_PADRAO = {
  Dinheiro: 0,
  Pix: 0,
  Débito: 1.5,
  "Crédito_1x": 2.9,
  "Crédito_2-6x": 3.9,
  "Crédito_7+x": 4.9,
} as const;

/**
 * Paleta Boutique Modern (bordô + champagne).
 * Cada forma usa uma cor harmonizada com a paleta principal.
 */
/**
 * Tints suaves para badges/pills das formas de pagamento.
 * O `c` (cor de texto) e o `bg` (fundo) funcionam tanto no light
 * quanto no dark mode porque o `bg` usa rgba com baixa opacidade.
 */
export const FORMA_COLORS: Record<string, { c: string; bg: string; border: string }> = {
  Dinheiro: { c: "#5a8062", bg: "rgba(135, 184, 144, 0.14)", border: "transparent" },
  Pix:      { c: "#587b9c", bg: "rgba(125, 155, 191, 0.14)", border: "transparent" },
  Débito:   { c: "#967a3d", bg: "rgba(184, 154, 99, 0.16)",  border: "transparent" },
  Crédito:  { c: "#8a4862", bg: "rgba(90, 46, 63, 0.10)",    border: "transparent" },
};
