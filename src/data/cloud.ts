import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
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

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(init().auth, email.trim());
}

export async function logout() {
  await signOut(init().auth);
}

// ---------- Lista de e-mails com acesso (coleção "acesso") ----------

export function watchAccess(cb: (items: Access[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    collection(init().fs, 'acesso'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Access, 'id'>) }))),
    onError,
  );
}

export async function grantAccess(email: string, name: string) {
  const id = email.trim().toLowerCase();
  await setDoc(doc(init().fs, 'acesso', id), { name: name.trim(), addedAt: Date.now() });
}

export async function revokeAccess(email: string) {
  await deleteDoc(doc(init().fs, 'acesso', email));
}

// ---------- Backend de dados ----------

export function createCloudBackend(): Backend {
  const { fs } = init();
  return {
    mode: 'cloud',
    start(onCollection, onError) {
      const unsubs = COLLECTIONS.map((name) =>
        onSnapshot(
          collection(fs, name),
          (snap) => onCollection(name, snap.docs.map((d) => ({ ...(d.data() as Item), id: d.id }))),
          (e) => onError(e),
        ),
      );
      return () => unsubs.forEach((u) => u());
    },
    async put(name, item) {
      const { id, ...data } = item;
      await setDoc(doc(fs, name, id), data);
    },
    async remove(name, id) {
      await deleteDoc(doc(fs, name, id));
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
