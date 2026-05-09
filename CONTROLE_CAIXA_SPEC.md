# Controle de Caixa — Especificação Técnica para Claude Code

> Use este documento como contexto completo para implementar o projeto do zero com Claude Code.
> O protótipo de referência já existe como um único arquivo `.jsx` — o objetivo aqui é transformá-lo
> em uma aplicação real: PWA instalável, dados persistidos em localStorage, exportação/importação Excel.

---

## 1. Visão Geral do Produto

**Produto:** Controle de Caixa — ferramenta de gestão financeira para salão de beleza  
**Modelo:** SaaS estático (sem backend), acessível via navegador, instalável como PWA  
**Armazenamento:** 100% localStorage — sem login, sem servidor, sem nuvem  
**Público:** Proprietária de salão de beleza; não técnica; usa celular e notebook

### O que o app faz hoje (protótipo)

- Planilha editável inline por mês/ano (navegação entre meses)
- Cada linha = um atendimento: cliente, serviço, valor, forma de pagamento, parcelas, taxa de cartão, custo do serviço, desconto, status
- **Cálculo por linha:**
  ```
  vef = valor − desconto
  taxaVal = vef × (taxa / 100)
  líquido = vef − taxaVal − custo
  margem% = líquido / valor × 100
  ```
- Cards de resumo: faturamento bruto, custos+taxas, lucro líquido, recebível este mês
- Projeção de recebimentos futuros: crédito à vista → próximo mês; parcelado → N meses
- Layout dual: planilha no desktop, cards + bottom sheet no mobile

### O que precisa ser construído

1. Migrar o protótipo single-file para projeto Vite + React + TypeScript estruturado
2. Persistir dados em localStorage (com versionamento para migrações futuras)
3. Configurar PWA (instalável em iOS, Android e desktop via Chrome/Edge)
4. Exportação para Excel (.xlsx) com múltiplas abas
5. Importação de Excel para restaurar backup
6. Interface de backup/restore visível no app

---

## 2. Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Framework | React 18 + Vite | Rápido, Claude Code domina, DX excelente |
| Linguagem | TypeScript | Tipos ajudam nas migrações de dados e no Excel |
| Estilização | CSS Modules + variáveis CSS | Manter design do protótipo sem Tailwind como dependência |
| PWA | `vite-plugin-pwa` + Workbox | Geração automática de service worker e manifest |
| Excel | `xlsx` (SheetJS Community Edition) | Leitura e escrita de .xlsx sem dependência de servidor |
| Fontes | Google Fonts (Syne, DM Sans, DM Mono) | Identidade visual do protótipo |
| Deploy | Vercel / Netlify / GitHub Pages | Hospedagem gratuita de site estático |

### Instalação das dependências

```bash
npm create vite@latest controle-caixa -- --template react-ts
cd controle-caixa
npm install
npm install xlsx
npm install -D vite-plugin-pwa
```

---

## 3. Estrutura de Arquivos

