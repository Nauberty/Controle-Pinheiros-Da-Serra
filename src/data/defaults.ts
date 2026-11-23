import type { DB, Settings, Unit } from '../types';

export const DEFAULT_UNITS: Unit[] = [
  { id: 'u1', name: 'Pau-Brasil', color: '#5fae1e', logo: 'unidades/pau-brasil.png', order: 1, active: true },
  { id: 'u2', name: 'Cedro', color: '#7d858c', logo: 'unidades/cedro.png', order: 2, active: true },
  { id: 'u3', name: 'Chorão', color: '#9b6fd6', logo: 'unidades/chorao.png', order: 3, active: true },
  { id: 'u4', name: 'Ipê', color: '#e2649c', logo: 'unidades/ipe.png', order: 4, active: true },
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
  campori: [],
  lixeira: [],
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
