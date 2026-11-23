import { useMemo, useSyncExternalStore } from 'react';
import { COLLECTIONS, type AccessRole, type CollectionName, type DB } from '../types';
import type { Backend, Item } from './backend';
import { EMPTY_DB, mergeSettings, mergeUnits } from './defaults';

interface State {
  db: DB;
  loaded: Set<CollectionName>;
  error: string | null;
}

let state: State = { db: structuredClone(EMPTY_DB), loaded: new Set(), error: null };
let backend: Backend | null = null;
let stop: (() => void) | null = null;
let currentUser: string | undefined;
let currentRole: AccessRole = 'executiva';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function friendlyError(e: Error & { code?: string }) {
  if (e.code === 'permission-denied')
    return 'Seu e-mail ainda não tem permissão para acessar os dados. Peça a alguém da diretoria para liberar seu acesso em Configurações.';
  return e.message;
}

export function connect(b: Backend, userEmail?: string, role: AccessRole = 'executiva') {
  stop?.();
  backend = b;
  currentUser = userEmail;
  currentRole = role;
  state = { db: structuredClone(EMPTY_DB), loaded: new Set(), error: null };
  emit();
  stop = b.start(
    (name, items) => {
      const loaded = new Set(state.loaded);
      loaded.add(name);
      state = { ...state, loaded, db: { ...state.db, [name]: items } };
      emit();
    },
    (e) => {
      state = { ...state, error: friendlyError(e) };
      emit();
    },
  );
}

export function disconnect() {
  stop?.();
  stop = null;
  backend = null;
  state = { db: structuredClone(EMPTY_DB), loaded: new Set(), error: null };
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getState = () => state;

/** Dados prontos para uso nas telas (com unidades e configurações padrão já aplicadas). */
export function useData() {
  const s = useSyncExternalStore(subscribe, getState);
  return useMemo(() => {
    const units = mergeUnits(s.db.units);
    return {
      ...s.db,
      units,
      activeUnits: units.filter((u) => u.active),
      settings: mergeSettings(s.db.settings),
      ready: COLLECTIONS.every((c) => s.loaded.has(c)),
      error: s.error,
      mode: backend?.mode ?? 'local',
      role: currentRole,
      /** Tesouraria, configurações e backup: somente diretoria executiva */
      isExecutive: currentRole === 'executiva',
      userEmail: currentUser,
    };
  }, [s]);
}

export type Data = ReturnType<typeof useData>;

function need() {
  if (!backend) throw new Error('Sem conexão com os dados');
  return backend;
}

/** Salva (cria ou atualiza) um registro. */
export async function save<K extends CollectionName>(name: K, item: DB[K][number]) {
  const withAuthor =
    currentUser && ['points', 'payments', 'expenses'].includes(name) && !('createdBy' in item && item.createdBy)
      ? { ...item, createdBy: currentUser }
      : item;
  await need().put(name, withAuthor as unknown as Item);
}

export async function removeItem(name: CollectionName, id: string) {
  await need().remove(name, id);
}

export async function replaceAll(db: DB) {
  await need().replaceAll(db);
}

export function snapshot(): DB {
  return structuredClone(state.db);
}
