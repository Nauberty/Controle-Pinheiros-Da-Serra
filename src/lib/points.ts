import type { PointEntry, Unit } from '../types';

export interface UnitScore {
  unit: Unit;
  total: number;
  gained: number;
  lost: number;
  last30: number;
  entries: number;
  position: number;
}

export function ranking(units: Unit[], points: PointEntry[]): UnitScore[] {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString().slice(0, 10);

  const rows = units.map((unit) => {
    const mine = points.filter((p) => p.unitId === unit.id);
    const gained = mine.filter((p) => p.points > 0).reduce((s, p) => s + p.points, 0);
    const lost = mine.filter((p) => p.points < 0).reduce((s, p) => s + p.points, 0);
    return {
      unit,
      total: gained + lost,
      gained,
      lost,
      last30: mine.filter((p) => p.date >= sinceIso).reduce((s, p) => s + p.points, 0),
      entries: mine.length,
      position: 0,
    };
  });
  rows.sort((a, b) => b.total - a.total || a.unit.order - b.unit.order);
  // empates ficam na mesma posição
  rows.forEach((r, i) => (r.position = i > 0 && rows[i - 1].total === r.total ? rows[i - 1].position : i + 1));
  return rows;
}

export function byCategory(points: PointEntry[]) {
  const map = new Map<string, number>();
  for (const p of points) map.set(p.category, (map.get(p.category) ?? 0) + p.points);
  return [...map.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}
