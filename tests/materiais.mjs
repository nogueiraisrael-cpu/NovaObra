// Materiais: aging, lead time, atrasado, contadores, ordem das colunas e as regras de mover.
import {
  proximoStatus, statusAnterior, lerQuantidade, quantidadeComUnidade, novoPedido, pedeFormulario, foiRecebido, filtrarQuantidade, diasNaColuna, leadTime, estaAtrasado,
  chegaEstaSemana, recebidoComProblema, contadores, montarQuadro, validarNovoPedido, validarMovimento, aplicarMovimento,
} from '../src/lib/materiais.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const hoje = '2026-11-01'
const p = (id, status, extra = {}) => ({ id, status, prioridade: 'Normal', previsao_entrega: null, historico: [{ status: 'Solicitar', data: '2026-10-20' }], ...extra })

conferir('próxima coluna', [proximoStatus('Solicitar'), proximoStatus('No almoxarifado'), proximoStatus('Entregue')], ['Em cotação', 'Entregue', null])
conferir('coluna anterior', [statusAnterior('Em cotação'), statusAnterior('Solicitar')], ['Solicitar', null])

conferir('quantidade com vírgula', lerQuantidade('2,5'), 2.5)
conferir('quantidade com milhar', lerQuantidade('2.000'), 2000)
conferir('ponto sem grupo de 3 é decimal (não vira 25)', [lerQuantidade('2.5'), lerQuantidade('1.234,5')], [2.5, 1234.5])
conferir('zero e texto não são quantidade', [lerQuantidade('0'), lerQuantidade('abc'), lerQuantidade('')], [null, null, null])
conferir('campo de quantidade só aceita número', [filtrarQuantidade('5a0'), filtrarQuantidade('2,555'), filtrarQuantidade('1,2,3')], ['50', '2,55', '1,23'])

conferir('plural da unidade', [quantidadeComUnidade(10, 'lata'), quantidadeComUnidade(1, 'saco'), quantidadeComUnidade(6, 'm³'), quantidadeComUnidade(2000, 'un'), quantidadeComUnidade(2.5, 'kg')],
  ['10 latas', '1 saco', '6 m³', '2.000 un', '2,5 kg'])

const andando =p('a', 'Comprado', { historico: [{ status: 'Solicitar', data: '2026-10-20' }, { status: 'Em cotação', data: '2026-10-22' }, { status: 'Comprado', data: '2026-10-28' }] })
conferir('há 4 dias na coluna Comprado', diasNaColuna(andando, hoje), 4)
conferir('sem chegar ao almoxarifado não tem lead time', leadTime(andando), null)
const chegou = { ...andando, historico: [...andando.historico, { status: 'No almoxarifado', data: '2026-10-31' }] }
conferir('lead time = do pedido até o almoxarifado', leadTime({ ...chegou, status: 'No almoxarifado' }), 11)
conferir('voltou para Comprado: o cartão não mostra lead time', leadTime({ ...chegou, status: 'Comprado' }), null)
conferir('voltar e avançar de novo não muda o lead time (conta a primeira chegada)',
  leadTime({ ...chegou, status: 'No almoxarifado', historico: [...chegou.historico, { status: 'Comprado', data: '2026-11-01' }, { status: 'No almoxarifado', data: '2026-11-05' }] }), 11)

conferir('previsão vencida em Comprado é atrasado', estaAtrasado(p('x', 'Comprado', { previsao_entrega: '2026-10-30' }), hoje), true)
conferir('previsão de hoje ainda não é atrasado', estaAtrasado(p('x', 'Comprado', { previsao_entrega: hoje }), hoje), false)
conferir('já no almoxarifado não é atrasado', estaAtrasado(p('x', 'No almoxarifado', { previsao_entrega: '2026-10-30' }), hoje), false)
conferir('chega esta semana: hoje e mais 6 dias', [
  chegaEstaSemana(p('x', 'Comprado', { previsao_entrega: hoje }), hoje),
  chegaEstaSemana(p('x', 'Comprado', { previsao_entrega: '2026-11-07' }), hoje),
  chegaEstaSemana(p('x', 'Comprado', { previsao_entrega: '2026-11-08' }), hoje),
  chegaEstaSemana(p('x', 'Comprado', { previsao_entrega: '2026-10-31' }), hoje),
], [true, true, false, false])
conferir('recebido com problema', [
  recebidoComProblema({ status: 'No almoxarifado', qtd_bate_nf: false, estado_ok: true }),
  recebidoComProblema({ status: 'Entregue', qtd_bate_nf: true, estado_ok: false }),
  recebidoComProblema({ status: 'No almoxarifado', qtd_bate_nf: true, estado_ok: true }),
  recebidoComProblema({ status: 'Solicitar' }),
], [true, true, false, false])
conferir('voltou para Comprado: o checklist antigo não marca o cartão', recebidoComProblema({ status: 'Comprado', qtd_bate_nf: false, estado_ok: true }), false)

