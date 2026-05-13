import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { observeFit } from "../../lib/fitText";

interface Props {
  children: ReactNode;
  baseFontSize: number;
  minFontSize: number;
  className?: string;
  style?: CSSProperties;
  /** HTML tag a renderizar. Default: span. */
  as?: "span" | "div";
  /** Force re-fit quando este valor mudar (ex.: texto). */
  watchKey?: string | number;
  title?: string;
}

/**
 * Texto que encolhe sozinho até caber no container pai. Usa observeFit
 * (binary search + ResizeObserver + document.fonts.ready) — robusto a
 * mudanças de layout e carregamento tardio de fontes.
 *
 * O pai DEVE ter `overflow: hidden` e/ou `min-width: 0` pra que o auto-
 * shrink funcione (senão o container expande junto com o texto).
 */
export function FitText({
  children,
  baseFontSize,
  minFontSize,
  className,
  style,
  as: Tag = "span",
  watchKey,
  title,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return observeFit(ref.current, baseFontSize, minFontSize);
  }, [baseFontSize, minFontSize, watchKey]);

  return (
    <Tag
      // @ts-expect-error — generic ref pra HTMLElement
      ref={ref}
      className={className}
      style={{
        display: "block",
        whiteSpace: "nowrap",
        ...style,
      }}
      title={title}
    >
      {children}
    </Tag>
  );
}