```
controle-caixa/
├── public/
│   ├── favicon.ico
│   ├── icon-192.png          # Ícone PWA 192×192px
│   ├── icon-512.png          # Ícone PWA 512×512px
│   └── apple-touch-icon.png  # 180×180px para iOS
├── src/
│   ├── main.tsx
│   ├── App.tsx               # Root: roteamento mobile/desktop, estado global
│   ├── types.ts              # Interfaces TypeScript
│   ├── constants.ts          # Meses, formas de pagamento, taxas padrão, cores
│   │
│   ├── hooks/
│   │   ├── useBreakpoint.ts  # Detecta mobile/desktop
│   │   ├── useStorage.ts     # Lê/escreve localStorage com versionamento
│   │   └── useCalc.ts        # Todos os cálculos financeiros (useMemo)
│   │
│   ├── lib/
│   │   ├── calc.ts           # Funções puras: calcRow, autoTaxa, addMes
│   │   ├── storage.ts        # Serialização, migração, validação do localStorage
│   │   └── excel.ts          # Exportação e importação Excel (SheetJS)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx         # Cabeçalho sticky (título + nav de mês + botão taxas)
│   │   │   ├── TaxBar.tsx         # Barra de referência de taxas (colapsável)
│   │   │   └── BottomNav.tsx      # Navegação inferior (mobile only)
│   │   ├── summary/
│   │   │   ├── SummaryCards.tsx   # 4 cards de métricas (responsivo)
│   │   │   └── PaymentBreakdown.tsx # Breakdown por forma de pagamento
│   │   ├── table/
│   │   │   ├── DesktopTable.tsx   # Planilha editável (desktop)
│   │   │   └── TotalsRow.tsx      # Linha de totais da planilha
│   │   ├── mobile/
│   │   │   ├── MobileCardList.tsx # Lista de cards (mobile)
│   │   │   ├── MobileCard.tsx     # Card individual de lançamento
│   │   │   └── FAB.tsx            # Botão flutuante de ação
│   │   ├── forms/
│   │   │   ├── EntryForm.tsx      # Formulário de lançamento (mobile sheet)
│   │   │   └── Sheet.tsx          # Bottom sheet container
│   │   ├── projection/
│   │   │   └── ProjectionSection.tsx # Projeção de recebimentos futuros
│   │   └── backup/
│   │       └── BackupPanel.tsx    # Exportar/importar Excel + limpar dados
│   │
│   └── styles/
│       ├── global.css
│       └── tokens.css            # Variáveis CSS do design system
│
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Modelo de Dados (TypeScript)

### `src/types.ts`

```typescript
export type FormaPagamento = "Dinheiro" | "Pix" | "Débito" | "Crédito";
export type StatusPagamento = "Pago" | "Pendente";

/** Linha de lançamento — dados brutos inseridos pelo usuário */
export interface Row {
  id: string;
  cliente: string;
  servico: string;
  valor: number | "";
  forma: FormaPagamento;
  parc: number;          // 1–24; relevante só quando forma === "Crédito"
  taxa: number;          // percentual, ex: 2.9
  custo: number | "";
  desconto: number | "";
  status: StatusPagamento;
  mes: number;           // 0–11 (mês de referência do lançamento)
  ano: number;
  criadoEm: string;      // ISO 8601
}

/** Linha calculada — campos derivados adicionados pelo calcRow() */
export interface CalculatedRow extends Row {
  v: number;             // valor numérico
  descontoVal: number;   // desconto numérico
  vef: number;           // valor efetivo (v − descontoVal)
  taxaVal: number;       // valor da taxa em reais
  custoVal: number;      // custo numérico
  liq: number;           // líquido final
  mar: number;           // margem %
}

/** Estado global persistido no localStorage */
export interface AppState {
  version: number;       // número inteiro para migrações (iniciar em 1)
  rows: Row[];
  lastModified: string;  // ISO 8601
}

/** Sumário calculado de um conjunto de linhas */
export interface Summary {
  bruto: number;
  descontos: number;
  taxas: number;
  custos: number;
  liq: number;
  margem: number;
  estesMes: number;
  futuro: number;
}

/** Item de projeção de recebimento futuro */
export interface ProjecaoMes {
  m: number;
  y: number;
  lbl: string;
  bruto: number;
  taxa: number;
  liq: number;
  items: ProjecaoItem[];
}

export interface ProjecaoItem {
  cliente: string;
  servico: string;
  bruto: number;
  liq: number;
  label: string;  // "Crédito à vista" | "Parcela N/Total"
}
```

---

## 5. Camada de Persistência (localStorage)

### Chave e estrutura

```
localStorage key: "controle-caixa:v1"
value: JSON serializado de AppState
```

### `src/lib/storage.ts`

```typescript
import { AppState, Row } from "../types";

const STORAGE_KEY = "controle-caixa:v1";
const CURRENT_VERSION = 1;

/** Lê e retorna o estado do localStorage. Retorna null se vazio. */
export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return migrate(parsed);
  } catch {
    return null;
  }
}

/** Salva o estado completo no localStorage */
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      lastModified: new Date().toISOString(),
    }));
  } catch (e) {
    // localStorage cheio — avisar o usuário
    console.error("Erro ao salvar no localStorage:", e);
  }
}

