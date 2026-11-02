// Efetivo geral — COMPARATIVO entre obras (o segundo da casa, ao lado de obras.jsx):
// quantos funcionários de cada função estão lotados em cada obra, com uma pizza ao lado.
// Uma consulta só (listarQuadroEfetivo); a escolha de obra aqui é só um recorte da tela,
// não troca a obra do seletor do topo.
import { useState } from 'react'
import { listarQuadroEfetivo } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { fatiasDaPizza, percentual, grupoDaPizza, OUTRAS } from '../lib/quadroEfetivo.js'
import { Cabecalho, Carregando, ErroCarga, Vazio } from '../components/index.jsx'

// A cor é da função, nunca da posição: trocar de obra não repinta ninguém.
// Paleta categórica validada contra o fundo dos cartões (daltonismo e contraste).
const COR_FUNCAO = {
  Pedreiro: '#3987e5', Servente: '#d95926', Armador: '#199e70',
  Carpinteiro: '#c98500', Eletricista: '#d55181', Encanador: '#008300', [OUTRAS]: '#6B7B83',
}
const corDa = (funcao) => COR_FUNCAO[grupoDaPizza(funcao)]

function Pizza({ fatias, destaque, aoDestacar }) {
  const r = 100
  const ponto = (fracao) => [r + r * Math.sin(2 * Math.PI * fracao), r - r * Math.cos(2 * Math.PI * fracao)]
  return (
    <svg viewBox="-4 -4 208 208" className="pizza" role="img"
      aria-label={fatias.map((f) => `${f.rotulo}: ${f.quantidade}`).join(', ')}>
      {fatias.map((f) => {
        const apagada = destaque && destaque !== f.rotulo
        const props = {
          fill: COR_FUNCAO[f.rotulo], stroke: 'var(--card)', strokeWidth: 2, opacity: apagada ? 0.35 : 1,
          onMouseEnter: () => aoDestacar(f.rotulo), onMouseLeave: () => aoDestacar(null),
          onClick: () => aoDestacar(destaque === f.rotulo ? null : f.rotulo),
        }
        if (f.fracao >= 1) return <circle key={f.rotulo} cx={r} cy={r} r={r} {...props} />
        const [x1, y1] = ponto(f.inicio)
        const [x2, y2] = ponto(f.inicio + f.fracao)
        const grande = f.fracao > 0.5 ? 1 : 0
        return <path key={f.rotulo} d={`M${r},${r} L${x1},${y1} A${r},${r} 0 ${grande} 1 ${x2},${y2} Z`} {...props} />
      })}
    </svg>
  )
}

