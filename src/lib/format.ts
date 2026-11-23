const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** centavos -> "R$ 1.234,56" */
export const money = (cents: number) => brl.format((cents || 0) / 100);

/** "1.234,56" | "1234.56" | "150" -> centavos (ou NaN) */
export function parseMoney(text: string): number {
  let t = String(text).trim().replace(/[R$\s]/g, '');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** centavos -> "1234,56" para preencher campos */
export const moneyInput = (cents: number) => ((cents || 0) / 100).toFixed(2).replace('.', ',');

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "2026-01-15" -> "15/01/2026" */
export function dateBR(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function dateShort(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export const monthKey = (iso: string) => iso.slice(0, 7);

export function monthLabel(key: string): string {
  const d = new Date(key + '-15T12:00:00');
  const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const plural = (n: number, one: string, many: string) => `${n} ${Math.abs(n) === 1 ? one : many}`;

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
