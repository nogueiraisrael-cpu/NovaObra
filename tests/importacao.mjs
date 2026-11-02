// Importação de cronograma por planilha: leitura do .xlsx/.csv (como TEXTO onde importa),
// hierarquia pelo código ITEM, datas DD/MM/AAAA e a conferência antes de gravar.
import * as XLSX from 'xlsx'
import { normalizarItem, lerData, conferirImportacao, paraGravar } from '../src/lib/importacao.js'
import { gerarModelo, lerPlanilha, lerCsv, COLUNAS, tipoDoArquivo } from '../src/lib/planilhaCronograma.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('código: 1.0 vira 1; 1.10 continua 1.10; espaço e ponto no fim saem',
  ['1.0', '1.10', ' 2.1 ', '3.', '12'].map(normalizarItem), ['1', '1.10', '2.1', '3', '12'])
conferir('datas DD/MM/AAAA (com ou sem zero)', [lerData('02/11/2026'), lerData('2/1/2027'), lerData('2026-11-02')], ['2026-11-02', '2027-01-02', '2026-11-02'])
conferir('data que não existe é recusada', [lerData('31/02/2026'), lerData('ontem'), lerData('')], [null, null, null])

const L = (linha, item, titulo, inicio, fim, duracao = '') => ({ linha, item, titulo, inicio, fim, duracao })
const boa = conferirImportacao([
  L(2, '2', 'Fundação', '', ''),
  L(3, '1', 'Serviços preliminares', '02/11/2026', '06/11/2026', '5'),
  L(4, '2.2', 'Sapatas', '12/11/2026', '20/11/2026'),
  L(5, '2.1', 'Escavação', '09/11/2026', '', '3'),
  L(6, '2.10', 'Décima', '21/11/2026', '21/11/2026'),
  L(7, '2.1.1', 'Vala A', '09/11/2026', '10/11/2026'),
])
conferir('ordena pelo código (2.10 depois de 2.2) e monta a hierarquia', boa.linhas.map((x) => `${x.item}:${x.nivel}:${x.pai ?? '-'}`),
  ['1:0:-', '2:0:-', '2.1:1:2', '2.1.1:2:2.1', '2.2:1:2', '2.10:1:2'])
conferir('término em branco sai do início + duração (dias corridos)', boa.linhas[2].fim, '2026-11-11')
conferir('duração em branco sai das datas', boa.linhas[4].duracao, 9)
conferir('grupo sem datas pega o período das filhas', [boa.linhas[1].inicio, boa.linhas[1].fim], ['2026-11-09', '2026-11-21'])
conferir('sem erros', boa.erros, 0)
const diferente = conferirImportacao([L(2, '1', 'A', '02/11/2026', '06/11/2026', '3')])
conferir('duração que não bate com as datas: aviso, sem impedir, e valem as datas',
  [diferente.erros, diferente.avisos, diferente.linhas[0].duracao, diferente.linhas[0].avisos[0]],
  [0, 1, 5, 'A duração da planilha (3 dias) não bate com as datas (5 dias). Vale o que as datas dizem.'])
conferir('duração que bate não avisa nada', boa.avisos, 0)

const ruim = conferirImportacao([
  L(2, '1', '', '02/11/2026', '03/11/2026'),
  L(3, '3.1', 'Órfã', '02/11/2026', '03/11/2026'),
  L(4, '4', 'Data ruim', '32/11/2026', '03/11/2026'),
  L(5, '5', 'Invertida', '10/11/2026', '03/11/2026'),
  L(6, '1', 'Repetida', '02/11/2026', '03/11/2026'),
  L(7, 'A.1', 'Código ruim', '02/11/2026', '03/11/2026'),
  L(8, '', 'Sem código', '02/11/2026', '03/11/2026'),
  L(9, '6', 'Sem datas', '', ''),
])
const errosDe = (item, titulo) => ruim.linhas.find((x) => x.item === item && (!titulo || x.titulo === titulo)).erros
conferir('sem nome', errosDe('1', ''), ['Atividade sem nome.'])
conferir('código órfão', errosDe('3.1'), ['Falta o item "3" (o 3.1 fica dentro dele).'])
conferir('data inválida', errosDe('4'), ['Data de início inválida: "32/11/2026". Use DD/MM/AAAA.'])
conferir('término antes do início', errosDe('5'), ['O término é antes do início.'])
conferir('código repetido', errosDe('1', 'Repetida'), ['Código 1 repetido (linha 2 também usa).'])
conferir('código fora do padrão', errosDe('A.1'), ['Código "A.1" inválido: use números separados por ponto (ex.: 2.1).'])
conferir('sem código', errosDe(''), ['Falta o código na coluna ITEM.'])
conferir('atividade sem datas e sem filhas', errosDe('6'), ['Falta a data de início.', 'Falta a data de término (ou a duração).'])
conferir('conta os problemas', ruim.erros, 9)

