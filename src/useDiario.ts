import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { listar, sincronizar, mensagemErroLocal, type Item } from './dados';

export function useDiario(uid: string) {
  const [itens, setItens] = useState<Item[]>([]);
  const [estado, setEstado] = useState('Abrindo o diário…');
  const [alteracao, setAlteracao] = useState(0);
  const atualizar = () => setAlteracao(valor => valor + 1);

  useEffect(() => {
    let ativo = true;
    listar(uid).then(lista => { if (ativo) setItens(lista); })
      .catch(erro => { if (ativo) setEstado(mensagemErroLocal(erro)); });
    return () => { ativo = false; };
  }, [uid, alteracao]);

  // Um único envio por sessão. Alterações feitas durante o envio geram outra rodada.
  const [controle] = useState(() => ({ solicitar: () => {} }));
  useEffect(() => {
    let ativo = true, online = false, enviando = false, repetir = false;
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
    const remover = NetInfo.addEventListener(rede => {
      online = rede.isConnected === true && rede.isInternetReachable !== false;
      if (online) void solicitar();
      else setEstado('Sem internet · dados no aparelho');
    });
    const timer = setInterval(solicitar, 30000);
    return () => { ativo = false; remover(); clearInterval(timer); };
  }, [uid, controle]);
  useEffect(() => { controle.solicitar(); }, [alteracao, controle]);
  return { itens, estado, atualizar };
}
