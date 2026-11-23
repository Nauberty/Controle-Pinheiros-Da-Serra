import type { Charge, Expense, Member, Payment, PaymentMethod } from '../types';

export const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'pix', label: 'Pix' },
  { id: '7me', label: '7me' },
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'cartao', label: 'Cartão' },
  { id: 'outro', label: 'Outro' },
];

export const methodLabel = (m: PaymentMethod) => METHODS.find((x) => x.id === m)?.label ?? m;

export type Status = 'pago' | 'parcial' | 'pendente';

export interface MemberBalance {
  member: Member;
  due: number;
  paid: number;
  remaining: number;
  status: Status;
  payments: Payment[];
}

export const amountFor = (charge: Charge, memberId: string) => charge.customAmounts?.[memberId] ?? charge.amount;

/** Situação de cada pessoa em uma cobrança. */
export function chargeBalances(charge: Charge, members: Member[], payments: Payment[]): MemberBalance[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const pays = payments.filter((p) => p.chargeId === charge.id);
  return charge.memberIds
    .map((id) => byId.get(id))
    .filter((m): m is Member => !!m)
    .map((member) => {
      const mine = pays.filter((p) => p.memberId === member.id);
      const paid = mine.reduce((s, p) => s + p.amount, 0);
      const due = amountFor(charge, member.id);
      const remaining = Math.max(0, due - paid);
      const status: Status = paid >= due ? 'pago' : paid > 0 ? 'parcial' : 'pendente';
      return { member, due, paid, remaining, status, payments: mine };
    })
    .sort((a, b) => a.member.name.localeCompare(b.member.name, 'pt-BR'));
}

export function chargeSummary(charge: Charge, members: Member[], payments: Payment[]) {
  const rows = chargeBalances(charge, members, payments);
  const expected = rows.reduce((s, r) => s + r.due, 0);
  const received = payments.filter((p) => p.chargeId === charge.id).reduce((s, p) => s + p.amount, 0);
  const remaining = rows.reduce((s, r) => s + r.remaining, 0);
  return {
    rows,
    expected,
    received,
    remaining,
    pct: expected ? Math.min(100, Math.round((Math.min(received, expected) / expected) * 100)) : 0,
    pago: rows.filter((r) => r.status === 'pago').length,
    parcial: rows.filter((r) => r.status === 'parcial').length,
    pendente: rows.filter((r) => r.status === 'pendente').length,
  };
}

export function cashSummary(payments: Payment[], expenses: Expense[], charges: Charge[], members: Member[]) {
  const income = payments.reduce((s, p) => s + p.amount, 0);
  const out = expenses.reduce((s, e) => s + e.amount, 0);
  const toReceive = charges
    .filter((c) => !c.archived)
    .reduce((s, c) => s + chargeSummary(c, members, payments).remaining, 0);
  const byMethod = METHODS.map((m) => ({
    ...m,
    total: payments.filter((p) => p.method === m.id).reduce((s, p) => s + p.amount, 0),
    count: payments.filter((p) => p.method === m.id).length,
  })).filter((m) => m.count > 0);
  return { income, out, balance: income - out, toReceive, byMethod };
}
