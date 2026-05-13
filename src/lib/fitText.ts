/**
 * Ajusta o font-size de um elemento pra que o texto caiba sem overflow
 * horizontal no container pai. Usa busca binária — mais rápido e robusto
 * que decremento de 1px.
 *
 * Retorna o size final aplicado.
 */
export function fitTextToContainer(
  element: HTMLElement,
  baseFontSize: number,
  minFontSize: number,
): number {
  const container = element.parentElement;
  if (!container) return baseFontSize;

  // Largura útil do container (já exclui padding via clientWidth)
  const availableWidth = container.clientWidth;
  if (availableWidth <= 0) return baseFontSize;

  // Testa primeiro o tamanho base — caso comum
  element.style.fontSize = `${baseFontSize}px`;
  if (element.scrollWidth <= availableWidth) return baseFontSize;

  // Busca binária: encontra o maior size em [minFontSize, baseFontSize]
  // tal que scrollWidth <= availableWidth.
  let lo = minFontSize;
  let hi = baseFontSize;
  let best = minFontSize;
  // Até 12 iterações é suficiente (resolução < 0.1px)
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    element.style.fontSize = `${mid}px`;
    if (element.scrollWidth <= availableWidth) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 0.5) break;
  }
  // Arredonda pra baixo (mais conservador) e aplica
  const finalSize = Math.floor(best);
  element.style.fontSize = `${finalSize}px`;
  return finalSize;
}

/**
 * Observa um container e re-ajusta o texto sempre que algo muda
 * (resize, fonts.ready, etc.). Retorna função de cleanup.
 */
export function observeFit(
  element: HTMLElement,
  baseFontSize: number,
  minFontSize: number,
): () => void {
  const fit = () => fitTextToContainer(element, baseFontSize, minFontSize);

  fit();

  // ResizeObserver no PAI (que decide a largura disponível) e no
  // próprio elemento (caso o texto/conteúdo mude).
  const container = element.parentElement;
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined" && container) {
    ro = new ResizeObserver(() => fit());
    ro.observe(container);
    ro.observe(element);
  }

  // Re-fit quando fonts terminam de carregar (Inter via Google Fonts
  // chega depois do primeiro paint)
  let cancelled = false;
  if (typeof document !== "undefined" && "fonts" in document) {
    document.fonts.ready
      .then(() => {
        if (!cancelled) fit();
      })
      .catch(() => {
        /* ignore */
      });
  }

  return () => {
    cancelled = true;
    ro?.disconnect();
  };
}
