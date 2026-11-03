// Planilhas de medição (v1.3): o Boletim de Medição do contrato (aba "BM") e a planilha do
// empreiteiro (uma aba por medição). Tudo é lido no próprio aparelho, e só os VALORES das
// células: o SheetJS não roda as macros de um .xlsm. O SheetJS chega como parâmetro (`XLSX`):
// a tela o carrega só quando precisa, e os testes passam o mesmo pacote no Node.
//
// As colunas são achadas pelos TÍTULOS das duas linhas de cabeçalho, não pela letra: uma
// coluna a mais na planilha não muda nada. Os valores são lidos, nunca recalculados (o painel
// mostra o que está no boletim); a conferência, em medicoes.js, só compara somas.
//
// PLANILHA DE EMPREITEIRO: os itens de cada aba param em "EXECUTANTE:", e o rodapé para antes
// do bloco "Dados para pagamento" (tem dados bancários). Esse bloco nunca é lido.

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
const doisDigitos = (n) => String(n).padStart(2, '0')
const iso = (a, m, d) => `${a}-${doisDigitos(m)}-${doisDigitos(d)}`

// Problema da planilha (não do app): a frase já é para a pessoa ler.
const erroDaPlanilha = (frase) => Object.assign(new Error(frase), { daPlanilha: true })

const TAMANHO_MAXIMO = 10 * 1024 * 1024

export function tipoDoArquivo({ name, size }) {
  const nome = String(name ?? '').toLowerCase()
  if (!nome.endsWith('.xlsx') && !nome.endsWith('.xlsm')) return { erro: 'Use a planilha em .xlsx ou .xlsm.' }
  if (size > TAMANHO_MAXIMO) return { erro: 'Arquivo grande demais (máximo 10 MB).' }
  return { tipo: 'xlsx' }
}

// ---------------------------------------------------------------------------
// Células
// ---------------------------------------------------------------------------

function texto(cel) {
  if (!cel || cel.v == null) return ''
  if (cel.t === 's') return String(cel.v).trim()
  return String(cel.w ?? cel.v).trim()
}

// Número escrito como texto: "1.234,56" (Brasil), "1,234.56" (Excel em inglês), "R$ 7,00",
// " -   " (o zero da formatação contábil). Devolve null quando não é número.
export function numeroDoTexto(s) {
  let t = String(s ?? '').replace(/R\$|\s|%/g, '')
  if (!t || /^-+$/.test(t)) return 0
  const virgula = t.lastIndexOf(',')
  const ponto = t.lastIndexOf('.')
  t = virgula > ponto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

// Célula vazia vale 0 (é como a planilha mostra o "nada medido"). Célula com erro de fórmula
// (#REF!) ou com texto que não é número devolve null: a linha fica de fora, com aviso.
// Os valores do Excel vêm com sobra de ponto flutuante (0,9600000000000001): arredonda para
// as casas do banco (quantidade com 4, dinheiro com 2). null continua null.
const arredondar = (n, casas) => (n === null ? null : Math.round(n * 10 ** casas) / 10 ** casas)

function numero(cel) {
  if (!cel || cel.v == null || cel.v === '') return 0
  if (cel.t === 'n') return cel.v
  if (cel.t === 'e' || cel.t === 'b') return null
  return numeroDoTexto(cel.v)
}

// "14/06/2026", "05.07.25", "21-10-2025" → "AAAA-MM-DD". Sem data → null.
export function dataDoTexto(s) {
  const m = String(s ?? '').match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?!\d)/)
  if (!m) return null
  const d = Number(m[1])
  const mes = Number(m[2])
  const a = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  if (mes < 1 || mes > 12 || d < 1 || d > 31 || a < 1990 || a > 2100) return null
  return iso(a, mes, d)
}

// Data de uma célula: número de série do Excel (convertido pela conta do próprio SheetJS,
// sem fuso), data, ou texto com data.
function data(XLSX, cel) {
  if (!cel || cel.v == null) return null
  if (cel.t === 'n') {
    if (cel.v < 20000 || cel.v > 80000) return null // não é data (1990 a 2119)
    const p = XLSX.SSF.parse_date_code(cel.v)
    return p ? iso(p.y, p.m, p.d) : null
  }
  if (cel.t === 'd' && cel.v instanceof Date) return iso(cel.v.getFullYear(), cel.v.getMonth() + 1, cel.v.getDate())
  return dataDoTexto(cel.v)
}

