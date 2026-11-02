// Planilha de cronograma: gerar o modelo e ler .xlsx / .csv, tudo no próprio aparelho
// (nada é enviado para lugar nenhum). O SheetJS chega como parâmetro (`XLSX`): a tela o
// carrega só quando precisa, e os testes passam o mesmo pacote no Node.
//
// REGRA QUE SEGURA A ÁRVORE: a coluna ITEM é lida como TEXTO (o valor formatado da célula,
// `w`), nunca como número — como número, "1.10" vira 1.1 e cai dentro do item errado.
// Datas do Excel viram "DD/MM/AAAA" pela conta do próprio SheetJS (sem toISOString: fuso).
import { segundaDaSemana } from './planejamento.js'
import { somarDias } from './datas.js'

export const COLUNAS = ['ITEM', 'Atividade', 'Início', 'Término', 'Duração (Dias)']

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Qual coluna é qual, pelo nome do cabeçalho (sem ligar para acento e maiúscula).
function mapearCabecalho(nomes) {
  const achar = (teste) => nomes.findIndex((n) => teste(semAcento(n)))
  const mapa = {
    item: achar((n) => n === 'item'),
    titulo: achar((n) => n.startsWith('atividade') || n === 'descricao' || n === 'servico'),
    inicio: achar((n) => n.startsWith('inicio')),
    fim: achar((n) => n.startsWith('termino') || n === 'fim'),
    duracao: achar((n) => n.startsWith('duracao')),
  }
  return mapa.item >= 0 && mapa.titulo >= 0 && mapa.inicio >= 0 && mapa.fim >= 0 ? mapa : null
}

const SEM_CABECALHO = 'Não achei o cabeçalho com as colunas ITEM, Atividade, Início e Término. Use a planilha modelo.'
const vazia = (l) => !l.item && !l.titulo && !l.inicio && !l.fim && !l.duracao

// ---------------------------------------------------------------------------
// .xlsx
// ---------------------------------------------------------------------------

const doisDigitos = (n) => String(n).padStart(2, '0')

function textoDaCelula(cel) {
  if (!cel || cel.v == null) return ''
  if (cel.t === 's') return String(cel.v).trim()
  return String(cel.w ?? cel.v).trim()
}

function dataDaCelula(XLSX, cel) {
  if (!cel || cel.v == null) return ''
  if (cel.t === 'n') {
    const d = XLSX.SSF.parse_date_code(cel.v)
    return d ? `${doisDigitos(d.d)}/${doisDigitos(d.m)}/${d.y}` : String(cel.v)
  }
  if (cel.t === 'd' && cel.v instanceof Date) return `${doisDigitos(cel.v.getDate())}/${doisDigitos(cel.v.getMonth() + 1)}/${cel.v.getFullYear()}`
  return String(cel.v).trim()
}

// Lê a primeira aba. O cabeçalho pode estar em qualquer uma das 20 primeiras linhas.
// Devolve as linhas cruas ({ linha, item, titulo, inicio, fim, duracao }, tudo texto).
export function lerPlanilha(XLSX, dados) {
  const wb = XLSX.read(dados, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws?.['!ref']) throw new Error('A planilha está vazia.')
  const area = XLSX.utils.decode_range(ws['!ref'])
  const celula = (r, c) => ws[XLSX.utils.encode_cell({ r, c })]
  let cabecalho = -1
  let mapa = null
  for (let r = area.s.r; r <= Math.min(area.e.r, area.s.r + 19) && !mapa; r++) {
    const nomes = []
    for (let c = area.s.c; c <= area.e.c; c++) nomes[c] = textoDaCelula(celula(r, c))
    mapa = mapearCabecalho(nomes)
    cabecalho = r
  }
  if (!mapa) throw new Error(SEM_CABECALHO)
  const linhas = []
  for (let r = cabecalho + 1; r <= area.e.r; r++) {
    const l = {
      linha: r + 1,
      item: textoDaCelula(celula(r, mapa.item)),
      titulo: textoDaCelula(celula(r, mapa.titulo)),
      inicio: dataDaCelula(XLSX, celula(r, mapa.inicio)),
      fim: dataDaCelula(XLSX, celula(r, mapa.fim)),
      duracao: mapa.duracao >= 0 ? textoDaCelula(celula(r, mapa.duracao)) : '',
    }
    if (!vazia(l)) linhas.push(l)
  }
  return linhas
}

