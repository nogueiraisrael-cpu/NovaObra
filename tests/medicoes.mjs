// Medições (v1.3): leitura do Boletim de Medição do contrato e da planilha do empreiteiro,
// e a conferência antes de gravar. As planilhas aqui são montadas no próprio teste, no mesmo
// formato das reais (as reais não vão para o Git). Se as reais estiverem na pasta, elas também
// são conferidas contra os números do PRD-BACKEND.
import fs from 'node:fs'
import * as XLSX from 'xlsx'
import { lerBoletimContrato, lerPlanilhaEmpreiteiro, numeroDoTexto, dataDoTexto, tipoDoArquivo } from '../src/lib/planilhaMedicao.js'
import {
  resumoDoBoletim, avisosDoContrato, validarMedicao, conferirAbas, errosDasAbas, nomesDeEmpreiteiros, nomeDoEmpreiteiro,
  medicaoDoContrato, medicaoDaAba, conferirParaGravar, proximoNumero, formatarReais,
  medicoesDoEmpreiteiro, somaDasAbas, medicaoAnterior, formatarQtd, formatarPct,
} from '../src/lib/medicoes.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const arquivo = (wb) => XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
const livro = (abas) => {
  const wb = XLSX.utils.book_new()
  for (const [nome, linhas] of abas) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), nome)
  return wb
}

conferir('números escritos de vários jeitos', ['1.234,56', '1,234.56', ' R$ 7,00 ', ' -   ', '', 'abc'].map(numeroDoTexto), [1234.56, 1234.56, 7, 0, 0, null])
conferir('datas da planilha', ['Data: 14/06/2026', '30ª med 05.07.25', '21.10.2025', '26.04', '31/13/2026'].map(dataDoTexto),
  ['2026-06-14', '2025-07-05', '2025-10-21', null, null])
conferir('só .xlsx e .xlsm', [tipoDoArquivo({ name: 'a.XLSM', size: 1 }).tipo, tipoDoArquivo({ name: 'a.csv', size: 1 }).erro], ['xlsx', 'Use a planilha em .xlsx ou .xlsm.'])

// ---- Contrato: o boletim no formato da aba BM (títulos nas linhas 10 e 11) ----
const cab = ['ITEM', 'DESCRIÇÃO', 'UNID.', 'QUANTIDADE', '', '', '', '', '', 'PERCENTUAL', '', 'VALORES']
const sub = ['', '', '', 'PREVISTO', ' ADEQUADO ', 'NO PERÍODO', ' FATURADO ', 'ACUMULADO', 'SALDO', 'NO PERÍODO', 'ACUMULADO', 'UNIT.', 'PREVISTO', 'ADEQUADO', 'NO PERÍODO', 'ACUMULADO', 'FATURADO', 'SALDO']
const serv = (item, desc, un, prev, adeq, per, acum, unit) => [item, desc, un, prev, adeq, per, acum, acum, adeq - acum, '', '', unit, prev * unit, adeq * unit, per * unit, acum * unit, acum * unit, (adeq - acum) * unit]
const titulo = (item, desc) => [item, desc]
const bm = (numero, linhasExtras = []) => livro([['ADM', [['outra aba']]], ['BM', [
  [], ['GOVERNO DO ESTADO'], [], [], [], [],
  ['Obra:', 'REFORMA', 'Contrato: \n006/2026 - SIN', '', '', '', '', '', '', 'Medição:', '', numero, 'Data: 14/10/2026'],
  ['', '', '', '', '', '', '', '', '', 'Período:', '', '01/09/2026 a 14/10/2026'],
  ['BOLETIM DE MEDIÇÃO DE SERVIÇOS'],
  cab, sub,
  titulo('1.0', 'SERVIÇOS PRELIMINARES'),
  serv('1.1', 'Placa de obra', 'M2', 24, 24, 6, 6, 500),
  titulo('2.0', 'REDE COLETORA'),
  titulo('2.2', 'TRABALHOS EM TERRA'),
  serv('2.2.1', 'Escavação de vala', 'M3', 100, 150, 50, 120, 10),
  titulo('12.0', 'CASA DE COMANDO'),
  serv('12.1', 'Quadro de comando', 'UND', 1, 1, 0, 0, 3000),
  ...linhasExtras,
  ['TOTAL GERAL DA MEDIÇÃO', '', '', '', '', '', '', '', '', '', '', '', 15000, 16500, 3500, 4200],
  [], ['VALOR DA MEDIÇÃO (R$)', 'não é lido'],
]]])