function abrir(XLSX, ws) {
  const area = XLSX.utils.decode_range(ws['!ref'])
  const cel = (r, c) => ws[XLSX.utils.encode_cell({ r, c })]
  const linha = (r) => {
    const nomes = []
    for (let c = area.s.c; c <= area.e.c; c++) nomes[c] = semAcento(texto(cel(r, c)))
    return nomes
  }
  return { area, cel, linha }
}

// A coluna cujo título passa no teste, entre `de` e `ate` (inclusive). -1 = não achou.
function achar(nomes, de, ate, teste) {
  for (let c = de; c <= ate; c++) if (nomes[c] && teste(nomes[c])) return c
  return -1
}

// O primeiro número à direita de uma célula (o valor de um rótulo do rodapé).
function numeroADireita(aba, r, c) {
  for (let cc = c + 1; cc <= aba.area.e.c; cc++) {
    const cel = aba.cel(r, cc)
    if (!cel || cel.v == null || texto(cel) === '') continue
    const n = numero(cel)
    if (n !== null) return arredondar(n, 2)
  }
  return null
}

// ---------------------------------------------------------------------------
// Contrato — Boletim de Medição (aba BM)
// ---------------------------------------------------------------------------

// Linha dos títulos: tem ITEM, e a linha de baixo tem ADEQUADO.
function cabecalhoDoBoletim(aba) {
  for (let r = aba.area.s.r; r <= Math.min(aba.area.e.r - 1, aba.area.s.r + 29); r++) {
    if (aba.linha(r).includes('ITEM') && aba.linha(r + 1).includes('ADEQUADO')) return r
  }
  return -1
}

function colunasDoBoletim(aba, r) {
  const cima = aba.linha(r)
  const baixo = aba.linha(r + 1)
  const fim = aba.area.e.c
  const ini = aba.area.s.c
  const qtd = achar(cima, ini, fim, (n) => n.startsWith('QUANTIDADE'))
  const val = achar(cima, ini, fim, (n) => n.startsWith('VALOR'))
  const pct = achar(cima, ini, fim, (n) => n.startsWith('PERCENTUAL'))
  const fimQtd = (pct > qtd ? pct : val) - 1
  const col = {
    item: achar(cima, ini, fim, (n) => n === 'ITEM'),
    descricao: achar(cima, ini, fim, (n) => n.startsWith('DESCRI') || n.startsWith('DISCRIMINA')),
    unidade: achar(cima, ini, fim, (n) => n.startsWith('UNID') || n === 'UN'),
    qtd_prevista: achar(baixo, qtd, fimQtd, (n) => n === 'PREVISTO'),
    qtd_contratada: achar(baixo, qtd, fimQtd, (n) => n === 'ADEQUADO'),
    qtd_periodo: achar(baixo, qtd, fimQtd, (n) => n === 'NO PERIODO'),
    qtd_acumulada: achar(baixo, qtd, fimQtd, (n) => n === 'ACUMULADO'),
    preco_unitario: achar(baixo, val, fim, (n) => n.startsWith('UNIT')),
    valor_previsto: achar(baixo, val, fim, (n) => n === 'PREVISTO'),
    valor_contratado: achar(baixo, val, fim, (n) => n === 'ADEQUADO'),
    valor_periodo: achar(baixo, val, fim, (n) => n === 'NO PERIODO'),
    valor_acumulado: achar(baixo, val, fim, (n) => n === 'ACUMULADO'),
  }
  if (qtd < 0 || val < 0) return null
  return Object.values(col).every((c) => c >= 0) ? col : null
}

