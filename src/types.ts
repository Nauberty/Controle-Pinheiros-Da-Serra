import type { ProfileKey } from './lib/memberFields';

// Valores em dinheiro são sempre guardados em CENTAVOS (inteiros) para evitar erros de arredondamento.

export interface Unit {
  id: string;
  name: string;
  color: string;
  logo?: string; // caminho da imagem (ex.: unidades/ipe.png)
  order: number;
  active: boolean;
}

export interface SgcChange {
  field: string;
  from: string;
  to: string;
  at: number;
  by?: string;
}

export type Member = {
  id: string;
  name: string;
  unitId: string | null;
  role: string; // ver ROLES em lib/memberFields
  active: boolean;
  createdAt: number;
  updatedAt?: number;
  /** Há alterações feitas aqui que ainda precisam ser lançadas no SGC */
  sgcPending?: boolean;
  sgcChanges?: SgcChange[];
  sgcSyncedAt?: number;
} & Partial<Record<ProfileKey, string>>;

export interface PointEntry {
  id: string;
  unitId: string;
  points: number; // positivo = ganho, negativo = perda
  category: string;
  description: string;
  date: string; // AAAA-MM-DD
  createdAt: number;
  createdBy?: string;
}

export interface Charge {
  id: string;
  title: string;
  amount: number; // valor padrão por pessoa (centavos)
  dueDate?: string;
  memberIds: string[]; // quem precisa pagar
  customAmounts?: Record<string, number>; // valor diferente para alguém (bolsa, desconto)
  notes?: string;
  archived?: boolean;
  createdAt: number;
}

export type PaymentMethod = 'pix' | '7me' | 'dinheiro' | 'cartao' | 'outro';

export interface Payment {
  id: string;
  memberId: string;
  chargeId: string | null;
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
  createdAt: number;
  createdBy?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  method: PaymentMethod;
  chargeId: string | null; // despesa ligada a um evento (ex.: Campori)
  date: string;
  createdAt: number;
  createdBy?: string;
}

export interface Settings {
  id: 'main';
  clubName: string;
  eventName: string; // evento em destaque no painel (ex.: Campori)
  eventDate: string; // AAAA-MM-DD (vazio = sem contagem regressiva)
  pointCategories: string[];
  expenseCategories: string[];
}

/** executiva: acesso total (inclusive Tesouraria) · regular: pontuação e membros */
export type AccessRole = 'executiva' | 'regular';

export interface Access {
  id: string; // e-mail em minúsculas
  name?: string;
  role?: AccessRole;
  addedAt: number;
}

export interface DB {
  units: Unit[];
  members: Member[];
  points: PointEntry[];
  charges: Charge[];
  payments: Payment[];
  expenses: Expense[];
  settings: Settings[];
}

export type CollectionName = keyof DB;
export const COLLECTIONS: CollectionName[] = ['units', 'members', 'points', 'charges', 'payments', 'expenses', 'settings'];
/** Coleções exclusivas da diretoria executiva */
export const FINANCE_COLLECTIONS: CollectionName[] = ['charges', 'payments', 'expenses'];
