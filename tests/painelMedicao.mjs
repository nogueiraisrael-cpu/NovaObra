// Painel de medição: as contas do contrato (casando serviços entre medições pelo item) e do
// empreiteiro (cada medição sozinha), a escolha "1ª · 2ª · … · Todas", a busca e o filtro.
// Usa os dados de exemplo (mockData): a UBS tem 3 medições do contrato; a Serra, o Drywall e o Gesso.
import { criarMock } from './apoio/mockData.js'
import { alternarEscolha, painelContrato, painelEmpreiteiro, filtrarEtapas, passaNoFiltro, compararItens } from '../src/lib/painelMedicao.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const db = criarMock('2026-11-02')
const contrato = db.medicoes.filter((m) => m.obra_id === 'obra-ubs' && m.tipo === 'Contrato')
const itensDe = (meds) => db.medicao_itens.filter((i) => meds.some((m) => m.id === i.medicao_id))
const itensContrato = itensDe(contrato)

conferir('escolha: tocar liga e desliga; o último desligado volta para Todas', [
  alternarEscolha(null, 2), alternarEscolha([2], 1), alternarEscolha([1, 2], 2), alternarEscolha([2], 2), alternarEscolha([1, 3], null),
], [[2], [1, 2], [1], null, null])
conferir('códigos em ordem natural (2.10 depois de 2.2)', ['2.10', '10.1', '2.2', '2.1.3', '9'].sort(compararItens), ['2.1.3', '2.2', '2.10', '9', '10.1'])

// ---- Contrato ----
const todas = painelContrato(contrato, itensContrato, null)
const t = todas.totais
conferir('Todas: adequado, medido (= acumulado da 3ª), saldo e %', [t.adequado, t.medido, t.saldo, t.pct, todas.ultima.numero], [2418300, 771500, 1646800, 31.9, 3])
conferir('Todas = soma dos três períodos', t.medido, 139000 + 256000 + 376500)
conferir('previsto original e o período da última', [t.previsto, t.ultimaPeriodo], [2418300 - 4800 - 30000, 376500])
conferir('as 8 etapas, na ordem, com o % do PRD', todas.etapas.map((e) => `${e.codigo} ${Math.round(e.pct)}%`),
  ['1.0 100%', '2.0 85%', '3.0 40%', '4.0 15%', '5.0 10%', '6.0 0%', '7.0 0%', '8.0 0%'])
const fundacao = todas.etapas[1]
conferir('Fundação: duas subetapas, nenhum serviço solto', [fundacao.subetapas.map((s) => s.codigo), fundacao.servicos.length, fundacao.adequado, fundacao.medido], [['2.1', '2.2'], 0, 412000, 350200])
const sapata = todas.servicos.find((s) => s.item === '2.1.3')
conferir('2.1.3 medido acima do adequado: saldo negativo, vermelho, e cresceu na adequação',
  [sapata.qtd_medida, sapata.saldo_qtd, sapata.saldo_valor, sapata.acima, sapata.cresceu], [91.2, -4.8, -3600, true, true])
conferir('só o 2.1.3 está acima; 2.1.3 e 4.1 cresceram', [todas.servicos.filter((s) => s.acima).map((s) => s.item), todas.servicos.filter((s) => s.cresceu).map((s) => s.item)], [['2.1.3'], ['2.1.3', '4.1']])
conferir('a etapa herda o vermelho do serviço', [fundacao.acima, fundacao.subetapas[0].acima, fundacao.subetapas[1].acima], [true, true, false])

conferir('a barra da etapa em Todas: tudo forte, nada "antes"', [fundacao.barra.escolha, fundacao.barra.antes, fundacao.barra.estourou], [85, 0, false])
conferir('% da última medição embaixo do % medido', t.ultimaPct, 15.6)
const so2 = painelContrato(contrato, itensContrato, [2])
const fund2 = so2.etapas[1]
conferir('só a 2ª: a barra separa o medido na 2ª do que veio antes; o cinza é o saldo até a 2ª',
  [Math.round(fund2.barra.escolha), Math.round(fund2.barra.antes), Math.round(100 - fund2.barra.escolha - fund2.barra.antes), Math.round((fund2.saldo / fund2.adequado) * 100)], [42, 15, 42, 42])
conferir('só a 2ª: medido é o período dela; saldo conta tudo até a 2ª', [so2.totais.medido, so2.totais.saldo, so2.ultima.numero], [256000, 2418300 - 395000, 2])
conferir('só a 2ª: o 2.1.3 ainda não passou do adequado', so2.servicos.find((s) => s.item === '2.1.3').acima, false)
const um3 = painelContrato(contrato, itensContrato, [1, 3])
conferir('1ª e 3ª: soma os dois períodos; saldo até a 3ª', [um3.totais.medido, um3.totais.saldo], [139000 + 376500, 1646800])
conferir('sem medição: nada para mostrar', painelContrato([], [], null), null)

