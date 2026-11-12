import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const configurado = Boolean(config.apiKey && config.projectId && config.appId);

function conectar() {
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  return { auth: getAuth(app), firestore: getFirestore(app) };
}

export const firebase = configurado ? conectar() : null;
