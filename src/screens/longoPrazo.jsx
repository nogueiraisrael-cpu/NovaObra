// Longo prazo — o cronograma da obra: as atividades da EAP em barras ao longo das
// semanas ou dos meses, com o avanço real contra o previsto (o que devia estar pronto até ontem).
// No computador, barras (CSS puro); no celular, uma lista. O avanço se lança tocando na linha.
import { useState } from 'react'
import { salvarProgresso, salvarCalendario, posso } from '../lib/dados.js'
import {
  montarEap, andamento, escalaDoCronograma, posicaoNaEscala, posicaoDeHoje, diasUteis, previstoAte,
  filtrarInteiro, lerProgresso, validarCalendario, descreverCalendario, NOMES_DIAS, segundaDaSemana,
} from '../lib/planejamento.js'
import { comProgresso, comCalendario } from '../lib/planejamentoLocal.js'
import { hojeISO, formatarData, formatarDiaMes } from '../lib/datas.js'
import { ErroCampo, Gaveta, Pill, Stats, Vazio } from '../components/index.jsx'

const COR_SITUACAO = { 'Concluída': 'ok', 'Em dia': 'info', 'Atrasada': 'bad', 'Não iniciada': 'idle' }
const LARGURA_COLUNA = { semana: 56, 'mês': 110 }
const diasUteisTxt = (n) => `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`

// Barra fina de avanço: preenchido = real; traço = onde devia estar até ontem.
function Avanco({ real, previsto }) {
  return (
    <div className="avanco" aria-hidden="true">
      <div className="avanco-real" style={{ width: `${real}%` }} />
      {previsto > 0 && previsto < 100 && <div className="avanco-previsto" style={{ left: `${previsto}%` }} />}
    </div>
  )
}

// ---------- lançar o avanço real ----------
function FormProgresso({ linha, and, calendario, hoje, fechar, salvar }) {
  const [texto, setTexto] = useState(String(linha.progresso ?? 0))
  const [tentou, setTentou] = useState(false)
  const erro = lerProgresso(texto) === null ? 'Informe um número de 0 a 100.' : null
  const previsto = previstoAte(linha.inicio, linha.fim, hoje, calendario)

  function enviar() {
    setTentou(true)
    if (!erro) salvar(texto)
  }

  return (
    <>
      <div className="eyebrow">{linha.codigo} · Avanço</div>
      <h2>{linha.titulo}</h2>
      <div className="sub">{formatarData(linha.inicio)} → {formatarData(linha.fim)} · {diasUteisTxt(diasUteis(linha.inicio, linha.fim, calendario))}</div>
      {linha.grupo
        ? (
          <>
            <div className="lines" style={{ marginTop: 16 }}>
              <div className="line"><span className="dot info" />Real: {and.real}%</div>
              <div className="line"><span className="dot idle" />Previsto até ontem: {and.previsto}%</div>
            </div>
            <div className="hint">Este é um grupo: o avanço dele é a média das subatividades, pesada pelos dias úteis. Lance o avanço em cada subatividade.</div>
            <div className="sheet-actions"><span /><button className="btn btn-ghost" onClick={fechar}>Fechar</button></div>
          </>
        )
        : (
          <>
            <label className="label" htmlFor="lp-prog">Quanto já foi feito (%)</label>
            <input id="lp-prog" className="field" inputMode="numeric" autoComplete="off" value={texto}
              onChange={(e) => setTexto(filtrarInteiro(e.target.value))} />
            <ErroCampo erro={(tentou || texto === '') && erro} />
            <div className="seg" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginTop: 10 }}>
              {[0, 25, 50, 75, 100].map((n) => (
                <button key={n} className={texto === String(n) ? 'info' : ''} onClick={() => setTexto(String(n))}>{n}%</button>
              ))}
            </div>
            <div className="hint">Pelas datas, até ontem devia estar em {previsto}%.</div>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
              <button className="btn btn-primary" onClick={enviar}>Salvar avanço</button>
            </div>
          </>
        )}
    </>
  )
}

