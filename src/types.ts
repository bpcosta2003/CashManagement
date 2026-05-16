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
  custo: number | "";
  desconto: number | "";
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
