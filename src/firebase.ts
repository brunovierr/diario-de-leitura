import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/* CONFIGURAÇÃO MOBILE: o Expo disponibiliza as variáveis EXPO_PUBLIC_ do .env.
 * Identificam o projeto cliente; a autorização depende de Auth e regras Firestore.
 * Não devem conter credenciais de administrador.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const configurado = Boolean(config.apiKey && config.projectId && config.appId);
/* SERVIÇOS NATIVOS: reutiliza ou cria o app. initializeAuth configura persistência
 * da sessão com AsyncStorage; getAuth reutiliza a instância existente.
 * getFirestore fornece acesso à nuvem. configurado só verifica preenchimento.
 */
function conectar() {
  const existe = getApps().length > 0;
  const app = existe ? getApp() : initializeApp(config);
  const auth = existe ? getAuth(app) : initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  return { auth, firestore: getFirestore(app) };
}
/* EXPORTAÇÃO: compartilha os serviços ou null para orientar a configuração na tela. */
export const firebase = configurado ? conectar() : null;
