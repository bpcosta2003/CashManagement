/**
 * Ajusta o font-size de um elemento pra que o texto caiba sem overflow
 * horizontal no container pai. Reduz iterativamente até caber, ou até
 * atingir o mínimo.
 */
export function fitTextToContainer(
  element: HTMLElement,
  baseFontSize: number,
  minFontSize: number,
  step: number = 1,
): void {
  if (!element || !element.parentElement) return;

  const container = element.parentElement;
  let size = baseFontSize;
  element.style.fontSize = `${size}px`;

  // Atalho: já cabe, pode até crescer
  if (element.scrollWidth <= container.clientWidth) {
    return;
  }

  // Reduz até caber ou atingir mínimo
  while (size > minFontSize && element.scrollWidth > container.clientWidth) {
    size -= step;
    element.style.fontSize = `${size}px`;
  }
}
