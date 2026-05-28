import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CatalogItem,
  Client,
  FormaPagamento,
  PagamentoSplit,
  Row,
  StatusPagamento,
} from "../../types";
import { FORMAS_PAGAMENTO, STATUS_OPTIONS } from "../../constants";
import {
  autoTaxa,
  calcRow,
  fmtBRL,
  fmtPct,
  joinItemNames,
  sumItems,
  uid,
} from "../../lib/calc";
import {
  formatDecimalBR,
  parseDecimalBR,
  sanitizeDecimalText,
} from "../../lib/numberInput";
import { formatPhoneBR } from "../../lib/phone";
import { ClientCombobox } from "./ClientCombobox";
import { ServicoCombobox } from "./ServicoCombobox";
import styles from "./EntryForm.module.css";

interface Props {
  initial: Row;
  /** true quando o sheet está criando um lançamento novo (não persistido ainda) */
  isNew?: boolean;
  /** Clientes do empreendimento ativo — usados pra autocomplete. */
  clients: Client[];
  /** Catálogo de serviços/produtos do empreendimento ativo. */
  catalog: CatalogItem[];
  /** Todos os lançamentos do empreendimento ativo — usados pra histórico. */
  allRows?: Row[];
  /** Taxa fixa do empreendimento ativo (%). Mostrada como disabled no
   *  form e usada no cálculo do líquido. Default 0 (sem taxa). */
  taxaFixaPct?: number;
  onSave: (row: Row, clientPhone?: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

interface Errors {
  cliente?: string;
  valor?: string;
  parc?: string;
  taxa?: string;
  items?: string;
  pagamentos?: string;
}

/** Parte de pagamento no editor de múltiplas formas. Texto bruto pra
 *  valor/taxa (mesmo motivo do itemList/taxaText: preservar "1," etc.). */
interface PartDraft {
  _key: string;
  forma: FormaPagamento;
  valorText: string;
  parc: number;
  taxaText: string;
  taxaMode: "percent" | "value";
}

/** Constrói o estado inicial das partes a partir de uma Row. */
function initParts(row: Row): PartDraft[] {
  if (!row.pagamentos || row.pagamentos.length === 0) return [];
  return row.pagamentos.map((p) => ({
    _key: uid(),
    forma: p.forma,
    valorText: formatDecimalBR(p.valor || 0),
    parc: Math.max(1, p.parc || 1),
    taxaText: formatDecimalBR(p.taxa ?? 0),
    taxaMode: p.taxaMode === "value" ? "value" : "percent",
  }));
}

/** Item interno do form multi-item. `_key` é só pra estabilizar React
 *  keys quando reordena/remove — não vai pro Row salvo. */
interface ItemDraft {
  _key: string;
  name: string;
  valor: number | "";
  catalogId?: string;
}

function validate(
  draft: Row,
  items: ItemDraft[],
  multiPay: boolean,
  parts: PartDraft[],
  effectiveTotal: number,
): Errors {
  const errors: Errors = {};
  if (!draft.cliente.trim()) {
    errors.cliente = "Informe o nome do cliente";
  }
  if (items.length > 0) {
    // Multi-mode: valida cada item. Nome obrigatório, valor > 0.
    const invalid = items.find(
      (it) => !it.name.trim() || !(+it.valor > 0),
    );
    if (invalid) {
      errors.items = "Preencha nome e valor de todos os itens";
    }
    const total = items.reduce((s, it) => s + (+it.valor || 0), 0);
    if (total <= 0) {
      errors.valor = "Total precisa ser maior que zero";
    }
  } else {
    const valor = typeof draft.valor === "number" ? draft.valor : 0;
    if (!valor || valor <= 0) {
      errors.valor = "Valor precisa ser maior que zero";
    }
  }
  if (multiPay) {
    // Múltiplas formas: cada parte com valor > 0 e a soma batendo com o
    // total do lançamento. Não validamos a taxa (pode ser 0, ex.: pix).
    if (parts.length < 2) {
      errors.pagamentos = "Adicione pelo menos 2 formas (ou desligue o múltiplo)";
    } else if (parts.some((p) => !(parseDecimalBR(p.valorText) > 0))) {
      errors.pagamentos = "Preencha o valor de cada forma";
    } else if (
      parts.some((p) => p.forma === "Crédito" && (!p.parc || p.parc < 1))
    ) {
      errors.pagamentos = "Informe as parcelas do crédito";
    } else {
      const sum = parts.reduce((s, p) => s + parseDecimalBR(p.valorText), 0);
      if (Math.abs(sum - effectiveTotal) > 0.01) {
        errors.pagamentos = `A soma das formas (${fmtBRL(sum)}) precisa bater com o total (${fmtBRL(effectiveTotal)})`;
      }
    }
  } else {
    if (draft.forma === "Crédito") {
      if (!draft.parc || draft.parc < 1) {
        errors.parc = "Informe o número de parcelas";
      }
      if (draft.taxa <= 0) {
        errors.taxa = "Informe a taxa";
      }
    }
    if (draft.forma === "Débito" && draft.taxa <= 0) {
      errors.taxa = "Informe a taxa";
    }
  }
  return errors;
}

/** Procura cliente pelo nome (case-insensitive). */
function findClient(clients: Client[], name: string): Client | undefined {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return undefined;
  return clients.find((c) => c.name.toLowerCase() === trimmed);
}

export function EntryForm({
  initial,
  isNew = false,
  clients,
  catalog,
  allRows = [],
  taxaFixaPct = 0,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<Row>(initial);
  const [taxaTouched, setTaxaTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [phone, setPhone] = useState("");
  // Texto bruto da TAXA — preserva o que o usuário digitou (ex.: "1,") sem
  // ser perdido quando o número derivado é 1 e a re-renderização mostraria
  // só "1". Sincroniza com draft.taxa apenas em mudanças externas
  // (forma/parc trocam → autoTaxa muda → atualizamos o texto).
  const [taxaText, setTaxaText] = useState(() => formatDecimalBR(initial.taxa));
  const [auxiliarText, setAuxiliarText] = useState(() =>
    formatDecimalBR(initial.auxiliarPct ?? 0),
  );
  // Taxa do negócio agora é por-lançamento (v3) — texto controlado
  // separado do draft pra preservar o que o usuário digita ("1,") sem
  // truncar quando o número derivado é só "1". Modo vive em
  // `draft.taxaNegocioMode` (mesmo padrão de `auxiliarMode`). Inicializa
  // do campo novo se presente, senão tenta o snapshot legado (sempre %),
  // senão 0.
  const [taxaNegocioText, setTaxaNegocioText] = useState(() =>
    formatDecimalBR(
      initial.taxaNegocio !== undefined
        ? initial.taxaNegocio
        : (initial.taxaFixaPctSnapshot ?? 0),
    ),
  );

  // Modo multi-item: itemList.length > 0 → mostra a lista; senão usa os
  // campos Serviço + Valor singulares (modo legado). Quando a Row inicial
  // já tem `items[]`, começamos em multi. Caso contrário, single.
  const [itemList, setItemList] = useState<ItemDraft[]>(() => {
    if (initial.items && initial.items.length > 0) {
      return initial.items.map((it) => ({
        _key: uid(),
        name: it.name,
        valor: it.valor,
        catalogId: it.catalogId,
      }));
    }
    return [];
  });
  const multiMode = itemList.length > 0;
  const itemsTotal = useMemo(
    () => itemList.reduce((s, it) => s + (+it.valor || 0), 0),
    [itemList],
  );

  // ─── Múltiplas formas de pagamento ──────────────────────────────────
  // Quando ligado, o valor do lançamento é dividido entre várias formas
  // (cada uma com sua taxa e, no crédito, suas parcelas). Desligado, é o
  // modo de forma única de sempre — Row sem `pagamentos`.
  const [multiPay, setMultiPay] = useState<boolean>(
    () => !!(initial.pagamentos && initial.pagamentos.length > 0),
  );
  const [parts, setParts] = useState<PartDraft[]>(() => initParts(initial));

  // Total que as partes precisam somar: em multi-item é a soma dos itens,
  // senão o valor singular.
  const effectiveTotal =
    itemList.length > 0
      ? itemsTotal
      : typeof draft.valor === "number"
        ? draft.valor
        : 0;
  const partsSum = useMemo(
    () => parts.reduce((s, p) => s + parseDecimalBR(p.valorText), 0),
    [parts],
  );
  const partsRemaining = effectiveTotal - partsSum;

  const clearPagamentosError = () => {
    if (!submitted) return;
    setErrors((prev) => {
      if (!prev.pagamentos) return prev;
      const next = { ...prev };
      delete next.pagamentos;
      return next;
    });
  };

  const toggleMultiPay = () => {
    setMultiPay((on) => {
      const next = !on;
      if (next && parts.length === 0) {
        // Semeia com a forma atual cobrindo o total + uma parte vazia, pra
        // o usuário "fatiar" reduzindo a primeira e preenchendo a segunda.
        setParts([
          {
            _key: uid(),
            forma: draft.forma,
            valorText: effectiveTotal > 0 ? formatDecimalBR(effectiveTotal) : "",
            parc: Math.max(1, draft.parc || 1),
            taxaText: formatDecimalBR(autoTaxa(draft.forma, draft.parc)),
            taxaMode: "percent",
          },
          {
            _key: uid(),
            forma: draft.forma === "Pix" ? "Dinheiro" : "Pix",
            valorText: "",
            parc: 1,
            taxaText: "0",
            taxaMode: "percent",
          },
        ]);
      }
      return next;
    });
    clearPagamentosError();
  };

  const updatePart = (
    key: string,
    patch: Partial<Omit<PartDraft, "_key">>,
  ) => {
    setParts((list) =>
      list.map((p) => {
        if (p._key !== key) return p;
        const np: PartDraft = { ...p, ...patch };
        // Trocar de forma → re-sugere a taxa automática (editável) e some
        // com parcelas fora do crédito.
        if (patch.forma !== undefined) {
          if (patch.forma !== "Crédito") np.parc = 1;
          np.taxaMode = "percent";
          np.taxaText = formatDecimalBR(autoTaxa(np.forma, np.parc));
        }
        // Trocar parcelas no crédito (modo %) → re-sugere a taxa por faixa.
        if (
          patch.parc !== undefined &&
          np.forma === "Crédito" &&
          np.taxaMode === "percent"
        ) {
          np.taxaText = formatDecimalBR(autoTaxa("Crédito", np.parc));
        }
        return np;
      }),
    );
    clearPagamentosError();
  };

  const addPart = () => {
    setParts((list) => [
      ...list,
      { _key: uid(), forma: "Pix", valorText: "", parc: 1, taxaText: "0", taxaMode: "percent" },
    ]);
    clearPagamentosError();
  };

  const removePart = (key: string) => {
    setParts((list) => list.filter((p) => p._key !== key));
    clearPagamentosError();
  };

  const flipPartTaxaMode = (key: string) => {
    setParts((list) =>
      list.map((p) =>
        p._key === key
          ? {
              ...p,
              taxaMode: p.taxaMode === "value" ? "percent" : "value",
              taxaText: "",
            }
          : p,
      ),
    );
  };

  const buildPagamentos = useCallback(
    (): PagamentoSplit[] =>
      parts.map((p) => ({
        forma: p.forma,
        valor: parseDecimalBR(p.valorText),
        ...(p.forma === "Crédito" ? { parc: Math.max(1, p.parc || 1) } : {}),
        taxa: parseDecimalBR(p.taxaText),
        taxaMode: p.taxaMode,
      })),
    [parts],
  );

  // Cliente conhecido = casamento exato (case-insensitive) com a base
  const knownClient = useMemo(
    () => findClient(clients, draft.cliente),
    [clients, draft.cliente],
  );

  // Histórico do cliente: últimos 3 atendimentos (mais recentes primeiro),
  // excluindo o lançamento atual quando está em modo edição.
  const clientHistory = useMemo(() => {
    const name = draft.cliente.trim().toLowerCase();
    if (!name) return [] as Row[];
    return allRows
      .filter(
        (r) =>
          r.cliente.trim().toLowerCase() === name &&
          r.id !== initial.id &&
          +r.valor > 0,
      )
      .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))
      .slice(0, 3);
  }, [allRows, draft.cliente, initial.id]);

  // Aplica os dados de um atendimento histórico no rascunho atual.
  // Preserva cliente/telefone/status/data atuais — só copia o que define
  // a natureza do lançamento (serviço, valor, forma, parcelas, taxa,
  // custo, desconto). Marca a taxa como tocada pra não auto-recalcular.
  const applyHistoryEntry = useCallback(
    (entry: Row) => {
      // Em multi-mode, histórico vira "adicionar novo item" em vez de
      // sobrescrever — preserva os itens já preenchidos. Forma/taxa/custo
      // ficam só com o que a Row atual já tinha (não faz sentido alterar
      // forma de pagamento ao adicionar um serviço extra).
      if (itemList.length > 0) {
        // Histórico multi-item: appenda TODOS os items do histórico.
        // Histórico single: appenda 1 item com servico+valor.
        const toAppend: ItemDraft[] =
          entry.items && entry.items.length > 0
            ? entry.items.map((it) => ({
                _key: uid(),
                name: it.name,
                valor: it.valor > 0 ? it.valor : "",
                catalogId: it.catalogId,
              }))
            : [
                {
                  _key: uid(),
                  name: entry.servico,
                  valor:
                    typeof entry.valor === "number" && entry.valor > 0
                      ? entry.valor
                      : "",
                },
              ];
        setItemList((list) => [...list, ...toAppend]);
        setErrors((prev) => {
          const next = { ...prev };
          delete next.valor;
          delete next.items;
          return next;
        });
        return;
      }

      // Single-mode: se o histórico era multi-item, promove o form pra
      // multi-mode espelhando os items. Senão, sobrescreve servico/valor
      // como antes.
      if (entry.items && entry.items.length > 0) {
        setItemList(
          entry.items.map((it) => ({
            _key: uid(),
            name: it.name,
            valor: it.valor > 0 ? it.valor : "",
            catalogId: it.catalogId,
          })),
        );
      }

      // Taxa do negócio: prefere o campo novo do histórico; senão cai pro
      // snapshot legado (que era sempre %).
      const histTaxaNeg =
        entry.taxaNegocio !== undefined
          ? entry.taxaNegocio
          : (entry.taxaFixaPctSnapshot ?? 0);
      const histTaxaNegMode: "percent" | "value" =
        entry.taxaNegocioMode === "value" ? "value" : "percent";

      setDraft((prev) => ({
        ...prev,
        servico: entry.servico,
        valor: entry.valor,
        forma: entry.forma,
        parc: entry.parc,
        taxa: entry.taxa,
        // Reflete o modo do histórico (% ou R$). Sem isso, repetir um
        // atendimento que foi cadastrado em R$ ficaria com a flag
        // em % e a interpretação do número errada.
        taxaMode: entry.taxaMode,
        custo: entry.custo,
        desconto: entry.desconto,
        // Copia auxiliarPct + auxiliarMode também — caso o histórico
        // tinha auxiliar configurado, repete junto preservando o modo
        // (% ou R$). Se entry não tem, limpa o auxiliar (`undefined`)
        // pra não vazar valor do draft anterior.
        auxiliarPct: entry.auxiliarPct,
        auxiliarMode: entry.auxiliarMode,
        // Taxa do negócio do histórico — propagada igual aos demais
        // campos pra "repetir atendimento" funcionar com fidelidade.
        taxaNegocio: histTaxaNeg,
        taxaNegocioMode: histTaxaNegMode,
      }));
      // Sincroniza os inputs controlados (taxa, auxiliar e taxa do
      // negócio) que mantêm texto bruto separado do draft — sem isso,
      // o usuário via os valores antigos no input apesar do draft já
      // estar atualizado.
      setTaxaText(formatDecimalBR(entry.taxa));
      setAuxiliarText(formatDecimalBR(entry.auxiliarPct ?? 0));
      setTaxaNegocioText(formatDecimalBR(histTaxaNeg));
      setTaxaTouched(true);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.valor;
        delete next.parc;
        delete next.taxa;
        return next;
      });
    },
    [itemList.length],
  );

