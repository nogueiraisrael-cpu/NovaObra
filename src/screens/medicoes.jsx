// Medições (v1.3) — aba dentro da obra, só do Engenheiro. A medição continua sendo feita na
// planilha: aqui se SOBE a planilha pronta e o app guarda o que leu. Duas sub-abas:
// Contrato (um Boletim de Medição por arquivo, aba BM) e Empreiteiros (um arquivo por
// empreiteiro, uma aba por medição). "Ver painel" abre o painel (painelMedicao.jsx).
//
// Tudo é lido no próprio aparelho; o SheetJS só carrega quando a pessoa escolhe um arquivo.
// Nada é gravado antes de "Confirmar importação": a conferência mostra o que foi lido, os
// avisos (amarelo, dá para gravar) e os erros (vermelho, corrigir antes).
import { useState } from 'react'
import { listarMedicoes, obterMedicao, importarMedicoes, trocarPlanilhaMedicao, excluirMedicao } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { lerBoletimContrato, lerPlanilhaEmpreiteiro, tipoDoArquivo } from '../lib/planilhaMedicao.js'
import {
  formatarReais, ordinal, proximoNumero, resumoDoBoletim, avisosDoContrato, validarMedicao,
  conferirAbas, errosDasAbas, medicaoDoContrato, medicaoDaAba, nomeDoEmpreiteiro, medicoesDoEmpreiteiro, somaDasAbas, medicaoAnterior,
} from '../lib/medicoes.js'
import { formatarData } from '../lib/datas.js'
import { Carregando, ErroCarga, ErroCampo, Gaveta, Icon, Pill, Vazio, useToast } from '../components/index.jsx'
import PainelMedicao from './painelMedicao.jsx'

const VISTAS = ['Contrato', 'Empreiteiros']
const carregarXlsx = () => import('xlsx')
const ACEITA = '.xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12'
const soDigitos = (s) => s.replace(/\D/g, '').slice(0, 4)

// Escolhe a planilha e lê no aparelho. `ler` = função de planilhaMedicao.js.
// Planilha fora do padrão é erro da planilha, já explicado: não suja o console.
async function lerArquivo(e, ler, toast) {
  const arquivo = e.target.files[0]
  e.target.value = '' // escolher o mesmo arquivo de novo também funciona
  if (!arquivo) return null
  const { erro } = tipoDoArquivo(arquivo)
  if (erro) { toast(erro, 'bad'); return null }
  try {
    return { nome: arquivo.name, lida: ler(await carregarXlsx(), new Uint8Array(await arquivo.arrayBuffer())) }
  } catch (falhou) {
    if (!falhou.daPlanilha) console.error('[medição]', falhou)
    toast(falhou.daPlanilha ? falhou.message : 'Não consegui ler este arquivo. Ele é mesmo uma planilha .xlsx ou .xlsm?', 'bad')
    return null
  }
}

function BotaoArquivo({ rotulo, lendo, desligado, aoEscolher, classe = 'btn btn-primary' }) {
  const off = lendo || desligado
  return (
    <label className={`${classe}${off ? ' desligado' : ''}`} style={{ cursor: off ? 'not-allowed' : 'pointer', justifyContent: 'center' }}>
      {lendo ? 'Lendo…' : rotulo}
      <input type="file" accept={ACEITA} hidden disabled={off} onChange={aoEscolher} />
    </label>
  )
}

