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

export const FORMA_COLORS: Record<string, { c: string; bg: string; border: string }> = {
  Dinheiro: { c: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
  Pix: { c: "#0284c7", bg: "#dbeafe", border: "#bae6fd" },
  Débito: { c: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe" },
  Crédito: { c: "#b45309", bg: "#fef9c3", border: "#fcd34d" },
};
