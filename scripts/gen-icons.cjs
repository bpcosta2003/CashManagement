/* Generates PWA icons (192, 512, apple-touch-icon 180) and a favicon.svg.
 * Pure procedural: dark slate background + cyan dot + monospace "CC".
 */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

const BG = [15, 23, 42];      // #0f172a
const DOT = [2, 132, 199];    // #0284c7
const FG = [241, 245, 249];   // #f1f5f9

function setPx(png, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fillRect(png, x0, y0, x1, y1, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      setPx(png, x, y, color);
    }
  }
}

function fillCircle(png, cx, cy, r, color) {
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(png, x, y, color);
    }
  }
}

// Tiny 5x7 bitmap font for "CC" letters. Each glyph is 5 cols × 7 rows.
const FONT = {
  C: [
    "01110",
    "10001",
    "10000",
    "10000",
    "10000",
    "10001",
    "01110",
  ],
};

function drawGlyph(png, glyph, ox, oy, scale, color) {
  for (let r = 0; r < glyph.length; r++) {
    for (let c = 0; c < glyph[r].length; c++) {
      if (glyph[r][c] === "1") {
        fillRect(
          png,
          ox + c * scale,
          oy + r * scale,
          ox + (c + 1) * scale,
          oy + (r + 1) * scale,
          color,
        );
      }
    }
  }
}

function drawIcon(size, outPath, withBg = true) {
  const png = new PNG({ width: size, height: size });
  // background
  if (withBg) fillRect(png, 0, 0, size, size, BG);

  // Cyan accent dot top-left-ish
  const dotR = Math.round(size * 0.06);
  fillCircle(png, Math.round(size * 0.22), Math.round(size * 0.22), dotR, DOT);

  // "CC" centered using bitmap font, large scale
  const scale = Math.round(size / 16);
  const glyphW = 5 * scale;
  const glyphH = 7 * scale;
  const gap = scale * 2;
  const totalW = glyphW * 2 + gap;
  const ox = Math.round((size - totalW) / 2);
  const oy = Math.round((size - glyphH) / 2);
  drawGlyph(png, FONT.C, ox, oy, scale, FG);
  drawGlyph(png, FONT.C, ox + glyphW + gap, oy, scale, FG);

  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log("wrote", outPath);
}

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

drawIcon(192, path.join(PUBLIC_DIR, "icon-192.png"));
drawIcon(512, path.join(PUBLIC_DIR, "icon-512.png"));
drawIcon(180, path.join(PUBLIC_DIR, "apple-touch-icon.png"));

// favicon.svg — much smaller, scalable
const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0f172a"/>
  <circle cx="14" cy="14" r="4" fill="#0284c7"/>
  <text x="32" y="44" font-family="monospace" font-size="28" font-weight="700"
    text-anchor="middle" fill="#f1f5f9">CC</text>
</svg>`;
fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.svg"), favSvg);
console.log("wrote favicon.svg");
