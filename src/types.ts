export type FormaPagamento = "Dinheiro" | "Pix" | "Débito" | "Crédito";
export type StatusPagamento = "Pago" | "Pendente";

export type BusinessType =
  | "salao"
  | "restaurante"
  | "comercio"
  | "servicos"
  | "freelancer"
  | "outro";

/** Perfil legado (v1) — preservado pra migração de estado antigo.
 *  Também usado pelo FirstUseModal pra cadastrar o primeiro
 *  empreendimento. */
export interface BusinessProfile {
  name: string;
  type: BusinessType;
  /** Logo opcional cadastrada no onboarding (data URL). */
  logo?: string;
}

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  createdAt: string;
  /** Logo customizada (data URL PNG/JPG ~256x256). Substitui a logo padrão. */
  logo?: string;
  /** @deprecated — Taxa fixa global do negócio em %. Foi substituído
   *  por `Row.taxaNegocio` (por lançamento, com modo % ou R$) na v3.
   *  Mantido no schema pra preservar storage legado, mas não é mais
   *  editável nem lido pelo calcRow nos novos lançamentos. */
  taxaFixaPct?: number;
}

export interface Client {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  lastUsedAt: string;
  createdAt: string;
}

/**
 * Item do catálogo de serviços/produtos do empreendimento.
 * Garante consistência de nomes (evita "corte" vs "Corte" vs "córte")
 * e permite valor sugerido — populado automaticamente ao selecionar.
 */
export interface CatalogItem {
  id: string;
  businessId: string;
  name: string;
  /** Valor padrão sugerido. Quando o usuário seleciona este item no
   *  formulário, o campo Valor é prefilhado com esse número (se ainda
   *  estiver vazio). */
  defaultValue?: number;
  lastUsedAt: string;
  createdAt: string;
}

/**
 * Meta de faturamento bruto de um mês específico.
 * Chaveada por (businessId, mes, ano). Quando ausente, o card de meta
 * mostra um CTA "Definir meta".
 */
export interface MonthGoal {
  id: string;
  businessId: string;
  mes: number;
  ano: number;
  /** Valor alvo em BRL. Sempre > 0 quando persistido. */
  target: number;
  createdAt: string;
  updatedAt: string;
}

/** Parte de um lançamento pago em mais de uma forma.
 *  Quando uma Row tem `pagamentos[]` (2+ partes), o `valor` bruto foi
 *  dividido entre vários métodos — a soma de `pagamentos[].valor` bate
 *  com o `valor` da Row. Cada parte carrega sua própria taxa (e parcelas,
 *  no crédito), porque a mordida do cartão difere por método. */
export interface PagamentoSplit {
  forma: FormaPagamento;
  /** Porção do valor bruto paga nesta forma (R$). */
  valor: number;
  /** Parcelas — só relevante no Crédito. Default 1. */
  parc?: number;
  /** Taxa desta parte (% ou R$, conforme `taxaMode`). Default 0. */
  taxa?: number;
  /** Como interpretar `taxa`: "percent" (default) ou "value". */
  taxaMode?: "percent" | "value";
}

/** Item individual de um lançamento com múltiplos serviços/produtos.
 *  Quando uma Row tem `items[]`, o `valor` da Row é a soma dos items e
 *  `servico` é a concatenação dos nomes pra display. */
export interface RowItem {
  /** Nome do serviço/produto. Cópia do CatalogItem.name ou texto livre. */
  name: string;
  /** Valor cobrado pelo item. */
  valor: number;
  /** ID do CatalogItem quando o item foi escolhido do catálogo. Permite
   *  manter o rastro nas análises (top serviços etc.) mesmo se o usuário
   *  renomear depois. Opcional. */
  catalogId?: string;
}