// O cabeçalho do boletim, acima dos títulos: nº, data, período e contrato.
function cabecalhoDoContrato(XLSX, aba, ate) {
  const cab = { numero: null, numeroLido: '', data: null, periodo_inicio: null, periodo_fim: null, contrato: '' }
  for (let r = aba.area.s.r; r < ate; r++) {
    for (let c = aba.area.s.c; c <= aba.area.e.c; c++) {
      const t = texto(aba.cel(r, c))
      if (!t) continue
      if (!cab.numeroLido && /^N\s*[º°o]/i.test(t)) {
        cab.numeroLido = t
        const n = t.match(/^N\s*[º°o]\.?\s*(\d+)/i)
        cab.numero = n ? Number(n[1]) : null
      }
      if (!cab.data && /^data\s*:/i.test(t)) {
        cab.data = dataDoTexto(t)
        for (let cc = c + 1; !cab.data && cc <= Math.min(c + 4, aba.area.e.c); cc++) cab.data = data(XLSX, aba.cel(r, cc))
      }
      const p = t.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:a|até|-)\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
      if (p && !cab.periodo_inicio) {
        cab.periodo_inicio = dataDoTexto(p[1])
        cab.periodo_fim = dataDoTexto(p[2])
      }
      const k = t.match(/^contrato\s*:\s*([\s\S]+)/i)
      if (k && !cab.contrato) cab.contrato = k[1].replace(/\s+/g, ' ').trim()
    }
  }
  return cab
}

const ehEtapa = (codigo) => /^\d+(\.0+)?$/.test(codigo)

// Lê o boletim do contrato. Linha com unidade = serviço; sem unidade = título: código
// terminado em ".0" (ou sem ponto) é etapa, outro é subetapa. Para no "TOTAL GERAL DA MEDIÇÃO".
export function lerBoletimContrato(XLSX, dados) {
  const wb = XLSX.read(dados, { type: 'array' })
  const candidatas = [...wb.SheetNames.filter((n) => semAcento(n) === 'BM'), ...wb.SheetNames.filter((n) => semAcento(n) !== 'BM')]
  let nomeAba = null
  let aba = null
  let r = -1
  for (const nome of candidatas) {
    const ws = wb.Sheets[nome]
    if (!ws?.['!ref']) continue
    const a = abrir(XLSX, ws)
    const achada = cabecalhoDoBoletim(a)
    if (achada >= 0) { nomeAba = nome; aba = a; r = achada; break }
  }
  if (!aba) {
    throw erroDaPlanilha('Não achei o Boletim de Medição (uma aba com as colunas ITEM, QUANTIDADE e VALORES, e ADEQUADO embaixo). Esta é a planilha de medição do contrato?')
  }
  const col = colunasDoBoletim(aba, r)
  if (!col) throw erroDaPlanilha(`Achei o boletim na aba "${nomeAba}", mas não reconheci todas as colunas (Previsto, Adequado, No período, Acumulado, Unit.). A planilha mudou de modelo?`)

  const cabecalho = cabecalhoDoContrato(XLSX, aba, r)
  const itens = []
  const problemas = []
  let etapa = null
  let sub = null
  let total = null
  for (let l = r + 2; l <= aba.area.e.r; l++) {
    const item = texto(aba.cel(l, col.item))
    const descricao = texto(aba.cel(l, col.descricao))
    const unidade = texto(aba.cel(l, col.unidade))
    if (semAcento(item).startsWith('TOTAL GERAL') || semAcento(descricao).startsWith('TOTAL GERAL')) {
      total = {
        previsto: arredondar(numero(aba.cel(l, col.valor_previsto)), 2), contratado: arredondar(numero(aba.cel(l, col.valor_contratado)), 2),
        periodo: arredondar(numero(aba.cel(l, col.valor_periodo)), 2), acumulado: arredondar(numero(aba.cel(l, col.valor_acumulado)), 2),
      }
      break
    }
    if (!item && !descricao) continue
    if (!unidade) {
      if (ehEtapa(item) || !etapa) { etapa = { codigo: item, nome: descricao }; sub = null }
      else sub = { codigo: item, nome: descricao }
      continue
    }
    const v = {}
    for (const campo of ['preco_unitario', 'qtd_prevista', 'qtd_contratada', 'qtd_periodo', 'qtd_acumulada', 'valor_previsto', 'valor_contratado', 'valor_periodo', 'valor_acumulado']) {
      v[campo] = arredondar(numero(aba.cel(l, col[campo])), campo.startsWith('valor') ? 2 : 4)
    }
    if (Object.values(v).some((n) => n === null)) {
      problemas.push({ linha: l + 1, motivo: `o serviço ${item || '(sem código)'} tem um valor que não deu para ler` })
      continue
    }
    const daSub = sub && item.startsWith(`${sub.codigo}.`)
    itens.push({
      linha_planilha: l + 1, item, descricao, unidade,
      etapa_codigo: etapa?.codigo ?? null, etapa_nome: etapa?.nome ?? null,
      subetapa_codigo: daSub ? sub.codigo : null, subetapa_nome: daSub ? sub.nome : null,
      ...v,
    })
  }
  return { aba: nomeAba, cabecalho, itens, total, problemas }
}

