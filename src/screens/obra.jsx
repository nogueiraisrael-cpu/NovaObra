// Dentro da obra escolhida: abas Hoje · Diários · Fotos · Comentários · Pranchas · Medições.
import { useObra } from '../lib/ObraContext.jsx'
import { hojeISO, formatarDataLonga } from '../lib/datas.js'
import { Cabecalho, Vazio } from '../components/index.jsx'
import RdoHoje from './rdoHoje.jsx'
import Diarios from './diarios.jsx'
import Fotos from './fotos.jsx'
import Comentarios from './comentarios.jsx'
import Pranchas from './pranchas.jsx'
import Medicoes from './medicoes.jsx'

const ABAS = ['Hoje', 'Diários', 'Fotos', 'Comentários', 'Pranchas', 'Medições']

export default function Obra({ goto, params }) {
  const { obra } = useObra()
  const aba = params.aba ?? 'Hoje'
  const irPara = (novos) => goto('obra', { ...params, ...novos })

  let corpo
  switch (aba) {
    case 'Diários': corpo = <Diarios />; break
    case 'Fotos': corpo = <Fotos />; break
    case 'Comentários': corpo = <Comentarios />; break
    case 'Pranchas': corpo = <Pranchas />; break
    case 'Medições': corpo = <Medicoes />; break
    default: corpo = obra.situacao === 'Concluída'
      ? <div style={{ marginTop: 16 }}><Vazio icone="obras" titulo="Obra concluída"
        texto="Para lançar diário, reabra a obra em Editar obra, na tela Obras."
        acao={<button className="btn btn-ghost" onClick={() => goto('obras')}>Ir para Obras</button>} /></div>
      : <RdoHoje passo={params.passo ?? 1} irParaPasso={(passo) => irPara({ passo })} aoFechar={() => goto('obras')} />
  }

  return (
    <>
      <Cabecalho voltar={{ rotulo: 'Todas as obras', onClick: () => goto('obras') }}
        eyebrow={formatarDataLonga(hojeISO())} titulo={obra.nome}
        sub={`${obra.codigo} · ${obra.tipo} · ${obra.cidade}${obra.situacao !== 'Em andamento' ? ` · ${obra.situacao}` : ''}`} />
      <div className="obra-tabs" role="tablist">
        {ABAS.map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} className={aba === a ? 'on' : ''} onClick={() => goto('obra', { aba: a })}>{a}</button>
        ))}
      </div>
      {corpo}
    </>
  )
}
