import styles from "./Brand.module.css";

interface MarkProps {
  size?: number;
  /** Logo customizada (data URL). Substitui as PNGs padrão. */
  customLogo?: string;
}

/**
 * BrandMark — usa as PNGs renderizadas (light + dark) trocadas via CSS
 * conforme o data-theme do root, OU uma logo customizada do empreendimento
 * quando passada.
 */
export function BrandMark({ size = 36, customLogo }: MarkProps) {
  if (customLogo) {
    return (
      <span
        className={styles.markWrap}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <img
          className={styles.markCustom}
          src={customLogo}
          alt=""
          width={size}
          height={size}
          loading="eager"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span
      className={styles.markWrap}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        className={`${styles.markImg} ${styles.markLight}`}
        src="/brand-light.png"
        alt=""
        width={size}
        height={size}
        loading="eager"
        decoding="async"
      />
      <img
        className={`${styles.markImg} ${styles.markDark}`}
        src="/brand-dark.png"
        alt=""
        width={size}
        height={size}
        loading="eager"
        decoding="async"
      />
    </span>
  );
}

interface BrandProps {
  /** Nome do empreendimento exibido no subtítulo. */
  businessName?: string;
  /** Logo do empreendimento (sobrepõe a logo padrão se presente). */
  businessLogo?: string;
  size?: "sm" | "md";
  /** Se passado, o brand vira clicável (botão pra abrir o switcher). */
  onClick?: () => void;
  /** Mostra o chevron sutil indicando dropdown. */
  showChevron?: boolean;
}

export function Brand({
  businessName,
  businessLogo,
  size = "sm",
  onClick,
  showChevron,
}: BrandProps) {
  const markSize = size === "md" ? 44 : 36;
  const subtitle = businessName?.trim() || "Configure seu negócio";

  const inner = (
    <>
      <BrandMark size={markSize} customLogo={businessLogo} />
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
          {showChevron && (
            <svg
              className={styles.chevron}
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={styles.brand}
        data-size={size}
        data-interactive="true"
        onClick={onClick}
        aria-label="Trocar empreendimento"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={styles.brand} data-size={size}>
      {inner}
    </div>
  );
}
