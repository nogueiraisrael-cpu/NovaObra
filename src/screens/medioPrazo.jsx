// Médio prazo (lookahead) — as próximas 3 a 6 semanas, uma coluna por semana, com as
// restrições (impedimentos) que precisam sair do caminho antes de cada atividade começar.
// Mover de semana é por botões (sem arrastar); a restrição vencida fica na semana atual, em vermelho.
import { useState } from 'react'
import { salvarRestricao, moverRestricao, resolverRestricao, apagarRestricao } from '../lib/dados.js'
import { montarEap, rotuloDaSemana, segundaDaSemana } from '../lib/planejamento.js'
import { montarLookahead, podeMover, validarRestricao, responsaveis, contarRestricoes, detalharRestricao, novoPrazo } from '../lib/restricoes.js'
import { comRestricao, comPrazo, comResolvida, semRestricao } from '../lib/planejamentoLocal.js'
import { TIPOS_RESTRICAO } from '../lib/listas.js'
import { hojeISO, formatarData, formatarDiaMes } from '../lib/datas.js'
import { ErroCampo, Gaveta, Icon, Pill, Stats, TIPO_RESTRICAO, TipoRestricao, Vazio } from '../components/index.jsx'


// ---------- criar e editar ----------
function FormRestricao({ eap, restricao, todas, hoje, fechar, salvar }) {
  const [f, setF] = useState(restricao
    ? { id: restricao.id, atividade_id: restricao.atividade_id, descricao: restricao.descricao, tipo: restricao.tipo, prazo: restricao.prazo, responsavel: restricao.responsavel }
    : { atividade_id: '', descricao: '', tipo: '', prazo: hoje, responsavel: '' })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const erros = validarRestricao(f, hoje)
  const mostrar = (campo) => (tentou || tocados[campo]) && erros[campo]
  const tocar = (campo) => setTocados((t) => ({ ...t, [campo]: true }))

  function enviar() {
    setTentou(true)
    if (Object.keys(erros).length) return
    salvar(f)
  }

  return (
    <>
      <div className="eyebrow">{restricao ? 'Editar restrição' : 'Nova restrição'}</div>
      <h2>O que impede a atividade?</h2>
      <label className="label" htmlFor="rs-at">Atividade</label>
      <select id="rs-at" className="field" value={f.atividade_id}
        onChange={(e) => { setF({ ...f, atividade_id: e.target.value }); tocar('atividade_id') }} onBlur={() => tocar('atividade_id')}>
        <option value="">Escolha…</option>
        {eap.map((x) => <option key={x.id} value={x.id}>{'  '.repeat(x.nivel)}{x.codigo} {x.titulo}</option>)}
      </select>
      <ErroCampo erro={mostrar('atividade_id')} />
      <label className="label" htmlFor="rs-desc">Restrição</label>
      <textarea id="rs-desc" className="field" style={{ minHeight: 76 }} placeholder="Ex.: Porcelanato dos banheiros não chegou" value={f.descricao}
        onChange={(e) => setF({ ...f, descricao: e.target.value })} onBlur={() => tocar('descricao')} />
      <ErroCampo erro={mostrar('descricao')} />
      <div className="label" id="rs-tipo">Tipo</div>
      <div className="tipos" role="group" aria-labelledby="rs-tipo">
        {TIPOS_RESTRICAO.map((t) => (
          <button key={t} className={`tipo-opcao tipo-${TIPO_RESTRICAO[t].classe}${f.tipo === t ? ' on' : ''}`} aria-pressed={f.tipo === t}
            onClick={() => { setF({ ...f, tipo: t }); tocar('tipo') }}>
            <Icon nome={TIPO_RESTRICAO[t].icone} />{t}
          </button>
        ))}
      </div>
      <ErroCampo erro={mostrar('tipo')} />
      <div className="form-2">
        <div>
          <label className="label" htmlFor="rs-prazo">Resolver até</label>
          <input id="rs-prazo" type="date" className="field" min={restricao ? undefined : hoje} value={f.prazo}
            onChange={(e) => { setF({ ...f, prazo: e.target.value }); tocar('prazo') }} />
          <ErroCampo erro={mostrar('prazo')} />
        </div>
        <div>
          <label className="label" htmlFor="rs-resp">Responsável</label>
          <input id="rs-resp" className="field" list="rs-resps" placeholder="Ex.: Eng. Israel" value={f.responsavel}
            onChange={(e) => setF({ ...f, responsavel: e.target.value })} onBlur={() => tocar('responsavel')} />
          <datalist id="rs-resps">{responsaveis(todas).map((r) => <option key={r} value={r} />)}</datalist>
          <ErroCampo erro={mostrar('responsavel')} />
        </div>
      </div>
      <div className="hint">A restrição entra na coluna da semana do prazo.</div>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={enviar}>{restricao ? 'Salvar' : 'Criar restrição'}</button>
      </div>
    </>
  )
}

