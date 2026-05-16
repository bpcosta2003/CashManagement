import type {
  Business,
  BusinessType,
  Client,
  FormaPagamento,
  MonthGoal,
  Row,
  StatusPagamento,
  Summary,
} from "../../src/types";
import { calcRow } from "../../src/lib/calc";
import { buildAiContext } from "../../src/lib/aiContext";

/**
 * Constrói o XML de contexto da IA **a partir do payload bruto** enviado
 * pelo cliente, validando cada campo antes.
 *
 * Por que existe: o cliente não pode mais ditar o XML que vai pro Claude
 * (vetor de prompt injection). Tudo que vem do navegador é dado puro,
 * passa por validação estrita aqui, e o XML é montado server-side a
 * partir desses dados normalizados.
 *
 * Caso o payload seja inválido, lança ValidationError com .code (mapeável
 * pra HTTP 400 no handler).
 */

const BUSINESS_TYPES: readonly BusinessType[] = [
  "salao",
  "restaurante",
  "comercio",
  "servicos",
  "freelancer",
  "outro",
];

const FORMAS: readonly FormaPagamento[] = [
  "Dinheiro",
  "Pix",
  "Débito",
  "Crédito",
];

const STATUS: readonly StatusPagamento[] = ["Pago", "Pendente"];

const MAX_ROWS = 2000;
const MAX_STRING = 80;
const MAX_GOAL = 1_000_000_000;
const MAX_VALOR = 100_000_000;

// Range U+0000..U+001F (controles ASCII) + U+007F (DEL). Strip via regex
// pra evitar que o usuário injete newlines no XML enviado ao Claude.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]+/g;

class ValidationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Strings recebidas do cliente: corta no comprimento máximo e remove
 *  caracteres de controle / newlines (mitigação extra contra injeção de
 *  instruções na prompt da IA). */
function sanitizeString(input: unknown, max = MAX_STRING): string {
  if (typeof input !== "string") return "";
  const flat = input.replace(CONTROL_CHARS, " ").trim();
  return flat.length > max ? flat.slice(0, max) : flat;
}

function asFiniteNumber(v: unknown, fallback = 0): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return v;
}

function clampNumber(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function validateBusiness(input: unknown): Business {
  if (!input || typeof input !== "object") {
    throw new ValidationError("invalid_business", "Empreendimento inválido.");
  }
  const b = input as Record<string, unknown>;
  const id = sanitizeString(b.id, 60);
  if (!id) {
    throw new ValidationError(
      "invalid_business",
      "ID do empreendimento ausente.",
    );
  }
  const name = sanitizeString(b.name, 60) || "Empreendimento";
  const rawType = typeof b.type === "string" ? b.type : "outro";
  const type: BusinessType = BUSINESS_TYPES.includes(rawType as BusinessType)
    ? (rawType as BusinessType)
    : "outro";
  return {
    id,
    name,
    type,
    createdAt:
      typeof b.createdAt === "string" ? b.createdAt : new Date().toISOString(),
  };
}

function validateRow(input: unknown, businessId: string): Row | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  if (r.businessId !== businessId) return null;

  const mes = asFiniteNumber(r.mes, -1);
  const ano = asFiniteNumber(r.ano, -1);
  if (!Number.isInteger(mes) || mes < 0 || mes > 11) return null;
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return null;

  const valor =
    r.valor === "" ? 0 : clampNumber(asFiniteNumber(r.valor, 0), 0, MAX_VALOR);
  const desconto =
    r.desconto === ""
      ? 0
      : clampNumber(asFiniteNumber(r.desconto, 0), 0, MAX_VALOR);
  const custo =
    r.custo === "" ? 0 : clampNumber(asFiniteNumber(r.custo, 0), 0, MAX_VALOR);
  const taxa = clampNumber(asFiniteNumber(r.taxa, 0), 0, 100);
  const parc = Math.max(1, Math.min(24, asFiniteNumber(r.parc, 1)));

  const formaRaw = typeof r.forma === "string" ? r.forma : "Dinheiro";
  const forma: FormaPagamento = FORMAS.includes(formaRaw as FormaPagamento)
    ? (formaRaw as FormaPagamento)
    : "Dinheiro";

  const statusRaw = typeof r.status === "string" ? r.status : "Pago";
  const status: StatusPagamento = STATUS.includes(statusRaw as StatusPagamento)
    ? (statusRaw as StatusPagamento)
    : "Pago";

  return {
    id: sanitizeString(r.id, 40) || "x",
    businessId,
    cliente: sanitizeString(r.cliente, MAX_STRING),
    servico: sanitizeString(r.servico, MAX_STRING),
    valor,
    forma,
    parc: Math.round(parc),
    taxa,
    custo,
    desconto,
    status,
    mes: Math.round(mes),
    ano: Math.round(ano),
    criadoEm: typeof r.criadoEm === "string" ? r.criadoEm : "",
  };
}

