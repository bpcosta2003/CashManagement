import type { AppState, CatalogItem, Client, MonthGoal, Row } from "../types";
import { autoTaxa, uid } from "./calc";

/**
 * Constrói um snapshot de AppState rico em dados pra ser usado durante
 * o tour. A ideia é o usuário ver TODAS as features funcionando (com
 * KPIs, gráficos, insights, projeção, catálogo, clientes etc.) sem
 * precisar cadastrar dado nenhum antes.
 *
 * Importante: este state é injetado **temporariamente**. O state real
 * do usuário é salvo em `controle-caixa:v1-pre-tour` antes de aplicar
 * o demo, e restaurado ao final.
 */

const DEMO_BUSINESS_ID = "demo-biz-bella-vista";
const NOW_ISO = new Date().toISOString();

function isoDays(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

interface RowSeed {
  cliente: string;
  servico: string;
  valor: number;
  forma: Row["forma"];
  parc?: number;
  status?: Row["status"];
  custo?: number;
  desconto?: number;
  diasAtras?: number;
}

function makeRow(seed: RowSeed, mes: number, ano: number): Row {
  const forma = seed.forma;
  const parc = seed.parc ?? 1;
  return {
    id: uid(),
    businessId: DEMO_BUSINESS_ID,
    cliente: seed.cliente,
    servico: seed.servico,
    valor: seed.valor,
    forma,
    parc,
    taxa: autoTaxa(forma, parc),
    custo: seed.custo ?? "",
    desconto: seed.desconto ?? "",
    status: seed.status ?? "Pago",
    mes,
    ano,
    criadoEm: isoDays(seed.diasAtras ?? 5),
  };
}

const CLIENTES = [
  { name: "Marina Souza", phone: "(11) 98765-4321" },
  { name: "Carlos Lima", phone: "(11) 99876-5432" },
  { name: "Patrícia Alves", phone: "(11) 91234-5678" },
  { name: "Roberto Mendes", phone: "(11) 98123-4567" },
  { name: "Juliana Costa", phone: "(11) 97654-3210" },
  { name: "Felipe Rocha" },
  { name: "Ana Beatriz", phone: "(11) 99988-7766" },
  { name: "Lucas Pereira" },
];

const CATALOGO = [
  { name: "Corte feminino", defaultValue: 80 },
  { name: "Corte masculino", defaultValue: 50 },
  { name: "Escova", defaultValue: 60 },
  { name: "Coloração", defaultValue: 200 },
  { name: "Hidratação", defaultValue: 120 },
  { name: "Progressiva", defaultValue: 280 },
  { name: "Manicure", defaultValue: 40 },
  { name: "Pedicure", defaultValue: 45 },
  { name: "Design de sobrancelha", defaultValue: 35 },
  { name: "Limpeza de pele", defaultValue: 150 },
];

export function buildDemoState(now: Date = new Date()): AppState {
  const mes = now.getMonth();
  const ano = now.getFullYear();
  const prevMes = mes === 0 ? 11 : mes - 1;
  const prevAno = mes === 0 ? ano - 1 : ano;
  const twoBackMes = prevMes === 0 ? 11 : prevMes - 1;
  const twoBackAno = prevMes === 0 ? prevAno - 1 : prevAno;

  // ── Mês atual: variado, com pendentes e crédito parcelado ────────────
  const currentSeeds: RowSeed[] = [
    {
      cliente: "Marina Souza",
      servico: "Coloração",
      valor: 200,
      forma: "Crédito",
      parc: 2,
      custo: 35,
      diasAtras: 2,
    },
    {
      cliente: "Carlos Lima",
      servico: "Corte masculino",
      valor: 50,
      forma: "Pix",
      diasAtras: 3,
    },
    {
      cliente: "Patrícia Alves",
      servico: "Progressiva",
      valor: 280,
      forma: "Crédito",
      parc: 3,
      custo: 60,
      diasAtras: 4,
    },
    {
      cliente: "Juliana Costa",
      servico: "Escova",
      valor: 60,
      forma: "Débito",
      diasAtras: 5,
    },
    {
      cliente: "Roberto Mendes",
      servico: "Corte masculino",
      valor: 50,
      forma: "Dinheiro",
      diasAtras: 6,
    },
    {
      cliente: "Ana Beatriz",
      servico: "Hidratação",
      valor: 120,
      forma: "Pix",
      diasAtras: 7,
    },
    {
      cliente: "Marina Souza",
      servico: "Manicure",
      valor: 40,
      forma: "Pix",
      diasAtras: 8,
    },
    {
      cliente: "Felipe Rocha",
      servico: "Corte masculino",
      valor: 50,
      forma: "Pix",
      diasAtras: 10,
    },
    {
      cliente: "Patrícia Alves",
      servico: "Manicure",
      valor: 40,
      forma: "Dinheiro",
      diasAtras: 12,
    },
    {
      cliente: "Lucas Pereira",
      servico: "Limpeza de pele",
      valor: 150,
      forma: "Crédito",
      parc: 1,
      custo: 30,
      diasAtras: 14,
    },
    // ── Pendentes pra produzir o insight de pagamentos pendentes ──────
    {
      cliente: "Ana Beatriz",
      servico: "Coloração",
      valor: 200,
      forma: "Pix",
      status: "Pendente",
      diasAtras: 6,
    },
    {
      cliente: "Roberto Mendes",
      servico: "Escova",
      valor: 60,
      forma: "Pix",
      status: "Pendente",
      diasAtras: 11,
    },
    {
      cliente: "Felipe Rocha",
      servico: "Design de sobrancelha",
      valor: 35,
      forma: "Dinheiro",
      status: "Pendente",
      diasAtras: 18,
    },
  ];

  const prevMonthSeeds: RowSeed[] = [
    {
      cliente: "Marina Souza",
      servico: "Coloração",
      valor: 200,
      forma: "Crédito",
      parc: 2,
      custo: 35,
    },
    { cliente: "Carlos Lima", servico: "Corte masculino", valor: 50, forma: "Pix" },
    {
      cliente: "Patrícia Alves",
      servico: "Hidratação",
      valor: 120,
      forma: "Débito",
    },
    {
      cliente: "Juliana Costa",
      servico: "Progressiva",
      valor: 280,
      forma: "Crédito",
      parc: 3,
      custo: 60,
    },
    {
      cliente: "Ana Beatriz",
      servico: "Coloração",
      valor: 200,
      forma: "Pix",
    },
    { cliente: "Roberto Mendes", servico: "Corte masculino", valor: 50, forma: "Dinheiro" },
    { cliente: "Marina Souza", servico: "Escova", valor: 60, forma: "Pix" },
    { cliente: "Lucas Pereira", servico: "Limpeza de pele", valor: 150, forma: "Crédito", parc: 1, custo: 30 },
    { cliente: "Felipe Rocha", servico: "Corte masculino", valor: 50, forma: "Pix" },
    { cliente: "Patrícia Alves", servico: "Manicure", valor: 40, forma: "Pix" },
    { cliente: "Ana Beatriz", servico: "Pedicure", valor: 45, forma: "Pix" },
    { cliente: "Carlos Lima", servico: "Corte masculino", valor: 50, forma: "Débito" },
  ];

  const twoBackSeeds: RowSeed[] = [
    { cliente: "Marina Souza", servico: "Coloração", valor: 200, forma: "Crédito", parc: 2, custo: 35 },
    { cliente: "Carlos Lima", servico: "Corte masculino", valor: 50, forma: "Pix" },
    { cliente: "Patrícia Alves", servico: "Manicure", valor: 40, forma: "Pix" },
    { cliente: "Juliana Costa", servico: "Hidratação", valor: 120, forma: "Pix" },
    { cliente: "Roberto Mendes", servico: "Corte masculino", valor: 50, forma: "Dinheiro" },
    { cliente: "Ana Beatriz", servico: "Escova", valor: 60, forma: "Débito" },
    { cliente: "Felipe Rocha", servico: "Corte masculino", valor: 50, forma: "Pix" },
    { cliente: "Lucas Pereira", servico: "Design de sobrancelha", valor: 35, forma: "Pix" },
    { cliente: "Marina Souza", servico: "Manicure", valor: 40, forma: "Dinheiro" },
  ];

  const rows: Row[] = [
    ...currentSeeds.map((s) => makeRow(s, mes, ano)),
    ...prevMonthSeeds.map((s) => makeRow({ ...s, diasAtras: 35 + Math.random() * 10 }, prevMes, prevAno)),
    ...twoBackSeeds.map((s) => makeRow({ ...s, diasAtras: 65 + Math.random() * 10 }, twoBackMes, twoBackAno)),
  ];

  const clients: Client[] = CLIENTES.map((c, idx) => ({
    id: uid(),
    businessId: DEMO_BUSINESS_ID,
    name: c.name,
    phone: c.phone,
    lastUsedAt: isoDays(2 + idx),
    createdAt: isoDays(60 + idx * 5),
  }));

  const catalog: CatalogItem[] = CATALOGO.map((c, idx) => ({
    id: uid(),
    businessId: DEMO_BUSINESS_ID,
    name: c.name,
    defaultValue: c.defaultValue,
    lastUsedAt: isoDays(idx + 1),
    createdAt: isoDays(60 + idx * 3),
  }));

  const goals: MonthGoal[] = [
    {
      id: uid(),
      businessId: DEMO_BUSINESS_ID,
      mes,
      ano,
      target: 8000,
      createdAt: isoDays(15),
      updatedAt: isoDays(2),
    },
  ];

  return {
    version: 4,
    rows,
    clients,
    catalog,
    goals,
    businesses: [
      {
        id: DEMO_BUSINESS_ID,
        name: "Salão Bella Vista",
        type: "salao",
        createdAt: isoDays(180),
      },
    ],
    activeBusinessId: DEMO_BUSINESS_ID,
    lastModified: NOW_ISO,
    settings: {
      autoBackupConsent: "yes",
      dailyReminder: true,
      emailNotifications: false,
      tourCompleted: false,
    },
  };
}