// ---------- detalhes: editar e excluir ----------
function Detalhes({ item, ocupado, editar, excluir, fechar }) {
  const [confirmar, setConfirmar] = useState(false)
  return (
    <>
      <div className="eyebrow">{item.atividade.codigo} {item.atividade.titulo}</div>
      <h2>{item.descricao}</h2>
      <div className="row-wrap" style={{ marginTop: 10 }}>
        <TipoRestricao tipo={item.tipo} />
        {item.vencida && <Pill cor="bad">Vencida</Pill>}
        {item.resolvida && <Pill cor="ok">Resolvida em {formatarDiaMes(item.resolvida_em)}</Pill>}
      </div>
      <div className="lines" style={{ marginTop: 14 }}>
        <div className="line"><span className="dot idle" />Responsável: {item.responsavel}</div>
        <div className={`line${item.vencida ? ' t-bad' : ''}`}><span className="dot idle" />Resolver até {formatarData(item.prazo)}</div>
      </div>
      {confirmar
        ? (
          <>
            <div className="banner bad">Excluir esta restrição? Use só para a lançada por engano: ela some do quadro e do banco, sem volta. Se ela foi resolvida, toque em Resolver em vez disso.</div>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmar(false)}>Não</button>
              <button className="btn btn-danger" disabled={ocupado} onClick={excluir}>Sim, excluir</button>
            </div>
          </>
        )
        : (
          <div className="sheet-actions">
            <button className="btn btn-danger" disabled={ocupado} onClick={() => setConfirmar(true)}>Excluir</button>
            <button className="btn btn-ghost" disabled={ocupado} onClick={editar}>Editar</button>
          </div>
        )}
      <button className="btn btn-ghost btn-full" style={{ marginTop: 10 }} onClick={fechar}>Fechar</button>
    </>
  )
}

function Cartao({ item, hoje, ocupado, mover, resolver, abrir }) {
  return (
    <div className={`item kcard${item.vencida ? ' alert' : ''}${item.resolvida ? ' resolvida' : ''}`}>
      <div className="item-top">
        <TipoRestricao tipo={item.tipo} />
        <button className="kcard-mais" disabled={ocupado} onClick={() => abrir(item)} aria-label={`Detalhes de ${item.descricao}`}>
          Detalhes<Icon nome="chev" />
        </button>
      </div>
      <h3 style={{ marginTop: 8 }}>{item.descricao}</h3>
      <div className="meta"><span className="t-info">{item.atividade.codigo}</span> {item.atividade.titulo}</div>
      <div className="meta">{item.responsavel} · <span className={item.vencida ? 't-bad' : ''}>até {formatarDiaMes(item.prazo)}</span></div>
      <div className="row-wrap" style={{ marginTop: 8, gap: 6 }}>
        {item.vencida && <Pill cor="bad">Vencida</Pill>}
        {item.resolvida && <Pill cor="ok">Resolvida</Pill>}
      </div>
      {item.resolvida
        ? <button className="btn btn-ghost btn-full kcard-avancar" disabled={ocupado} onClick={() => resolver(item, false)}>Reabrir</button>
        : (
          <div className="rs-acoes">
            <button className="btn btn-ghost" disabled={ocupado || !podeMover(item, -1, hoje)} onClick={() => mover(item, -1)} aria-label="Semana anterior">←</button>
            <button className="btn btn-ghost" disabled={ocupado} onClick={() => resolver(item, true)}><Icon nome="check" />Resolver</button>
            <button className="btn btn-ghost" disabled={ocupado} onClick={() => mover(item, 1)} aria-label="Próxima semana">→</button>
          </div>
        )}
    </div>
  )
}

