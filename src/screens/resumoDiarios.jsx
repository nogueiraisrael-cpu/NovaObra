// Resumo impresso de vários diários: escolhe a semana (ou os dias) e imprime uma tabela,
// um dia por linha, mais o que foi lançado em cada frente. Sem fotos.
import { useState } from 'react'
import { obterDiarios } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { useObra } from '../lib/ObraContext.jsx'
import { escolhaInicial, idsNoIntervalo, resumirPeriodo, semanaDe, situacaoDiario } from '../lib/diarios.js'
import { formatarData, formatarDataLonga, formatarDiaCurto, formatarDiaMes, hojeISO } from '../lib/datas.js'
import { Carregando, ErroCarga, Icon, Pill, Stats, COR_FRENTE_DIA, COR_SITUACAO_DIARIO } from '../components/index.jsx'

function Escolher({ diarios, escolhidos, setEscolhidos, ver, voltar }) {
  const hoje = hojeISO()
  const atalhos = [['Esta semana', semanaDe(hoje)], ['Semana passada', semanaDe(hoje, -1)]]
  const alternar = (id) => {
    const novo = new Set(escolhidos)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setEscolhidos(novo)
  }
  return (
    <>
      <button className="back" onClick={voltar}><Icon nome="back" />Todos os diários</button>
      <div className="sec" style={{ marginTop: 6 }}><h2>Imprimir resumo</h2><span className="t-muted">{escolhidos.size} escolhidos</span></div>
      <div className="chips">
        {atalhos.map(([rotulo, semana]) => (
          <button key={rotulo} className="chip" onClick={() => setEscolhidos(new Set(idsNoIntervalo(diarios, semana)))}>
            {rotulo} <small style={{ color: 'var(--muted)' }}>{formatarDiaMes(semana.de)} a {formatarDiaMes(semana.ate)}</small>
          </button>
        ))}
        <button className="chip" onClick={() => setEscolhidos(new Set())} disabled={!escolhidos.size}>Limpar</button>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>Ou toque nos dias que quer no resumo.</p>
      <div className="list" style={{ marginTop: 8 }}>
        {diarios.map((r) => {
          const marcado = escolhidos.has(r.id)
          const situacao = situacaoDiario(r, hoje)
          return (
            <button key={r.id} className="item" role="checkbox" aria-checked={marcado} onClick={() => alternar(r.id)}>
              <div className="item-top" style={{ alignItems: 'center' }}>
                <span className="row-wrap">
                  <span className={`check-sub${marcado ? ' on' : ''}`} aria-hidden="true">{marcado && <Icon nome="check" />}</span>
                  <b>{formatarDataLonga(r.data)}</b>
                </span>
                <Pill cor={COR_SITUACAO_DIARIO[situacao]}>{situacao}</Pill>
              </div>
            </button>
          )
        })}
      </div>
      <div className="cta">
        <button className="btn btn-primary btn-full" disabled={!escolhidos.size} onClick={ver}>
          {escolhidos.size ? `Ver resumo de ${escolhidos.size} ${escolhidos.size === 1 ? 'dia' : 'dias'}` : 'Escolha pelo menos um dia'}
        </button>
      </div>
    </>
  )
}

