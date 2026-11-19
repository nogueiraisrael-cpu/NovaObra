// Gestão à Vista — o editor: a <img> da planta e, por cima, um <svg> com viewBox nos pixels da
// imagem. Toda marcação é VETOR gravado no banco (nunca queimada na imagem) e todo ponto é
// convertido para pixels da IMAGEM antes de salvar: zoom, celular deitado ou tela grande não
// mexem em nada. As regras (lotes, legenda, avanço, varinha, rótulo) estão em src/lib/plantas.js
// e src/lib/plantaGeometria.js; aqui fica o gesto, o zoom e o desenho.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { abrirPlanta, criarMarcacao, avancarMarcacao, apagarMarcacao, enderecoDaPlanta, posso } from '../lib/dados.js'
import {
  etapasComLegado, marcacoesNaTela, corDaMarcacao, coresDosLotes, corPorLote, lotesDoDia, resumoDoLote,
  extrasDaMarcacao, validarMarcacao, formatarQtd,
} from '../lib/plantas.js'
import {
  pontoNaImagem, retanguloEntre, simplificarTraco, toleranciaDoTraco, bboxDe, centroDe, caminhoDoPincel, larguraDoTraco,
  pequenoDemais, sugerirRotulo, pontaDaSeta, caixaDaPonta, escalaDaVarinha, binarizar, detectarContorno, caixaNaImagem,
  limitarZoom, scrollAncorado,
} from '../lib/plantaGeometria.js'
import { htmlDaImpressao } from '../lib/plantaImpressao.js'
import { pecasDaPlanta, quadroDe, resumoDaPlanta, valorNoQuadro, valoresDasMarcacoes } from '../lib/quantitativo.js'
import { hojeISO, formatarData, formatarDiaMes } from '../lib/datas.js'
import { Carregando, ErroCarga, Icon, useToast } from '../components/index.jsx'
import { PainelPeca, PainelResumo, PainelEtapas } from './plantaPaineis.jsx'
import { PainelQuantitativo } from './plantaQuantitativo.jsx'

const FERRAMENTAS = [
  { id: 'mover', icone: '✋', nome: 'Mover', tecla: 'V' },
  { id: 'pincel', icone: '🖌️', nome: 'Pincel', tecla: 'P', pinta: true },
  { id: 'ret', icone: '▭', nome: 'Retângulo', tecla: 'R', pinta: true },
  { id: 'seta', icone: '↗', nome: 'Seta', tecla: 'S', pinta: true },
  { id: 'varinha', icone: '✨', nome: 'Detectar', tecla: 'D', pinta: true },
  { id: 'etapa', icone: '🔁', nome: 'Etapa', tecla: 'E', pinta: true },
  { id: 'apagar', icone: '🧽', nome: 'Apagar', tecla: 'X', pinta: true },
]
const TECLAS = { v: 'mover', m: 'mover', p: 'pincel', r: 'ret', s: 'seta', d: 'varinha', e: 'etapa', x: 'apagar' }
const ESPESSURAS = [[0.5, 'Fino'], [1, 'Normal'], [2, 'Grosso']]

// A planta na tela: desenho de uma marcação (o mesmo vai para o papel).
function Forma({ m, cor, largura, altura, selecionada, nome }) {
  const sw = larguraDoTraco(largura, altura, Number(m.espessura) || 1)
  const p = m.pontos
  const comum = { 'data-mid': m.id, stroke: cor, strokeWidth: sw, strokeLinejoin: 'round', strokeLinecap: 'round' }
  let corpo
  if (m.tipo === 'ret') corpo = <rect {...comum} x={p.x} y={p.y} width={p.w} height={p.h} fill={cor} fillOpacity={0.35} />
  else if (m.tipo === 'seta') {
    corpo = (
      <g data-mid={m.id}>
        <line {...comum} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} />
        <polygon data-mid={m.id} points={pontaDaSeta(p, sw * 5)} fill={cor} />
      </g>
    )
  } else corpo = <path {...comum} d={caminhoDoPincel(p.pts ?? [])} fill={cor} fillOpacity={0.35} />
  const b = bboxDe(m)
  const [cx, cy] = centroDe(m)
  const fonte = Math.max(12, Math.round(Math.max(largura, altura) / 110))
  return (
    <g>
      {corpo}
      {selecionada && <rect className="so-tela" x={b.x - sw * 2} y={b.y - sw * 2} width={b.w + sw * 4} height={b.h + sw * 4}
        fill="none" stroke="#00A3B4" strokeWidth={sw} strokeDasharray={`${sw * 3} ${sw * 2}`} pointerEvents="none" />}
      {nome && m.rotulo && <text x={cx} y={cy} fontSize={fonte} fontWeight="700" textAnchor="middle" dominantBaseline="middle"
        fill="#111" stroke="#fff" strokeWidth={fonte / 5} paintOrder="stroke" pointerEvents="none">{m.rotulo}</text>}
    </g>
  )
}

