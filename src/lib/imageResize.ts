/**
 * Lê um arquivo de imagem, redimensiona pra um quadrado de `targetSize`
 * (com letterbox transparente se a imagem original não for quadrada) e
 * devolve um data URL PNG.
 *
 * Limita o output em ~80KB pra não estourar localStorage.
 */
export async function resizeImageToDataUrl(
  file: File,
  targetSize: number = 256,
): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste navegador.");

  // Letterbox: cabe inteiro mantendo proporção, centralizado
  const ratio = Math.min(targetSize / img.width, targetSize / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (targetSize - w) / 2;
  const y = (targetSize - h) / 2;
  ctx.clearRect(0, 0, targetSize, targetSize);
  ctx.drawImage(img, x, y, w, h);

  // PNG preserva transparência; se ficar muito grande, tenta JPG.
  let out = canvas.toDataURL("image/png");
  if (out.length > 110_000) {
    out = canvas.toDataURL("image/jpeg", 0.85);
  }
  return out;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Erro ao ler"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagem inválida"));
    img.src = src;
  });
}