export interface Row {
  id: string;
  /** Empreendimento dono deste lançamento. */
  businessId: string;
  cliente: string;
  servico: string;
  valor: number | "";
  forma: FormaPagamento;
  parc: number;
  taxa: number;
  /** Como o campo `taxa` deve ser interpretado:
   *   - "percent" (default): `taxa` é uma porcentagem aplicada sobre o
   *     subtotal pós taxa do negócio.
   *   - "value": `taxa` é o R$ absoluto retido pelo cartão. Útil pra
   *     quem sabe o valor exato debitado mas não sabe o % aplicado.
   *  Quando undefined, comportamento legado = "percent". */
  taxaMode?: "percent" | "value";
  custo: number | "";
  desconto: number | "";
  /** % do auxiliar do serviço — quando o atendimento envolve um ajudante
   *  (ex.: cabeleireira com assistente). Aplicado sobre o subtotal após
   *  a taxa fixa do negócio. Default 0 (sem auxiliar). */
  auxiliarPct?: number;
  /** Como interpretar `auxiliarPct`:
   *   - "percent" (default): valor é uma porcentagem sobre vef.
   *   - "value": valor é R$ absoluto repassado ao auxiliar.
   *  Quando undefined, comportamento legado = "percent". */
  auxiliarMode?: "percent" | "value";
  /** Taxa do negócio do lançamento — % ou R$ (modo controlado por
   *  `taxaNegocioMode`). Substitui a antiga `Business.taxaFixaPct`
   *  global por valor por lançamento, permitindo o caso onde a taxa
   *  muda por atendimento (e não é uniforme pro negócio inteiro).
   *  Aplicada sobre o valor efetivo (= valor − desconto − custo).
   *  Default 0 (sem taxa). */
  taxaNegocio?: number;
  /** Como interpretar `taxaNegocio`:
   *   - "percent" (default): % sobre vef.
   *   - "value": R$ absoluto retido.
   *  Quando undefined, comportamento legado = "percent". */
  taxaNegocioMode?: "percent" | "value";
  /** @deprecated — Snapshot da taxa fixa global (%) no momento da
   *  criação do lançamento. Foi substituído por `taxaNegocio` na v3.
   *  Mantido como fallback no calcRow pra lançamentos pré-v3 que
   *  ainda têm o snapshot mas não têm `taxaNegocio`. */
  taxaFixaPctSnapshot?: number;
  /** Múltiplos serviços/produtos vendidos no mesmo atendimento.
   *  Quando presente:
   *    - `valor` é a soma dos items.valor
   *    - `servico` é a concatenação dos nomes (display only)
   *  Quando ausente, modo legado: `servico` e `valor` singulares. */
  items?: RowItem[];
  /** Pagamento dividido em várias formas. Quando presente (2+ partes), a
   *  taxa do cartão e a projeção passam a olhar cada parte; a soma dos
   *  `valor` bate com o `valor` bruto. Os campos `forma`/`parc`/`taxa`
   *  da Row viram só um resumo pra display. Quando ausente, modo legado
   *  de forma única — comportamento 100% inalterado. */
  pagamentos?: PagamentoSplit[];
  status: StatusPagamento;
  mes: number;
  ano: number;
  criadoEm: string;
}

export interface CalculatedRow extends Row {
  v: number;
  descontoVal: number;
  vef: number;
  taxaVal: number;
  custoVal: number;
  /** Valor R$ retido pela taxa fixa do negócio. 0 quando não configurada. */
  taxaFixaVal: number;
  /** Valor R$ retido pelo auxiliar do serviço. 0 quando auxiliarPct=0. */
  auxiliarVal: number;
  liq: number;
  mar: number;
}

export interface AppSettings {
  /** "yes" / "no" — consent for automatic Excel backups every 14 days.
   *  null = not asked yet. */
  autoBackupConsent: "yes" | "no" | null;
  /** Lembrete diário ativado — checa ao abrir o app. */
  dailyReminder?: boolean;
  /** Notificações por email (insights no último dia do mês + lembrete de
   *  metas no primeiro dia). Opt-in. */
  emailNotifications?: boolean;
  /** Tour de primeiro acesso já completado/pulado — não mostra de novo. */
  tourCompleted?: boolean;
}

export interface AppState {
  version: number;
  rows: Row[];
  /** Catálogo de clientes por empreendimento. */
  clients: Client[];
  /** Catálogo de serviços/produtos por empreendimento.
   *  Alimentado pelos lançamentos + CRUD em Preferências. */
  catalog: CatalogItem[];
  /** Metas mensais de faturamento bruto por (businessId, mes, ano). */
  goals: MonthGoal[];
  /** Lista de empreendimentos do usuário. */
  businesses: Business[];
  /** ID do empreendimento atualmente ativo (vazio = nenhum). */
  activeBusinessId: string;
  lastModified: string;
  settings?: AppSettings;
  /** Legado v1 — mantido apenas pra migração. Após v2, businesses[]
   *  passa a ser a fonte de verdade. */
  business?: BusinessProfile;
}

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

export interface ProjecaoItem {
  cliente: string;
  servico: string;
  bruto: number;
  liq: number;
  label: string;
}

export interface ProjecaoMes {
  m: number;
  y: number;
  lbl: string;
  bruto: number;
  taxa: number;
  liq: number;
  items: ProjecaoItem[];
}
