// Frentes de serviço: "parada há N dias", ordem da lista e o processo 1 (fechar o RDO).
import {
  diasParada, separarFrentes, aplicarFechamento, aplicarFechamentoAtrasado, validarPreenchimento,
  situacaoPadraoDoDia, diariosParaHerdar, lancamentosHerdados, DIARIOS_PARA_HERDAR,
} from '../src/lib/frentes.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const hoje = '2026-10-31'
const f = (id, nome, situacao, parada_desde = null) => ({ id, nome, situacao, parada_desde, motivo_parada: parada_desde ? 'Chuva' : null, data_inicio: null })

conferir('parada desde 25/10 = 6 dias', diasParada(f('a', 'A', 'Parada', '2026-10-25'), hoje), 6)
conferir('virada de mês conta certo', diasParada(f('a', 'A', 'Parada', '2026-09-30'), hoje), 31)
conferir('em execução não tem dias parada', diasParada(f('a', 'A', 'Em execução'), hoje), null)

const lista = [f('1', 'Pintura', 'Não iniciada'), f('2', 'Reboco', 'Parada', '2026-10-29'), f('3', 'Hidro', 'Em execução'), f('4', 'Imper', 'Parada', '2026-10-20'), f('5', 'Sapatas', 'Concluída')]
const { ativas, concluidas } = separarFrentes(lista, hoje)
conferir('paradas primeiro, a mais antiga no topo', ativas.map((x) => x.id), ['4', '2', '3', '1'])
conferir('concluídas separadas', concluidas.map((x) => x.id), ['5'])

conferir('parada sem motivo é recusada', validarPreenchimento({ situacao: 'Parada' }), 'Escolha o motivo da parada.')
conferir('em execução sem motivo passa', validarPreenchimento({ situacao: 'Em execução' }), null)

// Processo 1
const antes = [f('x', 'X', 'Em execução'), f('y', 'Y', 'Parada', '2026-10-20'), f('z', 'Z', 'Parada', '2026-10-28'), f('w', 'W', 'Em execução')]
const doDia = [
  { frente_id: 'x', situacao: 'Parada', motivo_parada: 'Falta de material' },
  { frente_id: 'y', situacao: 'Parada', motivo_parada: 'Chuva' },
  { frente_id: 'z', situacao: 'Em execução' },
  { frente_id: 'w', situacao: 'Concluída' },
]
const depois = Object.fromEntries(aplicarFechamento(antes, doDia, hoje).map((x) => [x.id, x]))
conferir('frente que parou hoje grava parada_desde = hoje', [depois.x.situacao, depois.x.parada_desde, depois.x.motivo_parada], ['Parada', hoje, 'Falta de material'])
conferir('frente que continua parada mantém a data antiga', depois.y.parada_desde, '2026-10-20')
conferir('frente que voltou limpa parada_desde', [depois.z.situacao, depois.z.parada_desde], ['Em execução', null])
conferir('frente concluída grava a data', [depois.w.situacao, depois.w.data_conclusao], ['Concluída', hoje])
conferir('frente sem registro no dia não muda', aplicarFechamento([f('q', 'Q', 'Parada', '2026-10-01')], [], hoje)[0].parada_desde, '2026-10-01')

// Fechar atrasado um dia que passou: frente decidida por um dia fechado mais novo não volta atrás.
const obraFr = [
  { ...f('x', 'Reboco', 'Concluída'), data_inicio: '2026-10-28', data_conclusao: '2026-10-30' },
  f('y', 'Pintura', 'Não iniciada'),
]
const doDiaVelho = [{ frente_id: 'x', situacao: 'Em execução', motivo_parada: null }, { frente_id: 'y', situacao: 'Parada', motivo_parada: 'Chuva' }]
const atrasado = aplicarFechamentoAtrasado(obraFr, doDiaVelho, '2026-10-26', ['x'])
conferir('frente fechada depois continua Concluída, só o início vai para trás', [atrasado[0].situacao, atrasado[0].data_inicio, atrasado[0].data_conclusao], ['Concluída', '2026-10-26', '2026-10-30'])
conferir('frente sem dia mais novo segue o dia fechado agora', [atrasado[1].situacao, atrasado[1].parada_desde, atrasado[1].motivo_parada], ['Parada', '2026-10-26', 'Chuva'])
conferir('sem dia mais novo é igual ao fechamento normal', aplicarFechamentoAtrasado(obraFr, doDiaVelho, '2026-10-26', []), aplicarFechamento(obraFr, doDiaVelho, '2026-10-26'))
conferir('início mais antigo não é empurrado para frente', aplicarFechamentoAtrasado(obraFr, doDiaVelho, '2026-10-29', ['x'])[0].data_inicio, '2026-10-28')

