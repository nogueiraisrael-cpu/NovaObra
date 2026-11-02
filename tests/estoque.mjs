// Estoque: saldo pelas movimentações, situação, filtro, baixa e o efeito do pedido no estoque.
import {
  saldoDe, situacao, montarEstoque, ajustarLinha, contarCriticos, filtrarEstoque, validarBaixa, lerMinimo,
  efeitoNoEstoque, bloqueioNoEstoque, saidaDoQueSobrou, podeDesfazer, ordenarHistorico, validarMinimo,
} from '../src/lib/estoque.js'
import { validarMovimento, aplicarMovimento } from '../src/lib/materiais.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const hoje = '2026-11-01'
const mov = (insumo_id, tipo, quantidade) => ({ insumo_id, tipo, quantidade })
const movimentos = [
  mov('a', 'Entrada', 45), mov('a', 'Saída', 30),
  mov('b', 'Entrada', '3.50'), mov('b', 'Saída', 2),
  mov('c', 'Entrada', 0.1), mov('c', 'Entrada', 0.2),
]
conferir('saldo = entradas − saídas', saldoDe(movimentos, 'a'), 15)
conferir('número que vem do banco como texto', saldoDe(movimentos, 'b'), 1.5)
conferir('0,1 + 0,2 dá 0,3 certinho', saldoDe(movimentos, 'c'), 0.3)
conferir('insumo sem movimento tem saldo 0', saldoDe(movimentos, 'z'), 0)

conferir('situação', [situacao(15, 10), situacao(10, 10), situacao(1.5, 2), situacao(0, 0), situacao(5, '0.00')],
  ['Ok', 'Crítico', 'Crítico', 'Sem mínimo', 'Sem mínimo'])

const materiais = [{ id: 'm1', nome: 'Porcelanato', unidade: 'm²' }, { id: 'm2', nome: 'Brita', unidade: 'm³' }, { id: 'm3', nome: 'Areia', unidade: 'm³' }]
const linhas = montarEstoque(
  [{ id: 'a', material_id: 'm1', saldo_minimo: 10 }, { id: 'b', material_id: 'm2', saldo_minimo: '2.00' }, { id: 'c', material_id: 'm3', saldo_minimo: 0 }],
  movimentos, materiais)
conferir('crítico primeiro, depois por nome', linhas.map((l) => l.nome), ['Brita', 'Areia', 'Porcelanato'])
conferir('linha traz unidade e mínimo em número', [linhas[0].unidade, linhas[0].saldo_minimo], ['m³', 2])
conferir('contar críticos', contarCriticos(linhas), 1)
conferir('baixa deixa crítico na hora', ajustarLinha(linhas.find((l) => l.id === 'a'), -6).situacao, 'Crítico')

conferir('busca sem acento e sem maiúscula', filtrarEstoque([{ nome: 'Tubo PVC', situacao: 'Ok' }, { nome: 'Cimento', situacao: 'Ok' }], { busca: 'tubo pvc' }).length, 1)
conferir('busca ignora acento', filtrarEstoque([{ nome: 'Tinta acrílica', situacao: 'Ok' }], { busca: 'ACRILICA' }).length, 1)
conferir('só críticos', filtrarEstoque(linhas, { soCriticos: true }).map((l) => l.nome), ['Brita'])

const brita = linhas[0]
conferir('baixa vazia avisa cada campo', Object.keys(validarBaixa({ insumo_id: '', quantidade: '', frente: '', data: '' }, null, hoje)), ['insumo_id', 'quantidade', 'frente', 'data'])
conferir('saldo nunca negativo: baixa maior que o saldo é recusada', validarBaixa({ insumo_id: 'b', quantidade: '2', frente: 'F', data: hoje }, brita, hoje).quantidade,
  'Saldo insuficiente: há só 1,5 m³ no estoque.')
conferir('baixa do saldo inteiro passa', validarBaixa({ insumo_id: 'b', quantidade: '1,5', frente: 'F', data: hoje }, brita, hoje), {})
conferir('data no futuro é recusada', validarBaixa({ insumo_id: 'b', quantidade: '1', frente: 'F', data: '2026-11-02' }, brita, hoje).data, 'A data não pode ser depois de hoje.')

conferir('mínimo: vazio e zero = sem mínimo; vírgula vale', [lerMinimo(''), lerMinimo('0'), lerMinimo('2,5'), lerMinimo('x')], [0, 0, 2.5, null])

