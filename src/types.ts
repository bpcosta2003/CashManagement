export type FormaPagamento = "Dinheiro" | "Pix" | "Débito" | "Crédito";
export type StatusPagamento = "Pago" | "Pendente";

export interface Row {
  id: string;
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

export type BusinessType =
  | "salao"
  | "restaurante"
  | "comercio"
  | "servicos"
  | "freelancer"
  | "outro";

export interface BusinessProfile {
  name: string;
  type: BusinessType;
}

export interface AppSettings {
  /** "yes" / "no" — consent for automatic Excel backups every 14 days.
   *  null = not asked yet. */
  autoBackupConsent: "yes" | "no" | null;
}

export interface AppState {
  version: number;
  rows: Row[];
  lastModified: string;
  business?: BusinessProfile;
  settings?: AppSettings;
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
