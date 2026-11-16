import { openDatabaseAsync } from 'expo-sqlite';
import { Platform } from 'react-native';
import { collection, deleteDoc, doc, getDocsFromServer, setDoc } from 'firebase/firestore';
import { firebase } from './firebase';

/* MODELOS: Modulo limita os nomes; Dados descreve campos e Item acrescenta ID.
 * Linha representa o SQLite: dados é JSON; os demais campos controlam a fila local.
 */
export type Modulo = 'Livros' | 'Leituras' | 'Avaliações';
export interface Dados {
  modulo: Modulo;
  titulo?: string;
  autor?: string;
  livroId?: string;
  data?: string;
  nota?: number;
  comentario?: string;
}
export type Item = Dados & { id: string };
interface Linha { id: string; dados: string; versao: number; excluido: number; pendente: number }

/* BANCO LOCAL: abre diario.db e cria registros. A chave (usuario,id) separa contas.
 * pendente=1 pede envio; excluido=1 esconde o item até confirmar a exclusão remota.
 */
async function abrir() {
  const db = await openDatabaseAsync('diario.db');
  await db.execAsync(`CREATE TABLE IF NOT EXISTS registros (
    usuario TEXT NOT NULL, id TEXT NOT NULL, dados TEXT NOT NULL,
    versao INTEGER NOT NULL DEFAULT 1, pendente INTEGER NOT NULL DEFAULT 1,
    excluido INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(usuario,id)
  )`);
  return db;
}
/* ABERTURA COMPARTILHADA: guarda a Promise para chamadas aguardarem o mesmo banco.
 * ReturnType obtém o retorno de abrir; ??= cria apenas se ausente. Falha limpa
 * a referência para permitir tentar novamente.
 */
let abertura: ReturnType<typeof abrir> | undefined;
function banco() {
  return abertura ??= abrir().catch(erro => {
    // Uma abertura que falhou não deve impedir todas as próximas tentativas.
    abertura = undefined;
    throw erro;
  });
}

/* DIAGNÓSTICO: registra o original e traduz falhas conhecidas de arquivos/isolamento
 * do navegador. Preserva detalhes desconhecidos; não altera nem apaga dados.
 */
export function mensagemErroLocal(erro: unknown): string {
  console.error('Falha no banco local:', erro);
  const detalhe = erro instanceof Error ? erro.message : String(erro);
  if (/UnknownError|Unknown failure/i.test(detalhe) && Platform.OS === 'web') {
    return 'O navegador não conseguiu acessar os arquivos locais. Feche todas as abas do aplicativo e reinicie o navegador. Se persistir no Firefox, tente abrir http://localhost:8082 em uma janela normal do Edge ou Chrome. Não apague os dados do site: pode haver registros ainda não sincronizados.';
  }
  if (/SharedArrayBuffer|crossOriginIsolated|secure context/i.test(detalhe)) {
    return 'O navegador não liberou o armazenamento local. Reinicie o Expo e abra o app em http://localhost:8082.';
  }
  return `Falha no armazenamento local: ${detalhe}`;
}

/* READ: consulta registros ativos do UID e converte JSON para os objetos da tela.
 * Parâmetros ? recebem valores separados do SQL; rowid DESC prioriza novas inserções.
 */
export async function listar(uid: string): Promise<Item[]> {
  const db = await banco();
  const linhas = await db.getAllAsync<Linha>(
    'SELECT * FROM registros WHERE usuario=? AND excluido=0 ORDER BY rowid DESC', uid);
  return linhas.map(l => ({ ...JSON.parse(l.dados), id: l.id }));
}

/* NUVEM: caminho usuarios/{uid}/registros. firebase! afirma configuração ao TypeScript;
 * a autorização real depende das regras publicadas e da sessão autenticada.
 */
function colecao(uid: string) {
  return collection(firebase!.firestore, 'usuarios', uid, 'registros');
}
/* CREATE/UPDATE: usa ID da edição ou gera outro localmente pelo SDK. ON CONFLICT
 * atualiza a linha, incrementa a versão e marca pendência. Não envia à nuvem aqui.
 */