const lido = lerBoletimContrato(XLSX, arquivo(bm('Nº 3/2026 - SIN')))
conferir('acha a aba BM mesmo não sendo a primeira', lido.aba, 'BM')
conferir('lê o cabeçalho', lido.cabecalho, { numero: 3, numeroLido: 'Nº 3/2026 - SIN', data: '2026-10-14', periodo_inicio: '2026-09-01', periodo_fim: '2026-10-14', contrato: '006/2026 - SIN' })
conferir('linha com unidade é serviço; para no TOTAL GERAL', lido.itens.map((i) => i.item), ['1.1', '2.2.1', '12.1'])
conferir('etapa, subetapa e etapa direto no serviço (12.1)', lido.itens.map((i) => [i.etapa_codigo, i.subetapa_codigo]), [['1.0', null], ['2.0', '2.2'], ['12.0', null]])
conferir('quantidades: prevista, adequada (contratada), período, acumulada',
  lido.itens.map((i) => [i.qtd_prevista, i.qtd_contratada, i.qtd_periodo, i.qtd_acumulada]), [[24, 24, 6, 6], [100, 150, 50, 120], [1, 1, 0, 0]])
conferir('valores lidos da planilha', lido.itens[1], {
  ...lido.itens[1], preco_unitario: 10, valor_previsto: 1000, valor_contratado: 1500, valor_periodo: 500, valor_acumulado: 1200,
})
conferir('o resumo usa a linha TOTAL GERAL', resumoDoBoletim(lido), { etapas: 3, servicos: 3, previsto: 15000, contratado: 16500, periodo: 3500, acumulado: 4200 })
const conferido = { numero: 3, data_medicao: '2026-10-14', periodo_inicio: '2026-09-01', periodo_fim: '2026-10-14' }
conferir('boletim que bate não tem aviso', avisosDoContrato(lido, conferido), [])

const xxx = lerBoletimContrato(XLSX, arquivo(bm('Nº XXX/2026 - SIN', [serv('12.2', 'Gerador', 'UND', 1, 1, 1, 1, '#REF!')])))
conferir('nº "XXX" fica em branco', xxx.cabecalho.numero, null)
conferir('linha com valor ilegível fica de fora, com o número da linha', xxx.problemas, [{ linha: 19, motivo: 'o serviço 12.2 tem um valor que não deu para ler' }])
const avisos = avisosDoContrato(xxx, { ...conferido, data_medicao: '2026-06-14' }, [
  { item: '1.1', descricao: 'PLACA DE OBRA' }, { item: '2.2.1', descricao: 'Escavação mecanizada' }, { item: '9.9', descricao: 'Sumiu' },
])
conferir('avisos: nº XXX, data fora do período, linha ilegível, serviço sumido e mudado', avisos, [
  'O nº da medição veio na planilha como “Nº XXX/2026 - SIN”: confira o número.',
  'A data da medição está fora do período.',
  'Linha 19: o serviço 12.2 tem um valor que não deu para ler. Ela ficou de fora.',
  'O serviço 9.9 estava na medição anterior e não está nesta.',
  'O serviço 2.2.1 mudou de descrição desde a medição anterior.',
])
const naoBate = lerBoletimContrato(XLSX, arquivo(bm('Nº 3', [serv('12.2', 'Gerador', 'UND', 1, 1, 1, 1, 100)])))
conferir('soma dos serviços diferente do TOTAL GERAL vira aviso', avisosDoContrato(naoBate, conferido).length, 3)

