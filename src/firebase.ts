import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const configurado = Boolean(config.apiKey && config.projectId && config.appId);
function conectar() {
  const existe = getApps().length > 0;
  const app = existe ? getApp() : initializeApp(config);
  const auth = existe ? getAuth(app) : initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  return { auth, firestore: getFirestore(app) };
}
export const firebase = configurado ? conectar() : null;
