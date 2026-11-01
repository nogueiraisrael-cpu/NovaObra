// Frentes de serviço: "parada há N dias", ordem da lista e o processo 1 (fechar o RDO).
import { diasParada, separarFrentes, aplicarFechamento, validarPreenchimento } from '../src/lib/frentes.js'

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

console.log(`${ok}/${tot} — frentes`)
process.exit(ok === tot ? 0 : 1)
