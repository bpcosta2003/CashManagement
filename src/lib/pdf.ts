import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Business, CalculatedRow, Summary } from "../types";
import type { AnnualSummary } from "../hooks/useAnnual";
import { fmtBRL, fmtPct } from "./calc";
import { MESES_FULL } from "../constants";

interface ExportOpts {
  /** Empreendimento ativo — usado pra cabeçalho. Pode ser null. */
  business: Business | null;
  rows: CalculatedRow[];
  summary: Summary;
  mes: number;
  ano: number;
}

const PAY_COLORS: Record<string, [number, number, number]> = {
  Dinheiro: [90, 128, 98],
  Pix: [88, 123, 156],
  Débito: [150, 122, 61],
  Crédito: [138, 72, 98],
};

const FORMA_TINT: Record<string, [number, number, number]> = {
  Dinheiro: [232, 240, 234],
  Pix: [228, 234, 244],
  Débito: [240, 234, 220],
  Crédito: [240, 226, 233],
};

/**
 * Gera e dispara download de um PDF mensal pronto pra contador.
 *
 * Layout:
 *  - Cabeçalho: nome do empreendimento + mês/ano
 *  - Caixa de KPIs: bruto, líquido, descontos, taxas, custos, margem
 *  - Tabela de lançamentos (data, cliente, serviço, forma, parc, bruto,
 *    taxa, custo, líquido, status)
 *  - Rodapé: totais + assinatura "gerado por Controle de Caixa"
 *
 * O nome do arquivo segue o padrão "controle-{negocio}-{mes-ano}.pdf"
 * pra facilitar arquivamento.
 */