// ---------- dias de trabalho e feriados da obra ----------
function FormCalendario({ calendario, hoje, fechar, salvar }) {
  const [dias, setDias] = useState(calendario.dias)
  const [feriados, setFeriados] = useState(calendario.feriados)
  const [novo, setNovo] = useState(hoje)
  const [tentou, setTentou] = useState(false)
  const erro = validarCalendario({ dias })
  const alternar = (d) => setDias((atual) => (atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d]))

  function adicionar() {
    if (novo && !feriados.includes(novo)) setFeriados([...feriados, novo].sort())
  }

  function enviar() {
    setTentou(true)
    if (!erro) salvar({ dias, feriados })
  }

  return (
    <>
      <div className="eyebrow">Calendário da obra</div>
      <h2>Dias de trabalho e feriados</h2>
      <div className="sub">Vale para contar os dias úteis e o previsto em todo o Planejamento desta obra.</div>
      <div className="label">Dias de trabalho</div>
      <div className="chips">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button key={d} className={`chip${dias.includes(d) ? ' on' : ''}`} aria-pressed={dias.includes(d)} onClick={() => alternar(d)}>{NOMES_DIAS[d]}</button>
        ))}
      </div>
      <ErroCampo erro={(tentou || !dias.length) && erro} />
      <div className="label">Feriados</div>
      {feriados.length
        ? feriados.map((f) => (
          <div className="linha-dia" key={f}>
            <span>{formatarData(f)}</span>
            <button className="link-remover" onClick={() => setFeriados(feriados.filter((x) => x !== f))} aria-label={`Tirar o feriado de ${formatarData(f)}`}>Tirar</button>
          </div>
        ))
        : <div className="hint">Nenhum feriado.</div>}
      <div className="minimo-linha" style={{ marginTop: 10 }}>
        <input type="date" className="field" aria-label="Data do feriado" value={novo} onChange={(e) => setNovo(e.target.value)} />
        <button className="btn btn-ghost" disabled={!novo || feriados.includes(novo)} onClick={adicionar}>Adicionar</button>
      </div>
      <div className="hint">Só muda a conta: as datas de início e fim das atividades continuam as mesmas.</div>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={enviar}>Salvar calendário</button>
      </div>
    </>
  )
}