const lista = [
  p('1', 'Em cotação'), p('2', 'Em cotação'),
  p('3', 'Comprado', { previsao_entrega: '2026-10-29' }),
  p('4', 'Comprado', { previsao_entrega: '2026-11-03' }),
  p('5', 'Comprado', { previsao_entrega: '2026-11-20' }),
]
conferir('contadores', contadores(lista, hoje), { em_cotacao: 2, chegando_semana: 1, atrasados: 1 })

const solicitar = [
  p('velho', 'Solicitar', { historico: [{ status: 'Solicitar', data: '2026-10-10' }] }),
  p('novo', 'Solicitar', { historico: [{ status: 'Solicitar', data: '2026-10-30' }] }),
  p('critico', 'Solicitar', { prioridade: 'Crítico', historico: [{ status: 'Solicitar', data: '2026-10-31' }] }),
]
const quadro = montarQuadro([...solicitar, ...lista], hoje)
conferir('cinco colunas, na ordem', Object.keys(quadro), ['Solicitar', 'Em cotação', 'Comprado', 'No almoxarifado', 'Entregue'])
conferir('crítico no topo, depois o mais antigo', quadro.Solicitar.map((x) => x.id), ['critico', 'velho', 'novo'])
conferir('atrasado no topo da coluna Comprado', quadro.Comprado[0].id, '3')

conferir('novo pedido vazio: avisa cada campo', Object.keys(validarNovoPedido({ material_id: '', quantidade: '', frente: ' ', prioridade: 'Normal' })), ['material_id', 'quantidade', 'frente'])
conferir('quantidade zero é recusada', validarNovoPedido({ material_id: 'm', quantidade: '0', frente: 'F', prioridade: 'Normal' }).quantidade, 'Quantidade tem que ser um número maior que zero.')
conferir('novo pedido completo passa', validarNovoPedido({ material_id: 'm', quantidade: '50', frente: 'Reboco', prioridade: 'Crítico' }), {})

conferir('não pula coluna', validarMovimento(p('x', 'Solicitar'), 'Comprado', { fornecedor: 'F', previsao_entrega: hoje }, hoje).status, 'O pedido anda uma coluna por vez.')
conferir('comprado sem fornecedor nem previsão', Object.keys(validarMovimento(p('x', 'Em cotação'), 'Comprado', {}, hoje)), ['fornecedor', 'previsao_entrega'])
conferir('almoxarifado sem o checklist', Object.keys(validarMovimento(p('x', 'Comprado'), 'No almoxarifado', { avarias: '' }, hoje)), ['qtd_bate_nf', 'estado_ok'])
conferir('checklist com "não" é resposta válida', validarMovimento(p('x', 'Comprado'), 'No almoxarifado', { qtd_bate_nf: false, estado_ok: false }, hoje), {})
conferir('entregue sem frente', Object.keys(validarMovimento(p('x', 'No almoxarifado'), 'Entregue', { frente: '' }, hoje)), ['frente'])
conferir('previsão antes de hoje é recusada', validarMovimento(p('x', 'Em cotação'), 'Comprado', { fornecedor: 'F', previsao_entrega: '2026-10-31' }, hoje).previsao_entrega, 'A previsão não pode ser antes de hoje.')
conferir('quais colunas abrem formulário', ['Em cotação', 'Comprado', 'No almoxarifado', 'Entregue'].map(pedeFormulario), [false, true, true, true])
conferir('recebido = almoxarifado ou entregue', ['Comprado', 'No almoxarifado', 'Entregue'].map((status) => foiRecebido({ status })), [false, true, true])
conferir('pedido nasce em Solicitar com o histórico de hoje', novoPedido({ material_id: 'm', quantidade: '2,5', frente: ' Reboco ', prioridade: 'Normal' }, hoje),
  { material_id: 'm', quantidade: 2.5, frente: 'Reboco', prioridade: 'Normal', status: 'Solicitar', historico: [{ status: 'Solicitar', data: hoje }] })
conferir('voltar uma coluna não pede nada', validarMovimento(p('x', 'Comprado'), 'Em cotação', {}, hoje), {})

const comprado = aplicarMovimento(p('x', 'Em cotação', { historico: [{ status: 'Solicitar', data: '2026-10-20' }] }), 'Comprado', { fornecedor: ' Casa do Construtor ', previsao_entrega: '2026-11-05' }, hoje)
conferir('ir para Comprado grava fornecedor, previsão e histórico', comprado,
  { status: 'Comprado', historico: [{ status: 'Solicitar', data: '2026-10-20' }, { status: 'Comprado', data: hoje }], fornecedor: 'Casa do Construtor', previsao_entrega: '2026-11-05' })
const recebido = aplicarMovimento(p('x', 'Comprado'), 'No almoxarifado', { qtd_bate_nf: true, estado_ok: false, avarias: '  ', foto_nf: '' }, hoje)
conferir('checklist gravado; avaria em branco vira vazio', [recebido.qtd_bate_nf, recebido.estado_ok, recebido.avarias, recebido.foto_nf], [true, false, null, null])
conferir('voltar só muda coluna e histórico', Object.keys(aplicarMovimento(p('x', 'Comprado'), 'Em cotação', {}, hoje)), ['status', 'historico'])

console.log(`${ok}/${tot} — materiais`)
process.exit(ok === tot ? 0 : 1)
