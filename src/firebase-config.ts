import type { FirebaseOptions } from 'firebase/app';

/**
 * CONFIGURAÇÃO DO BANCO ONLINE (Firebase)
 *
 * Enquanto estiver `null`, o sistema funciona em MODO LOCAL:
 * os dados ficam salvos somente no navegador de quem está usando.
 *
 * Para que toda a diretoria compartilhe os mesmos dados, siga o passo a passo
 * em docs/CONFIGURAR-FIREBASE.md e cole aqui o objeto de configuração do seu projeto.
 * (Essas chaves não são secretas: quem protege os dados são as regras de segurança.)
 *
 * Exemplo:
 * export const firebaseConfig: FirebaseOptions | null = {
 *   apiKey: 'AIza...',
 *   authDomain: 'pinheiros-da-serra.firebaseapp.com',
 *   projectId: 'pinheiros-da-serra',
 *   storageBucket: 'pinheiros-da-serra.appspot.com',
 *   messagingSenderId: '000000000000',
 *   appId: '1:000000000000:web:abcdef',
 * };
 */
export const firebaseConfig: FirebaseOptions | null = null;