export default function MedioPrazo({ lista, restricoes, gravar, ocupado, irParaEap }) {
  const [semanas, setSemanas] = useState(4)
  const [responsavel, setResponsavel] = useState('')
  const [verResolvidas, setVerResolvidas] = useState(false)
  const [gaveta, setGaveta] = useState(null) // {tipo:'nova'} | {tipo:'editar', id} | {tipo:'detalhes', id}
  const hoje = hojeISO()
  const eap = montarEap(lista)
  const quadro = montarLookahead(restricoes, eap, hoje, { semanas, responsavel, verResolvidas })
  const n = contarRestricoes(restricoes, eap, hoje)
  // A gaveta guarda só o id: mostra a restrição como está agora, não como estava ao abrir.
  const aberta = gaveta?.id ? detalharRestricao(restricoes, eap, gaveta.id, hoje) : null

  function salvar(f) {
    setGaveta(null)
    gravar(() => salvarRestricao(f), { mudar: (d) => comRestricao(d, f), sucesso: f.id ? 'Restrição salva' : 'Restrição criada', falhou: 'Não foi salva' })
  }
  const mover = (r, direcao) => gravar(() => moverRestricao(r.id, direcao), {
    mudar: (d) => comPrazo(d, r.id, novoPrazo(r.prazo, direcao, hoje)),
    sucesso: direcao > 0 ? 'Foi para a semana seguinte' : 'Voltou uma semana', falhou: 'Não mudou de semana',
  })
  const resolver = (r, sim) => gravar(() => resolverRestricao(r.id, sim), {
    mudar: (d) => comResolvida(d, r.id, sim, hoje), sucesso: sim ? 'Restrição resolvida' : 'Restrição reaberta', falhou: 'Não mudou',
  })
  function excluir(id) {
    setGaveta(null)
    gravar(() => apagarRestricao(id), { mudar: (d) => semRestricao(d, id), sucesso: 'Restrição excluída', falhou: 'Não foi excluída' })
  }

  const gavetas = (
    <>
      <Gaveta aberta={gaveta?.tipo === 'nova' || (gaveta?.tipo === 'editar' && Boolean(aberta))} fechar={() => setGaveta(null)} rotulo="Restrição">
        {(gaveta?.tipo === 'nova' || (gaveta?.tipo === 'editar' && aberta)) && (
          <FormRestricao eap={eap} restricao={gaveta.tipo === 'editar' ? aberta : null} todas={restricoes} hoje={hoje}
            fechar={() => setGaveta(null)} salvar={salvar} />
        )}
      </Gaveta>
      <Gaveta aberta={gaveta?.tipo === 'detalhes' && Boolean(aberta)} fechar={() => setGaveta(null)} rotulo="Detalhes da restrição">
        {gaveta?.tipo === 'detalhes' && aberta && (
          <Detalhes key={aberta.id} item={aberta} ocupado={ocupado} fechar={() => setGaveta(null)}
            editar={() => setGaveta({ tipo: 'editar', id: aberta.id })}
            excluir={() => excluir(aberta.id)} />
        )}
      </Gaveta>
    </>
  )

  if (!eap.length) {
    return (
      <Vazio icone="relogio" titulo="Ainda não há atividades"
        texto="As restrições são presas às atividades da EAP. Monte a EAP primeiro."
        acao={<button className="btn btn-primary" onClick={irParaEap}>Ir para a EAP</button>} />
    )
  }

  if (!restricoes.length) {
    return (
      <>
        <Vazio icone="escudo" titulo="Nenhuma restrição nesta obra"
          texto="Olhe as atividades das próximas semanas e anote o que pode impedir cada uma: material, projeto, equipe, equipamento…"
          acao={<button className="btn btn-primary" onClick={() => setGaveta({ tipo: 'nova' })}>+ Anotar a primeira restrição</button>} />
        {gavetas}
      </>
    )
  }

  const nomes = responsaveis(restricoes)
  return (
    <>
      <Stats itens={[
        { valor: n.abertas, rotulo: n.abertas === 1 ? 'restrição aberta' : 'restrições abertas', cor: 'accent' },
        { valor: n.vencidas, rotulo: n.vencidas === 1 ? 'vencida' : 'vencidas', cor: n.vencidas ? 'bad' : '' },
        { valor: n.resolvidas, rotulo: n.resolvidas === 1 ? 'resolvida' : 'resolvidas', cor: 'ok' },
      ]} />
      <div className="rs-filtros">
        <label className="rs-filtro">
          <span>Semanas</span>
          <select className="field" value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>
            {[3, 4, 5, 6].map((s) => <option key={s} value={s}>{s} semanas</option>)}
          </select>
        </label>
        <label className="rs-filtro">
          <span>Responsável</span>
          <select className="field" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">Todos</option>
            {nomes.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <button className={`tab${verResolvidas ? ' on' : ''}`} aria-pressed={verResolvidas} onClick={() => setVerResolvidas(!verResolvidas)}>
          Mostrar resolvidas
        </button>
      </div>
      <div className="sec">
        <h2>Restrições por semana</h2>
        <button className="link" disabled={ocupado} onClick={() => setGaveta({ tipo: 'nova' })}>+ Restrição</button>
      </div>
      <div className="kanban">
        {quadro.colunas.map((c) => (
          <section className="kcol" key={c.inicio} aria-label={rotuloDaSemana(c.inicio, segundaDaSemana(hoje))}>
            <div className="kcol-h">
              <span className="rs-sem">{rotuloDaSemana(c.inicio, segundaDaSemana(hoje))}<small>{formatarDiaMes(c.inicio)} a {formatarDiaMes(c.fim)}</small></span>
              <span>{c.itens.length}</span>
            </div>
            {c.itens.length
              ? c.itens.map((x) => <Cartao key={x.id} item={x} hoje={hoje} ocupado={ocupado} mover={mover} resolver={resolver} abrir={(it) => setGaveta({ tipo: 'detalhes', id: it.id })} />)
              : <div className="kcol-vazia">Nenhuma restrição nesta semana</div>}
          </section>
        ))}
      </div>
      {quadro.depois > 0 && (
        <div className="hint">
          Mais {quadro.depois} {quadro.depois === 1 ? 'restrição' : 'restrições'} depois destas {semanas} semanas.
          {semanas < 6 && <> <button className="link" style={{ display: 'inline', minHeight: 0 }} onClick={() => setSemanas(6)}>Ver 6 semanas</button></>}
        </div>
      )}
      {gavetas}
    </>
  )
}
