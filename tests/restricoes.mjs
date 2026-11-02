// Planejamento — Médio prazo: o quadro de semanas das restrições.
import { montarLookahead, novoPrazo, podeMover, validarRestricao, responsaveis, contarRestricoes, detalharRestricao } from '../src/lib/restricoes.js'
import { montarEap } from '../src/lib/planejamento.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const hoje = '2026-11-04' // quarta-feira
const at = (id, pai_id, ordem, titulo, arquivada = false) => ({ id, pai_id, ordem, titulo, data_inicio: '2026-11-02', data_fim: '2026-11-30', arquivada })
const eap = montarEap([at('ele', null, 0, 'Elétrica'), at('fio', 'ele', 0, 'Fiação'), at('pin', null, 1, 'Pintura'), at('vel', null, 2, 'Velha', true)])
const r = (id, atividade_id, prazo, responsavel, extra = {}) =>
  ({ id, atividade_id, descricao: id, tipo: 'Material', prazo, responsavel, resolvida: false, resolvida_em: null, ...extra })
const lista = [
  r('vencida', 'fio', '2026-10-30', 'Israel'),
  r('hoje', 'fio', '2026-11-04', 'Ricardo'),
  r('sexta', 'pin', '2026-11-06', 'Israel'),
  r('prox', 'pin', '2026-11-10', 'Israel'),
  r('longe', 'pin', '2026-12-01', 'Israel'),
  r('resolvida', 'fio', '2026-11-05', 'Ricardo', { resolvida: true, resolvida_em: '2026-11-03' }),
  r('antiga-ok', 'fio', '2026-10-20', 'Israel', { resolvida: true, resolvida_em: '2026-10-19' }),
  r('atrasada-ok', 'fio', '2026-10-28', 'Israel', { resolvida: true, resolvida_em: '2026-11-03' }),
  r('arquivada', 'vel', '2026-11-05', 'Israel'),
]

const q = montarLookahead(lista, eap, hoje, { semanas: 3 })
conferir('3 semanas a partir da segunda desta semana', q.colunas.map((c) => [c.inicio, c.fim]),
  [['2026-11-02', '2026-11-08'], ['2026-11-09', '2026-11-15'], ['2026-11-16', '2026-11-22']])
conferir('vencida entra na semana atual; resolvida e de atividade arquivada ficam de fora', q.colunas.map((c) => c.itens.map((x) => x.id)),
  [['vencida', 'hoje', 'sexta'], ['prox'], []])
conferir('a vencida vem marcada', q.colunas[0].itens.map((x) => x.vencida), [true, false, false])
conferir('cada item traz o código e o nome da atividade', q.colunas[0].itens[0].atividade, { codigo: '1.1', titulo: 'Fiação' })
conferir('quantas ficam depois do horizonte', q.depois, 1)

const comResolvidas = montarLookahead(lista, eap, hoje, { semanas: 3, verResolvidas: true })
conferir('mostrar resolvidas: a da semana e a resolvida com atraso nesta semana aparecem; a antiga não', comResolvidas.colunas[0].itens.map((x) => x.id), ['atrasada-ok', 'vencida', 'hoje', 'resolvida', 'sexta'])
conferir('sem o filtro, nenhuma resolvida aparece', q.colunas.flatMap((c) => c.itens).some((x) => x.resolvida), false)
conferir('filtro por responsável', montarLookahead(lista, eap, hoje, { semanas: 6, responsavel: 'Ricardo' }).colunas.flatMap((c) => c.itens.map((x) => x.id)), ['hoje'])
conferir('6 semanas alcançam a de dezembro', montarLookahead(lista, eap, hoje, { semanas: 6 }).depois, 0)

conferir('mover para a próxima semana soma 7 dias', novoPrazo('2026-11-06', 1, hoje), '2026-11-13')
conferir('vencida andando para a frente conta a partir de hoje', novoPrazo('2026-10-30', 1, hoje), '2026-11-11')
conferir('voltar uma semana', novoPrazo('2026-11-13', -1, hoje), '2026-11-06')
conferir('não volta para antes de hoje', [podeMover(lista[2], -1, hoje), podeMover(lista[3], -1, hoje), podeMover(lista[0], -1, hoje)], [false, true, false])
conferir('resolvida não muda de semana', podeMover(lista[5], 1, hoje), false)

conferir('validação: tudo certo', validarRestricao({ atividade_id: 'fio', descricao: 'x', tipo: 'Projeto', prazo: hoje, responsavel: 'Israel' }, hoje), {})
conferir('validação: tudo vazio', Object.keys(validarRestricao({ atividade_id: '', descricao: ' ', tipo: '', prazo: '', responsavel: '' }, hoje)),
  ['atividade_id', 'descricao', 'tipo', 'prazo', 'responsavel'])
conferir('validação: tipo fora da lista', validarRestricao({ atividade_id: 'fio', descricao: 'x', tipo: 'Chuva', prazo: hoje, responsavel: 'I' }, hoje).tipo, 'Escolha o tipo.')
conferir('validação: prazo no passado (só ao criar)', [
  validarRestricao({ atividade_id: 'fio', descricao: 'x', tipo: 'Projeto', prazo: '2026-11-01', responsavel: 'I' }, hoje).prazo,
  validarRestricao({ id: 'a', atividade_id: 'fio', descricao: 'x', tipo: 'Projeto', prazo: '2026-11-01', responsavel: 'I' }, hoje).prazo,
], ['O prazo não pode ser antes de hoje.', undefined])

conferir('responsáveis sem repetir, em ordem', responsaveis(lista), ['Israel', 'Ricardo'])
conferir('contadores (atividade arquivada não conta)', contarRestricoes(lista, eap, hoje), { abertas: 5, vencidas: 1, resolvidas: 3 })

conferir('detalhar: com a atividade e se venceu', [detalharRestricao(lista, eap, 'vencida', hoje).atividade.codigo, detalharRestricao(lista, eap, 'vencida', hoje).vencida], ['1.1', true])
conferir('detalhar: atividade arquivada não abre', detalharRestricao(lista, eap, 'arquivada', hoje), null)

console.log(`${ok}/${tot} — restricoes`)
process.exit(ok === tot ? 0 : 1)
