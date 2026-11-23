import { useMemo, useSyncExternalStore } from 'react';
import { COLLECTIONS, type AccessRole, type CollectionName, type DB, type TrashItem } from '../types';
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

function friendlyError(e: Error & { code?: string; collection?: string }) {
  if (e.code === 'permission-denied')
    return `O banco de dados recusou o acesso a "${e.collection ?? 'dados'}". Confira se as regras de segurança do arquivo firestore.rules foram coladas e publicadas no Firebase (Firestore Database → Regras → Publicar).`;
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

/**
 * Exclui um registro, guardando uma cópia na Lixeira para poder ser restaurado.
 * (Nada é apagado de verdade sem passar pela Lixeira.)
 */
export async function removeItem(name: CollectionName, id: string) {
  const b = need();
  if (name !== 'lixeira') {
    const original = (state.db[name] as unknown as Item[]).find((x) => x.id === id);
    if (original) {
      const { id: itemId, ...data } = original;
      await b.put('lixeira', {
        id: `${name}-${itemId}-${Date.now()}`,
        collection: name,
        itemId,
        data,
        deletedAt: Date.now(),
        ...(currentUser ? { deletedBy: currentUser } : {}),
      });
    }
  }
  await b.remove(name, id);
}

/** Devolve um item da Lixeira ao lugar de origem. */
export async function restoreFromTrash(t: TrashItem) {
  const b = need();
  await b.put(t.collection, { ...t.data, id: t.itemId });
  await b.remove('lixeira', t.id);
}

/** Apaga definitivamente (somente a partir da Lixeira). */
export async function purgeTrash(id: string) {
  await need().remove('lixeira', id);
}

export async function replaceAll(db: DB) {
  await need().replaceAll(db);
}

export function snapshot(): DB {
  return structuredClone(state.db);
}