function Resumo({ ids, voltar }) {
  const { obra } = useObra()
  const dias = useDados(() => obterDiarios(ids), [ids.join()])
  if (dias.carregando) return <Carregando />
  if (dias.erro) return <><button className="back" onClick={voltar}><Icon nome="back" />Escolher os dias</button><ErroCarga erro={dias.erro} tentar={dias.recarregar} /></>

  const p = resumirPeriodo(dias.data)
  const periodo = p.de === p.ate ? formatarData(p.de) : `${formatarData(p.de)} a ${formatarData(p.ate)}`
  return (
    <div className="resumo-diarios">
      <button className="back nao-imprimir" onClick={voltar}><Icon nome="back" />Escolher os dias</button>
      <div className="so-impressao">HB ENGENHARIA · Resumo dos diários · {obra.nome} ({obra.codigo}) · {obra.cidade}</div>
      <h2 className="dia-titulo" style={{ marginTop: 6 }}>Resumo · {periodo}</h2>
      <div className="sub">{p.totais.dias} {p.totais.dias === 1 ? 'diário' : 'diários'}{p.totais.nao_fechados ? ` · ${p.totais.nao_fechados} ainda não ${p.totais.nao_fechados === 1 ? 'fechado' : 'fechados'}` : ''}</div>

      <div style={{ marginTop: 14 }}>
        <Stats itens={[
          { valor: p.totais.media_presentes.toLocaleString('pt-BR'), rotulo: 'presentes por dia (média)', cor: 'accent' },
          { valor: p.totais.faltas, rotulo: 'faltas e atestados', cor: p.totais.faltas ? 'bad' : '' },
          { valor: p.totais.dias_nao_praticaveis, rotulo: p.totais.dias_nao_praticaveis === 1 ? 'dia não praticável' : 'dias não praticáveis', cor: p.totais.dias_nao_praticaveis ? 'warn' : '' },
        ]} />
      </div>

      <section className="block" style={{ marginTop: 12 }}>
        <div className="block-h"><h3>Dia a dia</h3></div>
        <div className="resumo-rolagem">
          <table className="tabela-resumo">
            <thead>
              <tr><th>Dia</th><th>Clima</th><th>Praticável</th><th>Presentes</th><th>Faltas</th><th>Frentes paradas</th><th>Ocorrências</th></tr>
            </thead>
            <tbody>
              {p.linhas.map((l) => (
                <tr key={l.id}>
                  <td><b>{formatarDiaCurto(l.data)}</b>{!l.fechado && <div className="t-bad" style={{ fontSize: 12 }}>não fechado</div>}</td>
                  <td>{l.clima}</td>
                  <td className={l.praticavel ? '' : 't-bad'}>{l.texto_praticavel}</td>
                  <td className="num">{l.presentes} de {l.total}</td>
                  <td className="num">{l.faltas}</td>
                  <td className={`num${l.paradas ? ' t-bad' : ''}`}>{l.paradas}</td>
                  <td className="texto-dia ocorr">{l.ocorrencias || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="sec"><h2>Frentes de serviço</h2><span className="t-muted">{p.frentes.length}</span></div>
      {p.frentes.length === 0 && <p className="note">Nenhuma frente preenchida nesses dias.</p>}
      <div className="list">
        {p.frentes.map((f) => (
          <section className="block" key={f.chave}>
            <div className="block-h"><h3>{f.nome}</h3><span className="count">{f.etapa}</span></div>
            {f.dias.map((x) => (
              <div className="linha-dia" key={x.data}>
                <div>
                  <b>{formatarDiaMes(x.data)}</b>
                  {x.motivo_parada && <span className="t-bad"> · {x.motivo_parada}</span>}
                  {x.descricao && <div className="meta texto-dia">{x.descricao}</div>}
                </div>
                <Pill cor={COR_FRENTE_DIA[x.situacao]}>{x.situacao}</Pill>
              </div>
            ))}
          </section>
        ))}
      </div>

      <div className="cta nao-imprimir">
        <button className="btn btn-primary btn-full" onClick={() => window.print()}>Imprimir</button>
      </div>
    </div>
  )
}

export default function ResumoDiarios({ diarios, voltar }) {
  const [escolhidos, setEscolhidos] = useState(() => new Set(escolhaInicial(diarios, hojeISO())))
  const [vendo, setVendo] = useState(false)
  function ver() { setVendo(true); window.scrollTo(0, 0) }
  if (vendo) {
    // Na ordem da lista (mais novo primeiro); o resumo reordena do mais antigo ao mais novo.
    const ids = diarios.filter((r) => escolhidos.has(r.id)).map((r) => r.id)
    return <Resumo ids={ids} voltar={() => setVendo(false)} />
  }
  return <Escolher diarios={diarios} escolhidos={escolhidos} setEscolhidos={setEscolhidos} ver={ver} voltar={voltar} />
}
