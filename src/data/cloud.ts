import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  updatePassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config';
import { COLLECTIONS, type Access, type CollectionName } from '../types';
import type { Backend, Item } from './backend';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let fs: Firestore | null = null;

export const cloudEnabled = firebaseConfig !== null;

function init() {
  if (!firebaseConfig) throw new Error('Firebase não configurado');
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // cache local: funciona sem internet e sincroniza quando a conexão volta
    fs = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  return { auth: auth!, fs: fs! };
}

export function watchAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(init().auth, cb);
}

export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(init().auth, email.trim(), password);
}

/**
 * Troca a senha de um login. Exige a senha atual daquele login.
 * - Se for o login em uso: confirma a senha atual e troca.
 * - Se for outro login (ex.: Diretoria Regular): entra nele numa conexão separada,
 *   troca a senha e sai, sem desconectar quem está usando o app.
 */
export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const { auth } = init();
  const me = auth.currentUser;
  if (me && me.email?.toLowerCase() === email.toLowerCase()) {
    await reauthenticateWithCredential(me, EmailAuthProvider.credential(email, currentPassword));
    await updatePassword(me, newPassword);
    return;
  }
  const temp = initializeApp(firebaseConfig!, 'troca-de-senha-' + Date.now());
  try {
    const tempAuth = getAuth(temp);
    const cred = await signInWithEmailAndPassword(tempAuth, email, currentPassword);
    await updatePassword(cred.user, newPassword);
    await signOut(tempAuth);
  } finally {
    await deleteApp(temp);
  }
}

export async function logout() {
  await signOut(init().auth);
}

// ---------- Nível de acesso (coleção "acesso", gerenciada só pelo console do Firebase) ----------


/** Lê o nível de acesso do usuário logado. Retorna null se o e-mail não estiver liberado. */
const ROLE_KEY = (email: string) => 'pinheiros-da-serra:role:' + email.trim().toLowerCase();

function rememberRole(a: Access) {
  try {
    localStorage.setItem(ROLE_KEY(a.id), JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

function rememberedRole(email: string): Access | null {
  try {
    const raw = localStorage.getItem(ROLE_KEY(email));
    return raw ? (JSON.parse(raw) as Access) : null;
  } catch {
    return null;
  }
}

const normalizeAccess = (id: string, data: Omit<Access, 'id'>): Access => ({
  id,
  ...data,
  role: data.role === 'executiva' ? 'executiva' : 'regular',
});

/**
 * Lê o nível de acesso do usuário logado. Retorna null se o e-mail não estiver liberado.
 * Sem internet, usa o último nível conhecido neste aparelho (para o app abrir offline).
 */
export async function getMyAccess(email: string): Promise<Access | null> {
  const ref = doc(init().fs, 'acesso', email.trim().toLowerCase());
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const a = normalizeAccess(snap.id, snap.data() as Omit<Access, 'id'>);
    rememberRole(a);
    return a;
  } catch (e) {
    if ((e as { code?: string }).code === 'permission-denied') return null;
    // provavelmente sem internet: tenta o cache do Firebase e depois o último nível guardado
    try {
      const snap = await getDocFromCache(ref);
      if (snap.exists()) return normalizeAccess(snap.id, snap.data() as Omit<Access, 'id'>);
    } catch {
      /* não estava no cache */
    }
    const saved = rememberedRole(email);
    if (saved) return saved;
    throw e;
  }
}




// ---------- Backend de dados ----------

function reportWriteError(e: Error & { code?: string }) {
  const msg =
    e.code === 'permission-denied'
      ? 'O banco recusou a gravação (sem permissão). Confira as regras do Firebase.'
      : 'Não foi possível salvar no servidor: ' + e.message;
  window.dispatchEvent(new CustomEvent('pinheiros:write-error', { detail: msg }));
}

export function createCloudBackend(allowed: CollectionName[] = COLLECTIONS): Backend {
  const { fs } = init();
  return {
    mode: 'cloud',
    start(onCollection, onError) {
      // coleções sem permissão (ex.: tesouraria para a diretoria regular) ficam vazias
      COLLECTIONS.filter((c) => !allowed.includes(c)).forEach((c) => onCollection(c, []));
      const unsubs = allowed.map((name) =>
        onSnapshot(
          collection(fs, name),
          (snap) => onCollection(name, snap.docs.map((d) => ({ ...(d.data() as Item), id: d.id }))),
          (e) => onError(Object.assign(e, { collection: name })),
        ),
      );
      return () => unsubs.forEach((u) => u());
    },
    // A gravação vale na hora no aparelho (aparece para quem está usando) e é enviada ao
    // servidor em segundo plano — inclusive quando estiver sem internet, assim que a conexão voltar.
    // Por isso não esperamos a confirmação do servidor; um erro de permissão é avisado depois.
    async put(name, item) {
      const { id, ...data } = item;
      setDoc(doc(fs, name, id), data).catch(reportWriteError);
    },
    async remove(name, id) {
      deleteDoc(doc(fs, name, id)).catch(reportWriteError);
    },
    async replaceAll(db) {
      // apaga tudo e grava o backup, em lotes (limite do Firestore: 500 operações por lote)
      const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
      for (const name of COLLECTIONS) {
        const snap = await getDocs(collection(fs, name));
        snap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
      }
      for (const name of COLLECTIONS as CollectionName[]) {
        for (const item of (db[name] ?? []) as unknown as Item[]) {
          const { id, ...data } = item;
          ops.push((b) => b.set(doc(fs, name, id), data));
        }
      }
      for (let i = 0; i < ops.length; i += 450) {
        const batch = writeBatch(fs);
        ops.slice(i, i + 450).forEach((op) => op(batch));
        await batch.commit();
      }
    },
  };
}