export default function LongoPrazo({ lista, calendario, gravar, ocupado, irParaEap }) {
  const [modo, setModo] = useState('semana')
  const [gaveta, setGaveta] = useState(null) // {tipo:'avanco', id} | {tipo:'calendario'}
  const hoje = hojeISO()
  const eap = montarEap(lista)
  const and = andamento(eap, hoje, calendario)
  const escala = escalaDoCronograma(eap, modo)
  const xHoje = posicaoDeHoje(escala, hoje)
  const aberta = gaveta?.tipo === 'avanco' ? eap.find((x) => x.id === gaveta.id) : null

  function salvarAvanco(id, texto) {
    setGaveta(null)
    gravar(() => salvarProgresso(id, texto), { mudar: (d) => comProgresso(d, id, lerProgresso(texto), segundaDaSemana(hoje)), sucesso: 'Avanço salvo', falhou: 'Avanço não salvo' })
  }

  function salvarCal(cal) {
    setGaveta(null)
    gravar(() => salvarCalendario(cal), { mudar: (d) => comCalendario(d, cal), sucesso: 'Calendário salvo', falhou: 'Calendário não salvo' })
  }

  const gavetas = (
    <>
      <Gaveta aberta={Boolean(aberta)} fechar={() => setGaveta(null)} rotulo="Avanço da atividade">
        {aberta && <FormProgresso key={aberta.id} linha={aberta} and={and.linhas[aberta.id]} calendario={calendario} hoje={hoje}
          fechar={() => setGaveta(null)} salvar={(texto) => salvarAvanco(aberta.id, texto)} />}
      </Gaveta>
      <Gaveta aberta={gaveta?.tipo === 'calendario'} fechar={() => setGaveta(null)} rotulo="Calendário da obra">
        {gaveta?.tipo === 'calendario' && <FormCalendario calendario={calendario} hoje={hoje} fechar={() => setGaveta(null)}
          salvar={salvarCal} />}
      </Gaveta>
    </>
  )

  // O calendário é dado da obra: só quem edita a obra muda (quadro, obra.editar).
  const linkCalendario = posso('obra.editar')
    ? <button className="link" disabled={ocupado} onClick={() => setGaveta({ tipo: 'calendario' })}>Calendário: {descreverCalendario(calendario)}</button>
    : <span className="t-muted">Calendário: {descreverCalendario(calendario)}</span>

  if (!eap.length) {
    return (
      <>
        <Vazio icone="relogio" titulo="Ainda não há cronograma"
          texto="O cronograma sai das atividades da EAP. Monte a EAP primeiro, com início e fim de cada atividade."
          acao={<button className="btn btn-primary" onClick={irParaEap}>Ir para a EAP</button>} />
        <div className="sec">{linkCalendario}</div>
        {gavetas}
      </>
    )
  }

  const abrir = (x) => !ocupado && setGaveta({ tipo: 'avanco', id: x.id })
  const rotuloLinha = (x) => `${x.codigo} ${x.titulo}: real ${and.linhas[x.id].real}%, previsto ${and.linhas[x.id].previsto}%`

  return (
    <>
      <Stats itens={[
        { valor: `${and.geral.real}%`, rotulo: 'feito na obra', cor: 'accent' },
        { valor: `${and.geral.previsto}%`, rotulo: 'previsto até ontem' },
        { valor: and.atrasadas, rotulo: and.atrasadas === 1 ? 'atividade atrasada' : 'atividades atrasadas', cor: and.atrasadas ? 'bad' : '' },
      ]} />
      <div className="sec">
        <div className="seg two cron-modo" role="group" aria-label="Ver por">
          {['semana', 'mês'].map((m) => (
            <button key={m} className={modo === m ? 'info' : ''} aria-pressed={modo === m} onClick={() => setModo(m)}>Por {m}</button>
          ))}
        </div>
        {linkCalendario}
      </div>

      {/* Computador: as barras. */}
      <div className="cron">
        <div className="cron-tabela" style={{ minWidth: 280 + escala.colunas.length * LARGURA_COLUNA[modo] }}>
          <div className="cron-linha cron-cab">
            <div className="cron-nome">Atividade</div>
            <div className="cron-trilha">
              {escala.colunas.map((c) => <span key={c.inicio} style={{ width: `${(100 * c.dias) / escala.dias}%` }}>{c.rotulo}</span>)}
            </div>
          </div>
          {eap.map((x) => {
            const pos = posicaoNaEscala(escala, x.inicio, x.fim)
            const a = and.linhas[x.id]
            return (
              <button key={x.id} className={`cron-linha${x.grupo ? ' grupo' : ''}`} onClick={() => abrir(x)} aria-label={rotuloLinha(x)}>
                <div className="cron-nome" style={{ paddingLeft: 10 + x.nivel * 14 }}><b>{x.codigo}</b> {x.titulo}</div>
                <div className="cron-trilha">
                  {xHoje !== null && <div className="cron-hoje" style={{ left: `${xHoje}%` }} />}
                  <div className={`cron-barra ${COR_SITUACAO[a.situacao]}`} style={{ left: `${pos.esquerda}%`, width: `${pos.largura}%` }}
                    title={`${formatarDiaMes(x.inicio)} → ${formatarDiaMes(x.fim)} · real ${a.real}% · previsto ${a.previsto}%`}>
                    <div className="cron-feito" style={{ width: `${a.real}%` }} />
                    {a.previsto > 0 && a.previsto < 100 && <div className="cron-prev" style={{ left: `${a.previsto}%` }} />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <div className="hint cron-legenda">
        Barra = período da atividade · parte cheia = o que já foi feito · traço branco = onde devia estar até ontem · linha turquesa = hoje.
        Toque numa atividade para lançar o avanço.
      </div>

      {/* Celular: a lista. */}
      <div className="list cron-lista">
        {eap.map((x) => {
          const a = and.linhas[x.id]
          return (
            <button key={x.id} className="item" onClick={() => abrir(x)} style={{ paddingLeft: 20 + x.nivel * 12 }}>
              <div className="item-top">
                <div>
                  <h3><span className="t-info">{x.codigo}</span> {x.titulo}</h3>
                  <div className="meta">{formatarDiaMes(x.inicio)} → {formatarDiaMes(x.fim)} · {diasUteisTxt(diasUteis(x.inicio, x.fim, calendario))}</div>
                </div>
                <Pill cor={COR_SITUACAO[a.situacao]}>{a.situacao}</Pill>
              </div>
              <Avanco real={a.real} previsto={a.previsto} />
              <div className="meta">Real {a.real}% · previsto {a.previsto}%</div>
            </button>
          )
        })}
      </div>
      {gavetas}
    </>
  )
}
