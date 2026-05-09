import type { Summary } from "../../types";
import { fmtBRL, fmtPct } from "../../lib/calc";

interface Props {
  summary: Summary;
  count: number;
}

const cellNum: React.CSSProperties = {
  padding: "12px 10px",
  textAlign: "right",
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
};

export function TotalsRow({ summary, count }: Props) {
  const liqColor =
    summary.liq >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <tr style={{ background: "var(--surface-2)", fontWeight: 600 }}>
      <td
        colSpan={3}
        style={{
          padding: "12px 10px",
          fontFamily: "var(--font-display)",
          color: "var(--text)",
          letterSpacing: "-0.01em",
        }}
      >
        Totais ({count})
      </td>
      <td style={cellNum}>{fmtBRL(summary.bruto)}</td>
      <td style={{ ...cellNum, color: "var(--warning)" }}>
        {fmtBRL(summary.descontos)}
      </td>
      <td style={cellNum}>{fmtBRL(summary.bruto - summary.descontos)}</td>
      <td colSpan={2} />
      <td />
      <td style={{ ...cellNum, color: "var(--text-muted)" }}>
        {fmtBRL(summary.taxas)}
      </td>
      <td style={{ ...cellNum, color: "var(--text-muted)" }}>
        {fmtBRL(summary.custos)}
      </td>
      <td style={{ ...cellNum, color: liqColor }}>{fmtBRL(summary.liq)}</td>
      <td style={{ ...cellNum, color: liqColor }}>{fmtPct(summary.margem)}</td>
      <td colSpan={2} />
    </tr>
  );
}
