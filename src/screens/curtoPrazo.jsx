// Curto prazo — a semana, no nível operacional: Kanban (A fazer · Em andamento · Concluído)
// com as atividades da semana, o checklist de subtarefas de cada uma e o PPC (quanto do
// planejado para a semana foi cumprido). Mover é por select, sem arrastar.
// Concluir uma atividade põe o avanço dela em 100% no Longo prazo.
import { useState } from 'react'
import { moverNaSemana, marcarNaoRealizada, criarSubtarefa, marcarSubtarefa, apagarSubtarefa } from '../lib/dados.js'
import { montarEap, segundaDaSemana } from '../lib/planejamento.js'
import { itensDaSemana, montarKanban, calcularPpc, historicoPpc, contarSubtarefas, rotuloDaSemana } from '../lib/curtoPrazo.js'
import { comStatusNaSemana, comNaoRealizada, novaSubtarefa, comSubtarefa, semSubtarefa } from '../lib/planejamentoLocal.js'
import { STATUS_SEMANA, CAUSAS_NAO_REALIZADO } from '../lib/listas.js'
import { hojeISO, somarDias, formatarDiaMes } from '../lib/datas.js'
import { ErroCampo, Gaveta, Icon, Pill, Vazio } from '../components/index.jsx'

// Escolher a causa raiz (obrigatória para "não realizada").
function EscolherCausa({ titulo, confirmar, cancelar }) {
  const [causa, setCausa] = useState('')
  const [tentou, setTentou] = useState(false)
  return (
    <div className="causa-box">
      <div className="label" style={{ marginTop: 0 }}>{titulo}</div>
      <div className="chips">
        {CAUSAS_NAO_REALIZADO.map((c) => (
          <button key={c} className={`chip${causa === c ? ' on' : ''}`} aria-pressed={causa === c} onClick={() => setCausa(c)}>{c}</button>
        ))}
      </div>
      <ErroCampo erro={tentou && !causa && 'Escolha a causa.'} />
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={cancelar}>Cancelar</button>
        <button className="btn btn-danger" onClick={() => { setTentou(true); if (causa) confirmar(causa) }}>Marcar não realizada</button>
      </div>
    </div>
  )
}

