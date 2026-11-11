// Aba Hoje: o RDO do dia da obra atual, em 2 passos na v1.0 (o passo 3, prancha, chega na v1.2).
import { obterRdoHoje } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { formatarMomento } from '../lib/datas.js'
import { Carregando, ErroCarga } from '../components/index.jsx'
import RdoPasso1 from './rdoPasso1.jsx'
import RdoPasso2 from './rdoPasso2.jsx'

const PASSOS = [[1, 'Efetivo e clima'], [2, 'Frentes']]

// `frente`: quem chegou pelo quadro "frentes paradas" do comparativo traz a frente a destacar no passo 2.
export default function RdoHoje({ passo, frente, irParaPasso, aoFechar }) {
  const rdo = useDados(obterRdoHoje)
  const fechado = rdo.data?.status === 'Fechado'

  if (rdo.carregando) return <Carregando />
  if (rdo.erro) return <ErroCarga erro={rdo.erro} tentar={rdo.recarregar} />

  return (
    <>
      <div className="steps" style={{ marginBottom: 16 }}>
        {PASSOS.map(([n, rotulo]) => (
          <button key={n} className={`step${passo === n ? ' on' : passo > n ? ' done' : ''}`} onClick={() => irParaPasso(n)}>
            <span className="num">{passo > n ? '✓' : n}</span>{rotulo}
          </button>
        ))}
      </div>
      <div className="sub" style={{ margin: '-6px 0 14px' }}>Passo {passo} de {PASSOS.length}</div>
      {fechado && (
        <div className="banner" style={{ margin: '0 0 14px' }}>
          Diário fechado em {formatarMomento(rdo.data.fechado_em)}{rdo.data.fechado_por_nome ? ` por ${rdo.data.fechado_por_nome}` : ''}. Os engenheiros ainda podem corrigir.
        </div>
      )}
      {passo === 1
        ? <RdoPasso1 rdo={rdo.data} aoMudarRdo={rdo.recarregar} avancar={() => irParaPasso(2)} />
        : <RdoPasso2 aoMudarRdo={rdo.recarregar} aoFechar={aoFechar} frenteDestaque={frente} />}
    </>
  )
}
