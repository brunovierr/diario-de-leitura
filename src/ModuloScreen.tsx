import { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { excluir, salvar, mensagemErroLocal, type Item, type Modulo, type Dados } from './dados';
import { Botao, Campo, s } from './interface';

type Resultado = { key:string; title:string; author_name?:string[] };
function dataValida(texto:string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) return false;
  const [dia, mes, ano] = texto.split('/').map(Number);
  const data = new Date(ano,mes-1,dia);
  return data.getFullYear()===ano && data.getMonth()===mes-1 && data.getDate()===dia;
}
export function ModuloScreen({modulo,uid,itens,atualizar,estado}:{
  modulo:Modulo; uid:string; itens:Item[]; atualizar:()=>void; estado:string
}) {
  const [id, setId] = useState<string>();
  const [form, setForm] = useState<Dados>({modulo});
  const [busca,setBusca] = useState('');
  const [resultados,setResultados] = useState<Resultado[]>([]);
  const [buscando,setBuscando] = useState(false);
  const [ocupado,setOcupado] = useState(false);
  const [aviso,setAviso] = useState('');
  const [paraExcluir,setParaExcluir] = useState<Item>();
  const [excluindo,setExcluindo] = useState(false);
  const [erroExclusao,setErroExclusao] = useState('');
  const livros = itens.filter(i => i.modulo==='Livros');
  const lista = itens.filter(i => i.modulo===modulo);
  const alterar = (dados:Partial<Dados>) => setForm(anterior=>({...anterior,...dados}));
  function limpar() {
    setId(undefined); setForm({modulo}); setResultados([]); setBusca(''); setAviso('');
  }
  async function buscar() {
    setBuscando(true); setResultados([]); setAviso('');
    try {
      const resposta = await fetch('https://openlibrary.org/search.json?fields=key,title,author_name&limit=5&title=' + encodeURIComponent(busca.trim()));
      if (!resposta.ok) throw new Error();
      const dados = await resposta.json();
      setResultados(dados.docs);
      if (!dados.docs.length) setAviso('Nenhum livro encontrado. Você pode preencher os campos abaixo.');
    } catch { setAviso('Busca indisponível. Preencha título e autor manualmente.'); }
    finally { setBuscando(false); }
  }
  async function gravar() {
    let dados:Dados;
    if (modulo==='Livros') {
      const titulo=form.titulo?.trim(), autor=form.autor?.trim();
      if (!titulo || !autor) return setAviso('Preencha título e autor.');
      dados={modulo,titulo,autor};
    } else {
      if (!livros.some(l=>l.id===form.livroId)) return setAviso('Selecione um livro cadastrado.');
      if (modulo==='Leituras') {
        if (!dataValida(form.data ?? '')) return setAviso('Informe uma data válida no formato DD/MM/AAAA.');
        dados={modulo,livroId:form.livroId,data:form.data};
      } else {
        if (!form.nota) return setAviso('Selecione uma nota de 1 a 5.');
        dados={modulo,livroId:form.livroId,nota:form.nota,comentario:form.comentario?.trim() ?? ''};
      }
    }
    setOcupado(true);
    try { await salvar(uid,dados,id); limpar(); atualizar(); }
    catch (erro) { setAviso(mensagemErroLocal(erro)); }
    finally { setOcupado(false); }
  }
  function confirmar(item:Item) {
    setErroExclusao(''); setParaExcluir(item);
  }
  async function remover() {
    if (!paraExcluir || excluindo) return;
    setExcluindo(true); setErroExclusao('');
    try {
      await excluir(uid,paraExcluir);
      if (id===paraExcluir.id || form.livroId===paraExcluir.id) limpar();
      setParaExcluir(undefined); atualizar();
    } catch (erro) { setErroExclusao(mensagemErroLocal(erro)); }
    finally { setExcluindo(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.pagina}>
    <Modal visible={!!paraExcluir} transparent animationType="fade"
      onRequestClose={()=>{if (!excluindo) setParaExcluir(undefined);}}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.45)',justifyContent:'center',alignItems:'center',padding:20}}>
        <View accessibilityViewIsModal style={[s.cartao,{width:'100%',maxWidth:440}]}>
          <Text style={s.titulo}>Excluir registro?</Text>
          <Text>{paraExcluir?.titulo ?? livros.find(l=>l.id===paraExcluir?.livroId)?.titulo}</Text>
          <Text>{modulo==='Livros' ? 'As leituras e avaliações deste livro também serão excluídas.' : 'Confirma a exclusão deste registro?'}</Text>
          {!!erroExclusao && <Text accessibilityLiveRegion="polite">{erroExclusao}</Text>}
          <Botao nome={excluindo ? 'Excluindo…' : 'Confirmar exclusão'} acao={remover} bloqueado={excluindo}/>
          <Botao secundario nome="Cancelar" acao={()=>setParaExcluir(undefined)} bloqueado={excluindo}/>
        </View>
      </View>
    </Modal>
    <Text>{estado}</Text><Text style={s.titulo}>{id ? 'Editar registro' : 'Novo registro'}</Text>
    {modulo==='Livros' ? <>
      <Campo nome="Buscar na Open Library" value={busca} onChangeText={setBusca}/>
      <Botao secundario nome={buscando?'Buscando…':'Buscar título'} bloqueado={buscando || !busca.trim()} acao={buscar}/>
      {resultados.map(r=><Botao key={r.key} secundario nome={r.title+' · '+(r.author_name?.join(', ') || 'Autor não informado')}
        acao={()=>{alterar({titulo:r.title,autor:r.author_name?.join(', ') ?? ''});setResultados([]);}}/>)}
      <Campo nome="Título" value={form.titulo ?? ''} onChangeText={titulo=>alterar({titulo})}/>
      <Campo nome="Autor" value={form.autor ?? ''} onChangeText={autor=>alterar({autor})}/>
    </> : <>
      <Text>Livro</Text>
      {!livros.length && <Text>Cadastre um livro no menu Livros para começar.</Text>}
      {livros.map(l=><Botao nome={l.titulo+' · '+l.autor} secundario={form.livroId!==l.id}
        key={l.id} acao={()=>alterar({livroId:l.id})}/>)}
      {modulo==='Leituras' ? <Campo nome="Data de conclusão" placeholder="DD/MM/AAAA" maxLength={10}
        value={form.data ?? ''} onChangeText={data=>alterar({data})}/> : <>
        <Text>Nota</Text><View style={s.linha}>{[1,2,3,4,5].map(n=><Botao key={n} nome={String(n)}
          secundario={form.nota!==n} acao={()=>alterar({nota:n})}/>)}</View>
        <Campo nome="Comentário" multiline maxLength={500} value={form.comentario ?? ''} onChangeText={comentario=>alterar({comentario})}/>
      </>}
    </>}
    {!!aviso && <Text accessibilityLiveRegion="polite">{aviso}</Text>}
    <Botao nome="Salvar" bloqueado={ocupado} acao={gravar}/>
    {id && <Botao secundario nome="Cancelar edição" acao={limpar}/>}
    <Text style={s.titulo}>{modulo}</Text>
    {!lista.length && <Text>Nenhum registro cadastrado.</Text>}
    {lista.map(item=><View key={item.id} style={s.cartao}>
      <Text style={{fontWeight:'700'}}>{item.titulo ?? livros.find(l=>l.id===item.livroId)?.titulo ?? 'Livro indisponível'}</Text>
      <Text>{item.autor ?? item.data ?? ('Nota '+item.nota+'/5'+(item.comentario?' · '+item.comentario:''))}</Text>
      <View style={s.linha}><Botao secundario nome="Editar" acao={()=>{
        const {id:chave,...dados}=item; setId(chave); setForm(dados); setAviso('');
      }}/><Botao secundario nome="Excluir" acao={()=>confirmar(item)}/></View>
    </View>)}
  </ScrollView>;
}