/** Limpa todos os dados do app */
export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Retorna o tamanho aproximado dos dados em KB */
export function getStorageSize(): number {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "";
  return Math.round(raw.length / 1024 * 10) / 10;
}

/** Migrações entre versões */
function migrate(state: AppState): AppState {
  // v1 → v2 exemplo (adicionar quando necessário):
  // if (state.version < 2) { ... state.version = 2; }
  return state;
}

/** Estado inicial quando não há dados salvos */
export function initialState(): AppState {
  return {
    version: CURRENT_VERSION,
    rows: [],
    lastModified: new Date().toISOString(),
  };
}
```

### `src/hooks/useStorage.ts`

```typescript
import { useState, useEffect, useCallback } from "react";
import { AppState, Row } from "../types";
import { loadState, saveState, initialState } from "../lib/storage";
import { uid } from "../lib/calc";

export function useStorage() {
  const [state, setState] = useState<AppState>(() => loadState() ?? initialState());

  // Persiste sempre que o estado muda
  useEffect(() => {
    saveState(state);
  }, [state]);

  const setRows = useCallback((updater: (rows: Row[]) => Row[]) => {
    setState(prev => ({ ...prev, rows: updater(prev.rows) }));
  }, []);

  const addRow = useCallback((init: Partial<Row> = {}) => {
    const newRow: Row = {
      id: uid(),
      cliente: "", servico: "", valor: "", forma: "Pix",
      parc: 1, taxa: 0, custo: "", desconto: "",
      status: "Pago",
      mes: new Date().getMonth(),
      ano: new Date().getFullYear(),
      criadoEm: new Date().toISOString(),
      ...init,
    };
    setRows(rows => [...rows, newRow]);
    return newRow.id;
  }, [setRows]);

  const updateRow = useCallback((id: string, field: keyof Row, value: unknown) => {
    setRows(rows => rows.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      // Auto-taxa
      if (field === "forma") {
        u.taxa = autoTaxa(value as string, u.parc);
        if (value !== "Crédito") u.parc = 1;
      }
      if (field === "parc") u.taxa = autoTaxa(u.forma, value as number);
      return u;
    }));
  }, [setRows]);

  const deleteRow = useCallback((id: string) => {
    setRows(rows => rows.filter(r => r.id !== id));
  }, [setRows]);

  const replaceAllRows = useCallback((rows: Row[]) => {
    setRows(() => rows);
  }, [setRows]);

  const mergeRows = useCallback((incoming: Row[]) => {
    setRows(existing => {
      const existingIds = new Set(existing.map(r => r.id));
      const newRows = incoming.filter(r => !existingIds.has(r.id));
      return [...existing, ...newRows];
    });
  }, [setRows]);

  return { state, setRows, addRow, updateRow, deleteRow, replaceAllRows, mergeRows };
}
```

---

## 6. Funções de Cálculo (`src/lib/calc.ts`)

Extrair do protótipo as funções puras:

```typescript
export const uid = () => Math.random().toString(36).slice(2, 9);

export function autoTaxa(forma: string, parc: number | string): number {
  if (!forma || forma === "Dinheiro" || forma === "Pix") return 0;
  if (forma === "Débito") return 1.5;
  if (forma === "Crédito") {
    const p = +parc || 1;
    return p <= 1 ? 2.9 : p <= 6 ? 3.9 : 4.9;
  }
  return 0;
}

export function addMes(m: number, y: number, n: number) {
  let nm = m + n, ny = y;
  while (nm > 11) { nm -= 12; ny++; }
  return { m: nm, y: ny };
}