function Rascunho({ r, cor, largura, altura, espessura }) {
  if (!r) return null
  const sw = larguraDoTraco(largura, altura, espessura)
  const comum = { className: 'so-tela', stroke: cor, strokeWidth: sw, fill: cor, fillOpacity: 0.25, strokeDasharray: `${sw * 2} ${sw}`, pointerEvents: 'none' }
  if (r.tipo === 'ret') return <rect {...comum} x={r.pontos.x} y={r.pontos.y} width={r.pontos.w} height={r.pontos.h} />
  if (r.tipo === 'seta') return <line {...comum} x1={r.pontos.x1} y1={r.pontos.y1} x2={r.pontos.x2} y2={r.pontos.y2} />
  return <path {...comum} fill="none" d={caminhoDoPincel(r.pontos.pts)} />
}

// A linha de números do quadro de resumo: "8 de 20 peças · 5,76 de 14,4 m³ · 40%".
function textoDoResumo(e) {
  const pecas = e.totalPecas ? `${e.feitas} de ${e.totalPecas} peças` : `${e.feitas} peça(s)`
  if (e.unidade === 'un') return e.pct !== null ? `${pecas} · ${e.pct}%` : pecas
  const qtd = e.previsto ? `${formatarQtd(e.feito, e.unidade)} de ${formatarQtd(e.previsto, e.unidade)}` : formatarQtd(e.feito, e.unidade)
  return [pecas, qtd, e.pct !== null ? `${e.pct}%` : null].filter(Boolean).join(' · ')
}

