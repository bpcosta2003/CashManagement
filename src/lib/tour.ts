import { driver, type Config, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Atributo data usado pra ancorar passos do tour em elementos da UI.
 * Mantém os seletores resilientes a refactors de class names.
 */
export type TourAnchor =
  | "business-switcher"
  | "summary"
  | "goal"
  | "insights"
  | "ai-card"
  | "add-row"
  | "settings"
  | "filter";

export function tourAttr(anchor: TourAnchor): { "data-tour": TourAnchor } {
  return { "data-tour": anchor };
}

const STEPS: DriveStep[] = [
  {
    element: "[data-tour='business-switcher']",
    popover: {
      title: "Seu empreendimento",
      description:
        "Aqui você troca entre diferentes negócios. Pode ter mais de um (salão + freelance, por exemplo). Cada um tem caixa, clientes e metas próprios.",
    },
  },
  {
    element: "[data-tour='add-row']",
    popover: {
      title: "Lance vendas em segundos",
      description:
        "Toque no <strong>+</strong> pra registrar uma venda. Pode marcar como pendente se o cliente ainda não pagou — depois é só dar baixa.",
    },
  },
  {
    element: "[data-tour='summary']",
    popover: {
      title: "Resumo do mês",
      description:
        "Bruto, descontos, taxas e líquido em tempo real. Toque nos cards pra ver detalhes — clientes, formas de pagamento, ticket médio.",
    },
  },
  {
    element: "[data-tour='goal']",
    popover: {
      title: "Meta mensal",
      description:
        "Defina quanto quer faturar no mês. O app acompanha o progresso e te avisa se está atrás ou na frente.",
    },
  },
  {
    element: "[data-tour='filter']",
    popover: {
      title: "Filtros e navegação",
      description:
        "Mude o mês/ano em foco, filtre por cliente, forma de pagamento ou status. Tudo que você vê na tela respeita esses filtros.",
    },
  },
  {
    element: "[data-tour='insights']",
    popover: {
      title: "Insights automáticos",
      description:
        "Quando detecto algo importante — pendência antiga, queda de faturamento, concentração em um cliente — aviso aqui. Sem ruído, só o que importa.",
    },
  },
  {
    element: "[data-tour='ai-card']",
    popover: {
      title: "Análise por IA",
      description:
        "No fim do mês, gere uma análise inteligente com insights, comparações e ações práticas. Limite de 3 por mês.",
    },
  },
  {
    element: "[data-tour='settings']",
    popover: {
      title: "Configurações",
      description:
        "Tema, cores, notificações por email, instalação como app e backup automático. Você pode refazer este tour aqui também.",
    },
  },
];

const BASE_CONFIG: Config = {
  showProgress: true,
  smoothScroll: true,
  allowClose: true,
  overlayOpacity: 0.55,
  stagePadding: 6,
  stageRadius: 12,
  nextBtnText: "Próximo →",
  prevBtnText: "← Anterior",
  doneBtnText: "Finalizar",
  progressText: "{{current}} de {{total}}",
};

export interface TourHandle {
  destroy: () => void;
}

/**
 * Inicia o tour. Pula passos cujo elemento âncora não existe no DOM
 * (ex.: card de IA quando feature flag está off, ou businesses-switcher
 * em mobile com layout diferente). onComplete é chamado tanto no
 * finish quanto no skip — a partir daqui, é "completou" pra todos os
 * efeitos práticos.
 */
export function startTour(onComplete: () => void): TourHandle {
  const steps = STEPS.filter((s) => {
    const sel = typeof s.element === "string" ? s.element : "";
    if (!sel) return false;
    return document.querySelector(sel) !== null;
  });

  if (steps.length === 0) {
    onComplete();
    return { destroy: () => undefined };
  }

  const drv = driver({
    ...BASE_CONFIG,
    steps,
    onDestroyed: () => {
      onComplete();
    },
  });

  drv.drive();

  return {
    destroy: () => drv.destroy(),
  };
}
