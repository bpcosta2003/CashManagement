import type { Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";

interface Props {
  summary: Summary;
  count: number;
}

export function TotalsRow({ summary, count }: Props) {
  const liqColor = summary.liq >= 0 ? "var(--color-positive)" : "var(--color-negative)";
  return (
    <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
      <td colSpan={3} style={{ padding: "10px 8px", fontFamily: "var(--font-display)" }}>
        Totais ({count})
      </td>
      <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
        {fmtBRL(summary.bruto)}
      </td>
      <td
        style={{
          padding: "10px 8px",
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          color: "var(--color-desconto)",
        }}
      >
        {fmtBRL(summary.descontos)}
      </td>
      <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
        {fmtBRL(summary.bruto - summary.descontos)}
      </td>
      <td colSpan={2} />
      <td />
      <td
        style={{
          padding: "10px 8px",
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          color: "var(--color-warning)",
        }}
      >
        {fmtBRL(summary.taxas)}
      </td>
      <td
        style={{
          padding: "10px 8px",
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          color: "var(--color-warning)",
        }}
      >
        {fmtBRL(summary.custos)}
      </td>
      <td
        style={{
          padding: "10px 8px",
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          color: liqColor,
        }}
      >
        {fmtBRL(summary.liq)}
      </td>
      <td
        style={{
          padding: "10px 8px",
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          color: liqColor,
        }}
      >
        {fmtPct(summary.margem)}
      </td>
      <td colSpan={2} />
    </tr>
  );
}
