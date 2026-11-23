import type { DB } from '../types';

/**
 * Formatos de backup aceitos:
 *  - comum:        { app, version, exportedAt, data: DB }
 *  - criptografado (gerado pelo backup automático semanal no GitHub):
 *      { app, version, exportedAt, encrypted: true, kdf: 'PBKDF2-SHA256', iterations, salt, iv, ciphertext }
 *    AES-256-GCM; salt/iv/ciphertext em base64 (o ciphertext já inclui a etiqueta de 16 bytes no final).
 */
export interface EncryptedBackup {
  app: string;
  version: number;
  exportedAt: string;
  encrypted: true;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const isEncrypted = (x: unknown): x is EncryptedBackup =>
  !!x && typeof x === 'object' && (x as EncryptedBackup).encrypted === true;

export async function decryptBackup(file: EncryptedBackup, password: string): Promise<unknown> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64(file.salt), iterations: file.iterations },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(file.iv) }, key, b64(file.ciphertext));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error('senha incorreta ou arquivo danificado');
  }
}

/** Extrai os dados de um backup já descriptografado. */
export function backupData(parsed: unknown): DB {
  const p = parsed as { data?: DB } & DB;
  return (p.data ?? p) as DB;
}

// ---------- lembrete de backup (por aparelho) ----------
const LAST_KEY = 'pinheiros-da-serra:last-backup';

export function markBackupDone() {
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function lastBackupAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function daysSinceBackup(): number | null {
  const t = lastBackupAt();
  return t ? Math.floor((Date.now() - t) / 86400000) : null;
}

/** Pede ao navegador para não apagar os dados salvos localmente (quando houver pouco espaço). */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* navegador sem suporte */
  }
}