export default function PlantaEditor({ plantaId, voltar }) {
  const toast = useToast()
  const [carga, setCarga] = useState({ carregando: true, erro: null })
  const [planta, setPlanta] = useState(null)
  const [etapas, setEtapas] = useState([])
  const [marcacoes, setMarcacoes] = useState([])
  const [quantitativos, setQuantitativos] = useState([])
  const podePintar = posso('pranchas.pintar')

  const [ferramenta, setFerramenta] = useState('mover')
  const [etapaAtiva, setEtapaAtiva] = useState(null)
  const [data, setData] = useState(hojeISO())
  const [espessura, setEspessura] = useState(1)
  const [qtdTexto, setQtdTexto] = useState('')
  const [lote, setLote] = useState('')
  const [nota, setNota] = useState('')
  const [loteCor, setLoteCor] = useState(null)
  const [ocultas, setOcultas] = useState(() => new Set())
  const [porCaminhao, setPorCaminhao] = useState(false)
  const [nomes, setNomes] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [larguraPalco, setLarguraPalco] = useState(0)
  const [rascunho, setRascunho] = useState(null)
  const [selecionada, setSelecionada] = useState(null)
  const [painel, setPainel] = useState(null) // 'resumo' | 'etapas'
  const [gravando, setGravando] = useState(false)

  const palcoRef = useRef(null)
  const svgRef = useRef(null)
  const gesto = useRef({ toques: new Map(), modo: null })
  const scrollPendente = useRef(null)
  const varinha = useRef(null) // { bin, w, h, escala } — memorizada: a planta não muda enquanto o editor está aberto

  const carregar = useCallback(async () => {
    const r = await abrirPlanta(plantaId)
    if (r.erro) return setCarga({ carregando: false, erro: r.erro })
    setPlanta(r.data.planta)
    setEtapas(r.data.etapas)
    setMarcacoes(r.data.marcacoes)
    setQuantitativos(r.data.quantitativos)
    setCarga({ carregando: false, erro: null })
  }, [plantaId])
  useEffect(() => { carregar() }, [carregar])

  const todasEtapas = useMemo(() => etapasComLegado(etapas, marcacoes), [etapas, marcacoes])
  const ativas = todasEtapas.filter((e) => !e.legado && e.ativa !== false)
  const etapa = ativas.find((e) => e.nome === etapaAtiva) ?? ativas[0] ?? null
  const etapasPorNome = useMemo(() => new Map(todasEtapas.map((e) => [e.nome, e])), [todasEtapas])
  const naTela = useMemo(() => marcacoesNaTela(marcacoes, ocultas), [marcacoes, ocultas])
  const cores = useMemo(() => coresDosLotes(marcacoes, data), [marcacoes, data])
  // O quadro de resumo: feitas de total, quantidade feita de prevista, % e o de hoje, por etapa.
  const quadro = useMemo(() => quadroDe(quantitativos), [quantitativos])
  const pecas = useMemo(() => pecasDaPlanta({ textos: planta?.textos, marcacoes, quantitativos }), [planta, marcacoes, quantitativos])
  const resumo = resumoDaPlanta(todasEtapas, marcacoes, quantitativos, pecas, hojeISO())
  const valores = useMemo(() => valoresDasMarcacoes(marcacoes, etapasPorNome, quadro), [marcacoes, etapasPorNome, quadro])
  const etapasMedidas = ativas.filter((e) => e.unidade && e.unidade !== 'un')
  const lotes = lotesDoDia(marcacoes, data).map(resumoDoLote)

  // Largura do palco: a planta "cabe na largura" no zoom 1.
  useLayoutEffect(() => {
    const el = palcoRef.current
    if (!el) return undefined
    const medir = () => setLarguraPalco(el.clientWidth)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [planta])

  // Depois de mudar o zoom, o scroll que mantém o ponto sob o cursor/pinça no lugar.
  useLayoutEffect(() => {
    const el = palcoRef.current
    if (el && scrollPendente.current) {
      el.scrollLeft = scrollPendente.current.left
      el.scrollTop = scrollPendente.current.top
      scrollPendente.current = null
    }
  }, [zoom])

  // Roda e pinça mandam vários eventos antes de a tela redesenhar: o zoom e o scroll de partida
  // vêm do que já foi pedido (zoomRef e o scroll ainda pendente), não do que está na tela, senão o
  // ponto sob o cursor escorrega.
  const zoomRef = useRef(1)
  const zoomEm = useCallback((novo, cx, cy) => {
    const el = palcoRef.current
    const antes = zoomRef.current
    const depois = limitarZoom(novo(antes))
    if (el) {
      const base = scrollPendente.current ?? { left: el.scrollLeft, top: el.scrollTop }
      scrollPendente.current = scrollAncorado({ scrollLeft: base.left, scrollTop: base.top, cx, cy, zoomAntes: antes, zoomDepois: depois })
    }
    zoomRef.current = depois
    setZoom(depois)
  }, [])

  // Roda do mouse = zoom ancorado no cursor (CAD). Listener NATIVO e não passivo: o do React é
  // passivo, o preventDefault não pega e a página rolaria em vez de dar zoom.
  useEffect(() => {
    const el = palcoRef.current
    if (!el) return undefined
    const aoRolar = (ev) => {
      ev.preventDefault()
      const caixa = el.getBoundingClientRect()
      zoomEm((z) => z * Math.exp(-ev.deltaY * 0.0015), ev.clientX - caixa.left, ev.clientY - caixa.top)
    }
    el.addEventListener('wheel', aoRolar, { passive: false })
    return () => el.removeEventListener('wheel', aoRolar)
  }, [zoomEm, planta])

  // Atalhos de teclado (fora de campo de texto).
  useEffect(() => {
    const aoTeclar = (ev) => {
      if (ev.target.closest?.('input, textarea, select') || ev.ctrlKey || ev.metaKey || ev.altKey) return
      const k = ev.key.toLowerCase()
      if (k === 'enter' || k === ' ' || k === 'escape') {
        if (k === ' ') ev.preventDefault()
        setFerramenta('mover'); setRascunho(null)
        return
      }
      if (k === 'n') { setNomes((n) => !n); return }
      const f = TECLAS[k]
      if (f && (f === 'mover' || podePintar)) setFerramenta(f)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [podePintar])

  if (carga.carregando) return <Carregando />
  if (carga.erro) return <ErroCarga erro={carga.erro} tentar={carregar} />

  const { largura, altura } = planta
  const escalaBase = larguraPalco ? larguraPalco / largura : 0
  const larguraNaTela = Math.round(largura * escalaBase * zoom)
  const alturaNaTela = Math.round(altura * escalaBase * zoom)

  const extras = () => extrasDaMarcacao({ etapa, data, espessura, quantidadeTexto: qtdTexto, lote, nota, loteCor })
  const ponto = (ev) => pontoNaImagem(ev.clientX, ev.clientY, svgRef.current.getBoundingClientRect(), largura, altura)

  async function gravarNova(tipo, pontos, caixaDoNome) {
    const campos = { tipo, pontos, ...extras(), rotacao: 0 }
    campos.rotulo = sugerirRotulo(planta.textos, caixaDoNome ?? bboxDe({ tipo, pontos }))
    const problema = validarMarcacao(campos, etapa, valorNoQuadro(quadro, planta.id, campos.rotulo, etapa?.nome) != null)
    if (problema) return toast(problema, 'bad')
    setGravando(true)
    const r = await criarMarcacao(planta.id, campos)
    setGravando(false)
    if (r.erro) return toast(r.erro, 'bad')
    setMarcacoes((ms) => [...ms, r.data])
    // A quantidade digitada vale para ESTA peça só: a próxima volta a usar o quadro de peças.
    setQtdTexto('')
  }

  async function avancar(id) {
    const anterior = marcacoes.find((m) => m.id === id)
    if (!anterior) return
    const campos = extras()
    const problema = validarMarcacao(campos, etapa, valorNoQuadro(quadro, planta.id, anterior.rotulo, etapa?.nome) != null)
    if (problema) return toast(problema, 'bad')
    setGravando(true)
    const r = await avancarMarcacao(id, campos)
    setGravando(false)
    if (r.erro) return toast(r.erro, 'bad')
    setMarcacoes((ms) => [...ms, r.data])
    setQtdTexto('')
    toast(`${anterior.rotulo || 'Peça'}: ${anterior.etapa} → ${r.data.etapa}`)
  }

  async function apagar(id) {
    setGravando(true)
    const r = await apagarMarcacao(id)
    setGravando(false)
    if (r.erro) return toast(r.erro, 'bad')
    setMarcacoes((ms) => ms.filter((m) => m.id !== id).map((m) => (m.substitui === id ? { ...m, substitui: null } : m)))
    if (selecionada === id) setSelecionada(null)
    toast('Marcação apagada.')
  }

  // A varinha lê a planta uma vez só, num canvas reduzido (lado maior ≤ 1400 px).
  async function mapaDaVarinha() {
    if (varinha.current) return varinha.current
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = planta.url
    await img.decode()
    const escala = escalaDaVarinha(largura, altura)
    const w = Math.round(largura * escala)
    const h = Math.round(altura * escala)
    const tela = document.createElement('canvas')
    tela.width = w
    tela.height = h
    const ctx = tela.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, w, h)
    varinha.current = { bin: binarizar(ctx.getImageData(0, 0, w, h).data, w, h), w, h, escala }
    return varinha.current
  }

  async function detectar(p) {
    let mapa
    try { mapa = await mapaDaVarinha() } catch (e) {
      console.error('[planta] varinha', e)
      return toast('Não consegui ler a planta para detectar o contorno. Use o retângulo (R).', 'bad')
    }
    const r = detectarContorno(mapa.bin, mapa.w, mapa.h, p[0] * mapa.escala, p[1] * mapa.escala)
    if (r.erro) return toast(r.erro, 'bad')
    const caixa = caixaNaImagem(r.caixa, mapa.escala, largura, altura)
    if (!caixa) return toast('A área é pequena demais. Dê zoom e tente de novo.', 'bad')
    gravarNova('ret', caixa)
  }

  // ---------------------------------------------------------------------------
  // Gestos: um dedo desenha (ou arrasta, na mãozinha); dois dedos = pinça, nunca desenho.
  // ---------------------------------------------------------------------------
  function aoApertar(ev) {
    const g = gesto.current
    if (ev.pointerType === 'mouse' && ev.button !== 0) return
    g.toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    svgRef.current.setPointerCapture?.(ev.pointerId)
    if (g.toques.size === 2) {
      // O segundo dedo cancela o traço que o primeiro começou.
      setRascunho(null)
      const [a, b] = [...g.toques.values()]
      g.modo = 'pinca'
      g.pinca = { distancia: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom }
      return
    }
    if (g.toques.size > 2 || g.modo === 'pinca') return
    const el = palcoRef.current
    // Com pointer capture ligado, o clique seguinte vai para o <svg>, não para a forma: quem
    // estava sob o dedo fica guardado aqui.
    g.alvo = ev.target.closest?.('[data-mid]')?.dataset.mid ?? null
    g.inicio = { x: ev.clientX, y: ev.clientY, left: el.scrollLeft, top: el.scrollTop, p: ponto(ev) }
    g.andou = false
    if (ferramenta === 'mover' || !podePintar) { g.modo = 'arrastar'; return }
    g.modo = ferramenta
    const p = g.inicio.p
    if (ferramenta === 'pincel') { g.pts = [p]; setRascunho({ tipo: 'pincel', pontos: { pts: [p] } }) }
    if (ferramenta === 'ret') setRascunho({ tipo: 'ret', pontos: retanguloEntre(p, p) })
    if (ferramenta === 'seta') setRascunho({ tipo: 'seta', pontos: { x1: p[0], y1: p[1], x2: p[0], y2: p[1] } })
  }

  function aoMover(ev) {
    const g = gesto.current
    if (!g.toques.has(ev.pointerId)) return
    g.toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    if (g.modo === 'pinca' && g.toques.size >= 2) {
      const [a, b] = [...g.toques.values()]
      const caixa = palcoRef.current.getBoundingClientRect()
      const fator = Math.hypot(a.x - b.x, a.y - b.y) / g.pinca.distancia
      zoomEm(() => g.pinca.zoom * fator, (a.x + b.x) / 2 - caixa.left, (a.y + b.y) / 2 - caixa.top)
      return
    }
    if (!g.inicio) return
    if (Math.hypot(ev.clientX - g.inicio.x, ev.clientY - g.inicio.y) > 6) g.andou = true
    if (g.modo === 'arrastar') {
      const el = palcoRef.current
      el.scrollLeft = g.inicio.left - (ev.clientX - g.inicio.x)
      el.scrollTop = g.inicio.top - (ev.clientY - g.inicio.y)
      return
    }
    const p = ponto(ev)
    const q = g.inicio.p
    if (g.modo === 'pincel') { g.pts.push(p); setRascunho({ tipo: 'pincel', pontos: { pts: [...g.pts] } }) }
    if (g.modo === 'ret') setRascunho({ tipo: 'ret', pontos: retanguloEntre(q, p) })
    if (g.modo === 'seta') setRascunho({ tipo: 'seta', pontos: { x1: q[0], y1: q[1], x2: p[0], y2: p[1] } })
  }

  function aoSoltar(ev) {
    const g = gesto.current
    if (!g.toques.has(ev.pointerId)) return
    g.toques.delete(ev.pointerId)
    if (g.modo === 'pinca') {
      if (!g.toques.size) { g.modo = null; g.inicio = null }
      return
    }
    const modo = g.modo
    const inicio = g.inicio
    g.modo = null
    g.inicio = null
    if (!inicio || ev.type === 'pointercancel') { setRascunho(null); return }
    const minimo = Math.max(8, Math.round(Math.max(largura, altura) / 300))
    if (modo === 'arrastar') {
      if (!g.andou) setSelecionada(g.alvo)
      return
    }
    if (gravando) { setRascunho(null); return }
    if (modo === 'varinha') { if (!g.andou) detectar(inicio.p); return }
    if (modo === 'etapa' || modo === 'apagar') {
      if (!g.alvo) return toast('Toque em cima de uma marcação.', 'bad')
      if (modo === 'etapa') avancar(g.alvo)
      else apagar(g.alvo)
      return
    }
    const p = ponto(ev)
    let nova = null
    if (modo === 'pincel') nova = { tipo: 'pincel', pontos: { pts: simplificarTraco([...g.pts, p], toleranciaDoTraco(largura, altura)) } }
    if (modo === 'ret') nova = { tipo: 'ret', pontos: retanguloEntre(inicio.p, p) }
    if (modo === 'seta') nova = { tipo: 'seta', pontos: { x1: inicio.p[0], y1: inicio.p[1], x2: p[0], y2: p[1] } }
    setRascunho(null)
    if (!nova || pequenoDemais(nova, minimo)) return
    gravarNova(nova.tipo, nova.pontos, nova.tipo === 'seta' ? caixaDaPonta(nova.pontos, largura, altura) : null)
  }

  // ---------------------------------------------------------------------------
  // Impressão: o MESMO svg da tela (sem a seleção) sobre a MESMA imagem
  // ---------------------------------------------------------------------------
  async function imprimir() {
    const janela = window.open('', '_blank') // abre já, no toque: depois o navegador bloquearia
    if (!janela) return toast('O navegador bloqueou a janela de impressão. Libere janelas deste site e tente de novo.', 'bad')
    janela.document.write('<p style="font-family:sans-serif;padding:20px">Preparando a impressão…</p>')
    const copia = svgRef.current.cloneNode(true)
    copia.querySelectorAll('.so-tela').forEach((n) => n.remove())
    copia.removeAttribute('style')
    copia.removeAttribute('class')
    const endereco = await enderecoDaPlanta(planta.id)
    const visiveis = resumo.filter((e) => !ocultas.has(e.nome) && e.feitas > 0)
    const html = htmlDaImpressao({
      titulo: planta.nome,
      subtitulo: `${planta.pavimento ? `${planta.pavimento} · ` : ''}impresso em ${formatarData(hojeISO())}`,
      filtro: porCaminhao ? `Cores por caminhão (dia ${formatarDiaMes(data)})`
        : ocultas.size ? `Etapas ocultas: ${[...ocultas].join(', ')}` : 'Todas as etapas',
      legenda: porCaminhao
        ? lotes.map((l) => ({ nome: [l.lote, l.nota && `NF ${l.nota}`].filter(Boolean).join(' · '), cor: l.cor, texto: `${l.pecas} peça(s)` }))
        : visiveis.map((e) => ({ nome: e.nome, cor: e.cor, texto: textoDoResumo(e) })),
      svg: copia.outerHTML, imagem: endereco.data ?? planta.url ?? '', largura, altura,
    })
    janela.document.open()
    janela.document.write(html)
    janela.document.close()
    // Imprimir antes de a imagem chegar sai com a folha em branco: espera load/erro ou 6 s, uma vez só.
    let foi = false
    const vai = () => { if (foi) return; foi = true; janela.focus(); janela.print() }
    const img = janela.document.querySelector('img')
    if (!img || img.complete) vai()
    else { img.onload = vai; img.onerror = vai; setTimeout(vai, 6000) }
  }

  const corDe = (m) => (porCaminhao ? corPorLote(m, cores) : corDaMarcacao(m, etapasPorNome))
  const alternarOculta = (nome) => setOcultas((s) => { const n = new Set(s); if (n.has(nome)) n.delete(nome); else n.add(nome); return n })
  const marcada = marcacoes.find((m) => m.id === selecionada)
  const cursor = ferramenta === 'mover' || !podePintar ? 'grab' : ferramenta === 'etapa' || ferramenta === 'apagar' ? 'pointer' : 'crosshair'

  return (
    <div className="gv">
      <div className="gv-topo">
        <button className="back" onClick={voltar}><Icon nome="back" />Plantas</button>
        <div className="gv-titulo"><b>{planta.nome}</b>{planta.pavimento && <span> · {planta.pavimento}</span>}</div>
      </div>

      {podePintar && (
        <div className="gv-barra" role="toolbar" aria-label="Ferramentas">
          {FERRAMENTAS.map((f) => (
            <button key={f.id} className={`gv-ferr${ferramenta === f.id ? ' on' : ''}`} onClick={() => setFerramenta(f.id)}
              title={`${f.nome} (${f.tecla})`} aria-pressed={ferramenta === f.id}>
              <span aria-hidden="true">{f.icone}</span><small>{f.nome}</small>
            </button>
          ))}
        </div>
      )}

      {podePintar && (
        <div className="gv-controles">
          <div className="gv-etapas">
            {ativas.map((e) => (
              <button key={e.nome} className={`gv-chip${etapa?.nome === e.nome ? ' on' : ''}`} onClick={() => setEtapaAtiva(e.nome)}>
                <i style={{ background: e.cor }} />{e.nome}
              </button>
            ))}
            {posso('pranchas.editar') && <button className="gv-chip gv-mais" onClick={() => setPainel('etapas')}>{ativas.length ? '⚙ Etapas' : '+ Criar etapas'}</button>}
          </div>
          <div className="gv-campos">
            <label>Data<input type="date" className="field" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value || hojeISO())} /></label>
            <label>Traço
              <select className="field" value={espessura} onChange={(e) => setEspessura(Number(e.target.value))}>
                {ESPESSURAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </select>
            </label>
            {etapa && etapa.unidade !== 'un' && (
              <label>Quantidade ({etapa.unidade})<input className="field" inputMode="decimal" value={qtdTexto} onChange={(e) => setQtdTexto(e.target.value)} placeholder="vazio = quadro de peças" /></label>
            )}
            <label>Placa (BT)<input className="field" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Ex.: BT 1111" autoComplete="off" /></label>
            <label>Nota fiscal<input className="field" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nº da NF" autoComplete="off" /></label>
            {(lote || nota) && (
              <label>Cor do caminhão
                <span className="gv-cor">
                  <input type="color" value={loteCor ?? '#FF3B30'} onChange={(e) => setLoteCor(e.target.value.toUpperCase())} />
                  {loteCor ? <button className="link-remover" onClick={() => setLoteCor(null)}>automática</button> : <small>automática</small>}
                </span>
              </label>
            )}
          </div>
          {data !== hojeISO() && <div className="hint t-warn">Marcando com data de {formatarData(data)} (retroativo).</div>}
          {!ativas.length && <div className="banner warn">Crie as etapas (Escavado, Forma, Armado…) antes de marcar.</div>}
        </div>
      )}

      <div className="gv-vista">
        <button className={`gv-chip${porCaminhao ? ' on' : ''}`} onClick={() => setPorCaminhao((v) => !v)}>🚚 Por caminhão</button>
        <button className={`gv-chip${nomes ? ' on' : ''}`} onClick={() => setNomes((v) => !v)} title="Nomes das peças (N)">Nomes</button>
        <button className="gv-chip" onClick={() => zoomEm((z) => z / 1.25, palcoRef.current.clientWidth / 2, palcoRef.current.clientHeight / 2)} aria-label="Diminuir zoom">−</button>
        <button className="gv-chip" onClick={() => zoomEm(() => 1, 0, 0)} title="Caber na largura">{Math.round(zoom * 100)}%</button>
        <button className="gv-chip" onClick={() => zoomEm((z) => z * 1.25, palcoRef.current.clientWidth / 2, palcoRef.current.clientHeight / 2)} aria-label="Aumentar zoom">+</button>
        <button className="gv-chip" onClick={() => setPainel('quantitativo')}>📋 Quantitativo</button>
        <button className="gv-chip" onClick={() => setPainel('resumo')}>📊 Resumo</button>
        <button className="gv-chip" onClick={imprimir}>🖨 Imprimir</button>
        {gravando && <span className="hint">Gravando…</span>}
      </div>

      <div className="gv-area">
        <div ref={palcoRef} className="gv-palco" style={{ cursor }}>
          {escalaBase > 0 && (
            <div className="gv-folha" style={{ width: larguraNaTela, height: alturaNaTela }}>
              {planta.url
                ? <img src={planta.url} alt={planta.nome} draggable={false} />
                : <div className="gv-semimagem">A imagem da planta não carregou. Volte e abra de novo.</div>}
              <svg ref={svgRef} viewBox={`0 0 ${largura} ${altura}`} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
                onPointerDown={aoApertar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}>
                {naTela.map((m) => <Forma key={m.id} m={m} cor={corDe(m)} largura={largura} altura={altura} selecionada={m.id === selecionada} nome={nomes} />)}
                <Rascunho r={rascunho} cor={etapa?.cor ?? '#00A3B4'} largura={largura} altura={altura} espessura={espessura} />
              </svg>
            </div>
          )}
        </div>

        <aside className="gv-legenda">
          {porCaminhao ? (
            <>
              <div className="eyebrow">Caminhões de {formatarDiaMes(data)}</div>
              {!lotes.length && <div className="hint">Nenhuma marcação com placa ou nota neste dia. Troque a data para ver outro dia.</div>}
              {lotes.map((l) => (
                <div key={l.chave} className="gv-leg">
                  <i style={{ background: l.cor }} />
                  <div><b>{[l.lote, l.nota && `NF ${l.nota}`].filter(Boolean).join(' · ')}</b>
                    <div className="hint">{l.pecas} peça(s){l.quantidade !== l.pecas ? ` · ${formatarQtd(l.quantidade)}` : ''}{l.nomes.length ? ` · ${l.nomes.join(', ')}` : ''}</div></div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="eyebrow">Resumo da planta · executado</div>
              {!resumo.length && <div className="hint">Sem etapas ainda.</div>}
              {resumo.map((e) => (
                <div key={e.nome} className={`gv-leg${ocultas.has(e.nome) ? ' apagada' : ''}`}>
                  <i style={{ background: e.cor }} />
                  <div style={{ flex: 1 }}>
                    <b>{e.nome}</b>{e.legado && <small> (etapa antiga)</small>}
                    <div className="gv-resumo-num">{textoDoResumo(e)}</div>
                    {e.pct !== null && <div className="gv-meta"><span style={{ width: `${Math.min(100, e.pct)}%`, background: e.cor }} /></div>}
                    {(e.hojePecas > 0) && <div className="hint">hoje: {e.hojePecas} peça(s){e.unidade !== 'un' ? ` · ${formatarQtd(e.hojeFeito, e.unidade)}` : ''}</div>}
                    {e.semQuantitativo > 0 && <div className="hint t-warn">{e.semQuantitativo} marcação(ões) sem quantitativo: preencha no 📋</div>}
                  </div>
                  <button className="gv-olho" onClick={() => alternarOculta(e.nome)} aria-label={`${ocultas.has(e.nome) ? 'Mostrar' : 'Esconder'} ${e.nome}`}
                    title={ocultas.has(e.nome) ? 'Mostrar' : 'Esconder'}>{ocultas.has(e.nome) ? '🙈' : '👁'}</button>
                </div>
              ))}
            </>
          )}
          <div className="hint" style={{ marginTop: 10 }}>
            {podePintar ? 'Mãozinha: arraste a planta e toque numa peça para ver a vida dela. Roda do mouse ou dois dedos: zoom.' : 'Toque numa peça para ver a vida dela.'}
          </div>
        </aside>
      </div>

      <PainelPeca marcacao={marcada} marcacoes={marcacoes} etapasPorNome={etapasPorNome} fechar={() => setSelecionada(null)}
        aoMudar={(nova) => setMarcacoes((ms) => ms.map((m) => (m.id === nova.id ? nova : m)))} />
      <PainelResumo aberto={painel === 'resumo'} fechar={() => setPainel(null)} etapas={todasEtapas} marcacoes={marcacoes} planta={planta} valores={valores} />
      <PainelQuantitativo aberto={painel === 'quantitativo'} fechar={() => setPainel(null)} planta={planta} etapas={etapasMedidas}
        pecas={pecas} quantitativos={quantitativos} aoMudar={carregar} />
      <PainelEtapas aberto={painel === 'etapas'} fechar={() => setPainel(null)} etapas={etapas}
        aoMudar={async () => { await carregar() }} />
    </div>
  )
}
