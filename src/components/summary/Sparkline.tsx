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
 * Sparkline minimalista — linha suave do líquido dos últimos meses.
 * Renderiza vazio quando não há variação (todos zero).
 */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = "currentColor",
  ariaLabel,
}: Props) {
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
    .map(([x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`))
    .join(" ");

  const lastPoint = points[points.length - 1];

  return (
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
      <circle
        cx={lastPoint[0]}
        cy={lastPoint[1]}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}
