// Materiais — quadro de pedidos e estoque da obra atual (aba dentro da obra).
// Cada cartão é um lote ("50 sacos de cimento") que anda pelas colunas por botões, sem arrastar.
// O estoque (sub-aba Estoque) recebe o lote que chega no almoxarifado e dá baixa no que é entregue.
// Tudo otimista: o cartão (ou o saldo) muda na hora e volta ao que era se o banco recusar.
import { useState } from 'react'
import { listarQuadroMateriais, salvarPedido, moverPedido, apagarPedido, registrarBaixa, desfazerBaixa, salvarMinimo, posso } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import {
  proximoStatus, statusAnterior, diasNaColuna, leadTime, estaAtrasado, recebidoComProblema, foiRecebido, contadores, montarQuadro,
  validarNovoPedido, validarMovimento, aplicarMovimento, novoPedido, pedeFormulario, filtrarQuantidade, quantidadeComUnidade, lerQuantidade,
} from '../lib/materiais.js'
import { ajustarLinha, contarCriticos, efeitoNoEstoque, lerMinimo } from '../lib/estoque.js'
import { PRIORIDADES_PEDIDO, CATEGORIAS_MATERIAL, STATUS_PEDIDO } from '../lib/listas.js'
import { hojeISO, formatarData } from '../lib/datas.js'
import { Carregando, ErroCampo, ErroCarga, Gaveta, Icon, Pill, Stats, Vazio, useToast, encolherFoto } from '../components/index.jsx'
import { VistaEstoque, FormBaixa, HistoricoInsumo } from './estoque.jsx'

const TITULO = {
  'Solicitar': 'Solicitar', 'Em cotação': 'Em cotação', 'Comprado': 'Comprado / a caminho',
  'No almoxarifado': 'No almoxarifado', 'Entregue': 'Entregue na frente',
}
// O botão de cada cartão diz o que acontece com o pedido.
const ACAO = { 'Em cotação': 'Mandar cotar', 'Comprado': 'Marcar comprado', 'No almoxarifado': 'Receber', 'Entregue': 'Entregar na frente' }
const COR_CATEGORIA = { 'Material grosso': 'info', 'Acabamento': 'ok', 'Instalações': 'ok' }