conferir('filtro "só com saldo negativo": só a Fundação, só o 2.1.3',
  filtrarEtapas(todas.etapas, { soNegativo: true }).map((e) => [e.codigo, e.subetapas.map((s) => s.servicos.map((x) => x.item))]), [['2.0', [['2.1.3']]]])
conferir('busca sem acento ("tubulacao") acha "Tubulação" na descrição', filtrarEtapas(todas.etapas, { busca: 'tubulacao' }).flatMap((e) => e.servicos.map((s) => s.item)), ['5.1', '5.2'])
conferir('busca pelo código do item', passaNoFiltro({ item: '2.2.1', descricao: 'x' }, { busca: '2.2' }), true)
conferir('sem filtro, a árvore volta inteira', filtrarEtapas(todas.etapas, { busca: '  ' }).length, 8)

// Bug achado com a planilha real (02/11/2026): o 1.8 tinha adequado R$ 26.468,46 e acumulado
// R$ 26.468,47, com a mesma quantidade. Centavo de arredondamento não é "acima do contratado".
const centavo = painelContrato([{ id: 'm1', numero: 1, valor_periodo: 0 }], [{
  medicao_id: 'm1', item: '1.8', descricao: 'Sanitário', unidade: 'M²', etapa_codigo: '1.0', etapa_nome: 'PRELIMINARES',
  qtd_prevista: 26.5, qtd_contratada: 26.5, qtd_periodo: 0, qtd_acumulada: 26.5,
  valor_previsto: 26468.46, valor_contratado: 26468.46, valor_periodo: 0, valor_acumulado: 26468.47,
}], null)
conferir('centavo de arredondamento não vira "acima do contratado"', [centavo.servicos[0].saldo_valor, centavo.servicos[0].acima, centavo.totais.acimaDoContratado], [-0.01, false, 0])

// ---- Empreiteiro ----
const drywall = db.medicoes.filter((m) => m.empreiteiro === 'Drywall RN')
const d = painelEmpreiteiro(drywall, itensDe(drywall), null)
conferir('Drywall, Todas: previsto, executado, pago e % (pela 2ª)', [d.totais.previsto, d.totais.executado, d.totais.pago, d.totais.pct], [30000, 18400, 18400, 61.3])
conferir('uma barra por medição, com o valor pago', d.barras.map((b) => [b.numero, b.valor]), [[1, 8000], [2, 10400]])
conferir('a tabela agrupa por medição; saldo linha a linha dentro dela', d.grupos.map((g) => g.linhas.map((l) => [l.item, l.saldo_valor])),
  [[['1', 9600], ['2', 6400], ['3', 6000]], [['1', 4000], ['2', 4000], ['3', 3600]]])
const d1 = painelEmpreiteiro(drywall, itensDe(drywall), [1])
conferir('Drywall, só a 1ª: executado e % da 1ª', [d1.totais.executado, d1.totais.pct, d1.grupos.length], [8000, 26.7, 1])
const gesso = db.medicoes.filter((m) => m.empreiteiro === 'Gesso Natal')
// Um empreiteiro só: grupos e barras na ordem do nº, mesmo com datas trocadas na planilha.
const trocadas = drywall.map((m) => ({ ...m, data_medicao: m.numero === 1 ? '2026-12-31' : m.data_medicao }))
conferir('um empreiteiro: ordem do nº, não da data', painelEmpreiteiro(trocadas, itensDe(drywall), null).barras.map((b) => b.numero), [1, 2])
conferir('Gesso por preço global: 65% depois da 2ª', painelEmpreiteiro(gesso, itensDe(gesso), null).totais.pct, 65)

const serra = db.medicoes.filter((m) => m.obra_id === 'obra-serra' && m.tipo === 'Empreiteiro')
const todos = painelEmpreiteiro(serra, itensDe(serra), [1])
conferir('Todos os empreiteiros: ignora a escolha por nº e soma tudo', [todos.varios, todos.grupos.length, todos.totais.executado], [true, 7, 6060 + 2240 + 2700 + 12000 + 7500 + 8000 + 10400])
// A 2ª do Reboco Forte não traz o chapisco: o previsto dele é só o do reboco.
conferir('Todos: o previsto é a soma do de cada empreiteiro (pela última de cada)', todos.totais.previsto, 12600 + 8100 + 30000 + 30000)
conferir('Todos: as barras em ordem de data', todos.barras.map((b) => `${b.empreiteiro} ${b.numero}`),
  ['Gesso Natal 1', 'Reboco Forte 1', 'Drywall RN 1', 'Reboco Forte 2', 'Gesso Natal 2', 'Imperme RN 1', 'Drywall RN 2'])

console.log(`${ok}/${tot} — painelMedicao`)
process.exit(ok === tot ? 0 : 1)