let erro = null
try { lerBoletimContrato(XLSX, arquivo(livro([['Plan1', [['ITEM', 'Atividade']]]]))) } catch (e) { erro = e }
conferir('planilha que não é boletim: erro da planilha, com frase', [erro?.daPlanilha, /Boletim de Medição/.test(erro?.message)], [true, true])

// ---- Contrato: erros que impedem gravar ----
conferir('nº vazio, nº repetido, data faltando', [
  validarMedicao({ numero: '', data_medicao: '2026-10-14' }, []).numero,
  validarMedicao({ numero: '3', data_medicao: '2026-10-14' }, [1, 2, 3]).numero,
  validarMedicao({ numero: '2.5', data_medicao: '2026-10-14' }, []).numero,
  validarMedicao({ numero: 4, data_medicao: '' }, [1, 2, 3]).data,
  validarMedicao({ numero: 4, data_medicao: '2026-10-14', periodo_inicio: '2026-10-01', periodo_fim: '2026-09-01' }, []).periodo,
], ['Digite o nº da medição.', 'Já existe uma 3ª medição. Use outro número.', 'O nº da medição é um número inteiro, de 1 para cima.', 'Escolha a data da medição.', 'O fim do período vem antes do início.'])
conferir('próximo nº sugerido', [proximoNumero([]), proximoNumero([{ numero: 1 }, { numero: 3 }])], [1, 4])
const pacote = medicaoDoContrato(lido, conferido, 'BM 3.xlsm', [])
conferir('o que vai para o banco (contrato)', [pacote.campos.tipo, pacote.campos.numero, pacote.campos.valor_periodo, pacote.campos.aba_origem, pacote.itens.length, Object.keys(pacote.itens[0]).length], ['Contrato', 3, 3500, 'BM', 3, 17])
conferir('a camada de dados recusa nº repetido e aceita trocar a própria', [
  conferirParaGravar([pacote], [{ id: 'a', numero: 3 }]), conferirParaGravar([pacote], [{ id: 'a', numero: 3 }], 'a'),
], ['Já existe uma 3ª medição. Use outro número.', null])

