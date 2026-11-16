// O Firebase 12 fornece esta função na entrada React Native, mas a omite nos tipos gerais.
import 'firebase/auth';
import type AsyncStorage from '@react-native-async-storage/async-storage';
import type { Persistence } from 'firebase/auth';
/* TIPAGEM: amplia firebase/auth com a assinatura da função nativa.
 * Um .d.ts descreve a API; não implementa funções nem habilita recursos na web.
 */
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
}
