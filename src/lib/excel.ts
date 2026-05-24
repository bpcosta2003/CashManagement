import * as XLSX from "xlsx";
import type {
  CalculatedRow,
  CatalogItem,
  Client,
  FormaPagamento,
  Row,
  StatusPagamento,
} from "../types";
import { addMes, calcRow, uid } from "./calc";
import { MESES_FULL } from "../constants";

export interface ImportResult {
  success: boolean;
  rows: Row[];
  clients: Client[];
  catalog: CatalogItem[];
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

export function exportToExcel(
  rows: Row[],
  clients: Client[] = [],
  catalog: CatalogItem[] = [],
  /** Taxa fixa atual do negócio ativo. Usada como fallback no cálculo
   *  pra lançamentos que ainda não têm `taxaFixaPctSnapshot` carimbado
   *  (criados antes da feature). Não sobrescreve o snapshot quando ele
   *  existe — esse mantém o histórico congelado. */
  taxaFixaPctFallback = 0,
): void {
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
    "Taxa do Negócio %",
    "Taxa do Negócio (R$)",
    "Auxiliar %",
    "Auxiliar (R$)",
    "Líquido",
    "Margem %",
    "Status",
    "Recebimento",
    "Itens (JSON)",
    "ID",
    "Criado Em",
  ];

  const lancData = rows
    .filter((r) => +r.valor > 0)
    .map((r) => {
      const calc = calcRow(r, { taxaFixaPct: taxaFixaPctFallback });
      const recLabel =
        r.forma !== "Crédito"
          ? "Este mês"
          : r.parc <= 1
            ? "Próx. mês"
            : `${r.parc} parcelas`;
      // Taxa do negócio efetiva — mesma prioridade do calcRow:
      // 1. campo novo `taxaNegocio` (v3, com modo % ou R$)
      // 2. snapshot legado (sempre %)
      // 3. fallback do negócio (legacy pré-snapshot)
      // Em modo "value" a coluna "% taxa negócio" sai como 0 — o valor
      // R$ retido fica em "Taxa negócio (R$)".
      let taxaNegPctCol = 0;
      if (r.taxaNegocio !== undefined) {
        taxaNegPctCol =
          r.taxaNegocioMode === "value" ? 0 : (r.taxaNegocio ?? 0) / 100;
      } else if (r.taxaFixaPctSnapshot !== undefined) {
        taxaNegPctCol = r.taxaFixaPctSnapshot / 100;
      } else {
        taxaNegPctCol = taxaFixaPctFallback / 100;
      }
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
        // Em modo "value", r.taxa é R$ absoluto, então a coluna "Taxa %"
        // sai como 0. Em modo "percent" (default), sai como fração
        // (0.029 = 2,9%). A coluna "Taxa (R$)" sempre tem o valor
        // efetivo retido (calc.taxaVal).
        r.taxaMode === "value" ? 0 : +r.taxa / 100,
        calc.taxaVal,
        calc.custoVal,
        taxaNegPctCol,
        calc.taxaFixaVal,
        // Em modo "value", auxiliarPct é R$ absoluto, então "Auxiliar %"
        // sai como 0 e "Auxiliar (R$)" carrega o valor. Em "percent",
        // sai como fração.
        r.auxiliarMode === "value" ? 0 : (r.auxiliarPct ?? 0) / 100,
        calc.auxiliarVal,
        calc.liq,
        calc.mar / 100,
        r.status,
        recLabel,
        // items[] preservado como JSON pra roundtrip. Excel mostra um
        // texto bruto; o import lê e reconstrói o array. Vazio quando
        // o lançamento é single-item (modo legado).
        r.items && r.items.length > 0 ? JSON.stringify(r.items) : "",
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
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 24 },
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
    { col: 12, fmt: "0.00%" },
    { col: 13, fmt: '"R$" #,##0.00' },
    { col: 14, fmt: "0.00%" },
    { col: 15, fmt: '"R$" #,##0.00' },
    { col: 16, fmt: '"R$" #,##0.00' },
    { col: 17, fmt: "0.00%" },
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, "Lançamentos");

  // ── Aba 2: Resumo Mensal ──────────────────────────────────────────────
  const byMes: Record<string, CalculatedRow[]> = {};
  rows
    .filter((r) => +r.valor > 0)
    .map((r) => calcRow(r, { taxaFixaPct: taxaFixaPctFallback }))
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
      // "Total Taxas" agrega cartão + taxa do negócio + auxiliar, igual
      // ao resumo do app. As colunas individuais ficam na aba Lançamentos.
      const taxas = items.reduce(
        (s, r) => s + r.taxaVal + r.taxaFixaVal + r.auxiliarVal,
        0,
      );
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
    .map((r) => calcRow(r, { taxaFixaPct: taxaFixaPctFallback }))
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

