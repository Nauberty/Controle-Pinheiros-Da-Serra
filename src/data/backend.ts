import type { CollectionName, DB } from '../types';

export type Item = { id: string } & Record<string, unknown>;

export interface Backend {
  mode: 'local' | 'cloud';
  /** Começa a ouvir os dados. Retorna função para parar. */
  start(onCollection: (name: CollectionName, items: Item[]) => void, onError: (e: Error) => void): () => void;
  put(name: CollectionName, item: Item): Promise<void>;
  remove(name: CollectionName, id: string): Promise<void>;
  /** Substitui todos os dados (restaurar backup). */
  replaceAll(db: DB): Promise<void>;
}