export async function salvar(uid: string, dados: Dados, id?: string) {
  const db = await banco();
  // O Firestore gera o ID no aparelho, inclusive sem conexão.
  const chave = id ?? doc(colecao(uid)).id;
  await db.runAsync(`INSERT INTO registros(usuario,id,dados) VALUES(?,?,?)
    ON CONFLICT(usuario,id) DO UPDATE SET dados=excluded.dados,
    versao=versao+1,pendente=1,excluido=0`, uid, chave, JSON.stringify(dados));
}

/* DELETE LOCAL: marca item e dependentes por livroId como excluídos/pendentes.
 * A lista já os esconde offline; sincronizar enviará a exclusão ao Firestore.
 */
export async function excluir(uid: string, item: Item) {
  const db = await banco();
  // Ao apagar um livro, remove também os registros que dependem dele.
  await db.runAsync(`UPDATE registros SET excluido=1, pendente=1, versao=versao+1
    WHERE usuario=? AND (id=? OR json_extract(dados,'$.livroId')=?)`, uid, item.id, item.id);
}

/* SINCRONIZAÇÃO: envia a fila, consulta o servidor e reconcilia o SQLite.
 * await aguarda operações; falhas chegam ao hook, que agenda novas tentativas.
 */
export async function sincronizar(uid: string) {
  const db = await banco();
  const registros = colecao(uid);
  const fila = await db.getAllAsync<Linha>(
    'SELECT * FROM registros WHERE usuario=? AND pendente=1 ORDER BY rowid', uid);
  /* ENVIO: deleteDoc remove; setDoc grava JSON. Só limpa pendente na versão enviada,
   * preservando uma edição realizada durante a espera pela resposta de rede.
   */
  for (const linha of fila) {
    const ref = doc(registros, linha.id);
    if (linha.excluido) await deleteDoc(ref);
    else await setDoc(ref, JSON.parse(linha.dados));
    // Uma edição feita durante o envio continua na fila.
    await db.runAsync('UPDATE registros SET pendente=0 WHERE usuario=? AND id=? AND versao=?',
      uid, linha.id, linha.versao);
  }
  /* RECUPERAÇÃO: consulta o servidor; Set de IDs identifica ausências na nuvem. */
  const remotos = await getDocsFromServer(registros);
  const ids = new Set(remotos.docs.map(d => d.id));
  /* RECONCILIAÇÃO: importa sem sobrescrever pendências e remove linhas sem pendência
   * ausentes no servidor. Pick descreve só os métodos necessários de db.
   * Versão e controles de fila são locais; não são enviados no JSON remoto.
   */
  const atualizar = async (tx: Pick<typeof db, 'runAsync' | 'getAllAsync'>) => {
    for (const registro of remotos.docs) {
      await tx.runAsync(`INSERT INTO registros(usuario,id,dados,pendente) VALUES(?,?,?,0)
        ON CONFLICT(usuario,id) DO UPDATE SET dados=excluded.dados,excluido=0
        WHERE registros.pendente=0`, uid, registro.id, JSON.stringify(registro.data()));
    }
    const locais = await tx.getAllAsync<{id:string}>(
      'SELECT id FROM registros WHERE usuario=? AND pendente=0', uid);
    for (const local of locais) {
      if (!ids.has(local.id)) await tx.runAsync(
        'DELETE FROM registros WHERE usuario=? AND id=? AND pendente=0', uid, local.id);
    }
  };
  /* TRANSAÇÃO: confirma/reverte a reconciliação local em conjunto; a variante exclusiva
   * não existe na web. Não engloba rede nem resolve conflitos entre aparelhos.
   */
  if (Platform.OS === 'web') {
    await db.withTransactionAsync(() => atualizar(db));
  } else {
    await db.withExclusiveTransactionAsync(atualizar);
  }
}