// Equipe que continua de um dia para o outro
conferir('não iniciada começa o dia em execução', situacaoPadraoDoDia(f('a', 'A', 'Não iniciada')), 'Em execução')
conferir('parada continua parada', situacaoPadraoDoDia(f('a', 'A', 'Parada', '2026-10-20')), 'Parada')
const dias = Array.from({ length: 9 }, (_, i) => ({ id: `r${i}`, data: `2026-10-${String(22 + i).padStart(2, '0')}` })) // 22 a 30
dias.push({ id: 'rhoje', data: hoje })
const paraHerdar = diariosParaHerdar(dias, hoje)
conferir('procura só nos 7 diários mais novos antes de hoje', paraHerdar.map((r) => r.id), ['r8', 'r7', 'r6', 'r5', 'r4', 'r3', 'r2'])
conferir('o limite é o da constante', paraHerdar.length, DIARIOS_PARA_HERDAR)
const frentesH = [f('x', 'X', 'Em execução'), f('y', 'Y', 'Em execução'), f('z', 'Z', 'Parada', '2026-10-29'), f('w', 'W', 'Em execução'), f('v', 'V', 'Em execução'), f('u', 'U', 'Em execução')]
const lancs = [
  { id: 'x-velho', rdo_id: 'r6', frente_id: 'x', situacao: 'Em execução' },
  { id: 'x-novo', rdo_id: 'r8', frente_id: 'x', situacao: 'Em execução' },
  { id: 'y-parou', rdo_id: 'r8', frente_id: 'y', situacao: 'Parada' },
  { id: 'y-antes', rdo_id: 'r7', frente_id: 'y', situacao: 'Em execução' },
  { id: 'z-exec', rdo_id: 'r8', frente_id: 'z', situacao: 'Em execução' },
  { id: 'w-exec', rdo_id: 'r8', frente_id: 'w', situacao: 'Em execução' },
  { id: 'v-antigo', rdo_id: 'r0', frente_id: 'v', situacao: 'Em execução' },
  { id: 'u-pulou', rdo_id: 'r5', frente_id: 'u', situacao: 'Em execução' },
]
const herd = lancamentosHerdados(frentesH, paraHerdar, lancs, ['w'])
conferir('herda do lançamento mais novo', herd.get('x')?.id, 'x-novo')
conferir('frente parada no último lançamento não herda', herd.has('y'), false)
conferir('frente que hoje está parada não herda', herd.has('z'), false)
conferir('frente já lançada hoje não herda', herd.has('w'), false)
conferir('lançamento fora dos 7 diários não conta', herd.has('v'), false)
// Ontem ficou sem fechar: a frente lançada "Em execução" continua "Não iniciada" no cadastro, e herda mesmo assim.
conferir('não iniciada lançada num dia sem fechar herda', lancamentosHerdados([f('n', 'N', 'Não iniciada')], paraHerdar, [{ id: 'n1', rdo_id: 'r8', frente_id: 'n', situacao: 'Em execução' }], []).get('n')?.id, 'n1')
conferir('dia pulado no meio não quebra: vale o último lançamento dela', herd.get('u')?.id, 'u-pulou')

console.log(`${ok}/${tot} — frentes`)
process.exit(ok === tot ? 0 : 1)