function validateGoal(
  input: unknown,
  businessId: string,
  mes: number,
  ano: number,
): MonthGoal | null {
  if (!input || typeof input !== "object") return null;
  const g = input as Record<string, unknown>;
  const target = clampNumber(asFiniteNumber(g.target, 0), 0, MAX_GOAL);
  if (target <= 0) return null;
  return {
    id: sanitizeString(g.id, 40) || "g",
    businessId,
    mes,
    ano,
    target,
    createdAt: typeof g.createdAt === "string" ? g.createdAt : "",
    updatedAt: typeof g.updatedAt === "string" ? g.updatedAt : "",
  };
}

export interface BuildContextResult {
  contextXml: string;
  dataHash: string;
  monthLabel: string;
  businessName: string;
}

export interface AnalyzeBody {
  businessId: string;
  business: unknown;
  mes: number;
  ano: number;
  rows: unknown;
  goal?: unknown;
  force?: boolean;
}

/** Valida o payload e devolve o XML/hash. Lança ValidationError com .code
 *  pro handler mapear pra 400. */
export function validateAndBuildContext(body: AnalyzeBody): BuildContextResult {
  const business = validateBusiness(body.business);
  if (business.id !== body.businessId) {
    throw new ValidationError(
      "invalid_business",
      "Empreendimento não bate com o ID informado.",
    );
  }
  const mes = body.mes;
  const ano = body.ano;
  if (!Number.isInteger(mes) || mes < 0 || mes > 11) {
    throw new ValidationError("invalid_period", "Mês inválido.");
  }
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    throw new ValidationError("invalid_period", "Ano inválido.");
  }

  if (!Array.isArray(body.rows)) {
    throw new ValidationError("invalid_rows", "Lançamentos ausentes.");
  }
  if (body.rows.length > MAX_ROWS) {
    throw new ValidationError(
      "too_many_rows",
      "Volume de lançamentos acima do limite suportado pela análise.",
    );
  }

  const rows: Row[] = [];
  for (const raw of body.rows) {
    const r = validateRow(raw, business.id);
    if (r) rows.push(r);
  }

  const goal = validateGoal(body.goal, business.id, mes, ano);

  const monthCalc = rows
    .filter((r) => r.mes === mes && r.ano === ano && (+r.valor || 0) > 0)
    .map(calcRow);

  const summary: Summary = monthCalc.reduce(
    (acc, r) => {
      acc.bruto += r.v;
      acc.descontos += r.descontoVal;
      acc.taxas += r.taxaVal;
      acc.custos += r.custoVal;
      acc.liq += r.liq;
      if (r.forma !== "Crédito") acc.estesMes += r.liq;
      else acc.futuro += r.liq;
      return acc;
    },
    {
      bruto: 0,
      descontos: 0,
      taxas: 0,
      custos: 0,
      liq: 0,
      margem: 0,
      estesMes: 0,
      futuro: 0,
    } as Summary,
  );
  summary.margem = summary.bruto > 0 ? (summary.liq / summary.bruto) * 100 : 0;

  // O builder do contexto vive em src/ — função pura, sem deps do browser.
  // Não passamos clients explícitos porque a versão atual do builder não
  // os usa pra montar o XML (top clientes vem dos rows).
  const noClients: Client[] = [];
  const built = buildAiContext({
    business,
    allRows: rows,
    clients: noClients,
    goal,
    mes,
    ano,
    summary,
  });

  return {
    contextXml: built.contextXml,
    dataHash: built.dataHash,
    monthLabel: built.monthLabel,
    businessName: business.name,
  };
}

export { ValidationError };