// ---------------------------------------------------------------------------
// .csv (sem biblioteca). Excel em português separa por ";"; aceita "," também.
// ---------------------------------------------------------------------------

function separarCsv(texto, separador) {
  const linhas = []
  let campo = ''
  let linha = []
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (ch === '"') aspas = false
      else campo += ch
    } else if (ch === '"') aspas = true
    else if (ch === separador) { linha.push(campo); campo = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo); linhas.push(linha); linha = []; campo = ''
    } else campo += ch
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha) }
  return linhas
}

export function lerCsv(texto) {
  const limpo = String(texto ?? '').replace(/^\uFEFF/, '')
  const primeira = limpo.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const separador = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ','
  const tabela = separarCsv(limpo, separador)
  const r = tabela.findIndex((nomes, i) => i < 20 && mapearCabecalho(nomes))
  if (r < 0) throw new Error(SEM_CABECALHO)
  const mapa = mapearCabecalho(tabela[r])
  const pegar = (cols, i) => (i >= 0 ? String(cols[i] ?? '').trim() : '')
  return tabela.slice(r + 1)
    .map((cols, i) => ({
      linha: r + i + 2, item: pegar(cols, mapa.item), titulo: pegar(cols, mapa.titulo),
      inicio: pegar(cols, mapa.inicio), fim: pegar(cols, mapa.fim), duracao: pegar(cols, mapa.duracao),
    }))
    .filter((l) => !vazia(l))
}

// ---------------------------------------------------------------------------
// O modelo para baixar: as 5 colunas, com 1, 2, 2.1 e 2.2 de exemplo a partir da semana
// de hoje. A coluna ITEM sai como TEXTO (formato @) também nas linhas vazias, para o
// Excel não transformar "1.10" em 1,1 quando a pessoa digitar.
// ---------------------------------------------------------------------------

const LINHAS_EM_BRANCO = 200
// Dias desde 30/12/1899, a contagem de datas do Excel. Conta em UTC dos dois lados: sem fuso.
const serialExcel = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000
}

export function gerarModelo(XLSX, hoje) {
  const base = segundaDaSemana(hoje)
  const exemplos = [
    ['1', 'Serviços preliminares', 0, 4],
    ['2', 'Fundação', 7, 18],
    ['2.1', 'Escavação', 7, 10],
    ['2.2', 'Sapatas', 11, 18],
  ]
  const ws = XLSX.utils.aoa_to_sheet([COLUNAS])
  const texto = (v) => ({ t: 's', v, z: '@' })
  const data = (dias) => ({ t: 'n', v: serialExcel(somarDias(base, dias)), z: 'dd/mm/yyyy' })
  exemplos.forEach(([item, titulo, ini, fim], i) => {
    const r = i + 2
    ws[`A${r}`] = texto(item)
    ws[`B${r}`] = { t: 's', v: titulo }
    ws[`C${r}`] = data(ini)
    ws[`D${r}`] = data(fim)
    ws[`E${r}`] = { t: 'n', v: fim - ini + 1 }
  })
  const ultima = exemplos.length + 1 + LINHAS_EM_BRANCO
  for (let r = exemplos.length + 2; r <= ultima; r++) ws[`A${r}`] = texto('')
  ws['!ref'] = `A1:E${ultima}`
  ws['!cols'] = [{ wch: 10 }, { wch: 42 }, { wch: 13 }, { wch: 13 }, { wch: 15 }]

  const ajuda = XLSX.utils.aoa_to_sheet([
    ['Como preencher'],
    ['ITEM: o código da atividade. 1 é item de topo; 1.1 fica dentro do 1; 1.1.1 fica dentro do 1.1.'],
    ['A coluna ITEM está como texto de propósito: assim 1.10 continua 1.10 (e não vira 1,1).'],
    ['Início e Término: datas no formato DD/MM/AAAA.'],
    ['Duração (Dias): dias corridos, contando o início e o término. Se o Término ficar em branco, o app calcula pela duração.'],
    ['Um item com subitens pode ficar sem datas: o app usa o período dos subitens.'],
    ['Apague as linhas de exemplo antes de importar.'],
  ])
  ajuda['!cols'] = [{ wch: 110 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Cronograma')
  XLSX.utils.book_append_sheet(wb, ajuda, 'Como preencher')
  return wb
}