// ---------------------------------------------------------------------------
// Empreiteiro — uma aba por medição
// ---------------------------------------------------------------------------

// Rodapé: parar antes dos dados bancários. Qualquer destes na linha encerra a leitura.
const DADOS_BANCARIOS = /DADOS PARA PAG|BANCO|AGENCIA|PIX|CPF|CNPJ|CONTA CORRENTE|FAVORECIDO/

function cabecalhoDaAba(aba) {
  for (let r = aba.area.s.r; r <= Math.min(aba.area.e.r - 1, aba.area.s.r + 29); r++) {
    const nomes = aba.linha(r)
    if (nomes.includes('ITEM') && nomes.some((n) => n?.startsWith('DISCRIMINA')) && nomes.includes('FISICO') && nomes.includes('FINANCEIRO')) return r
  }
  return -1
}

function colunasDaAba(aba, r) {
  const cima = aba.linha(r)
  const baixo = aba.linha(r + 1)
  const ini = aba.area.s.c
  const fim = aba.area.e.c
  const fis = cima.indexOf('FISICO')
  const fin = cima.indexOf('FINANCEIRO')
  const col = {
    item: cima.indexOf('ITEM'),
    descricao: achar(cima, ini, fim, (n) => n.startsWith('DISCRIMINA')),
    unidade: achar(cima, ini, fim, (n) => n.startsWith('UNID') || n === 'UN'),
    preco_unitario: achar(cima, ini, fim, (n) => n.startsWith('VALOR UNIT') || n.startsWith('PRECO UNIT')),
    qtd_prevista: achar(baixo, fis, fin - 1, (n) => n === 'PREVISTO'),
    qtd_periodo: achar(baixo, fis, fin - 1, (n) => n.includes('PERIODO')),
    qtd_acumulada: achar(baixo, fis, fin - 1, (n) => n.includes('ACUMULADO')),
    valor_previsto: achar(baixo, fin, fim, (n) => n === 'PREVISTO'),
    valor_periodo: achar(baixo, fin, fim, (n) => n.includes('PERIODO')),
    valor_acumulado: achar(baixo, fin, fim, (n) => n.includes('ACUMULADO')),
  }
  return fis < fin && Object.values(col).every((c) => c >= 0) ? col : null
}

function topoDaAba(XLSX, aba, ate) {
  const topo = { numero: null, data: null }
  for (let r = aba.area.s.r; r < ate; r++) {
    for (let c = aba.area.s.c; c <= aba.area.e.c; c++) {
      const t = texto(aba.cel(r, c))
      if (!t) continue
      const s = semAcento(t)
      const n = s.match(/MEDICAO\s*:?\s*N\s*[º°O]?\.?\s*(\d+)/)
      if (n && topo.numero === null) topo.numero = Number(n[1])
      if (topo.data === null && /^DATA\b/.test(s)) {
        topo.data = dataDoTexto(t)
        for (let cc = c + 1; topo.data === null && cc <= Math.min(c + 4, aba.area.e.c); cc++) topo.data = data(XLSX, aba.cel(r, cc))
      }
    }
  }
  return topo
}