export function calcRow(r: Row): CalculatedRow {
  const v = +r.valor || 0;
  const d = Math.min(+r.desconto || 0, v);
  const vef = v - d;
  const t = vef * (+r.taxa || 0) / 100;
  const c = +r.custo || 0;
  return { ...r, v, descontoVal: d, vef, taxaVal: t, custoVal: c,
    liq: vef - t - c, mar: v ? (vef - t - c) / v * 100 : 0 };
}
```

---

## 7. Configuração PWA

### `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-*.png"],
      manifest: {
        name: "Controle de Caixa",
        short_name: "Caixa",
        description: "Gestão financeira para salão de beleza",
        theme_color: "#0f172a",
        background_color: "#f1f5f9",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png",  purpose: "any maskable" },
        ],
      },
      workbox: {
        // Cache de todos os assets do app para funcionar offline
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
```

### Banner de instalação do PWA

Implementar em `App.tsx` o prompt de instalação:

```typescript
// Interceptar o evento beforeinstallprompt
useEffect(() => {
  const handler = (e: Event) => {
    e.preventDefault();
    setInstallPrompt(e as BeforeInstallPromptEvent);
  };
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}, []);
```

Mostrar um banner discreto na parte superior (abaixo do header) com:
> "📲 Instale o app para acesso rápido pelo celular" → [Instalar] [Agora não]

Para iOS (Safari não dispara `beforeinstallprompt`), detectar via `navigator.userAgent` e mostrar instrução:
> "No Safari: toque em Compartilhar → Adicionar à Tela Inicial"

---

## 8. Exportação Excel (`src/lib/excel.ts`)

Usar a biblioteca `xlsx` (SheetJS). O Excel exportado tem **3 abas**:

### Aba 1 — "Lançamentos" (dados brutos + calculados)

| Coluna | Campo | Tipo |
|--------|-------|------|
| A | Mês (nome) | string |
| B | Ano | number |
| C | Cliente | string |
| D | Serviço | string |
| E | Valor Cobrado | currency |
| F | Desconto | currency |
| G | Valor Efetivo | currency |
| H | Forma de Pagamento | string |
| I | Parcelas | number |
| J | Taxa % | percentage |
| K | Taxa (R$) | currency |
| L | Custo do Serviço | currency |
| M | Líquido | currency |
| N | Margem % | percentage |
| O | Status | string |
| P | Recebimento | string ("Este mês" / "Próx. mês" / "Parcela N/X") |
| Q | ID | string (para reimportação) |
| R | Criado Em | date |

### Aba 2 — "Resumo Mensal" (agregado por mês/ano)

| Coluna | Campo |
|--------|-------|
| A | Mês/Ano |
| B | Lançamentos |
| C | Faturamento Bruto |
| D | Total Descontos |
| E | Total Taxas |
| F | Total Custos |
| G | Lucro Líquido |
| H | Margem Média % |

### Aba 3 — "Projeção Futura" (crédito/parcelas)

| Coluna | Campo |
|--------|-------|
| A | Mês Recebimento |
| B | Cliente |
| C | Serviço |
| D | Descrição (ex: Parcela 2/3) |
| E | Valor Bruto da Parcela |
| F | Valor Líquido da Parcela |

### Implementação da exportação

```typescript
import * as XLSX from "xlsx";

export function exportToExcel(rows: Row[], mes?: number, ano?: number): void {
  const wb = XLSX.utils.book_new();

  // ── Aba 1: Lançamentos ──────────────────────────────────────────────────
  const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                      "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const lancHeaders = [
    "Mês","Ano","Cliente","Serviço","Valor Cobrado","Desconto",
    "Valor Efetivo","Forma de Pagamento","Parcelas","Taxa %","Taxa (R$)",
    "Custo do Serviço","Líquido","Margem %","Status","Recebimento","ID","Criado Em"
  ];

  const lancData = rows.filter(r => +r.valor > 0).map(r => {
    const calc = calcRow(r);
    const recLabel = r.forma !== "Crédito" ? "Este mês"
      : r.parc <= 1 ? "Próx. mês"
      : `${r.parc} parcelas`;
    return [
      MESES_FULL[r.mes], r.ano, r.cliente, r.servico,
      calc.v, calc.descontoVal, calc.vef,
      r.forma, r.parc,
      +r.taxa / 100,         // percentage — SheetJS formata como %
      calc.taxaVal, calc.custoVal, calc.liq,
      calc.mar / 100,        // percentage
      r.status, recLabel, r.id, r.criadoEm,
    ];
  });

  const ws1 = XLSX.utils.aoa_to_sheet([lancHeaders, ...lancData]);

  // Larguras de coluna
  ws1["!cols"] = [
    {wch:12},{wch:6},{wch:22},{wch:28},{wch:14},{wch:12},{wch:14},
    {wch:18},{wch:9},{wch:8},{wch:12},{wch:16},{wch:14},{wch:10},
    {wch:10},{wch:16},{wch:10},{wch:22},
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Lançamentos");

  // ── Aba 2: Resumo Mensal ────────────────────────────────────────────────
  const byMes: Record<string, CalculatedRow[]> = {};
  rows.filter(r => +r.valor > 0).map(calcRow).forEach(r => {
    const key = `${String(r.ano)}-${String(r.mes).padStart(2,"0")}`;
    if (!byMes[key]) byMes[key] = [];
    byMes[key].push(r);
  });

  const resumoHeaders = [
    "Mês/Ano","Lançamentos","Faturamento Bruto","Total Descontos",
    "Total Taxas","Total Custos","Lucro Líquido","Margem Média %"
  ];

  const resumoData = Object.entries(byMes)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const [anoStr, mesStr] = key.split("-");
      const label = `${MESES_FULL[+mesStr]}/${anoStr}`;
      const bruto  = items.reduce((s,r) => s+r.v, 0);
      const descs  = items.reduce((s,r) => s+r.descontoVal, 0);
      const taxas  = items.reduce((s,r) => s+r.taxaVal, 0);
      const custos = items.reduce((s,r) => s+r.custoVal, 0);
      const liq    = items.reduce((s,r) => s+r.liq, 0);
      return [label, items.length, bruto, descs, taxas, custos, liq, bruto ? liq/bruto : 0];
    });

  const ws2 = XLSX.utils.aoa_to_sheet([resumoHeaders, ...resumoData]);
  ws2["!cols"] = [{wch:16},{wch:14},{wch:18},{wch:16},{wch:14},{wch:14},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws2, "Resumo Mensal");

  // ── Aba 3: Projeção Futura ──────────────────────────────────────────────
  const projHeaders = ["Mês Recebimento","Cliente","Serviço","Descrição","Valor Bruto","Valor Líquido"];
  const projData: unknown[][] = [];

  rows.filter(r => r.forma === "Crédito" && +r.valor > 0).map(calcRow).forEach(r => {
    const n = Math.max(1, r.parc || 1);
    const mesPivot = r.mes; const anoPivot = r.ano;
    for (let i = 1; i <= n; i++) {
      const { m, y } = addMes(mesPivot, anoPivot, i);
      const lbl = `${MESES_FULL[m]}/${y}`;
      const desc = n === 1 ? "Crédito à vista" : `Parcela ${i}/${n}`;
      projData.push([lbl, r.cliente, r.servico, desc, r.v/n, r.liq/n]);
    }
  });

  const ws3 = XLSX.utils.aoa_to_sheet([projHeaders, ...projData]);
  ws3["!cols"] = [{wch:18},{wch:22},{wch:28},{wch:18},{wch:16},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws3, "Projeção Futura");

  // ── Gerar download ──────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g,"-");
  XLSX.writeFile(wb, `controle-caixa-backup-${dateStr}.xlsx`);
}
```

---

## 9. Importação Excel (`src/lib/excel.ts` — continuação)

```typescript
export interface ImportResult {
  success: boolean;
  rows: Row[];
  errors: string[];
  total: number;
  skipped: number;
}

