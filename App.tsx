import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { firebase } from './src/firebase';
import { ModuloScreen } from './src/ModuloScreen';
import { Botao, Campo, s } from './src/interface';
import { useDiario } from './src/useDiario';
import type { Modulo } from './src/dados';

const Stack = createNativeStackNavigator<{ Menu:undefined; Cadastro:{modulo:Modulo} }>();
const modulos: Modulo[] = ['Livros','Leituras','Avaliações'];

function Diario({uid}:{uid:string}) {
  const diario = useDiario(uid);
  return <NavigationContainer><Stack.Navigator>
    <Stack.Screen name="Menu" options={{title:'Diário de Leitura'}}>{({navigation})=>
      <ScrollView contentContainerStyle={s.pagina}><Text style={s.titulo}>Meu diário</Text>
        <Text>{diario.estado}</Text>
        {modulos.map(modulo=><Botao nome={modulo} key={modulo} acao={()=>navigation.navigate('Cadastro',{modulo})}/>)}
        <Botao nome="Sair da conta" secundario acao={()=>signOut(firebase!.auth).catch(()=>Alert.alert('Falha ao sair da conta'))}/>
      </ScrollView>}</Stack.Screen>
    <Stack.Screen name="Cadastro" options={({route})=>({title:route.params.modulo})}>{({route})=>
      <ModuloScreen key={route.params.modulo} modulo={route.params.modulo} uid={uid} {...diario}/>}
    </Stack.Screen>
  </Stack.Navigator></NavigationContainer>;
}

function Acesso() {
  const [usuario,setUsuario] = useState<User|null|undefined>(undefined);
  const [email,setEmail] = useState('');
  const [senha,setSenha] = useState('');
  const [cadastro,setCadastro] = useState(false);
  const [confirmacao,setConfirmacao] = useState('');
  const [erro,setErro] = useState('');
  const [entrando,setEntrando] = useState(false);
  useEffect(()=>{ if (firebase) return onAuthStateChanged(firebase.auth,setUsuario); },[]);
  async function entrar() {
    if (entrando) return;
    if (cadastro && senha.length < 6) return setErro('A senha deve ter pelo menos 6 caracteres.');
    if (cadastro && senha !== confirmacao) return setErro('As senhas não coincidem.');
    setEntrando(true); setErro('');
    try {
      if (cadastro) await createUserWithEmailAndPassword(firebase!.auth,email.trim(),senha);
      else await signInWithEmailAndPassword(firebase!.auth,email.trim(),senha);
      setSenha(''); setConfirmacao(''); setCadastro(false);
    }
    catch (e) {
      const codigo=(e as {code?:string}).code;
      setErro(codigo==='auth/email-already-in-use'?'Este e-mail já possui uma conta. Volte para entrar.':
        codigo==='auth/weak-password'?'Escolha uma senha mais forte, com pelo menos 6 caracteres.':
        codigo==='auth/password-does-not-meet-requirements'?'A senha não atende à política de segurança do projeto Firebase.':
        codigo==='auth/operation-not-allowed'?'Habilite o acesso por e-mail e senha no Firebase Authentication.':
        codigo==='auth/network-request-failed'?'Conecte-se à internet para acessar ou criar sua conta.':
        codigo==='auth/too-many-requests'?'Muitas tentativas. Tente novamente mais tarde.':
        codigo==='auth/invalid-credential' || codigo==='auth/invalid-email'?'Confira o e-mail e a senha.':
        'Falha no acesso. Confira a conta e a configuração do Firebase.');
    } finally { setEntrando(false); }
  }
  if (usuario) return <Diario key={usuario.uid} uid={usuario.uid}/>;
  return <SafeAreaView style={{flex:1}}><ScrollView contentContainerStyle={s.pagina} keyboardShouldPersistTaps="handled">
    <Text style={s.titulo}>Diário de Leitura</Text>
    {!firebase ? <Text>Preencha a configuração do Firebase no arquivo .env e reinicie o Expo.</Text> :
      usuario===undefined ? <Text>Abrindo a sessão…</Text> : <>
        <Text style={s.titulo}>{cadastro ? 'Criar conta' : 'Entrar'}</Text>
        <Campo nome="E-mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail}/>
        <Campo nome="Senha" secureTextEntry value={senha} onChangeText={setSenha}/>
        {cadastro && <>
          <Text>Use uma senha com pelo menos 6 caracteres.</Text>
          <Campo nome="Confirmar senha" secureTextEntry value={confirmacao} onChangeText={setConfirmacao}/>
        </>}
        {!!erro && <Text accessibilityLiveRegion="polite">{erro}</Text>}
        <Botao nome={entrando ? (cadastro ? 'Criando conta…' : 'Entrando…') : (cadastro ? 'Cadastrar' : 'Entrar')}
          acao={entrar} bloqueado={entrando || !email.trim() || !senha || (cadastro && !confirmacao)}/>
        <Botao secundario nome={cadastro ? 'Já tenho conta · Entrar' : 'Criar uma conta'} bloqueado={entrando}
          acao={()=>{setCadastro(!cadastro); setErro(''); setSenha(''); setConfirmacao('');}}/>
      </>}
  </ScrollView></SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><Acesso/></SafeAreaProvider>; }
