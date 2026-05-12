import * as XLSX from "xlsx";
import type {
  CalculatedRow,
  FormaPagamento,
  Row,
  StatusPagamento,
} from "../types";
import { addMes, calcRow, uid } from "./calc";
import { MESES_FULL } from "../constants";

export interface ImportResult {
  success: boolean;
  rows: Row[];
  errors: string[];
  total: number;
  skipped: number;
}

const MESES_MAP: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

const FORMAS_VALIDAS: FormaPagamento[] = ["Dinheiro", "Pix", "Débito", "Crédito"];

export function exportToExcel(rows: Row[]): void {
  const wb = XLSX.utils.book_new();

  // ── Aba 1: Lançamentos ────────────────────────────────────────────────
  const lancHeaders = [
    "Mês",
    "Ano",
    "Cliente",
    "Serviço",
    "Valor Cobrado",
    "Desconto",
    "Valor Efetivo",
    "Forma de Pagamento",
    "Parcelas",
    "Taxa %",
    "Taxa (R$)",
    "Custo do Serviço",
    "Líquido",
    "Margem %",
    "Status",
    "Recebimento",
    "ID",
    "Criado Em",
  ];

  const lancData = rows
    .filter((r) => +r.valor > 0)
    .map((r) => {
      const calc = calcRow(r);
      const recLabel =
        r.forma !== "Crédito"
          ? "Este mês"
          : r.parc <= 1
            ? "Próx. mês"
            : `${r.parc} parcelas`;
      return [
        MESES_FULL[r.mes],
        r.ano,
        r.cliente,
        r.servico,
        calc.v,
        calc.descontoVal,
        calc.vef,
        r.forma,
        r.parc,
        +r.taxa / 100,
        calc.taxaVal,
        calc.custoVal,
        calc.liq,
        calc.mar / 100,
        r.status,
        recLabel,
        r.id,
        r.criadoEm,
      ];
    });

  const ws1 = XLSX.utils.aoa_to_sheet([lancHeaders, ...lancData]);
  ws1["!cols"] = [
    { wch: 12 },
    { wch: 6 },
    { wch: 22 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 9 },
    { wch: 8 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 10 },
    { wch: 22 },
  ];
  applyNumberFormats(ws1, lancData.length, [
    { col: 4, fmt: '"R$" #,##0.00' },
    { col: 5, fmt: '"R$" #,##0.00' },
    { col: 6, fmt: '"R$" #,##0.00' },
    { col: 9, fmt: "0.00%" },
    { col: 10, fmt: '"R$" #,##0.00' },
    { col: 11, fmt: '"R$" #,##0.00' },
    { col: 12, fmt: '"R$" #,##0.00' },
    { col: 13, fmt: "0.00%" },
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, "Lançamentos");

  // ── Aba 2: Resumo Mensal ──────────────────────────────────────────────
  const byMes: Record<string, CalculatedRow[]> = {};
  rows
    .filter((r) => +r.valor > 0)
    .map(calcRow)
    .forEach((r) => {
      const key = `${String(r.ano)}-${String(r.mes).padStart(2, "0")}`;
      if (!byMes[key]) byMes[key] = [];
      byMes[key].push(r);
    });

  const resumoHeaders = [
    "Mês/Ano",
    "Lançamentos",
    "Faturamento Bruto",
    "Total Descontos",
    "Total Taxas",
    "Total Custos",
    "Lucro Líquido",
    "Margem Média %",
  ];

  const resumoData = Object.entries(byMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const [anoStr, mesStr] = key.split("-");
      const label = `${MESES_FULL[+mesStr]}/${anoStr}`;
      const bruto = items.reduce((s, r) => s + r.v, 0);
      const descs = items.reduce((s, r) => s + r.descontoVal, 0);
      const taxas = items.reduce((s, r) => s + r.taxaVal, 0);
      const custos = items.reduce((s, r) => s + r.custoVal, 0);
      const liq = items.reduce((s, r) => s + r.liq, 0);
      return [
        label,
        items.length,
        bruto,
        descs,
        taxas,
        custos,
        liq,
        bruto ? liq / bruto : 0,
      ];
    });

  const ws2 = XLSX.utils.aoa_to_sheet([resumoHeaders, ...resumoData]);
  ws2["!cols"] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  applyNumberFormats(ws2, resumoData.length, [
    { col: 2, fmt: '"R$" #,##0.00' },
    { col: 3, fmt: '"R$" #,##0.00' },
    { col: 4, fmt: '"R$" #,##0.00' },
    { col: 5, fmt: '"R$" #,##0.00' },
    { col: 6, fmt: '"R$" #,##0.00' },
    { col: 7, fmt: "0.00%" },
  ]);
  XLSX.utils.book_append_sheet(wb, ws2, "Resumo Mensal");

  // ── Aba 3: Projeção Futura ────────────────────────────────────────────
  const projHeaders = [
    "Mês Recebimento",
    "Cliente",
    "Serviço",
    "Descrição",
    "Valor Bruto",
    "Valor Líquido",
  ];
  const projData: (string | number)[][] = [];
  rows
    .filter((r) => r.forma === "Crédito" && +r.valor > 0)
    .map(calcRow)
    .forEach((r) => {
      const n = Math.max(1, r.parc || 1);
      for (let i = 1; i <= n; i++) {
        const { m, y } = addMes(r.mes, r.ano, i);
        const lbl = `${MESES_FULL[m]}/${y}`;
        const desc = n === 1 ? "Crédito à vista" : `Parcela ${i}/${n}`;
        projData.push([lbl, r.cliente, r.servico, desc, r.vef / n, r.liq / n]);
      }
    });

  const ws3 = XLSX.utils.aoa_to_sheet([projHeaders, ...projData]);
  ws3["!cols"] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
  ];
  applyNumberFormats(ws3, projData.length, [
    { col: 4, fmt: '"R$" #,##0.00' },
    { col: 5, fmt: '"R$" #,##0.00' },
  ]);
  XLSX.utils.book_append_sheet(wb, ws3, "Projeção Futura");

  // ── Download ──────────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  XLSX.writeFile(wb, `controle-caixa-backup-${dateStr}.xlsx`);
}