// ---- Empreiteiro: uma aba por medição ----
const abaEmp = (numero, data, itens, total, { topo = true } = {}) => [
  topo ? ['', '', 'HB ENGENHARIA LTDA'] : [],
  topo ? ['', '', `MEDIÇÃO :  Nº  ${numero}`, '', '', '', '', '', '', '', ' DATA: ', data] : [],
  [], [], [], [], ['', '', 'EXECUTANTE : FULANO'], [], [],
  ['ITEM', 'DISCRIMINAÇÃO', 'UNID', ' VALOR UNITARIO ', 'FÍSICO', '', '', '', 'FINANCEIRO'],
  ['', '', '', '', ' PREVISTO ', ' EXECUTADO NO PERÍODO ', ' EXECUTADO ACUMULADO ', '%', 'PREVISTO', 'EXECUTADO NO PERÍODO', 'EXECUTADO ACUMULADO', '%'],
  ...itens.map(([item, desc, un, unit, prev, per, acum]) => [item, desc, un, unit, prev, per, acum, '', prev * unit, per * unit, acum * unit]),
  ['3', '', '', '', '', '', ' -   ', '', ' R$ -   '], // item vazio do modelo: ignorado
  ['EXECUTANTE:', '', '', ' VISTO DIRETORIA: ', '', '', '', 'TOTAL NO PERÍODO', '', total],
  ['', '', '', '', '', '', '', 'DESCONTO', '', '', 100],
  ['', '', '', '', '', '', '', 'VALOR DA MEDIÇÃO', '', '', total - 100],
  ['ENGº RESPONSÁVEL:', '', '', '', '', '', '', 'OBSERVAÇÃO: Período: junho/25'],
  ['VALOR A PAGAR', '', '', ' R$1.400,00 '],
  ['DADOS PARA PAGAMENTO'],
  ['BANCO', '', 'Banco Fictício 999'],
]
const planilha = livro([
  ['31ª med 20.07.25', abaEmp(31, '20/07/2025', [['1', 'Reboco', 'm²', 30, 100, 50, 80]], 1500)],
  ['30ª med 05.07.25', abaEmp(30, 45843, [['1', 'Reboco', 'm²', 30, 100, 30, 30]], 900)],
  ['21.10.2025', abaEmp(30, '21/10/2025', [['1', 'Chapisco', 'm²', 5, 10, 10, 10]], 50)],
  ['02ª med 06.05', abaEmp(0, '', [['1', 'Pintura', 'm²', 10, 10, 1, 1]], 10, { topo: false })],
  ['Resumo', [['não é medição']]],
])
const abas = lerPlanilhaEmpreiteiro(XLSX, arquivo(planilha))
conferir('lê só as abas de medição', abas.map((a) => a.aba), ['31ª med 20.07.25', '30ª med 05.07.25', '21.10.2025', '02ª med 06.05'])
conferir('nº e data do topo; sem topo, do nome da aba', abas.map((a) => [a.numero, a.data]), [[31, '2025-07-20'], [30, '2025-07-05'], [30, '2025-10-21'], [2, null]])
conferir('itens sem discriminação são ignorados', abas[0].itens.map((i) => i.item), ['1'])
conferir('físico e financeiro; contratado = previsto', abas[0].itens[0], {
  ...abas[0].itens[0], preco_unitario: 30, qtd_prevista: 100, qtd_contratada: 100, qtd_periodo: 50, qtd_acumulada: 80,
  valor_previsto: 3000, valor_contratado: 3000, valor_periodo: 1500, valor_acumulado: 2400,
})
conferir('rodapé: total, desconto, valor a pagar e observação', [abas[0].valor_periodo, abas[0].desconto, abas[0].valor_a_pagar, abas[0].observacao], [1500, 100, 1400, 'Período: junho/25'])
conferir('o bloco de dados bancários nunca é lido', JSON.stringify(abas).includes('Fictício'), false)

const conferidas = conferirAbas(abas, [{ aba_origem: '31ª med 20.07.25', numero: 31 }])
conferir('a aba já importada vem marcada como "já no app"', conferidas.map((a) => a.jaNoApp), [true, false, false, false])
conferir('nº repetido no arquivo e data faltando viram aviso', [conferidas[1].avisos, conferidas[3].avisos], [
  ['O Nº 30 também está em “21.10.2025”.'], ['Não achei a data desta medição na aba.'],
])
conferir('nº repetido entre as marcadas e com o app é erro', errosDasAbas(
  [{ ...conferidas[1] }, { ...conferidas[2] }, { ...conferidas[3], data: '2025-05-06' }, { ...conferidas[0], numero: 32, data: '2025-08-01' }],
  [{ numero: 31 }],
), ['Já existe uma 30ª medição. Use outro número.', 'Já existe uma 30ª medição. Use outro número.', null, null])
conferir('corrigido o nº, passa', errosDasAbas([{ ...conferidas[1] }, { ...conferidas[2], numero: '32' }], [{ numero: 31 }]), [null, null])
const daAba = medicaoDaAba({ ...conferidas[1] }, ' Reboco Forte ', 'Reboco.xlsx')
conferir('o que vai para o banco (empreiteiro)', [daAba.campos.tipo, daAba.campos.empreiteiro, daAba.campos.numero, daAba.campos.desconto, daAba.campos.avisos.length], ['Empreiteiro', 'Reboco Forte', 30, 100, 1])
conferir('empreiteiro vazio é recusado', conferirParaGravar([medicaoDaAba(conferidas[1], '  ', 'x.xlsx')], []), 'Escolha ou digite o empreiteiro.')