function lerAbaEmpreiteiro(XLSX, ws, nomeAba) {
  const aba = abrir(XLSX, ws)
  const r = cabecalhoDaAba(aba)
  if (r < 0) return null
  const col = colunasDaAba(aba, r)
  if (!col) return null

  const topo = topoDaAba(XLSX, aba, r)
  // Sem nº ou data no topo, tenta o nome da aba ("30ª med 05.07.25", "21.10.2025").
  const numeroDaAba = nomeAba.match(/^\s*(\d+)\s*[ªºa°]/i)
  const numeroMedicao = topo.numero ?? (numeroDaAba ? Number(numeroDaAba[1]) : null)
  const dataMedicao = topo.data ?? dataDoTexto(nomeAba)

  const itens = []
  const problemas = []
  let l = r + 2
  for (; l <= aba.area.e.r; l++) {
    const item = texto(aba.cel(l, col.item))
    if (semAcento(item).startsWith('EXECUTANTE')) break
    const descricao = texto(aba.cel(l, col.descricao))
    if (!descricao) continue // item vazio do modelo
    const v = {}
    for (const campo of ['preco_unitario', 'qtd_prevista', 'qtd_periodo', 'qtd_acumulada', 'valor_previsto', 'valor_periodo', 'valor_acumulado']) {
      v[campo] = arredondar(numero(aba.cel(l, col[campo])), campo.startsWith('valor') ? 2 : 4)
    }
    if (Object.values(v).some((n) => n === null)) {
      problemas.push({ linha: l + 1, motivo: `o item ${item || '(sem número)'} tem um valor que não deu para ler` })
      continue
    }
    itens.push({
      linha_planilha: l + 1, item, descricao, unidade: texto(aba.cel(l, col.unidade)),
      etapa_codigo: null, etapa_nome: null, subetapa_codigo: null, subetapa_nome: null,
      ...v, qtd_contratada: v.qtd_prevista, valor_contratado: v.valor_previsto,
    })
  }

  // Rodapé (só os rótulos que importam), até os dados bancários.
  const rodape = { total: null, desconto: null, valorMedicao: null, aPagar: null, observacao: '' }
  for (let rr = l; rr <= Math.min(aba.area.e.r, l + 12); rr++) {
    const nomes = aba.linha(rr)
    if (nomes.some((n) => n && DADOS_BANCARIOS.test(n))) break
    for (let c = aba.area.s.c; c <= aba.area.e.c; c++) {
      const s = nomes[c]
      if (!s) continue
      if (s.startsWith('TOTAL NO PERIODO') && rodape.total === null) rodape.total = numeroADireita(aba, rr, c)
      else if (s.startsWith('DESCONTO') && rodape.desconto === null) rodape.desconto = numeroADireita(aba, rr, c)
      else if (s.startsWith('VALOR DA MEDICAO') && rodape.valorMedicao === null) rodape.valorMedicao = numeroADireita(aba, rr, c)
      else if (s.startsWith('VALOR A PAGAR') && rodape.aPagar === null) rodape.aPagar = numeroADireita(aba, rr, c)
      else if (s.startsWith('OBSERVACAO') && !rodape.observacao) {
        const t = texto(aba.cel(rr, c))
        rodape.observacao = t.slice(t.indexOf(':') + 1).trim() || (DADOS_BANCARIOS.test(aba.linha(rr + 1)[c] ?? '') ? '' : texto(aba.cel(rr + 1, c)))
      }
    }
  }

  const somaPeriodo = arredondar(itens.reduce((s, i) => s + i.valor_periodo, 0), 2)
  return {
    aba: nomeAba, numero: numeroMedicao, data: dataMedicao, itens, problemas,
    totalLido: rodape.total,
    valor_periodo: rodape.total ?? somaPeriodo,
    desconto: rodape.desconto,
    valor_a_pagar: rodape.aPagar ?? rodape.valorMedicao,
    observacao: rodape.observacao,
  }
}

// Lê todas as abas de medição do arquivo do empreiteiro (as outras abas são ignoradas).
export function lerPlanilhaEmpreiteiro(XLSX, dados) {
  const wb = XLSX.read(dados, { type: 'array' })
  const abas = []
  for (const nome of wb.SheetNames) {
    const ws = wb.Sheets[nome]
    if (!ws?.['!ref']) continue
    const lida = lerAbaEmpreiteiro(XLSX, ws, nome)
    if (lida) abas.push(lida)
  }
  if (!abas.length) {
    throw erroDaPlanilha('Não achei nenhuma aba de medição de empreiteiro (com as colunas ITEM, DISCRIMINAÇÃO, FÍSICO e FINANCEIRO). Esta é a planilha do empreiteiro?')
  }
  return abas
}