function applyNumberFormats(
  ws: XLSX.WorkSheet,
  dataRowCount: number,
  rules: { col: number; fmt: string }[],
) {
  for (let r = 1; r <= dataRowCount; r++) {
    rules.forEach(({ col, fmt }) => {
      const addr = XLSX.utils.encode_cell({ r, c: col });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = fmt;
      }
    });
  }
}

export function importFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        const sheetName = wb.SheetNames.find(
          (n) =>
            n.toLowerCase().includes("lançamento") ||
            n.toLowerCase().includes("lancamento"),
        );
        if (!sheetName) {
          return resolve({
            success: false,
            rows: [],
            errors: ["Aba 'Lançamentos' não encontrada no arquivo."],
            total: 0,
            skipped: 0,
          });
        }

        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        const rows: Row[] = [];
        const errors: string[] = [];
        let skipped = 0;

        raw.forEach((r, idx) => {
          const mesNome = String(r["Mês"] ?? r["Mes"] ?? "")
            .toLowerCase()
            .trim();
          const mes = MESES_MAP[mesNome];
          const ano = +(r["Ano"] ?? 0);
          if (mes === undefined || !ano) {
            skipped++;
            return;
          }

          const valor =
            parseFloat(String(r["Valor Cobrado"] ?? "0").replace(",", ".")) ||
            0;
          if (!valor) {
            skipped++;
            return;
          }

          const formaIn = String(r["Forma de Pagamento"] ?? "Pix");
          const forma = formaIn as FormaPagamento;
          if (!FORMAS_VALIDAS.includes(forma)) {
            errors.push(
              `Linha ${idx + 2}: forma de pagamento inválida "${formaIn}".`,
            );
            skipped++;
            return;
          }

          const taxaRaw = parseFloat(String(r["Taxa %"] ?? "0")) || 0;
          // If the export was as fraction (<1) we multiply by 100
          const taxa = taxaRaw > 0 && taxaRaw < 1 ? taxaRaw * 100 : taxaRaw;

          const custoNum =
            parseFloat(
              String(r["Custo do Serviço"] ?? "0").replace(",", "."),
            ) || 0;
          const descNum =
            parseFloat(String(r["Desconto"] ?? "0").replace(",", ".")) || 0;

          rows.push({
            id: String(r["ID"] || uid()),
            businessId: "",
            cliente: String(r["Cliente"] ?? ""),
            servico: String(r["Serviço"] ?? r["Servico"] ?? ""),
            valor,
            forma,
            parc: +(r["Parcelas"] ?? 1) || 1,
            taxa,
            custo: custoNum || "",
            desconto: descNum || "",
            status: (String(r["Status"] ?? "Pago") as StatusPagamento) || "Pago",
            mes,
            ano,
            criadoEm: String(r["Criado Em"] || new Date().toISOString()),
          });
        });

        resolve({ success: true, rows, errors, total: raw.length, skipped });
      } catch (err) {
        resolve({
          success: false,
          rows: [],
          errors: [String(err)],
          total: 0,
          skipped: 0,
        });
      }
    };
    reader.onerror = () =>
      resolve({
        success: false,
        rows: [],
        errors: ["Erro ao ler o arquivo."],
        total: 0,
        skipped: 0,
      });
    reader.readAsArrayBuffer(file);
  });
}
