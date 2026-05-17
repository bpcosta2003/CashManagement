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
 *
 * Notas de implementação:
 *  - A primeira medição é deferida pra `requestAnimationFrame` pra
 *    garantir que o layout do container já se estabilizou. Sem isso,
 *    em remounts (ex.: troca de mês via `key`), `clientWidth` podia
 *    devolver um valor parcial e a busca binária convergia pra uma
 *    fonte minúscula até o próximo evento de resize.
 *  - Observa apenas o CONTAINER, nunca o próprio elemento. Observar o
 *    elemento criaria feedback (o próprio `fit` muda o tamanho do
 *    elemento, dispara o ResizeObserver, refit, etc.).
 */
export function observeFit(
  element: HTMLElement,
  baseFontSize: number,
  minFontSize: number,
): () => void {
  let raf = 0;
  let cancelled = false;

  const runFit = () => {
    if (cancelled) return;
    fitTextToContainer(element, baseFontSize, minFontSize);
  };

  const scheduleFit = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      runFit();
    });
  };

  // 1ª medição: defer pro próximo frame — layout/grid já settled.
  scheduleFit();

  const container = element.parentElement;
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined" && container) {
    ro = new ResizeObserver(scheduleFit);
    ro.observe(container);
  }

  // Re-fit quando fonts terminam de carregar (Inter via Google Fonts
  // chega depois do primeiro paint).
  if (typeof document !== "undefined" && "fonts" in document) {
    document.fonts.ready
      .then(() => {
        if (!cancelled) scheduleFit();
      })
      .catch(() => {
        /* ignore */
      });
  }

  return () => {
    cancelled = true;
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
  };
}