export function importFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        // Procurar aba "Lançamentos"
        const sheetName = wb.SheetNames.find(n =>
          n.toLowerCase().includes("lançamento") || n.toLowerCase().includes("lancamento")
        );
        if (!sheetName) {
          return resolve({ success:false, rows:[], errors:["Aba 'Lançamentos' não encontrada"], total:0, skipped:0 });
        }

        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json<Record<string,unknown>>(ws, { defval: "" });

        const rows: Row[] = [];
        const errors: string[] = [];
        let skipped = 0;

        // Mapeamento de colunas (tolerante a variações de nome)
        const MESES_MAP: Record<string, number> = {
          "janeiro":0,"fevereiro":1,"março":2,"abril":3,"maio":4,"junho":5,
          "julho":6,"agosto":7,"setembro":8,"outubro":9,"novembro":10,"dezembro":11,
        };

        raw.forEach((r, idx) => {
          const mesNome = String(r["Mês"] ?? "").toLowerCase().trim();
          const mes = MESES_MAP[mesNome];
          const ano = +(r["Ano"] ?? 0);

          if (mes === undefined || !ano) { skipped++; return; }

          const valor = parseFloat(String(r["Valor Cobrado"] ?? "0").replace(",",".")) || 0;
          if (!valor) { skipped++; return; }

          const forma = String(r["Forma de Pagamento"] ?? "Pix") as FormaPagamento;
          const formasValidas: FormaPagamento[] = ["Dinheiro","Pix","Débito","Crédito"];
          if (!formasValidas.includes(forma)) {
            errors.push(`Linha ${idx+2}: Forma de pagamento inválida "${forma}"`);
            skipped++; return;
          }

          rows.push({
            id: String(r["ID"] ?? uid()),
            cliente: String(r["Cliente"] ?? ""),
            servico: String(r["Serviço"] ?? ""),
            valor,
            forma,
            parc: +(r["Parcelas"] ?? 1) || 1,
            taxa: parseFloat(String(r["Taxa %"] ?? "0")) * (parseFloat(String(r["Taxa %"] ?? "0")) < 1 ? 100 : 1),
            custo: parseFloat(String(r["Custo do Serviço"] ?? "0").replace(",",".")) || "",
            desconto: parseFloat(String(r["Desconto"] ?? "0").replace(",",".")) || "",
            status: String(r["Status"] ?? "Pago") as StatusPagamento,
            mes, ano,
            criadoEm: String(r["Criado Em"] ?? new Date().toISOString()),
          });
        });

        resolve({ success: true, rows, errors, total: raw.length, skipped });
      } catch (err) {
        resolve({ success:false, rows:[], errors:[String(err)], total:0, skipped:0 });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
```

---

## 10. Componente BackupPanel (`src/components/backup/BackupPanel.tsx`)

Interface de backup acessível via botão "⬇ Backup" no header ou num menu lateral.

### Visual e comportamento

```
┌─────────────────────────────────────────────────┐
│  💾 Backup & Restauração                        │
│                                                 │
│  [📥 Exportar Excel]     Baixa o arquivo .xlsx  │
│                          com todos os dados     │
│                                                 │
│  [📤 Importar Excel]     Abre o seletor de      │
│                          arquivo. Mostra        │
│                          preview antes de       │
│                          confirmar.             │
│                                                 │
│  Armazenamento local: 12,4 KB                   │
│                                                 │
│  ── Zona de perigo ──                           │
│  [🗑 Apagar todos os dados]  (pede confirmação) │
└─────────────────────────────────────────────────┘
```

### Fluxo de importação

1. Usuária clica em "Importar Excel"
2. Seletor de arquivo abre (aceita `.xlsx`)
3. Arquivo é processado com `importFromExcel()`
4. Modal de preview aparece:
   ```
   Arquivo: controle-caixa-backup-01-05-2025.xlsx
   Encontrados: 47 lançamentos
   Ignorados: 2 (sem valor)
   
   Como deseja importar?
   [Adicionar aos existentes]  [Substituir tudo]  [Cancelar]
   ```
5. Se "Adicionar": chama `mergeRows()` — ignora IDs duplicados
6. Se "Substituir": chama `replaceAllRows()` — confirma antes com dialog
7. Toast de confirmação: "47 lançamentos importados com sucesso"

---

## 11. Design System (`src/styles/tokens.css`)

Manter identidade visual do protótipo exatamente:

```css
:root {
  /* Cores principais */
  --color-bg:        #f1f5f9;
  --color-white:     #ffffff;
  --color-header:    #0f172a;
  --color-text:      #0f172a;
  --color-muted:     #64748b;
  --color-border:    #e2e8f0;
  --color-border-lt: #f1f5f9;

  /* Forma de pagamento */
  --color-dinheiro:  #16a34a;
  --color-pix:       #0284c7;
  --color-debito:    #7c3aed;
  --color-credito:   #b45309;
  --color-desconto:  #92400e;

  /* Semântica financeira */
  --color-positive:  #16a34a;
  --color-negative:  #dc2626;
  --color-warning:   #d97706;
  --color-neutral:   #7c3aed;

  /* Tipografia */
  --font-ui:      'DM Sans', system-ui, sans-serif;
  --font-display: 'Syne', sans-serif;
  --font-mono:    'DM Mono', monospace;

  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(0,0,0,.05);
  --shadow-md: 0 4px 16px rgba(0,0,0,.08);
  --shadow-lg: 0 8px 40px rgba(0,0,0,.15);

  /* Raios */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-full: 9999px;
}
```

---

## 12. Constantes (`src/constants.ts`)

```typescript
export const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const MESES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun",
  "Jul","Ago","Set","Out","Nov","Dez"];

