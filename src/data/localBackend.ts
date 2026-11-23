import { COLLECTIONS, type CollectionName, type DB } from '../types';
import { EMPTY_DB } from './defaults';
import type { Backend, Item } from './backend';

const KEY = 'pinheiros-da-serra:db:v1';

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY_DB, ...JSON.parse(raw) };
  } catch {
    /* sem armazenamento disponível */
  }
  return structuredClone(EMPTY_DB);
}

export function createLocalBackend(): Backend {
  let db = load();
  let listener: ((name: CollectionName, items: Item[]) => void) | null = null;

  const persist = (names: CollectionName[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* armazenamento cheio ou bloqueado */
    }
    for (const n of names) listener?.(n, db[n] as unknown as Item[]);
  };

  // sincroniza entre abas abertas do mesmo navegador
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    db = load();
    for (const n of COLLECTIONS) listener?.(n, db[n] as unknown as Item[]);
  };

  return {
    mode: 'local',
    start(onCollection) {
      listener = onCollection;
      window.addEventListener('storage', onStorage);
      for (const n of COLLECTIONS) onCollection(n, db[n] as unknown as Item[]);
      return () => {
        listener = null;
        window.removeEventListener('storage', onStorage);
      };
    },
    async put(name, item) {
      const list = db[name] as unknown as Item[];
      const i = list.findIndex((x) => x.id === item.id);
      const next = i >= 0 ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
      db = { ...db, [name]: next };
      persist([name]);
    },
    async remove(name, id) {
      db = { ...db, [name]: (db[name] as unknown as Item[]).filter((x) => x.id !== id) };
      persist([name]);
    },
    async replaceAll(next) {
      db = { ...EMPTY_DB, ...next };
      persist(COLLECTIONS);
    },
  };
}