  // ── Aba 4: Clientes ───────────────────────────────────────────────────
  if (clients.length > 0) {
    const cliHeaders = [
      "Nome",
      "Telefone",
      "Último uso",
      "Criado em",
      "ID",
    ];
    const cliData = clients.map((c) => [
      c.name,
      c.phone ?? "",
      c.lastUsedAt,
      c.createdAt,
      c.id,
    ]);
    const ws4 = XLSX.utils.aoa_to_sheet([cliHeaders, ...cliData]);
    ws4["!cols"] = [
      { wch: 24 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws4, "Clientes");
  }

  // ── Aba 5: Catálogo ───────────────────────────────────────────────────
  if (catalog.length > 0) {
    const catHeaders = [
      "Nome",
      "Valor Sugerido",
      "Último Uso",
      "Criado Em",
      "ID",
      "Business ID",
    ];
    const catData = catalog.map((c) => [
      c.name,
      typeof c.defaultValue === "number" ? c.defaultValue : "",
      c.lastUsedAt,
      c.createdAt,
      c.id,
      c.businessId,
    ]);
    const ws5 = XLSX.utils.aoa_to_sheet([catHeaders, ...catData]);
    ws5["!cols"] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 22 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
    ];
    applyNumberFormats(ws5, catData.length, [
      { col: 1, fmt: '"R$" #,##0.00' },
    ]);
    XLSX.utils.book_append_sheet(wb, ws5, "Catálogo");
  }

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
            clients: [],
            catalog: [],
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

          // Detecção do modo da taxa:
          //  - "Taxa %" > 0 → modo "percent", taxa = porcentagem.
          //  - "Taxa %" == 0 e "Taxa (R$)" > 0 → modo "value",
          //    taxa = R$ absoluto (lido da coluna "Taxa (R$)").
          // Permite roundtrip sem precisar de coluna extra; o modo é
          // inferido da estrutura natural do dado exportado.
          const taxaRaw = parseFloat(String(r["Taxa %"] ?? "0")) || 0;
          const taxaAbsRaw = parseFloat(String(r["Taxa (R$)"] ?? "0")) || 0;
          let taxa: number;
          let taxaMode: "percent" | "value" | undefined;
          if (taxaRaw > 0) {
            // Se exportou como fração (<1), multiplica por 100.
            taxa = taxaRaw > 0 && taxaRaw < 1 ? taxaRaw * 100 : taxaRaw;
          } else if (taxaAbsRaw > 0) {
            taxa = taxaAbsRaw;
            taxaMode = "value";
          } else {
            taxa = 0;
          }

          const custoNum =
            parseFloat(
              String(r["Custo do Serviço"] ?? "0").replace(",", "."),
            ) || 0;
          const descNum =
            parseFloat(String(r["Desconto"] ?? "0").replace(",", ".")) || 0;

          // Taxa fixa do negócio + auxiliar: opcionais (não existem em
          // backups antigos pré-feature). Mesma heurística de fração da
          // Taxa do cartão — Excel exporta como 0.30 (30%); usuário pode
          // editar pra "30" e o import deve aceitar os dois.
          const tfRaw = parseFloat(
            String(r["Taxa do Negócio %"] ?? "").replace(",", "."),
          );
          const taxaFixaPctSnapshot =
            Number.isFinite(tfRaw) && tfRaw > 0
              ? tfRaw > 0 && tfRaw < 1
                ? tfRaw * 100
                : tfRaw
              : undefined;

          // Detecção de modo do auxiliar — mesma heurística da taxa:
          // se "Auxiliar %" > 0 → modo percent. Se zero e
          // "Auxiliar (R$)" > 0 → modo value.
          const auxRaw = parseFloat(
            String(r["Auxiliar %"] ?? "").replace(",", "."),
          );
          const auxAbsRaw = parseFloat(
            String(r["Auxiliar (R$)"] ?? "").replace(",", "."),
          );
          let auxiliarPct: number | undefined;
          let auxiliarMode: "percent" | "value" | undefined;
          if (Number.isFinite(auxRaw) && auxRaw > 0) {
            auxiliarPct = auxRaw > 0 && auxRaw < 1 ? auxRaw * 100 : auxRaw;
          } else if (Number.isFinite(auxAbsRaw) && auxAbsRaw > 0) {
            auxiliarPct = auxAbsRaw;
            auxiliarMode = "value";
          }

