import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { listar, sincronizar, mensagemErroLocal, type Item } from './dados';

/* HOOK DO DIÁRIO: recebe UID e compartilha lista, mensagem e atualização.
 * useState preserva valores; atualizar incrementa alteracao após salvar/excluir.
 */
export function useDiario(uid: string) {
  const [itens, setItens] = useState<Item[]>([]);
  const [estado, setEstado] = useState('Abrindo o diário…');
  const [alteracao, setAlteracao] = useState(0);
  const atualizar = () => setAlteracao(valor => valor + 1);

  useEffect(() => {
    /* LEITURA LOCAL: o efeito depende de uid/alteracao e consulta SQLite offline.
     * ativo impede atualizar a tela com resposta antiga após a limpeza do efeito.
     */
    let ativo = true;
    listar(uid).then(lista => { if (ativo) setItens(lista); })
      .catch(erro => { if (ativo) setEstado(mensagemErroLocal(erro)); });
    return () => { ativo = false; };
  }, [uid, alteracao]);

  // Um único envio por sessão. Alterações feitas durante o envio geram outra rodada.
  /* REFERÊNCIA ESTÁVEL: controle guarda solicitar entre renderizações. enviando
   * evita rodadas simultâneas neste hook; repetir agenda nova rodada se necessário.
   * Esse controle não bloqueia outros dispositivos ou abas.
   */
  const [controle] = useState(() => ({ solicitar: () => {} }));
  useEffect(() => {
    let ativo = true, online = false, enviando = false, repetir = false;
    /* ENVIO: exige rede e efeito ativo; sincroniza, relê SQLite e atualiza a tela.
     * catch informa pendência; finally libera o controle para outra tentativa.
     */
    async function solicitar() {
      if (!ativo || !online) return;
      if (enviando) { repetir = true; return; }
      enviando = true;
      try {
        do {
          repetir = false;
          setEstado('Sincronizando…');
          await sincronizar(uid);
        } while (ativo && online && repetir);
        const lista = await listar(uid);
        if (ativo) {
          setItens(lista);
          setEstado(online ? 'Diário sincronizado' : 'Sem internet · dados no aparelho');
        }
      } catch {
        if (ativo) setEstado(online ? 'Sincronização pendente · nova tentativa automática' : 'Sem internet · dados no aparelho');
      } finally { enviando = false; }
    }
    controle.solicitar = solicitar;
    /* REDE: NetInfo solicita envio ao reconectar. O timer tenta a cada 30 segundos.
     * A limpeza desativa o efeito, remove o listener e cancela o timer.
     */
    const remover = NetInfo.addEventListener(rede => {
      online = rede.isConnected === true && rede.isInternetReachable !== false;
      if (online) void solicitar();
      else setEstado('Sem internet · dados no aparelho');
    });
    const timer = setInterval(solicitar, 30000);
    return () => { ativo = false; remover(); clearInterval(timer); };
  }, [uid, controle]);
  /* MUDANÇAS: nova alteracao solicita envio além da releitura local.
   * O retorno é consumido pelo menu e por ModuloScreen.
   */
  useEffect(() => { controle.solicitar(); }, [alteracao, controle]);
  return { itens, estado, atualizar };
}
