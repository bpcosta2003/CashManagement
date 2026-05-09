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
export const FORMA_COLORS: Record<string, { c: string; bg: string; border: string }> = {
  Dinheiro: { c: "#3f5a3e", bg: "#e7eee5", border: "#c6d6c4" },
  Pix:      { c: "#3a5a78", bg: "#e2ecf3", border: "#c0d4e3" },
  Débito:   { c: "#8a6f31", bg: "#f4ead5", border: "#e0cda0" },
  Crédito:  { c: "#7a3b54", bg: "#f0e0e6", border: "#e0c4cf" },
};