export const FORMAS_PAGAMENTO = ["Dinheiro","Pix","Débito","Crédito"] as const;

export const STATUS_OPTIONS = ["Pago","Pendente"] as const;

export const TAXA_PADRAO = {
  Dinheiro: 0,
  Pix:      0,
  Débito:   1.5,
  "Crédito_1x":  2.9,
  "Crédito_2-6x": 3.9,
  "Crédito_7+x":  4.9,
} as const;

export const FORMA_COLORS: Record<string, { c:string; bg:string; border:string }> = {
  Dinheiro: { c:"#16a34a", bg:"#dcfce7", border:"#bbf7d0" },
  Pix:      { c:"#0284c7", bg:"#dbeafe", border:"#bae6fd" },
  Débito:   { c:"#7c3aed", bg:"#ede9fe", border:"#ddd6fe" },
  Crédito:  { c:"#b45309", bg:"#fef9c3", border:"#fcd34d" },
};
```

---

## 13. Comportamentos de UX Críticos

### Salvamento automático
- Salvar no localStorage imediatamente após toda alteração (sem botão "Salvar")
- Debounce de 300ms nos campos de texto para não salvar a cada tecla

### Navegação entre meses
- Mês/ano atual como padrão ao abrir o app
- Setas `‹ ›` no header para navegar
- Cada mês mostra apenas os `rows` onde `r.mes === mes && r.ano === ano`
- Quando muda de mês, a planilha/lista atualiza automaticamente

### Desktop — planilha
- Tab na última coluna da última linha: adiciona nova linha e foca o primeiro campo
- Enter em qualquer campo: adiciona nova linha
- Hover na linha: exibe botão × de deletar (opacity 0 → 1)
- Célula em foco: highlight azul `inset 0 0 0 2px #2563eb`
- Linhas de crédito: fundo âmbar sutil `rgba(251,191,36,.04)`