export function exportMonthPdf({
  business,
  rows,
  summary,
  mes,
  ano,
}: ExportOpts): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const monthLabel = MESES_FULL[mes];
  const businessName = business?.name ?? "Empreendimento";

  // ─── Cabeçalho ───────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(40, 32, 28);
  doc.text(businessName, margin, margin + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(115, 105, 98);
  doc.text(
    `Relatório de ${monthLabel} de ${ano}`,
    margin,
    margin + 26,
  );

  // Data de geração à direita
  const generatedAt = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.setFontSize(9);
  doc.setTextColor(155, 145, 138);
  doc.text(
    `Gerado em ${generatedAt}`,
    pageWidth - margin,
    margin + 26,
    { align: "right" },
  );

  // Linha divisória
  doc.setDrawColor(220, 213, 205);
  doc.setLineWidth(0.5);
  doc.line(margin, margin + 38, pageWidth - margin, margin + 38);

  // ─── Caixa de KPIs ───────────────────────────────────────────
  let cursorY = margin + 58;
  const kpiHeight = 70;
  const kpiPadding = 12;
  const kpis: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: "Bruto", value: fmtBRL(summary.bruto) },
    { label: "Descontos", value: fmtBRL(summary.descontos) },
    { label: "Taxas", value: fmtBRL(summary.taxas) },
    { label: "Custos", value: fmtBRL(summary.custos) },
    { label: "Líquido", value: fmtBRL(summary.liq), accent: true },
    { label: "Margem", value: fmtPct(summary.margem), accent: true },
  ];
  const kpiCols = 3;
  const kpiColWidth = (pageWidth - margin * 2) / kpiCols;
  const kpiRowHeight = kpiHeight / 2;

  doc.setFillColor(248, 244, 238);
  doc.roundedRect(
    margin,
    cursorY,
    pageWidth - margin * 2,
    kpiHeight,
    6,
    6,
    "F",
  );

  kpis.forEach((kpi, i) => {
    const col = i % kpiCols;
    const row = Math.floor(i / kpiCols);
    const x = margin + col * kpiColWidth + kpiPadding;
    const y = cursorY + row * kpiRowHeight + 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(135, 124, 116);
    doc.text(kpi.label.toUpperCase(), x, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const c: [number, number, number] = kpi.accent
      ? [122, 70, 88]
      : [40, 32, 28];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(kpi.value, x, y + 16);
  });

  cursorY += kpiHeight + 18;

  // ─── Tabela de lançamentos ───────────────────────────────────
  const sortedRows = [...rows].sort((a, b) =>
    a.criadoEm < b.criadoEm ? -1 : 1,
  );
  const body = sortedRows.map((r) => {
    const date = new Date(r.criadoEm);
    const dateStr = isNaN(date.getTime())
      ? "—"
      : `${String(date.getDate()).padStart(2, "0")}/${String(
          date.getMonth() + 1,
        ).padStart(2, "0")}`;
    const formaLabel =
      r.forma === "Crédito" && r.parc > 1 ? `Crédito ${r.parc}x` : r.forma;
    return [
      dateStr,
      r.cliente || "—",
      r.servico || "—",
      formaLabel,
      fmtBRL(r.v),
      fmtBRL(r.taxaVal),
      fmtBRL(r.custoVal),
      fmtBRL(r.liq),
      r.status,
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    head: [
      [
        "Data",
        "Cliente",
        "Serviço",
        "Forma",
        "Bruto",
        "Taxa",
        "Custo",
        "Líquido",
        "Status",
      ],
    ],
    body,
    foot: [
      [
        "",
        "",
        "",
        { content: "Totais", styles: { fontStyle: "bold" } },
        fmtBRL(summary.bruto),
        fmtBRL(summary.taxas),
        fmtBRL(summary.custos),
        fmtBRL(summary.liq),
        "",
      ],
    ],
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 5,
      lineColor: [225, 218, 210],
      lineWidth: 0.4,
      textColor: [50, 42, 38],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [250, 246, 240],
      textColor: [80, 70, 64],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 6,
    },
    footStyles: {
      fillColor: [248, 244, 238],
      textColor: [40, 32, 28],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 38 },
      3: { halign: "center", cellWidth: 60 },
      4: { halign: "right", cellWidth: 60 },
      5: { halign: "right", cellWidth: 50 },
      6: { halign: "right", cellWidth: 50 },
      7: { halign: "right", cellWidth: 65 },
      8: { halign: "center", cellWidth: 50 },
    },
    didParseCell: (data) => {
      // Cor de pílula para forma de pagamento (col 3) e status (col 8)
      if (data.section !== "body") return;
      if (data.column.index === 3) {
        const raw = String(data.cell.raw ?? "").split(" ")[0];
        const tint = FORMA_TINT[raw];
        const fg = PAY_COLORS[raw];
        if (tint) data.cell.styles.fillColor = tint;
        if (fg) data.cell.styles.textColor = fg;
        data.cell.styles.fontStyle = "bold";
      }
      if (data.column.index === 8) {
        const raw = String(data.cell.raw ?? "");
        if (raw === "Pago") {
          data.cell.styles.textColor = [90, 128, 98];
          data.cell.styles.fontStyle = "bold";
        } else if (raw === "Pendente") {
          data.cell.styles.textColor = [180, 130, 60];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // ─── Rodapé ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(155, 145, 138);
    doc.text(
      "Controle de Caixa",
      margin,
      pageHeight - 18,
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 18,
      { align: "right" },
    );
  }

  // ─── Salvar ──────────────────────────────────────────────────
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const fileName = `controle-${slug(businessName) || "caixa"}-${String(
    mes + 1,
  ).padStart(2, "0")}-${ano}.pdf`;
  doc.save(fileName);
}

/* ──────────────────────────────────────────────────────────────────
 * Exportação anual — pensado pra contador / IRPF.
 *
 * Estrutura:
 *  - Capa: nome do empreendimento, "Relatório anual {ano}", totais.
 *  - Tabela consolidada: 12 meses (Mês | Lanç. | Bruto | Desc. |
 *    Taxas | Custos | Líquido | Margem).
 *  - Quebra de página + uma seção por mês com lançamentos:
 *    cabeçalho do mês + mini-resumo + tabela de transações.
 *
 * Meses sem nenhum lançamento são listados apenas na tabela consolidada
 * (não geram seção detalhada, pra não inflar o PDF).
 * ────────────────────────────────────────────────────────────────── */

interface ExportYearOpts {
  business: Business | null;
  summary: AnnualSummary;
}

const PAGE_MARGIN = 36;

function pdfSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  generatedAt: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(40, 32, 28);
  doc.text(title, PAGE_MARGIN, PAGE_MARGIN + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(115, 105, 98);
  doc.text(subtitle, PAGE_MARGIN, PAGE_MARGIN + 26);

  doc.setFontSize(9);
  doc.setTextColor(155, 145, 138);
  doc.text(
    `Gerado em ${generatedAt}`,
    pageWidth - PAGE_MARGIN,
    PAGE_MARGIN + 26,
    { align: "right" },
  );

  doc.setDrawColor(220, 213, 205);
  doc.setLineWidth(0.5);
  doc.line(
    PAGE_MARGIN,
    PAGE_MARGIN + 38,
    pageWidth - PAGE_MARGIN,
    PAGE_MARGIN + 38,
  );

  return PAGE_MARGIN + 58;
}

function drawKpiBox(
  doc: jsPDF,
  startY: number,
  kpis: Array<{ label: string; value: string; accent?: boolean }>,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const kpiHeight = 70;
  const kpiPadding = 12;
  const kpiCols = 3;
  const kpiColWidth = (pageWidth - PAGE_MARGIN * 2) / kpiCols;
  const kpiRowHeight = kpiHeight / 2;

  doc.setFillColor(248, 244, 238);
  doc.roundedRect(
    PAGE_MARGIN,
    startY,
    pageWidth - PAGE_MARGIN * 2,
    kpiHeight,
    6,
    6,
    "F",
  );

  kpis.forEach((kpi, i) => {
    const col = i % kpiCols;
    const row = Math.floor(i / kpiCols);
    const x = PAGE_MARGIN + col * kpiColWidth + kpiPadding;
    const y = startY + row * kpiRowHeight + 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(135, 124, 116);
    doc.text(kpi.label.toUpperCase(), x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const c: [number, number, number] = kpi.accent
      ? [122, 70, 88]
      : [40, 32, 28];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(kpi.value, x, y + 16);
  });

  return startY + kpiHeight + 18;
}

function drawFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(155, 145, 138);
    doc.text("Controle de Caixa", PAGE_MARGIN, pageHeight - 18);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - PAGE_MARGIN,
      pageHeight - 18,
      { align: "right" },
    );
  }
}

export function exportYearPdf({ business, summary }: ExportYearOpts): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const businessName = business?.name ?? "Empreendimento";
  const { year, total, monthly } = summary;

  const generatedAt = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ─── Página de capa ──────────────────────────────────────────
  let cursorY = drawHeader(
    doc,
    businessName,
    `Relatório anual de ${year}`,
    generatedAt,
  );

  cursorY = drawKpiBox(doc, cursorY, [
    { label: "Bruto", value: fmtBRL(total.bruto) },
    { label: "Descontos", value: fmtBRL(total.descontos) },
    { label: "Taxas", value: fmtBRL(total.taxas) },
    { label: "Custos", value: fmtBRL(total.custos) },
    { label: "Líquido", value: fmtBRL(total.liq), accent: true },
    { label: "Margem", value: fmtPct(total.margem), accent: true },
  ]);

  // ─── Tabela consolidada (12 meses) ───────────────────────────
  const consolidadoBody = monthly.map((b) => [
    MESES_FULL[b.m],
    String(b.count),
    fmtBRL(b.bruto),
    fmtBRL(b.bruto > 0 ? b.bruto - b.liq - b.taxas - b.custos : 0),
    fmtBRL(b.taxas),
    fmtBRL(b.custos),
    fmtBRL(b.liq),
    b.bruto > 0 ? fmtPct((b.liq / b.bruto) * 100) : "—",
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [
      [
        "Mês",
        "Lanç.",
        "Bruto",
        "Desc.",
        "Taxas",
        "Custos",
        "Líquido",
        "Margem",
      ],
    ],
    body: consolidadoBody,
    foot: [
      [
        { content: "Total", styles: { fontStyle: "bold" } },
        String(total.count),
        fmtBRL(total.bruto),
        fmtBRL(total.descontos),
        fmtBRL(total.taxas),
        fmtBRL(total.custos),
        fmtBRL(total.liq),
        fmtPct(total.margem),
      ],
    ],
    theme: "grid",
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 5,
      lineColor: [225, 218, 210],
      lineWidth: 0.4,
      textColor: [50, 42, 38],
      valign: "middle",
    },
    headStyles: {
      fillColor: [250, 246, 240],
      textColor: [80, 70, 64],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 6,
    },
    footStyles: {
      fillColor: [248, 244, 238],
      textColor: [40, 32, 28],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: "center", cellWidth: 36 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 6) {
        const raw = String(data.cell.raw ?? "");
        if (raw.includes("-") && raw !== "-") {
          data.cell.styles.textColor = [180, 80, 80];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // ─── Seções por mês (apenas meses com lançamentos) ───────────
  const monthsWithData = monthly.filter((b) => b.count > 0);

  monthsWithData.forEach((bucket) => {
    doc.addPage();

    cursorY = drawHeader(
      doc,
      `${MESES_FULL[bucket.m]} ${year}`,
      businessName,
      generatedAt,
    );

    // KPIs do mês
    const descontosMes = Math.max(0, bucket.bruto - bucket.liq - bucket.taxas - bucket.custos);
    cursorY = drawKpiBox(doc, cursorY, [
      { label: "Bruto", value: fmtBRL(bucket.bruto) },
      { label: "Descontos", value: fmtBRL(descontosMes) },
      { label: "Taxas", value: fmtBRL(bucket.taxas) },
      { label: "Custos", value: fmtBRL(bucket.custos) },
      { label: "Líquido", value: fmtBRL(bucket.liq), accent: true },
      {
        label: "Margem",
        value: bucket.bruto > 0 ? fmtPct((bucket.liq / bucket.bruto) * 100) : "—",
        accent: true,
      },
    ]);

    // Tabela de lançamentos do mês
    const sortedRows = [...bucket.rows].sort((a, b) =>
      a.criadoEm < b.criadoEm ? -1 : 1,
    );
    const body = sortedRows.map((r: CalculatedRow) => {
      const date = new Date(r.criadoEm);
      const dateStr = isNaN(date.getTime())
        ? "—"
        : `${String(date.getDate()).padStart(2, "0")}/${String(
            date.getMonth() + 1,
          ).padStart(2, "0")}`;
      const formaLabel =
        r.forma === "Crédito" && r.parc > 1 ? `Crédito ${r.parc}x` : r.forma;
      return [
        dateStr,
        r.cliente || "—",
        r.servico || "—",
        formaLabel,
        fmtBRL(r.v),
        fmtBRL(r.taxaVal),
        fmtBRL(r.custoVal),
        fmtBRL(r.liq),
        r.status,
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      head: [
        [
          "Data",
          "Cliente",
          "Serviço",
          "Forma",
          "Bruto",
          "Taxa",
          "Custo",
          "Líquido",
          "Status",
        ],
      ],
      body,
      foot: [
        [
          "",
          "",
          "",
          { content: "Totais", styles: { fontStyle: "bold" } },
          fmtBRL(bucket.bruto),
          fmtBRL(bucket.taxas),
          fmtBRL(bucket.custos),
          fmtBRL(bucket.liq),
          "",
        ],
      ],
      theme: "grid",
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 5,
        lineColor: [225, 218, 210],
        lineWidth: 0.4,
        textColor: [50, 42, 38],
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [250, 246, 240],
        textColor: [80, 70, 64],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 6,
      },
      footStyles: {
        fillColor: [248, 244, 238],
        textColor: [40, 32, 28],
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 38 },
        3: { halign: "center", cellWidth: 60 },
        4: { halign: "right", cellWidth: 60 },
        5: { halign: "right", cellWidth: 50 },
        6: { halign: "right", cellWidth: 50 },
        7: { halign: "right", cellWidth: 65 },
        8: { halign: "center", cellWidth: 50 },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index === 3) {
          const raw = String(data.cell.raw ?? "").split(" ")[0];
          const tint = FORMA_TINT[raw];
          const fg = PAY_COLORS[raw];
          if (tint) data.cell.styles.fillColor = tint;
          if (fg) data.cell.styles.textColor = fg;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index === 8) {
          const raw = String(data.cell.raw ?? "");
          if (raw === "Pago") {
            data.cell.styles.textColor = [90, 128, 98];
            data.cell.styles.fontStyle = "bold";
          } else if (raw === "Pendente") {
            data.cell.styles.textColor = [180, 130, 60];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  });

  drawFooter(doc);

  const fileName = `controle-${pdfSlug(businessName) || "caixa"}-anual-${year}.pdf`;
  doc.save(fileName);
}
