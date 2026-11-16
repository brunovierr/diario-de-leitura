import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
/* BOTÃO: Pressable trata toque/clique com onPress; disabled bloqueia interação.
 * accessibilityRole identifica o botão; o estilo reage a pressed/bloqueado.
 * secundario muda as cores e Text desenha o rótulo.
 */
export function Botao({nome, acao, secundario=false, bloqueado=false}: {
  nome:string; acao:()=>void; secundario?:boolean; bloqueado?:boolean
}) {
  return <Pressable accessibilityRole="button" disabled={bloqueado} onPress={acao}
    style={({pressed}) => [s.botao, secundario && s.secundario, (pressed || bloqueado) && {opacity:0.6}]}>
    <Text style={{color:secundario ? '#264738' : 'white',fontWeight:'600'}}>{nome}</Text>
  </Pressable>;
}
/* CAMPO: View agrupa rótulo Text e entrada TextInput. TextInputProps aceita
 * propriedades nativas; {...props} repassa value, onChangeText, secureTextEntry etc.
 * accessibilityLabel identifica o campo para leitores de tela.
 */
export function Campo({nome,...props}:TextInputProps & {nome:string}) {
  return <View><Text style={s.rotulo}>{nome}</Text><TextInput accessibilityLabel={nome}
    placeholderTextColor="#63746b" style={s.campo} {...props}/></View>;
}
/* ESTILOS: StyleSheet.create centraliza aparência. pagina define espaçamento;
 * campo/botao padronizam controles; cartao destaca registros; linha usa
 * flexDirection e flexWrap para organizar ações conforme o espaço disponível.
 */
export const s = StyleSheet.create({
  pagina:{padding:20,gap:12,backgroundColor:'#faf8f2',flexGrow:1},
  titulo:{fontSize:27,fontWeight:'700',color:'#253d30'},
  rotulo:{fontSize:15,color:'#293e31',marginBottom:4},
  campo:{backgroundColor:'white',borderColor:'#9ca99f',borderWidth:1,borderRadius:7,padding:11,color:'#18261d'},
  botao:{backgroundColor:'#315842',paddingVertical:12,paddingHorizontal:15,borderRadius:7,alignItems:'center'},
  secundario:{backgroundColor:'#e3ebe4'},
  cartao:{backgroundColor:'white',padding:14,borderRadius:8,gap:8,borderWidth:1,borderColor:'#dce1da'},
  linha:{flexDirection:'row',gap:8,flexWrap:'wrap'},
});