const gravar = paraGravar(boa)
conferir('para gravar: chave, mãe, ordem entre irmãs e datas', gravar.map((x) => [x.chave, x.paiChave, x.ordem, x.data_inicio, x.data_fim]), [
  ['1', null, 0, '2026-11-02', '2026-11-06'], ['2', null, 1, '2026-11-09', '2026-11-21'], ['2.1', '2', 0, '2026-11-09', '2026-11-11'],
  ['2.1.1', '2.1', 0, '2026-11-09', '2026-11-10'], ['2.2', '2', 1, '2026-11-12', '2026-11-20'], ['2.10', '2', 2, '2026-11-21', '2026-11-21'],
])

// O modelo gerado volta igual quando lido (ida e volta pelo .xlsx de verdade).
const wb = gerarModelo(XLSX, '2026-11-02')
const arquivo = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
const lidas = lerPlanilha(XLSX, arquivo)
conferir('o modelo tem as 5 colunas', XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })[0], COLUNAS)
conferir('o modelo volta com os exemplos 1, 2, 2.1, 2.2 (ITEM como texto)', lidas.map((x) => [x.item, x.inicio, x.fim]), [
  ['1', '02/11/2026', '06/11/2026'], ['2', '09/11/2026', '20/11/2026'], ['2.1', '09/11/2026', '12/11/2026'], ['2.2', '13/11/2026', '20/11/2026'],
])
conferir('ITEM do modelo é texto (formato @)', wb.Sheets[wb.SheetNames[0]].A2.z, '@')
conferir('e o modelo passa na conferência', conferirImportacao(lidas).erros, 0)

// Planilha feita à mão: ITEM digitado como número, 1.10 em texto, data como texto, cabeçalho na linha 3.
const ws = XLSX.utils.aoa_to_sheet([['Cronograma da obra'], [], COLUNAS, ['1', 'A', '01/11/2026', '02/11/2026', 2]])
XLSX.utils.sheet_add_aoa(ws, [[{ t: 's', v: '1.10' }, 'B', 46330, 46331, null]], { origin: 'A5' })
ws.C5.z = 'dd/mm/yyyy'; ws.D5.z = 'dd/mm/yyyy'
XLSX.utils.sheet_add_aoa(ws, [[{ t: 'n', v: 2, z: '0.0' }, 'C', '05/11/2026', '06/11/2026', '']], { origin: 'A6' })
const manual = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(manual, ws, 'Plan1')
const lidasManual = lerPlanilha(XLSX, XLSX.write(manual, { type: 'array', bookType: 'xlsx' }))
conferir('acha o cabeçalho fora da 1ª linha; lê 1.10 como texto; data do Excel vira DD/MM/AAAA; 2,0 vira 2',
  lidasManual.map((x) => [x.linha, normalizarItem(x.item), x.inicio, x.fim]),
  [[4, '1', '01/11/2026', '02/11/2026'], [5, '1.10', '04/11/2026', '05/11/2026'], [6, '2', '05/11/2026', '06/11/2026']])
conferir('planilha sem o cabeçalho', (() => { try { lerPlanilha(XLSX, XLSX.write((() => { const b = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet([['a', 'b']]), 'x'); return b })(), { type: 'array', bookType: 'xlsx' })); return 'leu' } catch (e) { return e.message } })(),
  'Não achei o cabeçalho com as colunas ITEM, Atividade, Início e Término. Use a planilha modelo.')

conferir('arquivo aceito ou recusado, com a frase', [tipoDoArquivo({ name: 'A.XLSX', size: 10 }), tipoDoArquivo({ name: 'a.csv', size: 10 }), tipoDoArquivo({ name: 'foto.png', size: 10 }), tipoDoArquivo({ name: 'a.xlsx', size: 6e6 })],
  [{ tipo: 'xlsx' }, { tipo: 'csv' }, { erro: 'Use um arquivo .xlsx ou .csv.' }, { erro: 'Arquivo grande demais (máximo 5 MB).' }])

// CSV: ponto e vírgula (Excel em português) ou vírgula, com aspas.
const csv = 'ITEM;Atividade;Início;Término;Duração (Dias)\n1;"Serviços; preliminares";02/11/2026;06/11/2026;5\n1.10;Décima;07/11/2026;07/11/2026;\n\n'
conferir('CSV com ; e aspas', lerCsv(csv).map((x) => [x.linha, x.item, x.titulo, x.fim]), [[2, '1', 'Serviços; preliminares', '06/11/2026'], [3, '1.10', 'Décima', '07/11/2026']])
conferir('CSV salvo pelo Excel (com a marca invisível no começo)', lerCsv(String.fromCharCode(0xfeff) + 'ITEM;Atividade;Início;Término\n1;A;02/11/2026;03/11/2026').map((x) => x.item), ['1'])
conferir('CSV com vírgula', lerCsv('item,atividade,inicio,termino\r\n2.1,Escavação,09/11/2026,11/11/2026').map((x) => x.titulo), ['Escavação'])

console.log(`${ok}/${tot} — importacao`)
process.exit(ok === tot ? 0 : 1)
