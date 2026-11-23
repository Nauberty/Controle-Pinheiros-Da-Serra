// Gera um backup criptografado de todo o banco (Cloud Firestore).
// Executado pelo GitHub Actions (.github/workflows/backup.yml).
//
// Variáveis de ambiente (cadastradas como "secrets" no GitHub):
//   FIREBASE_SERVICE_ACCOUNT  conteúdo do arquivo JSON da conta de serviço do Firebase
//   BACKUP_PASSWORD           senha usada para criptografar o backup (guarde-a bem!)
//
// O arquivo gerado pode ser restaurado pelo próprio sistema: Configurações → Restaurar backup.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const COLLECTIONS = ['units', 'members', 'points', 'charges', 'payments', 'expenses', 'settings', 'lixeira', 'acesso'];
const ITERATIONS = 310000;

const { FIREBASE_SERVICE_ACCOUNT, BACKUP_PASSWORD } = process.env;
if (!FIREBASE_SERVICE_ACCOUNT || !BACKUP_PASSWORD) {
  console.error('Faltam os secrets FIREBASE_SERVICE_ACCOUNT e/ou BACKUP_PASSWORD.');
  process.exit(1);
}
if (BACKUP_PASSWORD.length < 10) {
  console.error('BACKUP_PASSWORD precisa ter pelo menos 10 caracteres.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const data = {};
const counts = {};
for (const name of COLLECTIONS) {
  const snap = await db.collection(name).get();
  data[name] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  counts[name] = snap.size;
}

const exportedAt = new Date().toISOString();
const plain = Buffer.from(JSON.stringify({ app: 'controle-pinheiros-da-serra', version: 1, exportedAt, data }));

// AES-256-GCM com chave derivada da senha (PBKDF2-SHA256) — compatível com a restauração no navegador
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(BACKUP_PASSWORD, salt, ITERATIONS, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const ciphertext = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);

const out = {
  app: 'controle-pinheiros-da-serra',
  version: 1,
  exportedAt,
  encrypted: true,
  kdf: 'PBKDF2-SHA256',
  iterations: ITERATIONS,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  ciphertext: ciphertext.toString('base64'),
};

mkdirSync('out', { recursive: true });
const file = `out/backup-pinheiros-da-serra-${exportedAt.slice(0, 10)}.json`;
writeFileSync(file, JSON.stringify(out));
console.log('Backup gerado:', file);
console.table(counts);
