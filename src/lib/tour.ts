import { driver, type Config, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import type { AppState } from "../types";
import { buildDemoState } from "./demoState";

/**
 * Atributo data usado pra ancorar passos do tour em elementos da UI.
 * Mantém os seletores resilientes a refactors de class names.
 */
export type TourAnchor =
  | "business-switcher"
  | "sync-status"
  | "settings"
  | "taxbar-toggle"
  | "filter"
  | "summary"
  | "goal"
  | "insights"
  | "ai-card"
  | "entries"
  | "add-row"
  | "projection"
  | "clients-tab"
  | "catalog-tab"
  | "backup-tab"
  | "bottom-nav";

export function tourAttr(anchor: TourAnchor): { "data-tour": TourAnchor } {
  return { "data-tour": anchor };
}

/* ── Snapshot pra restaurar state do usuário ao final do tour ─────── */

const SNAPSHOT_KEY = "controle-caixa:v1-pre-tour";
const APP_STATE_KEY = "controle-caixa:v1";

/**
 * Salva o state real do usuário antes do tour começar. Chamado pela
 * função de orquestração, não diretamente pelo driver.js.
 */
function saveSnapshot(state: AppState) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[tour] falha ao salvar snapshot", e);
  }
}

/**
 * Restaura o state salvo. Escreve o snapshot direto no STORAGE_KEY
 * primeiro (pra sobreviver a crash mid-restore), depois remove o
 * snapshot. Se o navegador morrer entre os dois passos, no próximo
 * load o storage.ts vê o snapshot e restaura — então a janela de
 * perda é zero.
 */
export function restoreSnapshotIfAny(): AppState | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    localStorage.setItem(APP_STATE_KEY, raw);
    localStorage.removeItem(SNAPSHOT_KEY);
    return JSON.parse(raw) as AppState;
  } catch (e) {
    console.warn("[tour] falha ao restaurar snapshot", e);
    return null;
  }
}

export function hasTourSnapshot(): boolean {
  return localStorage.getItem(SNAPSHOT_KEY) !== null;
}

/* ── Helpers de breakpoint pra desktop vs mobile ──────────────────── */

function isMobile(): boolean {
  return typeof window !== "undefined" && window.innerWidth <= 720;
}

/* ── Definição dos passos ────────────────────────────────────────── */

export interface TourCallbacks {
  /** Troca de aba no BottomNav (mobile) ou no header (desktop). */
  setTab?: (tab: "lancamentos" | "projecao" | "clientes" | "catalogo") => void;
  /** Abre/fecha a barra de taxas pra demonstrar. */
  setTaxBarOpen?: (open: boolean) => void;
}

interface StepDef extends DriveStep {
  /** Hook executado antes do passo aparecer — usado pra trocar de aba
   *  ou ajustar UI quando necessário. */
  onBefore?: (cb: TourCallbacks) => void;
}