conferir('empreiteiros: os terceirizados das frentes e os que já têm medição, sem repetir', nomesDeEmpreiteiros(
  [{ executor: 'Terceirizado', empreiteiro: 'Reboco Forte' }, { executor: 'Equipe própria', empreiteiro: null }, { executor: 'Terceirizado', empreiteiro: 'Imperme RN' }],
  [{ tipo: 'Empreiteiro', empreiteiro: 'reboco forte' }, { tipo: 'Empreiteiro', empreiteiro: 'Topógrafo' }, { tipo: 'Contrato', empreiteiro: null }],
), ['Imperme RN', 'Reboco Forte', 'Topógrafo'])
conferir('nome digitado com outra grafia vira o que já existe', nomeDoEmpreiteiro('  reboco   forte ', ['Reboco Forte']), 'Reboco Forte')
// Achados da revisão de código (03/11/2026).
conferir('pacote misturado (contrato + empreiteiro) é recusado: a conferência do nº só vale para um grupo',
  conferirParaGravar([pacote, daAba], []), 'Importe um contrato ou um empreiteiro de cada vez.')
conferir('mesmo empreiteiro com outra maiúscula é o mesmo grupo', conferirParaGravar([daAba, medicaoDaAba({ ...conferidas[2], numero: 32 }, 'reboco forte', 'x.xlsx')], []), null)
conferir('tipo fora da lista do banco é recusado', conferirParaGravar([{ ...pacote, campos: { ...pacote.campos, tipo: 'Medição' } }], []), 'Tipo de medição desconhecido: Medição.')
conferir('as medições do empreiteiro sem ligar para maiúscula e espaço',
  medicoesDoEmpreiteiro([{ empreiteiro: 'Reboco Forte' }, { empreiteiro: 'reboco  forte ' }, { empreiteiro: 'Imperme RN' }], 'REBOCO FORTE').length, 2)
conferir('soma das abas marcadas, arredondada', somaDasAbas([{ valor_periodo: 0.1, desconto: 0.2 }, { valor_periodo: 0.2, desconto: null }]), { total: 0.3, descontos: 0.2 })
const bms = [{ id: 'a', numero: 1 }, { id: 'b', numero: 2 }, { id: 'c', numero: 3 }]
conferir('medição anterior: nova compara com a última; trocando a 2ª compara com a 1ª (mesmo com a 3ª gravada)',
  [medicaoAnterior(bms)?.id, medicaoAnterior(bms, bms[1])?.id, medicaoAnterior(bms, bms[0]), medicaoAnterior([])], ['c', 'a', null, null])
conferir('quantidade com 2 casas e unidade; % com 1 casa', [formatarQtd(125.4, 'm³'), formatarQtd(1), formatarPct(63.25)], ['125,40 m³', '1,00', '63,3%'])
conferir('R$ no formato brasileiro', formatarReais(2664011.25).replace(/\s/g, ' '), 'R$ 2.664.011,25')

// ---- As planilhas reais, se estiverem na pasta (não vão para o Git) ----
const real = (nome) => (fs.existsSync(nome) ? new Uint8Array(fs.readFileSync(nome)) : null)
const bmReal = real('medição real do contrato.xlsm')
if (bmReal) {
  const c = lerBoletimContrato(XLSX, bmReal)
  conferir('planilha real do contrato: os números do PRD', resumoDoBoletim(c), {
    etapas: 13, servicos: 277, previsto: 1790178.34, contratado: 2664011.25, periodo: 138346.23, acumulado: 1789748.4,
  })
  conferir('planilha real do contrato: nº XXX, data fora do período', avisosDoContrato(c, { data_medicao: c.cabecalho.data, periodo_inicio: c.cabecalho.periodo_inicio, periodo_fim: c.cabecalho.periodo_fim }).length, 2)
}
const empReal = real('medição empreiteiro.xlsx')
if (empReal) {
  const a = conferirAbas(lerPlanilhaEmpreiteiro(XLSX, empReal), [])
  conferir('planilha real do empreiteiro: 33 abas, com os nº 30, 26 e 2 repetidos', [a.length, [...new Set(a.filter((x) => x.avisos.some((t) => t.includes('também está'))).map((x) => x.numero))]], [33, [30, 26, 2]])
}

console.log(`${ok}/${tot} — medicoes`)
process.exit(ok === tot ? 0 : 1)
