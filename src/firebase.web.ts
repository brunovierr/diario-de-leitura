import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/* VERSÃO WEB: o Expo escolhe este arquivo ao importar ./firebase no navegador.
 * Evita usar getReactNativePersistence, exclusivo do mobile. Variáveis públicas
 * identificam o projeto; não substituem autenticação e regras de acesso.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const configurado = Boolean(config.apiKey && config.projectId && config.appId);

/* SERVIÇOS WEB: reutiliza/cria o app; getAuth usa a autenticação do navegador.
 * getFirestore obtém o serviço de documentos. configurado só verifica presença.
 */
function conectar() {
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  return { auth: getAuth(app), firestore: getFirestore(app) };
}

/* Mesmo formato auth/firestore da versão mobile; null quando falta configuração. */
export const firebase = configurado ? conectar() : null;