### Mobile — cards
- Tap no card: abre bottom sheet de edição
- Bottom sheet: drag handle no topo, fecha ao clicar no backdrop ou pressionar Esc
- FAB azul fixo no canto inferior direito
- Scroll horizontal nos summary cards (scroll snap)
- `overflow: hidden` no body quando sheet está aberta

### Feedback visual
- Toast de confirmação após salvar/deletar/importar/exportar
- Toast aparece na parte inferior da tela, acima do FAB
- Duração: 3 segundos, animação slideUp

---

## 14. Tratamento de Erros do localStorage

O localStorage tem limite de ~5–10MB dependendo do browser. Implementar:

```typescript
// Em saveState():
try {
  localStorage.setItem(key, data);
} catch (e) {
  if (e instanceof DOMException && e.name === "QuotaExceededError") {
    // Disparar evento customizado para o App mostrar aviso
    window.dispatchEvent(new CustomEvent("storage-quota-exceeded"));
  }
}
```

No App, escutar o evento e mostrar toast:
> "⚠️ Armazenamento quase cheio. Exporte um backup e limpe os dados antigos."

---

## 15. Ordem de Implementação Sugerida

Execute cada fase antes de começar a próxima:

### Fase 1 — Estrutura base
- [ ] Criar projeto Vite + React + TS
- [ ] Instalar dependências (`xlsx`, `vite-plugin-pwa`)
- [ ] Criar `types.ts`, `constants.ts`, `tokens.css`
- [ ] Implementar `src/lib/calc.ts` (extrair do protótipo)
- [ ] Implementar `src/lib/storage.ts`
- [ ] Implementar `useStorage.ts` hook
- [ ] Verificar: dados salvam e carregam do localStorage

