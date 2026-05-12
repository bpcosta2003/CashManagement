export type FormaPagamento = "Dinheiro" | "Pix" | "Débito" | "Crédito";
export type StatusPagamento = "Pago" | "Pendente";

export type BusinessType =
  | "salao"
  | "restaurante"
  | "comercio"
  | "servicos"
  | "freelancer"
  | "outro";

/** Perfil legado (v1) — preservado pra migração de estado antigo. */
export interface BusinessProfile {
  name: string;
  type: BusinessType;
}

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  createdAt: string;
}

export interface Client {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  lastUsedAt: string;
  createdAt: string;
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
}

export interface AppState {
  version: number;
  rows: Row[];
  /** Catálogo de clientes por empreendimento. */
  clients: Client[];
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