function Painel({ titulo, dados }) {
  const [destaque, setDestaque] = useState(null)
  const fatias = fatiasDaPizza(dados.contagem)
  if (!dados.total) {
    return <Vazio pequeno icone="pessoas" titulo={`Ninguém lotado em ${titulo}`} texto="Cadastre o funcionário em Pessoas, escolhendo esta obra." />
  }
  const fatiaDestaque = fatias.find((f) => f.rotulo === destaque)
  return (
    <div className="efetivo-painel">
      <section className="block">
        <div className="block-h"><h3>{titulo}</h3><span className="count"><b>{dados.total}</b> {dados.total === 1 ? 'funcionário' : 'funcionários'}</span></div>
        <table className="tabela-funcoes">
          <thead><tr><th>Função</th><th>Qtde</th><th>%</th></tr></thead>
          <tbody>
            {dados.contagem.map((x) => {
              const grupo = grupoDaPizza(x.funcao)
              return (
                <tr key={x.funcao} className={destaque && destaque !== grupo ? 'apagada' : ''}
                  onMouseEnter={() => setDestaque(grupo)} onMouseLeave={() => setDestaque(null)}>
                  <td><span className="amostra" style={{ background: corDa(x.funcao) }} />{x.funcao}</td>
                  <td>{x.quantidade}</td>
                  <td>{percentual(x.quantidade / dados.total)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr><td>Total</td><td>{dados.total}</td><td>100%</td></tr></tfoot>
        </table>
      </section>
      <section className="block pizza-bloco">
        <div className="pizza-legenda" aria-live="polite">
          {fatiaDestaque
            ? <><b>{fatiaDestaque.rotulo}</b>: {fatiaDestaque.quantidade} de {dados.total} ({percentual(fatiaDestaque.fracao)})</>
            : 'Toque numa fatia para ver o número'}
        </div>
        <Pizza fatias={fatias} destaque={destaque} aoDestacar={setDestaque} />
        {fatias.some((f) => f.rotulo === OUTRAS) && (
          <div className="hint">Outras: {dados.contagem.filter((x) => grupoDaPizza(x.funcao) === OUTRAS).map((x) => x.funcao).join(', ')}.</div>
        )}
      </section>
    </div>
  )
}

function TabelaPorObra({ quadro }) {
  const funcoes = quadro.geral.contagem.map((x) => x.funcao)
  const qtd = (linha, funcao) => linha.contagem.find((x) => x.funcao === funcao)?.quantidade ?? 0
  return (
    <>
      <div className="sec"><h2>Por obra</h2></div>
      <div className="tabela-rolagem block">
        <table className="tabela-obras">
          <thead><tr><th>Obra</th>{funcoes.map((fn) => <th key={fn}>{fn}</th>)}<th>Total</th></tr></thead>
          <tbody>
            {quadro.obras.map((o) => (
              <tr key={o.id}>
                <td><b>{o.nome}</b><div className="meta">{o.codigo}</div></td>
                {funcoes.map((fn) => <td key={fn} className={qtd(o, fn) ? '' : 't-muted'}>{qtd(o, fn) || '–'}</td>)}
                <td><b>{o.total}</b></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td>Todas as obras</td>{funcoes.map((fn) => <td key={fn}>{qtd(quadro.geral, fn)}</td>)}<td>{quadro.geral.total}</td></tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

export default function EfetivoGeral({ goto }) {
  const quadro = useDados(listarQuadroEfetivo)
  const [escolha, setEscolha] = useState('todas')

  const cabecalho = (
    <Cabecalho voltar={{ rotulo: 'Pessoas', onClick: () => goto('pessoas') }} eyebrow="Comparativo entre obras"
      titulo="Efetivo geral" sub="Funcionários lotados em cada obra, por função" />
  )
  if (quadro.carregando) return <>{cabecalho}<Carregando /></>
  if (quadro.erro) return <>{cabecalho}<ErroCarga erro={quadro.erro} tentar={quadro.recarregar} /></>

  const q = quadro.data
  if (!q.geral.total && !q.semObra.total) {
    return <>{cabecalho}<Vazio icone="pessoas" titulo="Nenhum funcionário cadastrado"
      texto="Cadastre o primeiro em Pessoas, escolhendo a obra em que ele está lotado."
      acao={<button className="btn btn-primary" onClick={() => goto('pessoas')}>Ir para Pessoas</button>} /></>
  }

  const opcoes = [
    { id: 'todas', rotulo: 'Todas as obras', dados: q.geral },
    ...q.obras.map((o) => ({ id: o.id, rotulo: o.nome, dados: o })),
    ...(q.semObra.total ? [{ id: 'sem', rotulo: 'Sem obra', dados: q.semObra }] : []),
  ]
  const atual = opcoes.find((o) => o.id === escolha) ?? opcoes[0]

  return (
    <>
      {cabecalho}
      <div className="chips" role="group" aria-label="Escolher obra">
        {opcoes.map((o) => (
          <button key={o.id} className={`chip${atual.id === o.id ? ' on' : ''}`} aria-pressed={atual.id === o.id} onClick={() => setEscolha(o.id)}>
            {o.rotulo} · {o.dados.total}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <Painel key={atual.id} titulo={atual.rotulo} dados={atual.dados} />
      </div>
      {atual.id === 'todas' && <TabelaPorObra quadro={q} />}
    </>
  )
}
