import styles from "./Brand.module.css";

interface MarkProps {
  size?: number;
}

export function BrandMark({ size = 34 }: MarkProps) {
  const r = size <= 36 ? 10 : 12;
  const stroke = size <= 36 ? 1.4 : 1.6;
  const dot = size <= 36 ? 2.4 : 3;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className={styles.mark}
    >
      <rect x="1" y="1" width={size - 2} height={size - 2} rx={r} fill="var(--accent)" />
      <path
        d={`M${size / 2} ${size * 0.21} L${size * 0.79} ${size / 2} L${size / 2} ${size * 0.79} L${size * 0.21} ${size / 2} Z`}
        fill="none"
        stroke="var(--champagne)"
        strokeWidth={stroke}
      />
      <circle cx={size / 2} cy={size / 2} r={dot} fill="var(--champagne)" />
      <line
        x1={size / 2}
        y1={size * 0.21}
        x2={size / 2}
        y2={size * 0.79}
        stroke="rgba(255,255,255,.18)"
        strokeWidth="0.7"
      />
    </svg>
  );
}

interface BrandProps {
  /** Nome do empreendimento exibido no subtítulo. */
  businessName?: string;
  size?: "sm" | "md";
}

export function Brand({ businessName, size = "sm" }: BrandProps) {
  const markSize = size === "md" ? 42 : 34;
  const subtitle = businessName?.trim() || "Configure seu negócio";

  return (
    <div className={styles.brand} data-size={size}>
      <BrandMark size={markSize} />
      <div className={styles.text}>
        <span className={styles.name}>Cash Management</span>
        <span
          className={styles.tag}
          title={subtitle}
          data-empty={!businessName?.trim()}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
}