  // Em multi-mode, `draft.valor` precisa refletir a soma dos itens em
  // todas as derivações (preview do calcRow, cálculo de margem, etc.).
  // Esse efeito mantém o invariante: valor === sum(items). Sem isso, ao
  // clicar num atendimento histórico durante multi-mode, o valor da Row
  // ficava no valor do histórico e o preview mostrava conta errada.
  useEffect(() => {
    if (itemList.length === 0) return;
    setDraft((d) => {
      if (d.valor === itemsTotal) return d;
      return { ...d, valor: itemsTotal };
    });
  }, [itemList.length, itemsTotal]);

  useEffect(() => {
    setDraft(initial);
    setTaxaTouched(false);
    setErrors({});
    setSubmitted(false);
    setTaxaText(formatDecimalBR(initial.taxa));
    setAuxiliarText(formatDecimalBR(initial.auxiliarPct ?? 0));
    setTaxaNegocioText(
      formatDecimalBR(
        initial.taxaNegocio !== undefined
          ? initial.taxaNegocio
          : (initial.taxaFixaPctSnapshot ?? 0),
      ),
    );
    setItemList(
      initial.items && initial.items.length > 0
        ? initial.items.map((it) => ({
            _key: uid(),
            name: it.name,
            valor: it.valor,
            catalogId: it.catalogId,
          }))
        : [],
    );
    setMultiPay(!!(initial.pagamentos && initial.pagamentos.length > 0));
    setParts(initParts(initial));
    // Telefone: se o cliente já está cadastrado, prefilla. Senão, vazio.
    const found = findClient(clients, initial.cliente);
    setPhone(formatPhoneBR(found?.phone ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // ─── Manipulação do itemList em multi-mode ──────────────────────────
  /** Promove single → multi: transforma o Serviço/Valor atual em items[0]
   *  e adiciona um novo item vazio pra o usuário preencher. */
  const promoteToMulti = useCallback(() => {
    setItemList([
      {
        _key: uid(),
        name: draft.servico,
        valor: typeof draft.valor === "number" ? draft.valor : 0,
      },
      { _key: uid(), name: "", valor: "" },
    ]);
  }, [draft.servico, draft.valor]);

  /** Adiciona mais um item vazio no fim da lista (já está em multi). */
  const addItem = useCallback(() => {
    setItemList((list) => [...list, { _key: uid(), name: "", valor: "" }]);
  }, []);

  /** Remove um item da lista. Se sobrar 1 só, volta pra single mode e
   *  copia esse item de volta pros campos Serviço/Valor. Se sobrar 0,
   *  também volta pra single (campos esvaziados). */
  const removeItem = useCallback((key: string) => {
    setItemList((list) => {
      const next = list.filter((it) => it._key !== key);
      if (next.length === 1) {
        // Sobra um → demota pra single mode preservando esse item.
        const only = next[0];
        setDraft((d) => ({
          ...d,
          servico: only.name,
          valor: only.valor === "" ? "" : +only.valor,
        }));
        return [];
      }
      if (next.length === 0) {
        // Vazio → volta pra single mode com Serviço/Valor limpos.
        setDraft((d) => ({ ...d, servico: "", valor: "" }));
        return [];
      }
      return next;
    });
  }, []);

  const updateItem = useCallback(
    (key: string, patch: Partial<Omit<ItemDraft, "_key">>) => {
      setItemList((list) =>
        list.map((it) => (it._key === key ? { ...it, ...patch } : it)),
      );
      if (submitted) {
        setErrors((prev) => {
          if (!prev.items) return prev;
          const next = { ...prev };
          delete next.items;
          delete next.valor;
          return next;
        });
      }
    },
    [submitted],
  );

  // Quando o nome muda pra um cliente já conhecido, prefilla o telefone
  useEffect(() => {
    if (knownClient) {
      setPhone((prev) => (prev ? prev : formatPhoneBR(knownClient.phone ?? "")));
    }
  }, [knownClient]);

  // Data do lançamento → ISO local (yyyy-mm-dd) pro <input type="date">.
  // Usamos meio-dia local pra evitar deslocamento de timezone ao formatar.
  const dateInputValue = useMemo(() => {
    const d = new Date(draft.criadoEm);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, [draft.criadoEm]);

  const setDate = (iso: string) => {
    if (!iso) return;
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return;
    // Preserva hora original (se houver) pra não embaralhar lançamentos
    // criados no mesmo dia ao reordenar por criadoEm.
    const orig = new Date(draft.criadoEm);
    const hh = isNaN(orig.getTime()) ? 12 : orig.getHours();
    const mi = isNaN(orig.getTime()) ? 0 : orig.getMinutes();
    const next = new Date(y, m - 1, d, hh, mi, 0);
    setDraft((prev) => ({
      ...prev,
      criadoEm: next.toISOString(),
      mes: next.getMonth(),
      ano: next.getFullYear(),
    }));
  };

  const update = <K extends keyof Row>(field: K, value: Row[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value } as Row;
      const mode: "percent" | "value" = next.taxaMode ?? "percent";
      // autoTaxa só é aplicada em modo %. Em "value" o usuário tem
      // controle total — trocar forma/parc não deve sobrescrever o R$.
      if (field === "forma") {
        if (mode === "percent") {
          next.taxa = autoTaxa(value as string, next.parc);
          setTaxaText(formatDecimalBR(next.taxa));
        }
        if (value !== "Crédito") next.parc = 1;
        setTaxaTouched(false);
      }
      if (field === "parc") {
        if (mode === "percent") {
          next.taxa = autoTaxa(next.forma, value as number);
          setTaxaText(formatDecimalBR(next.taxa));
        }
        setTaxaTouched(false);
      }
      if (field === "taxa") {
        setTaxaTouched(true);
      }
      return next;
    });
    if (submitted) {
      setErrors((prev) => {
        const next = { ...prev };
        if (field === "cliente") delete next.cliente;
        if (field === "valor") delete next.valor;
        if (field === "parc") delete next.parc;
        if (field === "taxa") delete next.taxa;
        if (field === "forma") {
          delete next.parc;
          delete next.taxa;
        }
        return next;
      });
    }
  };

  // Em multi-mode, o valor "real" do lançamento é a soma dos items —
  // não o draft.valor (que pode ficar dessincronizado quando o usuário
  // toca em histórico ou edita campos durante o multi). Construímos a
  // Row efetiva pra TODOS os cálculos (preview, validação, save).
  const effectiveDraft: Row = {
    ...draft,
    ...(itemList.length > 0 ? { valor: itemsTotal } : {}),
    pagamentos: multiPay ? buildPagamentos() : undefined,
  };
  // calcRow lê `taxaNegocio`/`taxaNegocioMode` da própria row (v3). O prop
  // `taxaFixaPct` é mantido como fallback de penúltimo recurso pra
  // lançamentos pré-snapshot — calcRow só recorre a ele se a row não tem
  // nem `taxaNegocio` nem `taxaFixaPctSnapshot`.
  const calc = calcRow(effectiveDraft, { taxaFixaPct });
  const taxaMode: "percent" | "value" = draft.taxaMode ?? "percent";
  // Auto-taxa só faz sentido em modo %. Em "value" o usuário sempre digita
  // o R$ exato manualmente.
  const isAutoTaxa =
    taxaMode === "percent" &&
    !taxaTouched &&
    draft.taxa === autoTaxa(draft.forma, draft.parc);

  const setTaxaMode = (mode: "percent" | "value") => {
    if (mode === taxaMode) return;
    // Trocar de modo zera o input — 2,9% e R$ 2,90 não são equivalentes
    // e manter o número seria confuso. O usuário re-digita no novo modo.
    setDraft((d) => ({ ...d, taxaMode: mode, taxa: 0 }));
    setTaxaText("");
    setTaxaTouched(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.taxa;
      return next;
    });
  };

  /** Toggle de 1 clique — pula pro modo oposto do atual. */
  const flipTaxaMode = () => {
    setTaxaMode(taxaMode === "percent" ? "value" : "percent");
  };

  // ── Auxiliar do serviço: mesmo padrão de modo % / R$ ────────────────
  const auxiliarMode: "percent" | "value" = draft.auxiliarMode ?? "percent";

  const setAuxiliarMode = (mode: "percent" | "value") => {
    if (mode === auxiliarMode) return;
    // Trocar de modo zera o input — 10% e R$ 10,00 não são equivalentes.
    setDraft((d) => ({ ...d, auxiliarMode: mode, auxiliarPct: 0 }));
    setAuxiliarText("");
  };

  const flipAuxiliarMode = () => {
    setAuxiliarMode(auxiliarMode === "percent" ? "value" : "percent");
  };

  // ── Taxa do negócio: mesmo padrão (% / R$) ──────────────────────────
  const taxaNegocioMode: "percent" | "value" =
    draft.taxaNegocioMode ?? "percent";

  const setTaxaNegocioMode = (mode: "percent" | "value") => {
    if (mode === taxaNegocioMode) return;
    // Trocar de modo zera o input — 10% e R$ 10,00 não são equivalentes.
    setDraft((d) => ({ ...d, taxaNegocioMode: mode, taxaNegocio: 0 }));
    setTaxaNegocioText("");
  };

  const flipTaxaNegocioMode = () => {
    setTaxaNegocioMode(taxaNegocioMode === "percent" ? "value" : "percent");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const v = validate(draft, itemList, multiPay, parts, effectiveTotal);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      const order: Array<keyof Errors> = [
        "cliente",
        "items",
        "valor",
        "parc",
        "taxa",
        "pagamentos",
      ];
      const first = order.find((k) => v[k]);
      if (first && first !== "items" && first !== "pagamentos") {
        const el = document.getElementById(`ef-${first}`);
        el?.focus();
      }
      return;
    }
    // Em multi-mode: carimba items[], servico (display), valor (soma).
    // Em single: salva como antes (items undefined).
    let rowToSave: Row = draft;
    if (itemList.length > 0) {
      const items = itemList.map((it) => ({
        name: it.name.trim(),
        valor: +it.valor || 0,
        ...(it.catalogId ? { catalogId: it.catalogId } : {}),
      }));
      const total = sumItems(items);
      const joined = joinItemNames(items);
      rowToSave = {
        ...draft,
        items,
        servico: joined,
        valor: total,
      };
    } else {
      // Limpa items[] se a Row vinha com (ex.: usuário entrou multi e
      // voltou pra single removendo todos).
      const { items: _drop, ...rest } = draft;
      rowToSave = rest as Row;
    }
    // Pagamentos: liga/desliga o split. Quando ligado, `forma`/`parc`/`taxa`
    // viram só um resumo pra display (maior parte); o cálculo usa
    // `pagamentos[]`. Quando desligado, garante que não sobra split antigo.
    if (multiPay) {
      const pags = buildPagamentos();
      const dominant = [...pags].sort((a, b) => b.valor - a.valor)[0];
      rowToSave = {
        ...rowToSave,
        pagamentos: pags,
        forma: dominant ? dominant.forma : rowToSave.forma,
        parc: dominant && dominant.parc ? dominant.parc : 1,
        taxa: 0,
        taxaMode: "percent",
      };
    } else if (rowToSave.pagamentos) {
      const { pagamentos: _dropPag, ...restNoPag } = rowToSave;
      rowToSave = restNoPag as Row;
    }
    onSave(rowToSave, phone.trim() || undefined);
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor="ef-cliente" className={styles.label}>
          Cliente <span className={styles.required}>*</span>
        </label>
        <ClientCombobox
          id="ef-cliente"
          value={draft.cliente}
          onChange={(v) => update("cliente", v)}
          matchedClient={knownClient ?? null}
          clients={clients}
          placeholder="Nome do cliente"
          invalid={!!errors.cliente}
          errorId={errors.cliente ? "ef-cliente-err" : undefined}
          autoFocus
        />
        {errors.cliente && (
          <span id="ef-cliente-err" className={styles.errorMsg}>
            {errors.cliente}
          </span>
        )}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ef-phone" className={styles.label}>
            Telefone <span className={styles.labelHintSoft}>· opcional</span>
          </label>
          <input
            id="ef-phone"
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
            placeholder="(11) 90000-0000"
            inputMode="tel"
            type="tel"
            autoComplete="tel"
            maxLength={16}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="ef-data" className={styles.label}>
            Data
            {(() => {
              const today = new Date();
              const isToday =
                today.getFullYear() === draft.ano &&
                today.getMonth() === draft.mes &&
                today.getDate() === new Date(draft.criadoEm).getDate();
              return isToday ? (
                <span className={styles.labelHintSoft}>· hoje</span>
              ) : (
                <span className={styles.labelHint}>
                  ·{" "}
                  {new Date(draft.criadoEm).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              );
            })()}
          </label>
          <input
            id="ef-data"
            className={styles.input}
            type="date"
            value={dateInputValue}
            onChange={(e) => setDate(e.target.value)}
            max={(() => {
              // Permite escolher datas passadas livremente, mas trava no
              // futuro pra evitar registro errado (ex: dedo escorregou
              // pra 2027).
              const d = new Date();
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            })()}
          />
        </div>
      </div>

      {clientHistory.length > 0 && (
        <div className={styles.history} aria-label="Histórico do cliente">
          <div className={styles.historyHead}>
            <span className={styles.historyTitle}>Últimos atendimentos</span>
            <span className={styles.historyHint}>
              toque pra repetir
            </span>
          </div>
          <ul className={styles.historyList}>
            {clientHistory.map((r) => {
              const calc = calcRow(r, { taxaFixaPct });
              const date = new Date(r.criadoEm);
              const dateLbl = isNaN(date.getTime())
                ? "—"
                : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={styles.historyItem}
                    onClick={() => applyHistoryEntry(r)}
                    title="Preencher o formulário com este atendimento"
                  >
                    <span className={styles.historyDate}>{dateLbl}</span>
                    <span className={styles.historyService} title={r.servico}>
                      {r.servico || "—"}
                    </span>
                    <span className={styles.historyForma} data-forma={r.forma}>
                      {r.forma}
                    </span>
                    <span className={styles.historyValue} title={fmtBRL(calc.v)}>
                      {fmtBRL(calc.v)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {multiMode ? (
        <div className={styles.itemsBlock}>
          <div className={styles.itemsHead}>
            <span className={styles.label}>
              Serviços / produtos{" "}
              <span className={styles.labelHintSoft}>
                · {itemList.length} ite{itemList.length === 1 ? "m" : "ns"}
              </span>
            </span>
          </div>
          {itemList.map((item, idx) => (
            <div className={styles.itemRow} key={item._key}>
              <div className={styles.itemName}>
                <ServicoCombobox
                  id={`ef-item-${item._key}`}
                  value={item.name}
                  onChange={(v) => updateItem(item._key, { name: v })}
                  catalog={catalog}
                  onPickItem={(c) => {
                    const empty = item.valor === "" || item.valor === 0;
                    const patch: Partial<Omit<ItemDraft, "_key">> = {
                      catalogId: c.id,
                    };
                    if (
                      empty &&
                      typeof c.defaultValue === "number" &&
                      c.defaultValue > 0
                    ) {
                      patch.valor = c.defaultValue;
                    }
                    updateItem(item._key, patch);
                  }}
                  placeholder={idx === 0 ? "Ex: Corte feminino" : "Outro serviço…"}
                />
              </div>
              <input
                className={styles.input}
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0"
                value={item.valor === "" ? "" : item.valor}
                onChange={(e) =>
                  updateItem(item._key, {
                    valor: e.target.value === "" ? "" : +e.target.value,
                  })
                }
                placeholder="0,00"
                aria-label={`Valor do item ${idx + 1}`}
              />
              <button
                type="button"
                className={styles.itemRemove}
                onClick={() => removeItem(item._key)}
                aria-label={`Remover item ${idx + 1}`}
                title="Remover este item"
              >
                ×
              </button>
            </div>
          ))}
          <div className={styles.itemsFoot}>
            <button
              type="button"
              className={styles.itemAdd}
              onClick={addItem}
            >
              + Adicionar item
            </button>
            <span className={styles.itemsTotal}>
              Total <strong>{fmtBRL(itemsTotal)}</strong>
            </span>
          </div>
          {errors.items && (
            <span className={styles.errorMsg}>{errors.items}</span>
          )}
          {errors.valor && !errors.items && (
            <span className={styles.errorMsg}>{errors.valor}</span>
          )}
        </div>
      ) : (
        <>
          <div className={styles.field}>
            <label htmlFor="ef-servico" className={styles.label}>
              Serviço / produto
            </label>
            <ServicoCombobox
              id="ef-servico"
              value={draft.servico}
              onChange={(v) => update("servico", v)}
              catalog={catalog}
              onPickItem={(item) => {
                // Preenche serviço (já feito no onChange) e o valor
                // sugerido — só sobrescreve se o campo ainda estiver
                // vazio, pra não atropelar um valor que o usuário já
                // digitou.
                const empty = draft.valor === "" || draft.valor === 0;
                if (
                  empty &&
                  typeof item.defaultValue === "number" &&
                  item.defaultValue > 0
                ) {
                  update("valor", item.defaultValue);
                }
              }}
              placeholder="Ex: Corte feminino"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="ef-valor" className={styles.label}>
              Valor <span className={styles.required}>*</span>
            </label>
            <input
              id="ef-valor"
              className={`${styles.input} ${errors.valor ? styles.inputError : ""}`}
              inputMode="decimal"
              type="number"
              step="0.01"
              min="0"
              value={draft.valor === "" ? "" : draft.valor}
              onChange={(e) =>
                update("valor", e.target.value === "" ? "" : +e.target.value)
              }
              placeholder="0,00"
              aria-invalid={!!errors.valor}
              aria-describedby={errors.valor ? "ef-valor-err" : undefined}
            />
            {errors.valor && (
              <span id="ef-valor-err" className={styles.errorMsg}>
                {errors.valor}
              </span>
            )}
          </div>

          <button
            type="button"
            className={styles.linkBtn}
            onClick={promoteToMulti}
          >
            + Adicionar outro serviço / produto
          </button>
        </>
      )}

      {/* Desconto e Custo na mesma linha 50/50 — ambos reduzem o vef
          antes de qualquer taxa percentual (a partir da v3). */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ef-desconto" className={styles.label}>
            Desconto
          </label>
          <input
            id="ef-desconto"
            className={styles.input}
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
            value={draft.desconto === "" ? "" : draft.desconto}
            onChange={(e) =>
              update("desconto", e.target.value === "" ? "" : +e.target.value)
            }
            placeholder="0,00"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="ef-custo" className={styles.label}>
            Custo do serviço
          </label>
          <input
            id="ef-custo"
            className={styles.input}
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
            value={draft.custo === "" ? "" : draft.custo}
            onChange={(e) =>
              update("custo", e.target.value === "" ? "" : +e.target.value)
            }
            placeholder="0,00"
          />
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.formaHead}>
          <label className={styles.label}>Forma de pagamento</label>
          <button
            type="button"
            className={styles.multiPayToggle}
            data-on={multiPay}
            aria-pressed={multiPay}
            onClick={toggleMultiPay}
          >
            {multiPay ? "Múltiplo ✓" : "+ Dividir"}
          </button>
        </div>
        {!multiPay && (
          <div className={styles.formaGrid}>
            {FORMAS_PAGAMENTO.map((f) => {
              const active = draft.forma === f;
              return (
                <button
                  type="button"
                  key={f}
                  data-active={active}
                  className={styles.formaBtn}
                  onClick={() => update("forma", f as FormaPagamento)}
                >
                  {f}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!multiPay && draft.forma === "Crédito" && (
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              Parcelas <span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${errors.parc ? styles.inputError : ""}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={draft.parc === 0 ? "" : String(draft.parc)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                update("parc", raw === "" ? 0 : Math.min(24, +raw));
              }}
              placeholder="1"
              aria-invalid={!!errors.parc}
            />
            {errors.parc && (
              <span className={styles.errorMsg}>{errors.parc}</span>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              Taxa{" "}
              <span className={styles.labelHintSoft}>
                ({taxaMode === "value" ? "R$" : "%"})
              </span>{" "}
              <span className={styles.required}>*</span>
              {isAutoTaxa && (
                <span className={styles.labelHint}>· automática</span>
              )}
            </label>
            <div className={styles.taxaInputWrap}>
              <input
                className={`${styles.input} ${styles.taxaInput} ${errors.taxa ? styles.inputError : ""}`}
                type="text"
                inputMode="decimal"
                value={taxaText}
                onChange={(e) => {
                  const text = e.target.value;
                  const allowed = sanitizeDecimalText(text);
                  setTaxaText(allowed);
                  update("taxa", parseDecimalBR(allowed));
                }}
                placeholder="0,00"
                aria-invalid={!!errors.taxa}
              />
              <button
                type="button"
                className={styles.taxaModeToggle}
                onClick={flipTaxaMode}
                aria-label={`Modo atual: ${taxaMode === "value" ? "R$" : "porcentagem"}. Toque para alternar.`}
                title={
                  taxaMode === "value"
                    ? "Em R$ — toque pra usar %"
                    : "Em % — toque pra usar R$"
                }
              >
                {taxaMode === "value" ? "R$" : "%"}
              </button>
            </div>
            {errors.taxa && (
              <span className={styles.errorMsg}>{errors.taxa}</span>
            )}
          </div>
        </div>
      )}

      {!multiPay && draft.forma === "Débito" && (
        // Débito: só Taxa (Custo já está no topo, junto do Desconto).
        // Taxa fica sozinha na linha pra acomodar o toggle %/R$ confortável.
        <div className={styles.field}>
          <label className={styles.label}>
            Taxa{" "}
            <span className={styles.labelHintSoft}>
              ({taxaMode === "value" ? "R$" : "%"})
            </span>{" "}
            <span className={styles.required}>*</span>
            {isAutoTaxa && (
              <span className={styles.labelHint}>· automática</span>
            )}
          </label>
          <div className={styles.taxaInputWrap}>
            <input
              className={`${styles.input} ${styles.taxaInput} ${errors.taxa ? styles.inputError : ""}`}
              type="text"
              inputMode="decimal"
              value={taxaText}
              onChange={(e) => {
                const text = e.target.value;
                const allowed = sanitizeDecimalText(text);
                setTaxaText(allowed);
                update("taxa", parseDecimalBR(allowed));
              }}
              placeholder="0,00"
              aria-invalid={!!errors.taxa}
            />
            <button
              type="button"
              className={styles.taxaModeToggle}
              onClick={flipTaxaMode}
              aria-label={`Modo atual: ${taxaMode === "value" ? "R$" : "porcentagem"}. Toque para alternar.`}
              title={
                taxaMode === "value"
                  ? "Em R$ — toque pra usar %"
                  : "Em % — toque pra usar R$"
              }
            >
              {taxaMode === "value" ? "R$" : "%"}
            </button>
          </div>
          {errors.taxa && (
            <span className={styles.errorMsg}>{errors.taxa}</span>
          )}
        </div>
      )}

      {multiPay && (
        <div className={styles.splitBlock}>
          {parts.map((p) => (
            <div className={styles.splitRow} key={p._key}>
              <div className={styles.splitTop}>
                <div className={styles.splitFormaGrid}>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <button
                      type="button"
                      key={f}
                      data-active={p.forma === f}
                      className={styles.splitFormaBtn}
                      onClick={() =>
                        updatePart(p._key, { forma: f as FormaPagamento })
                      }
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {parts.length > 1 && (
                  <button
                    type="button"
                    className={styles.splitRemove}
                    onClick={() => removePart(p._key)}
                    aria-label="Remover forma"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className={styles.splitFields}>
                <div className={styles.splitField}>
                  <span className={styles.splitFieldLabel}>Valor (R$)</span>
                  <input
                    className={styles.input}
                    type="text"
                    inputMode="decimal"
                    value={p.valorText}
                    onChange={(e) =>
                      updatePart(p._key, {
                        valorText: sanitizeDecimalText(e.target.value),
                      })
                    }
                    placeholder="0,00"
                  />
                </div>
                {p.forma === "Crédito" && (
                  <div className={styles.splitFieldNarrow}>
                    <span className={styles.splitFieldLabel}>Parc.</span>
                    <input
                      className={styles.input}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={p.parc === 0 ? "" : String(p.parc)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        updatePart(p._key, {
                          parc: raw === "" ? 0 : Math.min(24, +raw),
                        });
                      }}
                      placeholder="1"
                    />
                  </div>
                )}
                <div className={styles.splitFieldNarrow}>
                  <span className={styles.splitFieldLabel}>
                    Taxa ({p.taxaMode === "value" ? "R$" : "%"})
                  </span>
                  <div className={styles.taxaInputWrap}>
                    <input
                      className={`${styles.input} ${styles.taxaInput}`}
                      type="text"
                      inputMode="decimal"
                      value={p.taxaText}
                      onChange={(e) =>
                        updatePart(p._key, {
                          taxaText: sanitizeDecimalText(e.target.value),
                        })
                      }
                      placeholder="0,00"
                    />
                    <button
                      type="button"
                      className={styles.taxaModeToggle}
                      onClick={() => flipPartTaxaMode(p._key)}
                      aria-label={`Modo atual: ${p.taxaMode === "value" ? "R$" : "porcentagem"}. Toque para alternar.`}
                    >
                      {p.taxaMode === "value" ? "R$" : "%"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className={styles.splitFoot}>
            <button
              type="button"
              className={styles.splitAdd}
              onClick={addPart}
            >
              + Adicionar forma
            </button>
            <span
              className={styles.splitSum}
              data-ok={Math.abs(partsRemaining) < 0.01}
            >
              {Math.abs(partsRemaining) < 0.01
                ? `Soma bate · ${fmtBRL(partsSum)}`
                : partsRemaining > 0
                  ? `Faltam ${fmtBRL(partsRemaining)}`
                  : `Sobram ${fmtBRL(-partsRemaining)}`}
            </span>
          </div>
          {errors.pagamentos && (
            <span className={styles.errorMsg}>{errors.pagamentos}</span>
          )}
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ef-taxa-negocio" className={styles.label}>
            Taxa do negócio{" "}
            <span className={styles.labelHintSoft}>
              ({taxaNegocioMode === "value" ? "R$" : "%"})
            </span>
          </label>
          <div className={styles.taxaInputWrap}>
            <input
              id="ef-taxa-negocio"
              className={`${styles.input} ${styles.taxaInput}`}
              type="text"
              inputMode="decimal"
              value={taxaNegocioText}
              onChange={(e) => {
                const allowed = sanitizeDecimalText(e.target.value);
                setTaxaNegocioText(allowed);
                update("taxaNegocio", parseDecimalBR(allowed));
              }}
              placeholder="0,00"
            />
            <button
              type="button"
              className={styles.taxaModeToggle}
              onClick={flipTaxaNegocioMode}
              aria-label={`Modo atual: ${taxaNegocioMode === "value" ? "R$" : "porcentagem"}. Toque para alternar.`}
              title={
                taxaNegocioMode === "value"
                  ? "Em R$ — toque pra usar %"
                  : "Em % — toque pra usar R$"
              }
            >
              {taxaNegocioMode === "value" ? "R$" : "%"}
            </button>
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="ef-auxiliar" className={styles.label}>
            Auxiliar do serviço{" "}
            <span className={styles.labelHintSoft}>
              ({auxiliarMode === "value" ? "R$" : "%"})
            </span>
          </label>
          <div className={styles.taxaInputWrap}>
            <input
              id="ef-auxiliar"
              className={`${styles.input} ${styles.taxaInput}`}
              type="text"
              inputMode="decimal"
              value={auxiliarText}
              onChange={(e) => {
                const allowed = sanitizeDecimalText(e.target.value);
                setAuxiliarText(allowed);
                update("auxiliarPct", parseDecimalBR(allowed));
              }}
              placeholder="0,00"
            />
            <button
              type="button"
              className={styles.taxaModeToggle}
              onClick={flipAuxiliarMode}
              aria-label={`Modo atual: ${auxiliarMode === "value" ? "R$" : "porcentagem"}. Toque para alternar.`}
              title={
                auxiliarMode === "value"
                  ? "Em R$ — toque pra usar %"
                  : "Em % — toque pra usar R$"
              }
            >
              {auxiliarMode === "value" ? "R$" : "%"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Status</label>
        <div className={styles.statusGrid}>
          {STATUS_OPTIONS.map((s) => {
            const active = draft.status === s;
            const cls = s === "Pago" ? styles.statusPago : styles.statusPend;
            const glyph = s === "Pago" ? "✓" : "○";
            return (
              <button
                type="button"
                key={s}
                data-active={active}
                className={`${styles.statusBtn} ${cls}`}
                onClick={() => update("status", s as StatusPagamento)}
              >
                <span className={styles.statusGlyph}>{glyph}</span>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.preview} role="status" aria-live="polite">
        <span className={styles["previewLabel-eyebrow"]}>Resultado</span>
        {/* Cadeia da v3:
              Valor bruto
              − Desconto
              − Custo            (ambos reduzem o vef antes de % nenhuma)
              = Valor efetivo
              − Taxa do negócio  (% sobre vef OU R$)
              − Taxa cartão      (% sobre subtotal pós taxa do negócio OU R$)
              − Auxiliar         (% sobre vef OU R$)
              = LÍQUIDO
            Mostramos cada linha explicitamente pra transparência —
            esconde só as que são zero. */}
        {calc.v > 0 && (
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Valor</span>
            <span className={styles.previewValue}>{fmtBRL(calc.v)}</span>
          </div>
        )}
        {calc.descontoVal > 0 && (
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Desconto</span>
            <span className={styles.previewValue}>
              − {fmtBRL(calc.descontoVal)}
            </span>
          </div>
        )}
        {calc.custoVal > 0 && (
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Custo</span>
            <span className={styles.previewValue}>
              − {fmtBRL(calc.custoVal)}
            </span>
          </div>
        )}
        <div className={styles.previewRow}>
          <span className={styles.previewLabel}>Valor efetivo</span>
          <span className={styles.previewValue}>{fmtBRL(calc.vef)}</span>
        </div>
        {calc.taxaFixaVal > 0 && (
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>
              {taxaNegocioMode === "value"
                ? "Taxa do negócio (R$)"
                : `Taxa do negócio (${formatDecimalBR(draft.taxaNegocio ?? 0)}%)`}
            </span>
            <span className={styles.previewValue}>
              − {fmtBRL(calc.taxaFixaVal)}
            </span>
          </div>
        )}
        {calc.taxaVal > 0 && (
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>
              {taxaMode === "value"
                ? "Taxa cartão (R$)"
                : `Taxa cartão (${formatDecimalBR(draft.taxa)}%)`}
            </span>
            <span className={styles.previewValue}>
              − {fmtBRL(calc.taxaVal)}
            </span>
          </div>
        )}
        {calc.auxiliarVal > 0 && (
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>
              {auxiliarMode === "value"
                ? "Auxiliar (R$)"
                : `Auxiliar (${formatDecimalBR(draft.auxiliarPct ?? 0)}%)`}
            </span>
            <span className={styles.previewValue}>
              − {fmtBRL(calc.auxiliarVal)}
            </span>
          </div>
        )}
        <div className={styles.previewDivider} aria-hidden="true" />
        <div className={`${styles.previewRow} ${styles.previewTotal}`}>
          <span className={styles.previewLabel}>LÍQUIDO</span>
          <span
            className={`${styles.previewLiq} ${
              calc.liq < 0 ? styles.previewLiqNeg : ""
            }`}
          >
            {fmtBRL(calc.liq)}
          </span>
        </div>
        <div className={styles.previewMargin}>
          Margem <strong>{fmtPct(calc.mar)}</strong>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onCancel}
        >
          Cancelar
        </button>
        {onDelete && !isNew && (
          <button
            type="button"
            className={styles.btnDanger}
            onClick={onDelete}
          >
            Excluir
          </button>
        )}
        <button type="submit" className={styles.btnPrimary}>
          {isNew ? "Adicionar" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
