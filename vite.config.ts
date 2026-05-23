import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// ─── Identidade do build ──────────────────────────────────────────────
// Versão "humana" vem do package.json (manual via npm version patch
// quando faz sentido marcar release). Build identifier vem do git
// short SHA — auto-incrementa naturalmente a cada deploy.
const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};
const APP_VERSION = pkg.version;

let APP_BUILD = "dev";
// 1ª prioridade: env var da Vercel (set automaticamente em CI/CD).
// 2ª: git local (funciona em qualquer máquina com .git presente).
// Fallback "dev" pra ambientes sem git nem env.
if (process.env.VERCEL_GIT_COMMIT_SHA) {
  APP_BUILD = process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
} else {
  try {
    APP_BUILD = execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch {
    /* sem git → fica "dev" */
  }
}

const APP_BUILT_AT = new Date().toISOString();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_BUILD__: JSON.stringify(APP_BUILD),
    __APP_BUILT_AT__: JSON.stringify(APP_BUILT_AT),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/xlsx")) return "excel";
          if (id.includes("node_modules/react")) return "react";
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "brand-light.png",
        "brand-dark.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
      ],
      manifest: {
        name: "Controle de Caixa — registro e análise financeira",
        // short_name é usado pela home screen iOS/Android quando o nome
        // completo não cabe. "Caixa" sozinho ficava ambíguo, então
        // usamos uma forma curta mas reconhecível.
        short_name: "Controle de Caixa",
        description: "Registro e análise dos lançamentos financeiros do seu empreendimento",
        theme_color: "#5a2e3f",
        background_color: "#f5f0e8",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        lang: "pt-BR",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
});