function Avisos({ lista }) {
  if (!lista.length) return null
  return (
    <div className="banner warn">
      {lista.length === 1 ? 'Confira antes de gravar:' : `Confira antes de gravar (${lista.length}):`}
      <ul style={{ margin: '6px 0 0 18px', fontWeight: 500 }}>{lista.map((a) => <li key={a}>{a}</li>)}</ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contrato: conferência do boletim (nova medição ou "Trocar planilha")
// ---------------------------------------------------------------------------

function ConferenciaContrato({ arquivo, lida, existentes, anteriores, trocando, ocupado, cancelar, confirmar }) {
  const outras = existentes.filter((m) => m.id !== trocando?.id)
  const sugerido = proximoNumero(outras)
  // Nº "XXX" na planilha: o campo nasce em branco (com o próximo nº sugerido), para ninguém
  // gravar um número sem olhar. Trocando a planilha, fica o nº da medição trocada.
  const [campos, setCampos] = useState({
    numero: String(lida.cabecalho.numero ?? trocando?.numero ?? ''),
    data_medicao: lida.cabecalho.data ?? '',
    periodo_inicio: lida.cabecalho.periodo_inicio ?? '',
    periodo_fim: lida.cabecalho.periodo_fim ?? '',
  })
  const [tentou, setTentou] = useState(false)
  const mudar = (nome, valor) => setCampos({ ...campos, [nome]: valor })
  const r = resumoDoBoletim(lida)
  const avisos = avisosDoContrato(lida, campos, anteriores)
  const erros = validarMedicao(campos, outras.map((m) => m.numero))
  const temErro = Object.keys(erros).length > 0

  function enviar() {
    setTentou(true)
    if (temErro) return
    confirmar(medicaoDoContrato(lida, campos, arquivo, avisos))
  }

  return (
    <>
      <div className="eyebrow">{trocando ? `Trocar a planilha da ${ordinal(trocando.numero)} medição` : 'Conferir antes de importar'}</div>
      <h2 style={{ wordBreak: 'break-word' }}>{arquivo}</h2>
      <div className="hint">
        {r.etapas} {r.etapas === 1 ? 'etapa' : 'etapas'}, {r.servicos} {r.servicos === 1 ? 'serviço' : 'serviços'} · aba “{lida.aba}”
        {lida.cabecalho.contrato && ` · contrato ${lida.cabecalho.contrato}`}. Nada foi gravado ainda.
      </div>
      <div className="med-numeros">
        <div><span>Previsto</span><b>{formatarReais(r.previsto)}</b></div>
        <div><span>Adequado</span><b>{formatarReais(r.contratado)}</b></div>
        <div><span>Nesta medição</span><b className="t-info">{formatarReais(r.periodo)}</b></div>
        <div><span>Acumulado</span><b>{formatarReais(r.acumulado)}</b></div>
      </div>
      {!r.servicos && <div className="banner bad">Não achei nenhum serviço (linha com unidade) no boletim.</div>}

      <div className="form-2">
        <div>
          <label className="label" htmlFor="mc-numero">Nº da medição</label>
          <input id="mc-numero" className={`field${lida.cabecalho.numero === null ? ' med-conferir' : ''}`} inputMode="numeric" autoComplete="off"
            placeholder={`Sugestão: ${sugerido}`} value={campos.numero} onChange={(e) => mudar('numero', soDigitos(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="mc-data">Data</label>
          <input id="mc-data" type="date" className="field" value={campos.data_medicao} onChange={(e) => mudar('data_medicao', e.target.value)} />
        </div>
      </div>
      {lida.cabecalho.numero === null && (
        <div className="hint t-warn">{trocando ? 'A planilha não traz o nº: ficou o desta medição. Confira.' : `A planilha não traz o nº. Digite o nº desta medição (o próximo seria o ${sugerido}).`}</div>
      )}
      <ErroCampo erro={tentou && (erros.numero ?? erros.data)} />
      <div className="form-2">
        <div>
          <label className="label" htmlFor="mc-ini">Período: de</label>
          <input id="mc-ini" type="date" className="field" value={campos.periodo_inicio} onChange={(e) => mudar('periodo_inicio', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="mc-fim">até</label>
          <input id="mc-fim" type="date" className="field" value={campos.periodo_fim} onChange={(e) => mudar('periodo_fim', e.target.value)} />
        </div>
      </div>
      <ErroCampo erro={erros.periodo} />
      <Avisos lista={avisos} />
      {trocando && <div className="hint">As linhas da {ordinal(trocando.numero)} medição serão trocadas pelas desta planilha.</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" disabled={ocupado} onClick={cancelar}>Cancelar</button>
        <button className="btn btn-primary" disabled={ocupado || !r.servicos} onClick={enviar}>{ocupado ? 'Gravando…' : 'Confirmar importação'}</button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Empreiteiro: escolher o empreiteiro, o arquivo e as abas
// ---------------------------------------------------------------------------

function LinhaAba({ a, marcada, erro, mostrarErro, alternar, mudar }) {
  return (
    <div className={`imp-linha${mostrarErro && erro ? ' erro' : ''}`} style={{ '--nivel': 0 }}>
      <div className="imp-topo">
        <button className={`check-sub${marcada ? ' on' : ''}`} disabled={a.jaNoApp} onClick={alternar}
          aria-pressed={marcada} aria-label={`Importar a aba ${a.aba}`}>{marcada && <Icon nome="check" />}</button>
        <span className="imp-txt">
          <b>{a.aba.trim() || 'Aba sem nome'}</b>
          <span>
            {a.numero ? `Nº ${a.numero}` : 'sem nº'} · {a.data ? formatarData(a.data) : 'sem data'} · {a.itens.length} {a.itens.length === 1 ? 'item' : 'itens'} · {formatarReais(a.valor_periodo)}
            {a.desconto ? ` · desconto ${formatarReais(a.desconto)}` : ''}
          </span>
        </span>
        {a.jaNoApp && <Pill cor="ok">Já no app</Pill>}
      </div>
      {marcada && (
        <div className="imp-edicao">
          <label className="imp-campo">
            <span>Nº</span>
            <input className="field" inputMode="numeric" autoComplete="off" value={a.numero ?? ''} onChange={(e) => mudar({ numero: soDigitos(e.target.value) || null })} />
          </label>
          <label className="imp-campo" style={{ gridColumn: 'auto' }}>
            <span>Data</span>
            <input className="field" type="date" value={a.data ?? ''} onChange={(e) => mudar({ data: e.target.value || null })} />
          </label>
        </div>
      )}
      {mostrarErro && erro && <div className="err">{erro}</div>}
      {marcada && a.avisos.map((t) => <div className="hint t-warn" key={t}>{t}</div>)}
    </div>
  )
}

function SubirEmpreiteiro({ empreiteiros, medicoes, inicial, ocupado, cancelar, confirmar }) {
  const toast = useToast()
  const [nome, setNome] = useState(inicial ?? '')
  const [digitar, setDigitar] = useState(!empreiteiros.length)
  const [lendo, setLendo] = useState(false)
  const [lido, setLido] = useState(null) // { nome, abas }
  const [marcadas, setMarcadas] = useState([]) // nomes das abas marcadas
  const [tentou, setTentou] = useState(false)

  const empreiteiro = nomeDoEmpreiteiro(nome, empreiteiros)
  const existentes = medicoesDoEmpreiteiro(medicoes, empreiteiro)

  async function escolher(e) {
    if (!empreiteiro) {
      e.target.value = ''
      return toast('Escolha ou digite o empreiteiro primeiro.', 'bad')
    }
    setLendo(true)
    const r = await lerArquivo(e, lerPlanilhaEmpreiteiro, toast)
    setLendo(false)
    if (!r) return
    const abas = conferirAbas(r.lida, existentes)
    setLido({ nome: r.nome, abas })
    setMarcadas(abas.filter((a) => !a.jaNoApp).map((a) => a.aba))
    setTentou(false)
  }

  const escolhidas = lido ? lido.abas.filter((a) => marcadas.includes(a.aba)) : []
  const erros = errosDasAbas(escolhidas, existentes)
  const erroDe = (a) => erros[escolhidas.indexOf(a)] ?? null
  const mudarAba = (aba, campos) => setLido({ ...lido, abas: lido.abas.map((a) => (a.aba === aba ? { ...a, ...campos } : a)) })
  const alternar = (aba) => setMarcadas(marcadas.includes(aba) ? marcadas.filter((x) => x !== aba) : [...marcadas, aba])
  const { total, descontos } = somaDasAbas(escolhidas)

  function enviar() {
    setTentou(true)
    if (!escolhidas.length || erros.some(Boolean)) return
    confirmar(escolhidas.map((a) => medicaoDaAba(a, empreiteiro, lido.nome)))
  }

  return (
    <>
      <div className="eyebrow">Subir planilha de empreiteiro</div>
      <h2>{lido ? lido.nome : 'De qual empreiteiro?'}</h2>
      {!lido && (
        <>
          {empreiteiros.length > 0 && (
            <div className="chips" style={{ marginTop: 12 }}>
              {empreiteiros.map((n) => (
                <button key={n} className={`chip${!digitar && n === empreiteiro ? ' on' : ''}`} onClick={() => { setNome(n); setDigitar(false) }}>{n}</button>
              ))}
              <button className={`chip${digitar ? ' on' : ''}`} onClick={() => { setNome(''); setDigitar(true) }}>Outro</button>
            </div>
          )}
          {digitar && (
            <>
              <label className="label" htmlFor="me-nome">Nome do empreiteiro</label>
              <input id="me-nome" className="field" autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Reboco Forte" />
            </>
          )}
          <div className="hint">Escolha a planilha inteira do empreiteiro (.xlsx): o app mostra as abas e marca as que ainda não estão aqui.</div>
          <div style={{ marginTop: 16, display: 'grid' }}>
            <BotaoArquivo rotulo="Escolher planilha" lendo={lendo} desligado={!empreiteiro} aoEscolher={escolher} />
          </div>
          {!empreiteiro && <div className="hint">Escolha ou digite o empreiteiro primeiro.</div>}
          <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={cancelar}>Cancelar</button>
        </>
      )}
      {lido && (
        <>
          <div className="hint">
            {empreiteiro} · {lido.abas.length} {lido.abas.length === 1 ? 'aba de medição' : 'abas de medição'}. Nada foi gravado ainda.
          </div>
          <div className="row-wrap" style={{ marginTop: 10, gap: 6 }}>
            <Pill cor="info">{escolhidas.length} {escolhidas.length === 1 ? 'medição nova' : 'medições novas'}</Pill>
            <Pill cor="idle">{formatarReais(total)}</Pill>
            <Pill cor="idle">descontos {formatarReais(descontos)}</Pill>
          </div>
          <div className="imp-lista">
            {lido.abas.map((a) => (
              <LinhaAba key={a.aba} a={a} marcada={marcadas.includes(a.aba)} erro={erroDe(a)} mostrarErro={tentou || Boolean(erroDe(a) && a.numero !== null)}
                alternar={() => alternar(a.aba)} mudar={(campos) => mudarAba(a.aba, campos)} />
            ))}
          </div>
          {tentou && !escolhidas.length && <div className="err">Marque pelo menos uma aba para importar.</div>}
          {tentou && erros.some(Boolean) && <div className="err">Corrija as abas em vermelho para importar.</div>}
          <div className="sheet-actions">
            <button className="btn btn-ghost" disabled={ocupado} onClick={cancelar}>Cancelar</button>
            <button className="btn btn-primary" disabled={ocupado} onClick={enviar}>{ocupado ? 'Gravando…' : 'Confirmar importação'}</button>
          </div>
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Uma medição: os dados dela, Trocar planilha (contrato) e Excluir
// ---------------------------------------------------------------------------

function DetalheMedicao({ medicao, ocupado, trocar, excluir, fechar }) {
  const toast = useToast()
  const detalhe = useDados(() => obterMedicao(medicao.id), [medicao.id])
  const [confirmar, setConfirmar] = useState(false)
  const [lendo, setLendo] = useState(false)
  const m = medicao

  async function escolher(e) {
    setLendo(true)
    const r = await lerArquivo(e, lerBoletimContrato, toast)
    setLendo(false)
    if (r) trocar(m, r)
  }

  const linha = (rotulo, valor) => valor ? <div className="linha-dia"><span className="t-muted">{rotulo}</span><b style={{ textAlign: 'right' }}>{valor}</b></div> : null
  return (
    <>
      <div className="eyebrow">{m.tipo === 'Contrato' ? 'Medição do contrato' : m.empreiteiro}</div>
      <h2>{ordinal(m.numero)} medição</h2>
      <div style={{ marginTop: 12 }}>
        {linha('Data', formatarData(m.data_medicao))}
        {linha('Período', m.periodo_inicio && `${formatarData(m.periodo_inicio)} a ${formatarData(m.periodo_fim)}`)}
        {linha(m.tipo === 'Contrato' ? 'Medido no período' : 'Total no período', formatarReais(m.valor_periodo))}
        {m.desconto > 0 && linha('Desconto', formatarReais(m.desconto))}
        {m.valor_a_pagar != null && linha('Valor a pagar', formatarReais(m.valor_a_pagar))}
        {linha('Observação', m.observacao)}
        {linha('Linhas lidas', detalhe.carregando ? '…' : detalhe.data ? String(detalhe.data.itens.length) : '—')}
        {linha('Arquivo', `${m.arquivo_nome} · aba “${m.aba_origem.trim()}”`)}
      </div>
      {detalhe.erro && <ErroCarga erro={detalhe.erro} tentar={detalhe.recarregar} />}
      {m.avisos?.length > 0 && (
        <div className="banner warn">
          Avisos aceitos ao importar:
          <ul style={{ margin: '6px 0 0 18px', fontWeight: 500 }}>{m.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}
      <div className="hint">“Baixar planilha original” chega junto com o armazenamento de arquivos: por enquanto o app guarda só o que leu. Guarde a planilha no seu computador.</div>

      {confirmar ? (
        <div className="banner bad">
          Excluir a {ordinal(m.numero)} medição{m.tipo === 'Empreiteiro' ? ` de ${m.empreiteiro}` : ''}? As linhas dela saem do app. A planilha continua com você.
          <div className="sheet-actions" style={{ marginTop: 10 }}>
            <button className="btn btn-ghost" disabled={ocupado} onClick={() => setConfirmar(false)}>Não</button>
            <button className="btn btn-danger" disabled={ocupado} onClick={() => excluir(m)}>{ocupado ? 'Excluindo…' : 'Sim, excluir'}</button>
          </div>
        </div>
      ) : (
        <div className="med-acoes">
          {m.tipo === 'Contrato' && <BotaoArquivo rotulo="Trocar planilha" lendo={lendo} desligado={ocupado} aoEscolher={escolher} classe="btn btn-ghost" />}
          <button className="btn btn-ghost t-bad" disabled={ocupado} onClick={() => setConfirmar(true)}>Excluir</button>
        </div>
      )}
      {m.tipo === 'Empreiteiro' && !confirmar && <div className="hint">Planilha errada? Exclua esta medição e suba o arquivo do empreiteiro de novo: só as abas que faltam são importadas.</div>}
      <button className="btn btn-ghost btn-full" style={{ marginTop: 12 }} onClick={fechar}>Fechar</button>
    </>
  )
}

// ---------------------------------------------------------------------------
// As listas
// ---------------------------------------------------------------------------

function CartaoMedicao({ m, comEmpreiteiro, abrir }) {
  return (
    <button className="item" onClick={() => abrir(m)}>
      <div className="item-top">
        <div>
          <h3>{ordinal(m.numero)} medição{comEmpreiteiro ? ` · ${m.empreiteiro}` : ''}</h3>
          <div className="meta">
            {m.periodo_inicio ? `${formatarData(m.periodo_inicio)} a ${formatarData(m.periodo_fim)} · ` : ''}data {formatarData(m.data_medicao)}
          </div>
        </div>
        <Icon nome="chev" />
      </div>
      <div className="row-wrap" style={{ marginTop: 10, gap: 6 }}>
        <span className="med-valor">{formatarReais(m.valor_periodo)}</span>
        {m.avisos?.length > 0 && <Pill cor="warn">{m.avisos.length} {m.avisos.length === 1 ? 'aviso' : 'avisos'}</Pill>}
      </div>
    </button>
  )
}

export default function Medicoes() {
  const toast = useToast()
  const lista = useDados(listarMedicoes)
  const [vista, setVista] = useState('Contrato')
  const [filtro, setFiltro] = useState('Todos')
  const [lendo, setLendo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [aberta, setAberta] = useState(null) // a medição tocada
  const [conferindo, setConferindo] = useState(null) // { arquivo, lida, anteriores, trocando }
  const [subindo, setSubindo] = useState(false)
  const [painel, setPainel] = useState(null) // { tipo, empreiteiro, escolhidos }: o painel aberto

  // Os serviços da medição anterior (medicaoAnterior decide qual): a conferência avisa o que
  // sumiu ou mudou de descrição. Se não der para ler, confere sem isso.
  async function anterioresA(trocando) {
    const anterior = medicaoAnterior(lista.data.contrato, trocando)
    if (!anterior) return []
    const { data } = await obterMedicao(anterior.id)
    return data?.itens ?? []
  }

  async function subirContrato(e) {
    setLendo(true)
    const r = await lerArquivo(e, lerBoletimContrato, toast)
    if (r) setConferindo({ arquivo: r.nome, lida: r.lida, anteriores: await anterioresA(null), trocando: null })
    setLendo(false)
  }

  async function trocar(m, r) {
    setAberta(null)
    setConferindo({ arquivo: r.nome, lida: r.lida, anteriores: await anterioresA(m), trocando: m })
  }

  async function gravar(acao, sucesso, fechar) {
    setOcupado(true)
    const { erro } = await acao()
    setOcupado(false)
    if (erro) return toast(`Não foi gravado: ${erro}`, 'bad')
    fechar()
    await lista.recarregar()
    toast(sucesso)
  }

  // Depois de subir, o painel abre sozinho: o contrato já nesta medição; o empreiteiro, inteiro.
  const confirmarContrato = (pacote) => (conferindo.trocando
    ? gravar(() => trocarPlanilhaMedicao(conferindo.trocando.id, pacote), `Planilha da ${ordinal(pacote.campos.numero)} medição trocada`, () => setConferindo(null))
    : gravar(() => importarMedicoes([pacote]), `${ordinal(pacote.campos.numero)} medição importada`, () => {
      setConferindo(null)
      setPainel({ tipo: 'Contrato', escolhidos: [pacote.campos.numero] })
    }))

  const confirmarEmpreiteiro = (pacotes) => gravar(() => importarMedicoes(pacotes),
    `${pacotes.length} ${pacotes.length === 1 ? 'medição importada' : 'medições importadas'} de ${pacotes[0].campos.empreiteiro}`,
    () => {
      setSubindo(false)
      setFiltro(pacotes[0].campos.empreiteiro)
      setPainel({ tipo: 'Empreiteiro', empreiteiro: pacotes[0].campos.empreiteiro })
    })

  const excluir = (m) => gravar(() => excluirMedicao(m.id), `${ordinal(m.numero)} medição excluída`, () => setAberta(null))

  if (painel) return <PainelMedicao alvo={painel} voltar={() => setPainel(null)} />

  let corpo
  if (lista.carregando) corpo = <Carregando />
  else if (lista.erro) corpo = <ErroCarga erro={lista.erro} tentar={lista.recarregar} />
  else if (vista === 'Contrato') {
    const meds = lista.data.contrato
    corpo = (
      <>
        <div className="med-topo-lista">
          <BotaoArquivo rotulo="+ Subir medição" lendo={lendo} desligado={ocupado} aoEscolher={subirContrato} />
          {meds.length > 0 && <button className="btn btn-ghost" onClick={() => setPainel({ tipo: 'Contrato' })}>Ver painel</button>}
        </div>
        {meds.length
          ? <div className="list">{[...meds].reverse().map((m) => <CartaoMedicao key={m.id} m={m} abrir={setAberta} />)}</div>
          : <Vazio icone="prancheta" titulo="Nenhuma medição ainda" texto="Suba a planilha da 1ª medição (o Boletim de Medição, .xlsx ou .xlsm)." />}
      </>
    )
  } else {
    const { empreiteiro: meds, empreiteiros } = lista.data
    const vendo = filtro === 'Todos' || !empreiteiros.includes(filtro) ? 'Todos' : filtro
    // Um empreiteiro: na ordem dos nº. Todos: na ordem das datas (a lista mostra do fim para o começo).
    const daVez = vendo === 'Todos'
      ? [...meds].sort((a, b) => a.data_medicao.localeCompare(b.data_medicao) || a.numero - b.numero)
      : meds.filter((m) => m.empreiteiro === vendo)
    corpo = (
      <>
        <div className="med-topo-lista">
          <button className="btn btn-primary" disabled={ocupado} onClick={() => setSubindo(true)}>+ Subir planilha</button>
          {daVez.length > 0 && (
            <button className="btn btn-ghost" onClick={() => setPainel({ tipo: 'Empreiteiro', empreiteiro: vendo === 'Todos' ? null : vendo })}>Ver painel</button>
          )}
        </div>
        {empreiteiros.length > 0 && (
          <div className="chips" style={{ marginBottom: 12 }}>
            {['Todos', ...empreiteiros].map((n) => (
              <button key={n} className={`chip${vendo === n ? ' on' : ''}`} onClick={() => setFiltro(n)}>{n}</button>
            ))}
          </div>
        )}
        {daVez.length
          ? <div className="list">{[...daVez].reverse().map((m) => <CartaoMedicao key={m.id} m={m} comEmpreiteiro={vendo === 'Todos'} abrir={setAberta} />)}</div>
          : <Vazio icone="prancheta" pequeno={meds.length > 0}
            titulo={vendo === 'Todos' ? 'Nenhuma medição de empreiteiro ainda' : 'Nenhuma medição deste empreiteiro ainda'}
            texto="Toque em “+ Subir planilha”, escolha o empreiteiro e o arquivo dele." />}
      </>
    )
  }

  return (
    <>
      <div className="tabs" role="tablist">
        {VISTAS.map((v) => (
          <button key={v} role="tab" aria-selected={vista === v} className={`tab${vista === v ? ' on' : ''}`} onClick={() => setVista(v)}>{v}</button>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>{corpo}</div>

      <Gaveta aberta={Boolean(aberta)} fechar={() => !ocupado && setAberta(null)} rotulo="Medição">
        {aberta && <DetalheMedicao medicao={aberta} ocupado={ocupado} trocar={trocar} excluir={excluir} fechar={() => setAberta(null)} />}
      </Gaveta>
      <Gaveta aberta={Boolean(conferindo)} fechar={() => !ocupado && setConferindo(null)} rotulo="Conferir medição">
        {conferindo && (
          <ConferenciaContrato {...conferindo} existentes={lista.data.contrato} ocupado={ocupado}
            cancelar={() => setConferindo(null)} confirmar={confirmarContrato} />
        )}
      </Gaveta>
      <Gaveta aberta={subindo} fechar={() => !ocupado && setSubindo(false)} rotulo="Subir planilha de empreiteiro">
        {subindo && lista.data && (
          <SubirEmpreiteiro empreiteiros={lista.data.empreiteiros} medicoes={lista.data.empreiteiro} inicial={filtro === 'Todos' ? '' : filtro}
            ocupado={ocupado} cancelar={() => setSubindo(false)} confirmar={confirmarEmpreiteiro} />
        )}
      </Gaveta>
    </>
  )
}