          // items[] reconstruído da coluna "Itens (JSON)". Parse tolerante:
          // se o JSON estiver corrompido (usuário editou na mão e
          // bagunçou), ignora silenciosamente e o lançamento volta como
          // single-item (servico/valor preservados normalmente).
          let items:
            | { name: string; valor: number; catalogId?: string }[]
            | undefined;
          const itemsRaw = String(r["Itens (JSON)"] ?? "").trim();
          if (itemsRaw && itemsRaw.startsWith("[")) {
            try {
              const parsed = JSON.parse(itemsRaw) as unknown;
              if (Array.isArray(parsed) && parsed.length > 0) {
                const out: {
                  name: string;
                  valor: number;
                  catalogId?: string;
                }[] = [];
                for (const e of parsed.slice(0, 20)) {
                  if (!e || typeof e !== "object") continue;
                  const o = e as Record<string, unknown>;
                  const name =
                    typeof o.name === "string" ? o.name.trim().slice(0, 80) : "";
                  const v =
                    typeof o.valor === "number"
                      ? o.valor
                      : parseFloat(String(o.valor ?? "0")) || 0;
                  if (!name || v <= 0) continue;
                  const ent: {
                    name: string;
                    valor: number;
                    catalogId?: string;
                  } = { name, valor: v };
                  if (typeof o.catalogId === "string" && o.catalogId)
                    ent.catalogId = o.catalogId.slice(0, 40);
                  out.push(ent);
                }
                if (out.length > 0) items = out;
              }
            } catch {
              /* JSON corrompido — ignora, mantém como single-item */
            }
          }

          rows.push({
            id: String(r["ID"] || uid()),
            businessId: "",
            cliente: String(r["Cliente"] ?? ""),
            servico: String(r["Serviço"] ?? r["Servico"] ?? ""),
            valor,
            forma,
            parc: +(r["Parcelas"] ?? 1) || 1,
            taxa,
            ...(taxaMode ? { taxaMode } : {}),
            custo: custoNum || "",
            desconto: descNum || "",
            ...(auxiliarPct !== undefined ? { auxiliarPct } : {}),
            ...(auxiliarMode ? { auxiliarMode } : {}),
            ...(taxaFixaPctSnapshot !== undefined
              ? { taxaFixaPctSnapshot }
              : {}),
            ...(items ? { items } : {}),
            status: (String(r["Status"] ?? "Pago") as StatusPagamento) || "Pago",
            mes,
            ano,
            criadoEm: String(r["Criado Em"] || new Date().toISOString()),
          });
        });

        // Aba opcional: Clientes
        const clients: Client[] = [];
        const cliSheetName = wb.SheetNames.find((n) =>
          n.toLowerCase().includes("cliente"),
        );
        if (cliSheetName) {
          const wsC = wb.Sheets[cliSheetName];
          const rawC = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsC, {
            defval: "",
          });
          rawC.forEach((c) => {
            const name = String(c["Nome"] ?? "").trim();
            if (!name) return;
            const phone = String(c["Telefone"] ?? "").trim();
            const lastUsedAt =
              String(c["Último uso"] ?? c["Ultimo uso"] ?? "") ||
              new Date().toISOString();
            const createdAt =
              String(c["Criado em"] ?? "") || new Date().toISOString();
            const id = String(c["ID"] ?? uid());
            clients.push({
              id,
              businessId: "",
              name,
              phone: phone || undefined,
              lastUsedAt,
              createdAt,
            });
          });
        }

        // Aba opcional: Catálogo
        const catalog: CatalogItem[] = [];
        const catSheetName = wb.SheetNames.find(
          (n) =>
            n.toLowerCase().includes("catálogo") ||
            n.toLowerCase().includes("catalogo"),
        );
        if (catSheetName) {
          const wsCat = wb.Sheets[catSheetName];
          const rawCat = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            wsCat,
            { defval: "" },
          );
          rawCat.forEach((c) => {
            const name = String(c["Nome"] ?? "").trim();
            if (!name) return;
            const defaultValueRaw = parseFloat(
              String(c["Valor Sugerido"] ?? "").replace(",", "."),
            );
            const defaultValue =
              Number.isFinite(defaultValueRaw) && defaultValueRaw > 0
                ? defaultValueRaw
                : undefined;
            const lastUsedAt =
              String(c["Último Uso"] ?? c["Ultimo Uso"] ?? "") ||
              new Date().toISOString();
            const createdAt =
              String(c["Criado Em"] ?? "") || new Date().toISOString();
            const id = String(c["ID"] ?? uid());
            const businessId = String(c["Business ID"] ?? "");
            catalog.push({
              id,
              businessId,
              name,
              defaultValue,
              lastUsedAt,
              createdAt,
            });
          });
        }

        resolve({
          success: true,
          rows,
          clients,
          catalog,
          errors,
          total: raw.length,
          skipped,
        });
      } catch (err) {
        resolve({
          success: false,
          rows: [],
          clients: [],
          catalog: [],
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
        clients: [],
        catalog: [],
        errors: ["Erro ao ler o arquivo."],
        total: 0,
        skipped: 0,
      });
    reader.readAsArrayBuffer(file);
  });
}