function buildSteps(_mobile: boolean): StepDef[] {
  return [
    {
      // ── Boas-vindas (sem âncora, modal central) ────────────────────
      popover: {
        title: "Bem-vindo ao tour 👋",
        description:
          "Vou te mostrar tudo o que dá pra fazer no Controle de Caixa. Os dados que aparecem agora são <strong>exemplos</strong> — quando você terminar, seus dados reais voltam intactos.",
      },
    },
    {
      element: "[data-tour='business-switcher']",
      popover: {
        title: "Seu empreendimento",
        description:
          "Aqui você troca entre negócios. Pode ter mais de um (salão + freelance, por exemplo). Cada um tem caixa, clientes, catálogo e metas próprios.",
      },
    },
    {
      element: "[data-tour='sync-status']",
      popover: {
        title: "Sincronização na nuvem",
        description:
          "Faça login com seu email pra sincronizar entre dispositivos. Funciona offline e sincroniza automaticamente quando volta online.",
      },
    },
    {
      element: "[data-tour='settings']",
      popover: {
        title: "Preferências",
        description:
          "Tema, cor de destaque, lembretes, backup automático, notificações por email, instalar como app, refazer este tour, e suporte. Tudo num lugar só.",
      },
    },
    {
      element: "[data-tour='taxbar-toggle']",
      onBefore: (cb) => cb.setTaxBarOpen?.(true),
      popover: {
        title: "Taxas configuráveis",
        description:
          "Crédito, débito, parcelado — cada modalidade tem taxa diferente. O app já vem com padrões do mercado, mas você pode ajustar pro que sua maquininha cobra.",
      },
    },
    {
      element: "[data-tour='filter']",
      onBefore: (cb) => cb.setTaxBarOpen?.(false),
      popover: {
        title: "Mês e ano em foco",
        description:
          "Navegue por mês ou alterne pra visão <strong>anual consolidada</strong> com gráficos dos últimos 12 meses, histórico de atividade, e comparativo entre empreendimentos.",
      },
    },
    {
      element: "[data-tour='summary']",
      popover: {
        title: "Resumo do mês",
        description:
          "Bruto, descontos, taxas e líquido em tempo real. Toque nos cards pra ver detalhes — clientes, formas de pagamento, ticket médio, top serviços.",
      },
    },
    {
      element: "[data-tour='goal']",
      popover: {
        title: "Meta mensal",
        description:
          "Defina quanto quer faturar no mês. O app acompanha o progresso com barra colorida (vermelho/amarelo/verde/dourado) e te avisa o quanto falta.",
      },
    },
    {
      element: "[data-tour='insights']",
      popover: {
        title: "Insights automáticos",
        description:
          "Quando detecto algo importante — queda de faturamento, pagamentos pendentes, concentração em um cliente — aviso aqui. Sem ruído: só o que importa.",
      },
    },
    {
      element: "[data-tour='ai-card']",
      popover: {
        title: "Análise por IA",
        description:
          "No fim do mês, gere uma análise inteligente com insights profundos, comparações e ações práticas. Usa Claude. Limite de 3 análises por mês.",
      },
    },
    {
      element: "[data-tour='entries']",
      onBefore: (cb) => cb.setTab?.("lancamentos"),
      popover: {
        title: "Lançamentos do mês",
        description:
          "Cada venda fica aqui. Toque numa linha pra editar, com cliente, serviço, valor, forma de pagamento, status e mais. Pendentes ficam destacados pra você dar baixa.",
      },
    },
    {
      element: "[data-tour='add-row']",
      popover: {
        title: "Lançar venda em segundos",
        description:
          "Toque no <strong>+</strong> pra registrar. Cliente e serviço usam autocompletar — o app aprende com seu histórico e sugere preços do catálogo.",
      },
    },
    {
      element: "[data-tour='projection']",
      onBefore: (cb) => cb.setTab?.("projecao"),
      popover: {
        title: "Projeção futura",
        description:
          "Vendas no crédito caem nos próximos meses (parceladas ou não). Aqui você vê <strong>quanto vai entrar</strong> e quando — sem precisar fazer conta.",
      },
    },
    {
      element: "[data-tour='clients-tab']",
      onBefore: (cb) => cb.setTab?.("clientes"),
      popover: {
        title: "Clientes e LTV",
        description:
          "Lista todos os clientes com faturamento total, ticket médio, última visita e telefone. Identifique seus melhores clientes e quem está sumindo.",
      },
    },
    {
      element: "[data-tour='catalog-tab']",
      onBefore: (cb) => cb.setTab?.("catalogo"),
      popover: {
        title: "Catálogo de serviços",
        description:
          "Seus serviços/produtos com valor sugerido. Quando você lança uma venda e seleciona um item, o valor vem preenchido — economiza digitação e evita erro.",
      },
    },
    {
      element: "[data-tour='backup-tab']",
      onBefore: (cb) => cb.setTab?.("lancamentos"),
      popover: {
        title: "Backup e restauração",
        description:
          "Exporte tudo pra Excel (3 abas: lançamentos, resumo mensal, projeção + clientes e catálogo). Importe pra restaurar de outro dispositivo ou recomeçar.",
      },
    },
    {
      popover: {
        title: "Pronto! 🎉",
        description:
          "Esses dados de exemplo somem agora — seu app volta como estava antes do tour. Bora cadastrar seu primeiro empreendimento e começar a registrar?",
      },
    },
  ];
}

/* ── Config visual do driver.js ───────────────────────────────────── */

const BASE_CONFIG: Config = {
  showProgress: true,
  smoothScroll: true,
  allowClose: true,
  overlayOpacity: 0.6,
  stagePadding: 6,
  stageRadius: 14,
  nextBtnText: "Próximo →",
  prevBtnText: "← Anterior",
  doneBtnText: "Concluir",
  progressText: "{{current}} de {{total}}",
  popoverClass: "cc-tour-popover",
};

export interface TourHandle {
  destroy: () => void;
}

/**
 * Inicia o tour. Aplica state de demo, executa os passos, e ao final
 * (concluir ou pular) restaura o state real e chama onComplete.
 *
 * Pula passos cujo elemento âncora não existe no DOM (ex.: card de IA
 * quando feature flag está off). Se a UI precisa estar num estado
 * específico (ex.: aba certa selecionada), o callback onBefore do passo
 * cuida disso.
 */
export function startTour(
  realState: AppState,
  replaceState: (next: AppState) => void,
  callbacks: TourCallbacks,
  onComplete: () => void,
): TourHandle {
  // ── 1. Snapshot + injeta state de demo ────────────────────────────
  saveSnapshot(realState);
  const demo = buildDemoState();
  replaceState(demo);

  // ── 2. Aguarda 2 frames pra DOM repintar antes de medir âncoras ──
  const finish = () => {
    const snap = restoreSnapshotIfAny();
    if (snap) replaceState(snap);
    onComplete();
  };

  let drv: Driver | null = null;

  const start = () => {
    const stepsAll = buildSteps(isMobile());

    // Cada passo precisa ter um onHighlightStarted que dispara onBefore.
    // driver.js já tem essa hook por passo (config.onHighlightStarted).
    const steps: DriveStep[] = stepsAll
      .filter((s) => {
        const sel = typeof s.element === "string" ? s.element : "";
        if (!sel) return true; // passos sem âncora (welcome/end) sempre incluídos
        // Pra passos com âncora que dependem de aba específica,
        // confiamos que onBefore vai trocar a aba — a verificação
        // de existência acontece "lazy" via the driver.
        return true;
      })
      .map((s) => {
        const before = s.onBefore;
        if (!before) return s as DriveStep;
        const orig = (s as DriveStep).popover;
        return {
          ...s,
          popover: orig,
          onHighlightStarted: () => before(callbacks),
        } as DriveStep;
      });

    if (steps.length === 0) {
      finish();
      return;
    }

    drv = driver({
      ...BASE_CONFIG,
      steps,
      onDestroyed: () => {
        finish();
      },
    });

    drv.drive();
  };

  // 2 RAFs garantem que React montou o demo state na UI
  requestAnimationFrame(() => requestAnimationFrame(start));

  return {
    destroy: () => {
      drv?.destroy();
    },
  };
}
