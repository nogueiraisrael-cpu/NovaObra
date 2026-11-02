// Planejamento — Curto prazo: quais atividades entram na semana, o Kanban e o PPC.
import { itensDaSemana, montarKanban, calcularPpc, historicoPpc, validarCausa, contarSubtarefas, rotuloDaSemana } from '../src/lib/curtoPrazo.js'
import { montarEap } from '../src/lib/planejamento.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const at = (id, pai_id, ordem, ini, fim, progresso = 0) => ({ id, pai_id, ordem, titulo: id, data_inicio: ini, data_fim: fim, progresso, arquivada: false })
const eap = montarEap([
  at('grupo', null, 0, '2026-10-01', '2026-11-30'),
  at('cruza', 'grupo', 0, '2026-11-04', '2026-11-12'),
  at('atrasada', 'grupo', 1, '2026-10-20', '2026-10-30', 60),
  at('cedo', 'grupo', 2, '2026-10-26', '2026-11-20'),
  at('futura', 'grupo', 3, '2026-11-16', '2026-11-20'),
  at('feita', 'grupo', 4, '2026-10-12', '2026-10-16', 100),
  at('feita-agora', 'grupo', 5, '2026-11-02', '2026-11-03', 100),
])
const sem = '2026-11-02'
const reg = (atividade_id, semana, status, extra = {}) => ({ atividade_id, semana, status, nao_realizada: false, causa: null, ...extra })
const registros = [
  reg('cruza', sem, 'Em andamento'),
  reg('cedo', '2026-10-26', 'Concluído'),
  reg('atrasada', '2026-10-26', 'Em andamento', { nao_realizada: true, causa: 'Material' }),
]

const itens = itensDaSemana(eap, registros, sem)
conferir('entram: as que cruzam a semana e a atrasada não terminada; grupo, futura e terminadas antes ficam fora',
  itens.map((x) => x.atividade.id), ['cruza', 'atrasada', 'feita-agora'])
conferir('a atrasada vem marcada como acumulada', itens.map((x) => x.acumulada), [false, true, false])
conferir('status vem do registro da semana; sem registro = A fazer', itens.map((x) => x.status), ['Em andamento', 'A fazer', 'Concluído'])
conferir('o "não realizada" é da semana em que foi marcado', [itens[1].nao_realizada, itensDaSemana(eap, registros, '2026-10-26').find((x) => x.atividade.id === 'atrasada').causa], [false, 'Material'])
conferir('concluída numa semana sai das seguintes', itensDaSemana(eap, registros, '2026-10-26').some((x) => x.atividade.id === 'cedo'), true)
conferir('semana antes de tudo começar: nada', itensDaSemana(eap, registros, '2026-09-07'), [])
conferir('semanas depois do fim: só as que não terminaram, acumuladas', itensDaSemana(eap, registros, '2027-03-01').map((x) => x.atividade.id), ['cruza', 'atrasada', 'futura'])

const kanban = montarKanban(itens)
conferir('Kanban em três colunas', Object.fromEntries(Object.entries(kanban).map(([k, v]) => [k, v.map((x) => x.atividade.id)])),
  { 'A fazer': ['atrasada'], 'Em andamento': ['cruza'], 'Concluído': ['feita-agora'] })

conferir('PPC: concluídas / planejadas', calcularPpc(itens), { concluidas: 1, total: 3, pct: 33 })
conferir('PPC sem atividade planejada não é zero: é vazio', calcularPpc([]), { concluidas: 0, total: 0, pct: null })
const hist = historicoPpc(eap, registros, sem, 3)
conferir('histórico do PPC: as últimas semanas, da mais antiga para a atual', hist.map((h) => [h.semana, h.pct]),
  [['2026-10-19', 0], ['2026-10-26', 50], ['2026-11-02', 33]])

conferir('causa precisa estar na lista', [validarCausa('Clima'), validarCausa(''), validarCausa('Preguiça')], [null, 'Escolha a causa.', 'Escolha a causa.'])
conferir('subtarefas feitas', contarSubtarefas([{ feita: true }, { feita: false }, { feita: true }]), { feitas: 2, total: 3 })

conferir('rótulo da semana', ['2026-11-02', '2026-10-26', '2026-11-09', '2026-11-16'].map((s) => rotuloDaSemana(s, '2026-11-02')),
  ['Esta semana', 'Semana passada', 'Próxima semana', 'Semana de 16/11'])

console.log(`${ok}/${tot} — curtoPrazo`)
process.exit(ok === tot ? 0 : 1)