const dias = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`

function SimNao({ id, valor, mudar }) {
  return (
    <div className="seg two" role="group" aria-labelledby={id}>
      <button className={valor === true ? 'ok' : ''} onClick={() => mudar(true)}>Sim</button>
      <button className={valor === false ? 'bad' : ''} onClick={() => mudar(false)}>Não</button>
    </div>
  )
}

// ---------- novo pedido: material, quantidade, frente e prioridade. Só isso. ----------
function FormNovoPedido({ catalogo, frentes, fechar, salvar }) {
  const [f, setF] = useState({ material_id: '', quantidade: '', frente: '', prioridade: 'Normal' })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const erros = validarNovoPedido(f)
  const mostrar = (campo) => (tentou || tocados[campo]) && erros[campo]
  const tocar = (campo) => setTocados((t) => ({ ...t, [campo]: true }))
  const unidade = catalogo.find((m) => m.id === f.material_id)?.unidade

  function enviar() {
    setTentou(true)
    if (Object.keys(erros).length) return
    salvar(f)
  }

  return (
    <>
      <div className="eyebrow">Novo pedido</div>
      <h2>Pedir material</h2>
      <label className="label" htmlFor="np-material">Material</label>
      <select id="np-material" className="field" value={f.material_id}
        onChange={(e) => { setF({ ...f, material_id: e.target.value }); tocar('material_id') }} onBlur={() => tocar('material_id')}>
        <option value="">Escolha…</option>
        {CATEGORIAS_MATERIAL.map((c) => (
          <optgroup key={c} label={c}>
            {catalogo.filter((m) => m.categoria === c).map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.unidade})</option>)}
          </optgroup>
        ))}
      </select>
      <ErroCampo erro={mostrar('material_id')} />
      <label className="label" htmlFor="np-qtd">Quantidade{unidade ? ` (${unidade})` : ''}</label>
      <input id="np-qtd" className="field" inputMode="decimal" autoComplete="off" placeholder="Ex.: 50"
        value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: filtrarQuantidade(e.target.value) })} onBlur={() => tocar('quantidade')} />
      <ErroCampo erro={mostrar('quantidade')} />
      <label className="label" htmlFor="np-frente">Frente</label>
      <input id="np-frente" className="field" list="np-frentes" placeholder="Ex.: Banheiro suíte"
        value={f.frente} onChange={(e) => setF({ ...f, frente: e.target.value })} onBlur={() => tocar('frente')} />
      <datalist id="np-frentes">{frentes.map((x) => <option key={x} value={x} />)}</datalist>
      <ErroCampo erro={mostrar('frente')} />
      <div className="label">Prioridade</div>
      <div className="seg two">
        {PRIORIDADES_PEDIDO.map((x) => (
          <button key={x} className={f.prioridade === x ? (x === 'Crítico' ? 'bad' : 'info') : ''} onClick={() => setF({ ...f, prioridade: x })}>{x}</button>
        ))}
      </div>
      <div className="hint">O pedido entra na coluna Solicitar.</div>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={enviar}>Criar pedido</button>
      </div>
    </>
  )
}

// ---------- o que cada coluna pede antes de o pedido entrar nela ----------
function FormMover({ pedido, novo, frentes, hoje, fechar, confirmar }) {
  // A previsão sempre nasce com hoje: uma previsão antiga (de antes de o pedido voltar) já venceu.
  const [form, setForm] = useState({
    fornecedor: pedido.fornecedor ?? '', previsao_entrega: hoje,
    qtd_bate_nf: null, qtd_recebida: '', estado_ok: null, avarias: '', foto_nf: '', frente: pedido.frente,
  })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const [erroFoto, setErroFoto] = useState(null)
  const erros = validarMovimento(pedido, novo, form, hoje)
  const mostrar = (campo) => (tentou || tocados[campo]) && erros[campo]
  const tocar = (campo) => setTocados((t) => ({ ...t, [campo]: true }))
  const mudar = (campo, valor) => { setForm((atual) => ({ ...atual, [campo]: valor })); tocar(campo) }
  const nome = `${pedido.material.nome} · ${quantidadeComUnidade(pedido.quantidade, pedido.material.unidade)}`

  async function anexarNF(e) {
    const arquivo = e.target.files[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      const foto_nf = await encolherFoto(arquivo)
      setForm((atual) => ({ ...atual, foto_nf }))
      setErroFoto(null)
    } catch (_) {
      setErroFoto('Não foi possível ler essa foto. Tente outra.')
    }
  }

  function enviar() {
    setTentou(true)
    if (Object.keys(erros).length) return
    confirmar(form)
  }

  return (
    <>
      <div className="eyebrow">{ACAO[novo]}</div>
      <h2>{nome}</h2>
      <div className="sub">Frente: {pedido.frente}</div>

      {novo === 'Comprado' && (
        <>
          <label className="label" htmlFor="mv-forn">Fornecedor</label>
          <input id="mv-forn" className="field" placeholder="Ex.: Depósito Boa Vista" value={form.fornecedor}
            onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} onBlur={() => tocar('fornecedor')} />
          <ErroCampo erro={mostrar('fornecedor')} />
          <label className="label" htmlFor="mv-prev">Previsão de entrega</label>
          <input id="mv-prev" type="date" className="field" min={hoje} value={form.previsao_entrega} onChange={(e) => mudar('previsao_entrega', e.target.value)} />
          <ErroCampo erro={mostrar('previsao_entrega')} />
        </>
      )}

      {novo === 'No almoxarifado' && (
        <>
          <div className="label" id="mv-nf">A quantidade bate com a nota fiscal?</div>
          <SimNao id="mv-nf" valor={form.qtd_bate_nf} mudar={(v) => mudar('qtd_bate_nf', v)} />
          <ErroCampo erro={mostrar('qtd_bate_nf')} />
          {form.qtd_bate_nf === false && (
            <>
              <label className="label" htmlFor="mv-qtd">Quanto chegou de fato ({pedido.material.unidade})</label>
              <input id="mv-qtd" className="field" inputMode="decimal" autoComplete="off" placeholder={`Pedido: ${quantidadeComUnidade(pedido.quantidade, pedido.material.unidade)}`}
                value={form.qtd_recebida} onChange={(e) => setForm({ ...form, qtd_recebida: filtrarQuantidade(e.target.value) })} onBlur={() => tocar('qtd_recebida')} />
              <ErroCampo erro={mostrar('qtd_recebida')} />
              <div className="hint">É essa quantidade que entra no estoque.</div>
            </>
          )}
          <div className="label" id="mv-estado">O material chegou em perfeito estado?</div>
          <SimNao id="mv-estado" valor={form.estado_ok} mudar={(v) => mudar('estado_ok', v)} />
          <ErroCampo erro={mostrar('estado_ok')} />
          <label className="label" htmlFor="mv-avarias">Avarias (opcional)</label>
          <textarea id="mv-avarias" className="field" style={{ minHeight: 76 }} placeholder="Ex.: 3 sacos rasgados"
            value={form.avarias} onChange={(e) => setForm({ ...form, avarias: e.target.value })} />
          {posso('pedidos.ver_nota_fiscal') && <>
          <div className="label">Foto da nota fiscal (opcional)</div>
          <div className="photo-row">
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              <Icon nome="camera" />Tirar foto
              <input type="file" accept="image/*" capture="environment" hidden onChange={anexarNF} />
            </label>
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              <Icon nome="galeria" />Da galeria
              <input type="file" accept="image/*" hidden onChange={anexarNF} />
            </label>
          </div>
          {form.foto_nf && (
            <div className="thumbs">
              <div className="thumb"><img src={form.foto_nf} alt="Foto da nota fiscal" /><button aria-label="Tirar a foto da nota" onClick={() => setForm({ ...form, foto_nf: '' })}>×</button></div>
            </div>
          )}
          <ErroCampo erro={erroFoto} />
          </>}
          {(form.qtd_bate_nf === false || form.estado_ok === false) && <div className="banner warn">O pedido vai ficar marcado com alerta de recebimento.</div>}
        </>
      )}

      {novo === 'Entregue' && (
        <>
          <label className="label" htmlFor="mv-frente">Confirme a frente de aplicação</label>
          <input id="mv-frente" className="field" list="mv-frentes" value={form.frente}
            onChange={(e) => setForm({ ...form, frente: e.target.value })} onBlur={() => tocar('frente')} />
          <datalist id="mv-frentes">{frentes.map((f) => <option key={f} value={f} />)}</datalist>
          <ErroCampo erro={mostrar('frente')} />
          <div className="hint">O pedido sai do quadro. Para ver depois, toque em Ver entregues.</div>
        </>
      )}

      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={enviar}>Confirmar</button>
      </div>
    </>
  )
}

// ---------- detalhes: histórico, recebimento, voltar coluna e excluir ----------
function Detalhes({ pedido, hoje, fechar, voltar, excluir }) {
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const anterior = statusAnterior(pedido.status)
  const lead = leadTime(pedido)
  const resposta = (v) => (v ? <span className="t-ok">Sim</span> : <span className="t-bad">Não</span>)
  return (
    <>
      <div className="eyebrow">{TITULO[pedido.status]}</div>
      <h2>{pedido.material.nome}</h2>
      <div className="sub">{quantidadeComUnidade(pedido.quantidade, pedido.material.unidade)} · {pedido.frente} · {pedido.prioridade}</div>
      <div className="lines" style={{ marginTop: 16 }}>
        {pedido.fornecedor && <div className="line"><span className="dot idle" />Fornecedor: {pedido.fornecedor}</div>}
        {pedido.previsao_entrega && <div className={`line${estaAtrasado(pedido, hoje) ? ' t-bad' : ''}`}><span className="dot idle" />Previsão de entrega: {formatarData(pedido.previsao_entrega)}</div>}
        {lead !== null && <div className="line"><span className="dot info" />Lead time: {dias(lead)} do pedido ao almoxarifado</div>}
      </div>
      {foiRecebido(pedido) && (
        <>
          <div className="label">Recebimento</div>
          <div className="linha-dia"><span>Quantidade bate com a NF</span>{resposta(pedido.qtd_bate_nf)}</div>
          {pedido.qtd_recebida != null && <div className="linha-dia"><span>Chegou (entrou no estoque)</span><b>{quantidadeComUnidade(pedido.qtd_recebida, pedido.material.unidade)}</b></div>}
          <div className="linha-dia"><span>Material em perfeito estado</span>{resposta(pedido.estado_ok)}</div>
          {pedido.avarias && <div className="linha-dia"><span>Avarias: {pedido.avarias}</span></div>}
          {pedido.foto_nf && <div className="fotos-dia"><figure><img src={pedido.foto_nf} alt="Foto da nota fiscal" /><figcaption>Nota fiscal</figcaption></figure></div>}
        </>
      )}
      <div className="label">Histórico</div>
      {pedido.historico.map((h, i) => (
        <div className="linha-dia" key={`${h.status}-${i}`}><span>{TITULO[h.status]}</span><span className="t-muted">{formatarData(h.data)}</span></div>
      ))}
      {confirmarExclusao
        ? (
          <>
            <div className="banner bad">Excluir este pedido? Ele some do quadro e do banco, sem volta.</div>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmarExclusao(false)}>Não</button>
              <button className="btn btn-danger" onClick={excluir}>Sim, excluir</button>
            </div>
          </>
        )
        : (
          <div className="sheet-actions">
            <button className="btn btn-danger" onClick={() => setConfirmarExclusao(true)}>Excluir</button>
            {anterior
              ? <button className="btn btn-ghost" onClick={voltar}>Voltar para {TITULO[anterior]}</button>
              : <button className="btn btn-ghost" onClick={fechar}>Fechar</button>}
          </div>
        )}
    </>
  )
}

function Cartao({ p, hoje, pausa, avancar, abrir }) {
  const atrasado = estaAtrasado(p, hoje)
  const problema = recebidoComProblema(p)
  const proximo = proximoStatus(p.status)
  const lead = leadTime(p)
  const espera = Boolean(p.gravando) // enquanto o banco não responde, o cartão não aceita outro toque
  return (
    <div className={`item kcard${atrasado ? ' alert' : ''}`}>
      <div className="item-top">
        <h3>{p.material.nome}</h3>
        <button className="kcard-mais" disabled={espera} onClick={() => abrir(p)} aria-label={`Detalhes de ${p.material.nome}`}>
          Detalhes<Icon nome="chev" />
        </button>
      </div>
      <div className="meta"><b>{quantidadeComUnidade(p.quantidade, p.material.unidade)}</b> · {p.frente}</div>
      <div className="row-wrap" style={{ marginTop: 10, gap: 6 }}>
        {atrasado && <Pill cor="bad">Atrasado</Pill>}
        {p.prioridade === 'Crítico' && <Pill cor="bad">Crítico</Pill>}
        {p.material.categoria && <Pill cor={COR_CATEGORIA[p.material.categoria]}>{p.material.categoria}</Pill>}
        {problema && <Pill cor="warn">Recebido com problema</Pill>}
      </div>
      {(p.fornecedor || p.previsao_entrega) && (
        <div className="meta">
          {p.fornecedor}{p.fornecedor && p.previsao_entrega ? ' · ' : ''}
          {p.previsao_entrega && <span className={atrasado ? 't-bad' : ''}>previsão {formatarData(p.previsao_entrega)}</span>}
        </div>
      )}
      <div className="meta">{espera ? 'Gravando…' : `Há ${dias(diasNaColuna(p, hoje))} nesta coluna`}</div>
      {lead !== null && <div className="meta">Lead time: {dias(lead)}</div>}
      {proximo && (
        <button className="btn btn-ghost btn-full kcard-avancar" disabled={espera || pausa} onClick={() => avancar(p, proximo)}>
          {ACAO[proximo]} <Icon nome="arrow" />
        </button>
      )}
    </div>
  )
}

export default function Materiais() {
  const toast = useToast()
  const quadro = useDados(listarQuadroMateriais)
  const [pedidos, setPedidos] = useState(null) // cópias locais, para o otimista
  const [estoque, setEstoque] = useState(null)
  // {tipo:'novo'} | {tipo:'mover', pedido, novo} | {tipo:'detalhes', pedido} | {tipo:'baixa'} | {tipo:'insumo', id}
  const [gaveta, setGaveta] = useState(null)
  const [vista, setVista] = useState('Pedidos')
  const [verEntregues, setVerEntregues] = useState(false)
  // Ao mover, o cartão sai da coluna na hora e o de baixo sobe para o mesmo lugar: sem esta
  // pausa, o segundo toque de um toque duplo avançaria o pedido de baixo.
  const [pausa, setPausa] = useState(false)
  const hoje = hojeISO()

  // "Tentar de novo" da tela de erro: busca tudo de novo.
  async function recarregar() {
    await quadro.recarregar()
    setPedidos(null)
    setEstoque(null)
  }

  // Busca de novo sem sair da tela: depois de uma gravação recusada, e depois de um pedido
  // que mexeu no estoque. Se nem isso der (internet caiu), fica como está.
  async function atualizarQuieto() {
    const { data } = await listarQuadroMateriais()
    if (!data) return
    setPedidos(data.pedidos)
    setEstoque(data.estoque)
  }

  if (quadro.carregando) return <Carregando />
  if (quadro.erro) return <ErroCarga erro={quadro.erro} tentar={recarregar} />

  const lista = pedidos ?? quadro.data.pedidos
  const insumos = estoque ?? quadro.data.estoque
  const { catalogo, frentes } = quadro.data
  const mudarLista = (fn) => setPedidos((atual) => fn(atual ?? quadro.data.pedidos))
  const trocar = (id, novo) => mudarLista((l) => l.map((p) => (p.id === id ? novo : p)))
  const mudarInsumo = (id, fn) => setEstoque((atual) => (atual ?? quadro.data.estoque).map((l) => (l.id === id ? fn(l) : l)))
  // A gaveta guarda só o id: o histórico mostra o saldo e o mínimo de agora, não os de quando abriu.
  const insumoAberto = gaveta?.tipo === 'insumo' ? insumos.find((l) => l.id === gaveta.id) : null

  async function criar(f) {
    const material = catalogo.find((m) => m.id === f.material_id)
    const temp = {
      ...novoPedido(f, hoje), id: `tmp-${Date.now()}`, gravando: true,
      material: { nome: material.nome, unidade: material.unidade, categoria: material.categoria },
    }
    setGaveta(null)
    mudarLista((l) => [...l, temp])
    const { data, erro } = await salvarPedido(f)
    if (erro) {
      mudarLista((l) => l.filter((p) => p.id !== temp.id))
      return toast(`Pedido não foi salvo: ${erro}`, 'bad')
    }
    trocar(temp.id, data)
    toast('Pedido criado em Solicitar')
  }

  async function mover(p, novo, extras = {}) {
    setGaveta(null)
    setPausa(true)
    setTimeout(() => setPausa(false), 700)
    trocar(p.id, { ...p, ...aplicarMovimento(p, novo, extras, hoje), gravando: true })
    const { data, erro } = await moverPedido(p.id, novo, extras)
    if (erro) {
      trocar(p.id, p)
      toast(`Não mudou de coluna: ${erro}`, 'bad')
      return atualizarQuieto()
    }
    trocar(p.id, data)
    toast(novo === 'Entregue' && !verEntregues ? `Entregue em ${data.frente}. Veja em Ver entregues.` : `${p.material.nome}: ${TITULO[novo]}`)
    if (efeitoNoEstoque(p, data)) atualizarQuieto()
  }

  async function darBaixa(f) {
    const n = lerQuantidade(f.quantidade)
    setGaveta(null)
    mudarInsumo(f.insumo_id, (l) => ajustarLinha(l, -n))
    const { erro } = await registrarBaixa(f)
    if (erro) {
      mudarInsumo(f.insumo_id, (l) => ajustarLinha(l, n))
      toast(`Baixa não registrada: ${erro}`, 'bad')
      return atualizarQuieto()
    }
    toast('Baixa registrada')
  }

  async function mudarMinimo(id, texto) {
    const antes = insumos.find((l) => l.id === id)
    mudarInsumo(id, (l) => ajustarLinha({ ...l, saldo_minimo: lerMinimo(texto) }, 0))
    const { erro } = await salvarMinimo(id, texto)
    if (erro) {
      mudarInsumo(id, () => antes)
      return toast(`Mínimo não salvo: ${erro}`, 'bad')
    }
    toast('Mínimo salvo')
  }

  async function desfazerUmaBaixa(m) {
    mudarInsumo(m.insumo_id, (l) => ajustarLinha(l, m.quantidade))
    const { erro } = await desfazerBaixa(m.id)
    if (erro) {
      mudarInsumo(m.insumo_id, (l) => ajustarLinha(l, -m.quantidade))
      return toast(`Baixa não desfeita: ${erro}`, 'bad')
    }
    toast('Baixa desfeita')
  }

  function avancar(p, novo) {
    if (pausa) return
    if (pedeFormulario(novo)) setGaveta({ tipo: 'mover', pedido: p, novo })
    else mover(p, novo)
  }

  async function excluir(p) {
    setGaveta(null)
    mudarLista((l) => l.filter((x) => x.id !== p.id))
    const { erro } = await apagarPedido(p.id)
    if (erro) {
      toast(`Não foi excluído: ${erro}`, 'bad')
      return atualizarQuieto()
    }
    toast('Pedido excluído')
  }

  const gavetas = (
    <>
      <Gaveta aberta={gaveta?.tipo === 'novo'} fechar={() => setGaveta(null)} rotulo="Novo pedido">
        {gaveta?.tipo === 'novo' && <FormNovoPedido catalogo={catalogo} frentes={frentes} fechar={() => setGaveta(null)} salvar={criar} />}
      </Gaveta>
      <Gaveta aberta={gaveta?.tipo === 'mover'} fechar={() => setGaveta(null)} rotulo="Mudar de coluna">
        {gaveta?.tipo === 'mover' && <FormMover pedido={gaveta.pedido} novo={gaveta.novo} frentes={frentes} hoje={hoje} fechar={() => setGaveta(null)}
          confirmar={(extras) => mover(gaveta.pedido, gaveta.novo, extras)} />}
      </Gaveta>
      <Gaveta aberta={gaveta?.tipo === 'detalhes'} fechar={() => setGaveta(null)} rotulo="Detalhes do pedido">
        {gaveta?.tipo === 'detalhes' && <Detalhes pedido={gaveta.pedido} hoje={hoje} fechar={() => setGaveta(null)}
          voltar={() => mover(gaveta.pedido, statusAnterior(gaveta.pedido.status))} excluir={() => excluir(gaveta.pedido)} />}
      </Gaveta>
      <Gaveta aberta={gaveta?.tipo === 'baixa'} fechar={() => setGaveta(null)} rotulo="Baixa de estoque">
        {gaveta?.tipo === 'baixa' && <FormBaixa linhas={insumos} frentes={frentes} hoje={hoje} fechar={() => setGaveta(null)} salvar={darBaixa} />}
      </Gaveta>
      <Gaveta aberta={gaveta?.tipo === 'insumo'} fechar={() => setGaveta(null)} rotulo="Histórico do insumo">
        {gaveta?.tipo === 'insumo' && insumoAberto && <HistoricoInsumo key={insumoAberto.id} linha={insumoAberto} fechar={() => setGaveta(null)} salvarMinimo={mudarMinimo} desfazerBaixa={desfazerUmaBaixa} />}
      </Gaveta>
    </>
  )

  const colunas = montarQuadro(lista, hoje)
  const n = contadores(lista, hoje)
  const criticos = contarCriticos(insumos)
  const visiveis = STATUS_PEDIDO.filter((s) => s !== 'Entregue' || verEntregues)
  const baixa = <button className="link" disabled={!insumos.some((l) => l.saldo > 0)} onClick={() => setGaveta({ tipo: 'baixa' })}>Baixa de estoque</button>

  return (
    <>
      <div style={{ marginTop: 16 }}>
        <Stats itens={[
          { valor: n.em_cotacao, rotulo: 'em cotação', cor: 'accent' },
          { valor: n.chegando_semana, rotulo: 'chegando esta semana', cor: 'ok' },
          { valor: n.atrasados, rotulo: n.atrasados === 1 ? 'atrasado' : 'atrasados', cor: n.atrasados ? 'bad' : '' },
          { valor: criticos, rotulo: criticos === 1 ? 'insumo crítico' : 'insumos críticos', cor: criticos ? 'bad' : '' },
        ]} />
      </div>
      <div className="tabs" role="tablist">
        {['Pedidos', 'Estoque'].map((v) => (
          <button key={v} role="tab" aria-selected={vista === v} className={`tab${vista === v ? ' on' : ''}`} onClick={() => setVista(v)}>{v}</button>
        ))}
      </div>

      {vista === 'Estoque' && (
        <>
          <div className="sec"><h2>Estoque</h2>{baixa}</div>
          <VistaEstoque linhas={insumos} abrir={(id) => setGaveta({ tipo: 'insumo', id })} />
        </>
      )}

      {vista === 'Pedidos' && (lista.length
        ? (
          <>
            <div className="sec">
              <h2>Pedidos</h2>
              <div className="sec-acoes">{baixa}<button className="link" onClick={() => setGaveta({ tipo: 'novo' })}>+ Novo pedido</button></div>
            </div>
            <div className="tabs" style={{ marginTop: 0, marginBottom: 12 }}>
              <button className={`tab${verEntregues ? ' on' : ''}`} onClick={() => setVerEntregues(!verEntregues)} aria-pressed={verEntregues}>
                Ver entregues ({colunas.Entregue.length})
              </button>
            </div>
            <div className="kanban">
              {visiveis.map((s) => (
                <section className="kcol" key={s} aria-label={TITULO[s]}>
                  <div className="kcol-h">{TITULO[s]}<span>{colunas[s].length}</span></div>
                  {colunas[s].length
                    ? colunas[s].map((p) => <Cartao key={p.id} p={p} hoje={hoje} pausa={pausa} avancar={avancar} abrir={(x) => setGaveta({ tipo: 'detalhes', pedido: x })} />)
                    : <div className="kcol-vazia">Nenhum pedido aqui</div>}
                </section>
              ))}
            </div>
          </>
        )
        : (
          <div style={{ marginTop: 16 }}>
            <Vazio icone="frente" titulo="Nenhum pedido de material nesta obra"
              texto="Faça o primeiro: escolha o material, a quantidade e a frente. Leva menos de 30 segundos."
              acao={<button className="btn btn-primary" onClick={() => setGaveta({ tipo: 'novo' })}>+ Fazer o primeiro pedido</button>} />
          </div>
        ))}
      {gavetas}
    </>
  )
}