### Fase 2 — UI Desktop (planilha)
- [ ] Implementar `Header.tsx` com navegação de mês
- [ ] Implementar `DesktopTable.tsx` (extrair do protótipo)
- [ ] Implementar `SummaryCards.tsx`
- [ ] Implementar `ProjectionSection.tsx`
- [ ] Verificar: planilha funciona, cálculos corretos, dados persistem

### Fase 3 — UI Mobile
- [ ] Implementar `useBreakpoint.ts`
- [ ] Implementar `MobileCard.tsx` e `MobileCardList.tsx`
- [ ] Implementar `EntryForm.tsx` e `Sheet.tsx`
- [ ] Implementar `FAB.tsx` e `BottomNav.tsx`
- [ ] Verificar: mobile completo, bottom sheet funciona

### Fase 4 — PWA
- [ ] Configurar `vite.config.ts` com VitePWA
- [ ] Criar ícones (192px, 512px, apple-touch-icon)
- [ ] Implementar banner de instalação (`beforeinstallprompt`)
- [ ] Implementar instrução iOS (detectar Safari)
- [ ] Verificar: app instalável no Android e iOS; funciona offline

### Fase 5 — Backup Excel
- [ ] Implementar `src/lib/excel.ts` — exportação
- [ ] Implementar `src/lib/excel.ts` — importação
- [ ] Implementar `BackupPanel.tsx` com UI de import/export
- [ ] Adicionar botão de acesso ao painel no header
- [ ] Verificar: exportar → abrir no Excel → reimportar → dados corretos

### Fase 6 — Polimento
- [ ] Tratamento de erro de quota do localStorage
- [ ] Toast notifications
- [ ] Empty states
- [ ] Animações e transições
- [ ] Teste em iOS Safari, Chrome Android, Chrome desktop, Firefox

---

## 16. Deploy

### Vercel (recomendado)
```bash
npm install -g vercel
vercel --prod
```
Ou conectar o repositório GitHub na interface do Vercel — deploy automático a cada push.

### Netlify
```bash
npm run build
# Arrastar a pasta dist/ para netlify.com/drop
```

### GitHub Pages
```bash
# vite.config.ts: adicionar base: "/nome-do-repo/"
npm run build
# Usar github-pages action no CI
```

> **Domínio customizado:** Para uma URL profissional como `caixa.seudominio.com.br`,
> configurar DNS no Vercel/Netlify. Custo ~R$40/ano para o domínio `.com.br`.

---

## 17. Referência do Protótipo

O protótipo de origem está em `controle-caixa.jsx` (arquivo React single-file).
Ele contém toda a lógica de cálculo, renderização mobile/desktop e os estilos inline.
Use-o como referência fiel para:

- A lógica exata de `calcRow()` e `useCalc()`
- O design visual completo (cores, tipografia, espaçamentos)
- O comportamento do bottom sheet no mobile
- A estrutura dos cards de resumo e projeção mensal
- A fórmula de `recInfo()` (quando o dinheiro entra: este mês / próximo mês / parcelas)

Ao migrar para o projeto estruturado, **não altere nenhuma lógica de cálculo** —
apenas mova as funções para os arquivos corretos (`lib/calc.ts`, `hooks/useCalc.ts`).

---

## 18. Checklist Final antes do Deploy

- [ ] Abrir no Chrome mobile (Android): app instalável, dados persistem após fechar e reabrir
- [ ] Abrir no Safari iOS: instrução de "Adicionar à tela inicial" aparece
- [ ] Exportar Excel → abrir no Excel/Google Sheets → valores corretos e formatados
- [ ] Importar o Excel exportado → todos os dados restaurados corretamente
- [ ] Limpar localStorage manualmente (DevTools) → app inicia vazio sem erros
- [ ] Desligar Wi-Fi → app continua funcionando (service worker ativo)
- [ ] Lighthouse PWA score ≥ 90
- [ ] Lighthouse Performance score ≥ 80 no mobile
