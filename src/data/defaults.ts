import type { DB, Settings, Unit } from '../types';

export const DEFAULT_UNITS: Unit[] = [
  { id: 'u1', name: 'Unidade 1', color: '#2f7d3a', order: 1, active: true },
  { id: 'u2', name: 'Unidade 2', color: '#c0392b', order: 2, active: true },
  { id: 'u3', name: 'Unidade 3', color: '#2c6db5', order: 3, active: true },
  { id: 'u4', name: 'Unidade 4', color: '#d49a1c', order: 4, active: true },
];

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  clubName: 'Pinheiros da Serra',
  eventName: 'Campori',
  eventDate: '',
  pointCategories: [
    'Pontualidade',
    'Uniforme',
    'Bíblia e devocional',
    'Classes e especialidades',
    'Atividades e gincanas',
    'Disciplina',
    'Limpeza e organização',
    'Campori',
    'Outros',
  ],
  expenseCategories: ['Inscrição', 'Transporte', 'Alimentação', 'Materiais', 'Uniformes', 'Equipamentos', 'Outros'],
};

export const EMPTY_DB: DB = {
  units: [],
  members: [],
  points: [],
  charges: [],
  payments: [],
  expenses: [],
  settings: [],
};

/** Unidades padrão sobrepostas pelas que foram editadas/criadas. */
export function mergeUnits(stored: Unit[]): Unit[] {
  const byId = new Map(DEFAULT_UNITS.map((u) => [u.id, u]));
  for (const u of stored) byId.set(u.id, { ...byId.get(u.id), ...u });
  return [...byId.values()].sort((a, b) => a.order - b.order);
}

export function mergeSettings(stored: Settings[]): Settings {
  return { ...DEFAULT_SETTINGS, ...(stored.find((s) => s.id === 'main') ?? {}) };
}