// Checklist: quantidade que não bate pede quanto chegou, e é isso que entra.
const comprado = { status: 'Comprado', quantidade: 4, historico: [] }
conferir('não bate com a nota e sem quantidade: recusa', validarMovimento(comprado, 'No almoxarifado', { qtd_bate_nf: false, estado_ok: true }, hoje).qtd_recebida, 'Informe quanto chegou de fato.')
conferir('bate com a nota: entra o pedido inteiro', aplicarMovimento(comprado, 'No almoxarifado', { qtd_bate_nf: true, estado_ok: true }, hoje).qtd_recebida, 4)
conferir('não bate: entra o que chegou', aplicarMovimento(comprado, 'No almoxarifado', { qtd_bate_nf: false, qtd_recebida: '3,5', estado_ok: true }, hoje).qtd_recebida, 3.5)

// Efeito do pedido no estoque.
const recebido = { status: 'No almoxarifado', quantidade: 4, qtd_recebida: 3.5 }
const entrega = efeitoNoEstoque(recebido, { ...recebido, status: 'Entregue' })
conferir('chegar no almoxarifado = entrada do que chegou', efeitoNoEstoque(comprado, { ...comprado, status: 'No almoxarifado', qtd_recebida: 3.5 }), { tipo: 'Entrada', desfazer: false, quantidade: 3.5 })
conferir('entregar = saída do que chegou', entrega, { tipo: 'Saída', desfazer: false, quantidade: 3.5 })
conferir('voltar do almoxarifado desfaz a entrada', efeitoNoEstoque(recebido, { ...recebido, status: 'Comprado' }), { tipo: 'Entrada', desfazer: true, quantidade: 3.5 })
conferir('voltar da entrega desfaz a saída', efeitoNoEstoque({ ...recebido, status: 'Entregue' }, recebido), { tipo: 'Saída', desfazer: true, quantidade: 3.5 })
conferir('cotar não mexe no estoque', efeitoNoEstoque({ status: 'Solicitar' }, { status: 'Em cotação' }), null)
// Baixa manual e entrega não descontam o mesmo lote duas vezes.
conferir('entregar depois de baixa parcial leva só o que sobrou', saidaDoQueSobrou(entrega, 1.5).quantidade, 1.5)
conferir('entregar com saldo cheio leva o lote inteiro', saidaDoQueSobrou(entrega, 10).quantidade, 3.5)
conferir('lote todo já consumido: a entrega não mexe no estoque', saidaDoQueSobrou(entrega, 0), null)
conferir('a regra do que sobrou não toca a entrada', saidaDoQueSobrou({ tipo: 'Entrada', desfazer: false, quantidade: 9 }, 0).quantidade, 9)
conferir('voltar recebimento já consumido é bloqueado', bloqueioNoEstoque({ tipo: 'Entrada', desfazer: true, quantidade: 3.5 }, 1.5, 'm³'),
  'Parte deste lote já saiu do estoque (há 1,5 m³). Não dá para voltar o recebimento.')
conferir('entrega e voltar com saldo suficiente não bloqueiam', [
  bloqueioNoEstoque({ tipo: 'Saída', desfazer: false, quantidade: 3.5 }, 1, 'm³'),
  bloqueioNoEstoque({ tipo: 'Entrada', desfazer: true, quantidade: 3.5 }, 3.5, 'm³'),
], [null, null])

conferir('só baixa manual se desfaz pelo histórico', [podeDesfazer({ tipo: 'Saída', origem: 'Manual' }), podeDesfazer({ tipo: 'Saída', origem: 'Pedido' }), podeDesfazer({ tipo: 'Entrada', origem: 'Manual' })], [true, false, false])
conferir('histórico: mais novo primeiro; no mesmo dia, o último lançado', ordenarHistorico([
  { id: 1, data: '2026-10-30', created_at: '2026-10-30T10:00' }, { id: 2, data: '2026-11-01', created_at: '2026-11-01T08:00' },
  { id: 3, data: '2026-11-01', created_at: '2026-11-01T09:00' }]).map((m) => m.id), [3, 2, 1])
conferir('mínimo inválido avisa', [validarMinimo('abc'), validarMinimo('2,5'), validarMinimo('')], ['O mínimo tem que ser um número (0 = sem mínimo).', null, null])

console.log(`${ok}/${tot} — estoque`)
process.exit(ok === tot ? 0 : 1)
