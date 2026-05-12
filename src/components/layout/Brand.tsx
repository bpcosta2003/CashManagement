import styles from "./Brand.module.css";

interface MarkProps {
  size?: number;
}

/**
 * BrandMark — cofre com elementos financeiros (paper R$, bar chart, arrow ↑).
 * Themes via CSS variables: light/dark muda os tons do baú; bordô e champagne
 * vêm dos tokens principais.
 */
export function BrandMark({ size = 36 }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={styles.mark}
    >
      {/* Background: chest tile com cantos arredondados */}
      <rect width="64" height="64" rx="14" className={styles.markBg} />

      {/* Conteúdo do baú (saindo de dentro): papel com R$ no canto esquerdo */}
      <g transform="translate(11, 14)">
        <rect width="11" height="15" rx="1.2" className={styles.markPaper} />
        <rect x="2" y="3.5" width="7" height="0.9" className={styles.markPaperLine} />
        <text
          x="5.5"
          y="11"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="5.2"
          fontWeight="700"
          className={styles.markPaperR}
        >
          R$
        </text>
      </g>

      {/* Bar chart no centro/direita do conteúdo */}
      <g transform="translate(28, 15)">
        <rect x="0" y="9" width="3.5" height="6" rx="0.6" className={styles.markBar1} />
        <rect x="5" y="5" width="3.5" height="10" rx="0.6" className={styles.markBar2} />
        <rect x="10" y="0" width="3.5" height="15" rx="0.6" className={styles.markBar3} />
      </g>

      {/* Seta ascendente no canto superior direito */}
      <g transform="translate(43, 12)">
        <path
          d="M0 9 L5 4 L9 7 L14 1"
          fill="none"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.markArrow}
        />
        <path
          d="M10 0 L14 0 L14 4"
          fill="none"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.markArrow}
        />
      </g>

      {/* Corpo do baú (trapezoide) */}
      <path
        d="M8 36 L56 36 L52 56 L12 56 Z"
        className={styles.markChest}
      />

      {/* Tampa do baú aberta (linha superior do baú) */}
      <path d="M6 36 L58 36" strokeWidth="1.2" className={styles.markChestEdge} />

      {/* Fechadura central */}
      <rect x="29" y="44" width="6" height="6" rx="1.2" className={styles.markLock} />
      <circle cx="32" cy="47" r="1" className={styles.markLockDot} />
    </svg>
  );
}

interface BrandProps {
  /** Nome do empreendimento exibido no subtítulo. */
  businessName?: string;
  size?: "sm" | "md";
}

export function Brand({ businessName, size = "sm" }: BrandProps) {
  const markSize = size === "md" ? 44 : 36;
  const subtitle = businessName?.trim() || "Configure seu negócio";

  return (
    <div className={styles.brand} data-size={size}>
      <BrandMark size={markSize} />
      <div className={styles.text}>
        <span className={styles.name}>
          Controle <span className={styles.nameAccent}>de Caixa</span>
        </span>
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