// ---------- detalhes de uma atividade da semana: coluna, não realizada e subtarefas ----------
function Detalhes({ item, subtarefas, ocupado, mover, naoRealizada, sub }) {
  const [causaDe, setCausaDe] = useState(null) // 'atividade' | id da subtarefa
  const [apagar, setApagar] = useState(null) // id da subtarefa
  const [nova, setNova] = useState('')
  const [tentouNova, setTentouNova] = useState(false)
  const a = item.atividade
  const n = contarSubtarefas(subtarefas)

  function adicionar() {
    setTentouNova(true)
    if (!nova.trim()) return
    sub.criar(nova)
    setNova('')
    setTentouNova(false)
  }

  return (
    <>
      <div className="eyebrow">{a.codigo} · {formatarDiaMes(a.inicio)} → {formatarDiaMes(a.fim)}</div>
      <h2>{a.titulo}</h2>
      <div className="row-wrap" style={{ marginTop: 8, gap: 6 }}>
        {item.acumulada && <Pill cor="warn">Acumulada</Pill>}
        {item.nao_realizada && <Pill cor="bad">Não realizada · {item.causa}</Pill>}
      </div>

      <div className="label">Coluna</div>
      <div className="seg three">
        {STATUS_SEMANA.map((s) => (
          <button key={s} className={item.status === s ? (s === 'Concluído' ? 'ok' : 'info') : ''} disabled={ocupado} onClick={() => item.status !== s && mover(s)}>{s}</button>
        ))}
      </div>
      {item.status !== 'Concluído' && (causaDe === 'atividade'
        ? <EscolherCausa titulo="Por que não foi realizada?" cancelar={() => setCausaDe(null)} confirmar={(c) => { setCausaDe(null); naoRealizada(c) }} />
        : item.nao_realizada
          ? <button className="btn btn-ghost btn-full" style={{ marginTop: 10 }} disabled={ocupado} onClick={() => naoRealizada(null)}>Desmarcar "não realizada"</button>
          : <button className="btn btn-danger btn-full" style={{ marginTop: 10 }} disabled={ocupado} onClick={() => setCausaDe('atividade')}>Marcar como não realizada</button>)}

      <div className="label">Subtarefas {n.total ? `(${n.feitas} de ${n.total} feitas)` : ''}</div>
      {subtarefas.length === 0 && <div className="hint">Nenhuma subtarefa. Quebre a atividade em passos para acompanhar.</div>}
      {subtarefas.map((s) => (
        <div className="subtarefa" key={s.id}>
          <div className="subtarefa-linha">
            <button className={`check-sub${s.feita ? ' on' : ''}`} role="checkbox" aria-checked={s.feita} aria-label={`${s.titulo}: feita`}
              disabled={ocupado} onClick={() => sub.marcar(s.id, { feita: !s.feita })}>
              {s.feita && <Icon nome="check" />}
            </button>
            <span className={`subtarefa-txt${s.feita ? ' feita' : ''}`}>
              {s.titulo}
              {s.nao_realizada && <small className="t-bad">Não realizada · {s.causa}</small>}
            </span>
            {s.nao_realizada
              ? <button className="sub-acao" disabled={ocupado} onClick={() => sub.marcar(s.id, { causa: null })}>Desmarcar</button>
              : !s.feita && <button className="sub-acao t-bad" disabled={ocupado} onClick={() => setCausaDe(s.id)}>Não feita</button>}
            <button className="sub-acao" disabled={ocupado} onClick={() => setApagar(s.id)} aria-label={`Excluir ${s.titulo}`}>×</button>
          </div>
          {causaDe === s.id && <EscolherCausa titulo="Por que não foi feita?" cancelar={() => setCausaDe(null)}
            confirmar={(c) => { setCausaDe(null); sub.marcar(s.id, { causa: c }) }} />}
          {apagar === s.id && (
            <div className="banner bad">
              Excluir a subtarefa "{s.titulo}"?
              <div className="sheet-actions" style={{ marginTop: 10 }}>
                <button className="btn btn-ghost" onClick={() => setApagar(null)}>Não</button>
                <button className="btn btn-danger" disabled={ocupado} onClick={() => { setApagar(null); sub.apagar(s.id) }}>Sim, excluir</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="minimo-linha" style={{ marginTop: 12 }}>
        <input className="field" aria-label="Nova subtarefa" placeholder="Ex.: Reboco da cozinha" value={nova}
          onChange={(e) => setNova(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} />
        <button className="btn btn-ghost" disabled={ocupado} onClick={adicionar}>Adicionar</button>
      </div>
      <ErroCampo erro={tentouNova && !nova.trim() && 'Escreva a subtarefa.'} />
    </>
  )
}

// O PPC das últimas semanas: uma barra por semana, o número em cima (sem semana planejada = "—").
function GraficoPpc({ historico, atual }) {
  return (
    <div className="ppc-hist" role="img" aria-label={`PPC das últimas semanas: ${historico.map((h) => `${formatarDiaMes(h.semana)} ${h.pct ?? 'sem plano'}${h.pct === null ? '' : '%'}`).join(', ')}`}>
      {historico.map((h) => (
        <div className={`ppc-col${h.semana === atual ? ' atual' : ''}`} key={h.semana}
          title={h.pct === null ? `${formatarDiaMes(h.semana)}: nada planejado` : `${formatarDiaMes(h.semana)}: ${h.pct}% (${h.concluidas} de ${h.total})`}>
          <span className="ppc-val">{h.pct === null ? '—' : `${h.pct}%`}</span>
          <div className="ppc-trilho"><div className="ppc-barra" style={{ height: `${h.pct ?? 0}%` }} /></div>
          <span className="ppc-sem">{formatarDiaMes(h.semana)}</span>
        </div>
      ))}
    </div>
  )
}

function Cartao({ item, subtarefas, ocupado, mover, abrir }) {
  const a = item.atividade
  const n = contarSubtarefas(subtarefas)
  return (
    <div className={`item kcard${item.nao_realizada ? ' alert' : ''}`}>
      <div className="item-top">
        <h3><span className="t-info">{a.codigo}</span> {a.titulo}</h3>
        <button className="kcard-mais" disabled={ocupado} onClick={abrir} aria-label={`Detalhes de ${a.titulo}`}>Detalhes<Icon nome="chev" /></button>
      </div>
      <div className="meta">{formatarDiaMes(a.inicio)} → {formatarDiaMes(a.fim)}{n.total ? ` · ${n.feitas}/${n.total} subtarefas` : ''}</div>
      <div className="row-wrap" style={{ marginTop: 8, gap: 6 }}>
        {item.acumulada && <Pill cor="warn">Acumulada</Pill>}
        {item.nao_realizada && <Pill cor="bad">Não realizada · {item.causa}</Pill>}
      </div>
      <select className="field kcard-mover" aria-label={`Mover ${a.titulo}`} value={item.status} disabled={ocupado} onChange={(e) => mover(e.target.value)}>
        {STATUS_SEMANA.map((s) => <option key={s} value={s}>{s === item.status ? `Em: ${s}` : `Mover para ${s}`}</option>)}
      </select>
    </div>
  )
}

export default function CurtoPrazo({ lista, semanas, subtarefas, gravar, ocupado, irParaEap }) {
  const hoje = hojeISO()
  const atual = segundaDaSemana(hoje)
  const [semana, setSemana] = useState(atual)
  const [aberta, setAberta] = useState(null) // id da atividade
  const eap = montarEap(lista)
  const itens = itensDaSemana(eap, semanas, semana)
  const kanban = montarKanban(itens)
  const ppc = calcularPpc(itens)
  const subsDe = (id) => subtarefas.filter((s) => s.atividade_id === id).sort((x, y) => x.ordem - y.ordem)
  const itemAberto = itens.find((x) => x.atividade.id === aberta)

  const mover = (id, status) => gravar(() => moverNaSemana(id, semana, status), {
    mudar: (d) => comStatusNaSemana(d, id, semana, status),
    sucesso: status === 'Concluído' ? 'Concluída: avanço em 100%' : `Movida para ${status}`, falhou: 'Não mudou de coluna',
  })
  const naoRealizada = (id, causa) => gravar(() => marcarNaoRealizada(id, semana, causa), {
    mudar: (d) => comNaoRealizada(d, id, semana, causa), sucesso: causa ? `Não realizada: ${causa}` : 'Desmarcada', falhou: 'Não mudou',
  })
  const sub = {
    criar: (titulo) => gravar(() => criarSubtarefa(aberta, titulo), { mudar: (d) => novaSubtarefa(d, aberta, titulo), falhou: 'Subtarefa não criada' }),
    marcar: (id, campos) => gravar(() => marcarSubtarefa(id, campos), { mudar: (d) => comSubtarefa(d, id, campos), falhou: 'Subtarefa não mudou' }),
    apagar: (id) => gravar(() => apagarSubtarefa(id), { mudar: (d) => semSubtarefa(d, id), sucesso: 'Subtarefa excluída', falhou: 'Subtarefa não excluída' }),
  }

  if (!eap.length) {
    return (
      <Vazio icone="relogio" titulo="Ainda não há atividades"
        texto="O Kanban da semana sai das atividades da EAP. Monte a EAP primeiro."
        acao={<button className="btn btn-primary" onClick={irParaEap}>Ir para a EAP</button>} />
    )
  }

  return (
    <>
      <div className="semana-nav">
        <button className="btn btn-ghost" onClick={() => setSemana(somarDias(semana, -7))} aria-label="Semana anterior">‹</button>
        <div className="semana-nome">
          <b>{rotuloDaSemana(semana, atual)}</b>
          <span>{formatarDiaMes(semana)} a {formatarDiaMes(somarDias(semana, 6))}</span>
        </div>
        <button className="btn btn-ghost" onClick={() => setSemana(somarDias(semana, 7))} aria-label="Próxima semana">›</button>
      </div>
      {semana !== atual && <button className="link" style={{ marginTop: 6 }} onClick={() => setSemana(atual)}>Voltar para esta semana</button>}

      <div className="block ppc">
        <div className="ppc-topo">
          <div>
            <div className="period" style={{ margin: 0 }}>PPC da semana</div>
            <div className="ppc-num">{ppc.pct === null ? '—' : `${ppc.pct}%`}</div>
            <div className="meta">{ppc.total ? `${ppc.concluidas} de ${ppc.total} concluídas` : 'Nada planejado nesta semana'}</div>
          </div>
          <GraficoPpc historico={historicoPpc(eap, semanas, semana, 6)} atual={semana} />
        </div>
        <div className="avanco" aria-hidden="true"><div className="avanco-real" style={{ width: `${ppc.pct ?? 0}%` }} /></div>
        <div className="hint">PPC = atividades concluídas ÷ atividades planejadas para a semana. Mede se o plano está sendo cumprido.</div>
      </div>

      {itens.length
        ? (
          <div className="kanban kanban-tres" style={{ marginTop: 16 }}>
            {STATUS_SEMANA.map((s) => (
              <section className="kcol" key={s} aria-label={s}>
                <div className="kcol-h">{s}<span>{kanban[s].length}</span></div>
                {kanban[s].length
                  ? kanban[s].map((x) => (
                    <Cartao key={x.atividade.id} item={x} subtarefas={subsDe(x.atividade.id)} ocupado={ocupado}
                      mover={(novo) => mover(x.atividade.id, novo)} abrir={() => setAberta(x.atividade.id)} />
                  ))
                  : <div className="kcol-vazia">Nenhuma atividade aqui</div>}
              </section>
            ))}
          </div>
        )
        : (
          <div style={{ marginTop: 16 }}>
            <Vazio icone="relogio" pequeno titulo="Nenhuma atividade nesta semana"
              texto="Entram aqui as atividades da EAP cujo período passa por esta semana e as atrasadas que ainda não terminaram." />
          </div>
        )}

      <Gaveta aberta={Boolean(itemAberto)} fechar={() => setAberta(null)} rotulo="Atividade da semana">
        {itemAberto && (
          <>
            <Detalhes key={itemAberto.atividade.id} item={itemAberto} subtarefas={subsDe(itemAberto.atividade.id)} ocupado={ocupado}
              mover={(s) => mover(itemAberto.atividade.id, s)} naoRealizada={(c) => naoRealizada(itemAberto.atividade.id, c)} sub={sub} />
            <button className="btn btn-ghost btn-full" style={{ marginTop: 20 }} onClick={() => setAberta(null)}>Fechar</button>
          </>
        )}
      </Gaveta>
    </>
  )
}
