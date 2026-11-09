// COMPARATIVO ENTRE OBRAS — a única tela que mostra várias obras juntas.
// Tocar num cartão escolhe a obra e abre o RDO de hoje dela.
import { useState } from 'react'
import { listarResumoObras, salvarObra, apagarObra, posso, textosDasObras } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { useObra } from '../lib/ObraContext.jsx'
import { ordenarResumo, separarPorSituacao } from '../lib/obras.js'
import { SITUACOES_OBRA, TIPOS_OBRA } from '../lib/listas.js'
import { hojeISO, formatarDataLonga, formatarData } from '../lib/datas.js'
import { Cabecalho, Carregando, ErroCarga, Gaveta, Icon, Pill, Stats, Vazio, useToast } from '../components/index.jsx'

const COR_RDO = { 'Não iniciado': 'idle', 'Em andamento': 'warn', 'Fechado': 'ok' }

function CartaoObra({ r, atual, abrir, editar }) {
  const { obra } = r
  const alerta = r.rdo_ontem_nao_fechado
  const linhas = []
  if (r.frentes_paradas) linhas.push(['bad', `${r.frentes_paradas} ${r.frentes_paradas === 1 ? 'frente parada' : 'frentes paradas'}`])
  if (r.rdo_ontem_nao_fechado) linhas.push(['bad', 'RDO de ontem não fechado'])
  if (r.equipamentos_quebrados) linhas.push(['warn', `${r.equipamentos_quebrados} ${r.equipamentos_quebrados === 1 ? 'equipamento quebrado' : 'equipamentos quebrados'}`])
  return (
    <div className={`item${alerta ? ' alert' : ''}${atual ? ' current' : ''}`} style={{ padding: 0 }}>
      <button className="item" style={{ background: 'transparent' }} onClick={() => abrir(obra.id)}>
        <div className="item-top">
          <div>
            <h3>{obra.nome}</h3>
            <div className="meta">{obra.codigo} · {obra.tipo} · {obra.cidade}</div>
            {obra.cliente && <div className="meta">Cliente: {obra.cliente}</div>}
          </div>
          {obra.situacao === 'Concluída' ? <Pill cor="ok">Concluída</Pill> : <Pill cor={COR_RDO[r.rdo_hoje]}>RDO: {r.rdo_hoje}</Pill>}
        </div>
        {obra.situacao !== 'Concluída' && (
          <div className="lines">
            {linhas.length
              ? linhas.map(([c, t]) => <div key={t} className={`line t-${c}`}><span className={`dot ${c}`} />{t}</div>)
              : <div className="line t-ok"><span className="dot ok" />Tudo em dia</div>}
          </div>
        )}
      </button>
      <div style={{ padding: '0 18px 14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span className="t-muted" style={{ fontSize: 14 }}>
          {atual ? 'Obra atual' : obra.data_meta_entrega ? `Entrega: ${formatarData(obra.data_meta_entrega)}` : ''}
        </span>
        {posso('obra.editar') && <button className="link t-info" style={{ fontSize: 15, fontWeight: 700, minHeight: 44 }} onClick={() => editar(obra)}>Editar obra</button>}
      </div>
    </div>
  )
}

const VAZIA = { nome: '', codigo: '', tipo: 'Alto padrão', endereco: '', cidade: '', cliente: '', numero_contrato: '', data_inicio: '', data_meta_entrega: '', situacao: 'Em andamento' }

function FormObra({ inicial, fechar, salvo, apagada }) {
  const [o, setO] = useState({ ...VAZIA, ...inicial })
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmarApagar, setConfirmarApagar] = useState(false)

  async function apagar() {
    setSalvando(true)
    const { erro: falhou } = await apagarObra(inicial.id)
    setSalvando(false)
    setConfirmarApagar(false)
    if (falhou) return setErro(falhou)
    apagada()
  }
  const campo = (k) => ({ value: o[k] ?? '', onChange: (e) => setO({ ...o, [k]: e.target.value }) })

  async function salvar() {
    setSalvando(true)
    const { data, erro: falhou } = await salvarObra({ ...o, numero_contrato: o.numero_contrato || null, data_meta_entrega: o.data_meta_entrega || null })
    setSalvando(false)
    if (falhou) return setErro(falhou)
    salvo(data, !inicial?.id)
  }

  return (
    <>
      <div className="eyebrow">{inicial?.id ? 'Editar obra' : 'Nova obra'}</div>
      <h2>{inicial?.id ? inicial.nome : 'Cadastrar obra'}</h2>
      <label className="label" htmlFor="o-nome">Nome da obra</label>
      <input id="o-nome" className="field" placeholder="Ex.: Casa Lagoa 12" {...campo('nome')} />
      <div className="form-2">
        <div>
          <label className="label" htmlFor="o-cod">Código / apelido</label>
          <input id="o-cod" className="field" placeholder="LAGOA12" {...campo('codigo')} />
        </div>
        <div>
          <label className="label" htmlFor="o-tipo">Tipo</label>
          <select id="o-tipo" className="field" {...campo('tipo')}>{TIPOS_OBRA.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
      </div>
      <label className="label" htmlFor="o-end">Endereço</label>
      <input id="o-end" className="field" placeholder="Rua, número, bairro" {...campo('endereco')} />
      <label className="label" htmlFor="o-cid">Cidade</label>
      <input id="o-cid" className="field" {...campo('cidade')} />
      <label className="label" htmlFor="o-cli">Cliente</label>
      <input id="o-cli" className="field" placeholder="Nome do cliente ou prefeitura" {...campo('cliente')} />
      <label className="label" htmlFor="o-ct">Nº do contrato (opcional)</label>
      <input id="o-ct" className="field" {...campo('numero_contrato')} />
      <div className="form-2">
        <div>
          <label className="label" htmlFor="o-ini">Início</label>
          <input id="o-ini" className="field" type="date" {...campo('data_inicio')} />
        </div>
        <div>
          <label className="label" htmlFor="o-meta">Meta de entrega</label>
          <input id="o-meta" className="field" type="date" {...campo('data_meta_entrega')} />
        </div>
      </div>
      <div className="label">Situação</div>
      <div className="seg three">
        {SITUACOES_OBRA.map((s) => (
          <button key={s} type="button" className={o.situacao === s ? { 'Em andamento': 'ok', 'Parada': 'warn', 'Concluída': 'info' }[s] : ''}
            onClick={() => setO({ ...o, situacao: s })}>{s}</button>
        ))}
      </div>
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
      {inicial?.id && posso('obra.apagar') && (confirmarApagar
        ? (
          <div className="note" style={{ marginTop: 24 }}>
            <b>Apagar a obra {inicial.nome}?</b> Isto não se desfaz. Só funciona se a obra não tiver nada lançado.
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmarApagar(false)} disabled={salvando}>Não apagar</button>
              <button className="btn btn-danger" onClick={apagar} disabled={salvando}>{salvando ? 'Apagando…' : 'Apagar de vez'}</button>
            </div>
          </div>
        )
        : <button className="link t-bad" style={{ marginTop: 24, fontSize: 15, fontWeight: 700, minHeight: 44 }}
          onClick={() => { setErro(null); setConfirmarApagar(true) }}>Apagar obra</button>)}
    </>
  )
}

export default function Obras({ abrirObra }) {
  const { obraId, recarregarObras } = useObra()
  const toast = useToast()
  const { data, erro, carregando, recarregar } = useDados(listarResumoObras)
  const [aba, setAba] = useState('Ativas')
  const [verParadas, setVerParadas] = useState(false)
  const [form, setForm] = useState(null) // null | {} (nova) | obra (editar)

  async function aoSalvar(obra, nova) {
    setForm(null)
    toast(nova ? 'Obra cadastrada' : 'Obra atualizada')
    await recarregarObras(nova ? obra.id : undefined)
    recarregar()
  }

  async function aoApagar() {
    setForm(null)
    toast('Obra apagada')
    // Se era a obra atual, ela some da lista e o contexto escolhe outra (escolherObraInicial).
    await recarregarObras()
    recarregar()
  }

  const cabecalho = (
    <Cabecalho eyebrow={formatarDataLonga(hojeISO())} titulo="Obras" sub={textosDasObras().comparativo}
      acao={posso('obra.criar') && <button className="btn btn-ghost" onClick={() => setForm({})}>+ Nova obra</button>} />
  )
  const gaveta = (
    <Gaveta aberta={form !== null} fechar={() => setForm(null)} rotulo="Cadastro de obra">
      {form !== null && <FormObra inicial={form} fechar={() => setForm(null)} salvo={aoSalvar} apagada={aoApagar} />}
    </Gaveta>
  )

  if (carregando) return <>{cabecalho}<Carregando /></>
  if (erro) return <>{cabecalho}<ErroCarga erro={erro} tentar={recarregar} /></>
  if (!data.length) {
    return <>{cabecalho}{posso('obra.criar')
      ? <Vazio icone="obras" titulo="Nenhuma obra cadastrada" texto="Toque em + Nova obra para começar."
        acao={<button className="btn btn-primary" onClick={() => setForm({})}>+ Cadastrar a primeira obra</button>} />
      : <Vazio icone="obras" titulo="Nenhuma obra liberada para você" texto="Peça ao Engenheiro administrador para liberar as suas obras." />}{gaveta}</>
  }

  const { andamento, paradas, concluidas } = separarPorSituacao(ordenarResumo(data))
  const lista = aba === 'Ativas' ? andamento : concluidas
  const cartao = (r) => <CartaoObra key={r.obra.id} r={r} atual={r.obra.id === obraId} abrir={abrirObra} editar={setForm} />

  return (
    <>
      {cabecalho}
      <Stats itens={[
        { valor: andamento.filter((r) => r.rdo_hoje === 'Não iniciado').length, rotulo: 'diários de hoje não iniciados', cor: 'accent' },
        { valor: andamento.reduce((s, r) => s + r.frentes_paradas, 0), rotulo: 'frentes paradas', cor: 'bad' },
        { valor: andamento.filter((r) => r.rdo_ontem_nao_fechado).length, rotulo: 'RDOs de ontem não fechados', cor: 'warn' },
      ]} />
      <div className="tabs">
        {['Ativas', 'Concluídas'].map((a) => <button key={a} className={`tab${aba === a ? ' on' : ''}`} onClick={() => setAba(a)}>{a}</button>)}
      </div>
      <div className="sec">
        <h2>{aba === 'Ativas' ? 'Diário de hoje' : 'Obras concluídas'}</h2>
        <span className="t-muted" style={{ fontSize: 15 }}>{lista.length} {lista.length === 1 ? 'obra' : 'obras'}</span>
      </div>
      {lista.length
        ? <div className="list two">{lista.map(cartao)}</div>
        : <Vazio pequeno icone="obras" titulo={aba === 'Ativas' ? 'Nenhuma obra em andamento' : 'Nenhuma obra concluída'} />}
      {aba === 'Ativas' && paradas.length > 0 && (
        <>
          <button className="collapsed" onClick={() => setVerParadas(!verParadas)}>
            <span>Paradas ({paradas.length})</span><Icon nome={verParadas ? 'down' : 'chev'} />
          </button>
          {verParadas && <div className="list two" style={{ marginTop: 12 }}>{paradas.map(cartao)}</div>}
        </>
      )}
      {gaveta}
    </>
  )
}
