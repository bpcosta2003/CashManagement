import { PNG } from "pngjs";
import { readFileSync, writeFileSync } from "fs";

// Lê um PNG e reduz pra targetSize x targetSize usando box filter simples.
function resize(inputBuf, targetSize) {
  const png = PNG.sync.read(inputBuf);
  const { width, height, data } = png;
  const out = new PNG({ width: targetSize, height: targetSize });
  const scaleX = width / targetSize;
  const scaleY = height / targetSize;
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const x0 = Math.floor(x * scaleX);
      const y0 = Math.floor(y * scaleY);
      const x1 = Math.min(width, Math.ceil((x + 1) * scaleX));
      const y1 = Math.min(height, Math.ceil((y + 1) * scaleY));
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * width + xx) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
          count++;
        }
      }
      const j = (y * targetSize + x) * 4;
      out.data[j] = Math.round(r / count);
      out.data[j + 1] = Math.round(g / count);
      out.data[j + 2] = Math.round(b / count);
      out.data[j + 3] = Math.round(a / count);
    }
  }
  return PNG.sync.write(out);
}

function emit(inputPath, outputs) {
  const buf = readFileSync(inputPath);
  for (const { size, path } of outputs) {
    const data = resize(buf, size);
    writeFileSync(path, data);
    console.log(
      `${path} → ${(data.length / 1024).toFixed(1)} KB (${size}×${size})`,
    );
  }
}

emit("public/brand-light.png", [
  { size: 256, path: "public/brand-light.png" },
  { size: 192, path: "public/icon-192.png" },
  { size: 512, path: "public/icon-512.png" },
  { size: 180, path: "public/apple-touch-icon.png" },
]);

emit("public/brand-dark.png", [
  { size: 256, path: "public/brand-dark.png" },
]);
