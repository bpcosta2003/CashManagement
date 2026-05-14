import { useRef, useState } from "react";
import { fmtBRL } from "../../lib/calc";

interface Point {
  liq: number;
  label: string;
}

interface Props {
  data: Point[];
  width?: number;
  height?: number;
  color?: string;
  ariaLabel?: string;
}

/**
 * Sparkline interativa — linha do líquido nos últimos meses.
 * Pointer/touch sobre o svg aparece um tooltip com mês + valor do
 * ponto mais próximo. Renderiza vazio quando todos os valores são
 * iguais (não há tendência pra mostrar).
 */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = "currentColor",
  ariaLabel,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length < 2) return null;

  const values = data.map((d) => d.liq);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  if (Math.abs(range) < 0.01) return null;

  const stepX = width / (data.length - 1);
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d.liq - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const pathD = points
    .map(([x, y], i) =>
      i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`,
    )
    .join(" ");

  const lastPoint = points[points.length - 1];

  // Posição do ponto destacado (hover). Default = último.
  const activeIdx = hoverIdx ?? data.length - 1;
  const activePoint = points[activeIdx];
  const activeData = data[activeIdx];

  // Mapeia coordenada do clientX pra índice do ponto mais próximo.
  const handleMove = (clientX: number) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const xLocal = ((clientX - rect.left) / rect.width) * width;
    const idx = Math.round(xLocal / stepX);
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const isHovering = hoverIdx !== null;

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: "crosshair",
      }}
      onPointerMove={(e) => handleMove(e.clientX)}
      onPointerEnter={(e) => handleMove(e.clientX)}
      onPointerLeave={() => setHoverIdx(null)}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={ariaLabel}
        role="img"
        style={{ display: "block", flexShrink: 0 }}
      >
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
        {/* Linha vertical do hover */}
        {isHovering && (
          <line
            x1={activePoint[0]}
            x2={activePoint[0]}
            y1={0}
            y2={height}
            stroke={color}
            strokeWidth="1"
            opacity="0.25"
          />
        )}
        {/* Ponto destacado */}
        <circle
          cx={isHovering ? activePoint[0] : lastPoint[0]}
          cy={isHovering ? activePoint[1] : lastPoint[1]}
          r={isHovering ? "3" : "2.5"}
          fill={color}
          stroke="var(--surface)"
          strokeWidth={isHovering ? "1.5" : "0"}
        />
      </svg>
      {isHovering && activeData && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            left: `${(activePoint[0] / width) * 100}%`,
            top: -8,
            transform: "translate(-50%, -100%)",
            background: "var(--hero-bg)",
            color: "var(--hero-fg)",
            padding: "5px 9px",
            borderRadius: "var(--radius-sm)",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "var(--shadow-card-hi)",
            zIndex: 5,
          }}
        >
          <span style={{ opacity: 0.7, marginRight: 6 }}>
            {activeData.label}
          </span>
          <strong>{fmtBRL(activeData.liq)}</strong>
        </div>
      )}
    </div>
  );
}
