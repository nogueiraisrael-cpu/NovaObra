// Planejamento — o que a tela mostra no toque (otimista), antes de o banco responder.
// Tem que bater com o que dados.js grava: rodamos as duas coisas lado a lado no banco em memória.
import * as dados from '../src/lib/dados.js'
import { segundaDaSemana } from '../src/lib/planejamento.js'
import { hojeISO } from '../src/lib/datas.js'
import {
  comAtividade, comArquivadas, comProgresso, comRestricao, comPrazo, comResolvida, semRestricao,
  comStatusNaSemana, comNaoRealizada, novaSubtarefa, comSubtarefa, semSubtarefa,
} from '../src/lib/planejamentoLocal.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

dados._reiniciarMock()
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')
const ler = async () => (await dados.listarPlanejamento()).data
const hoje = hojeISO()
const semana = segundaDaSemana(hoje)
// Compara só os campos que a tela usa (o banco acrescenta id, obra_id, datas de gravação).
const campos = (x, nomes) => Object.fromEntries(nomes.map((n) => [n, x?.[n] ?? null]))

// Kanban: concluir e voltar, na tela e no banco, chegam no mesmo lugar.
let local = comStatusNaSemana(await ler(), 'at-ele-fio', semana, 'Concluído')
await dados.moverNaSemana('at-ele-fio', semana, 'Concluído')
let banco = await ler()
const daSemana = (d) => campos(d.semanas.find((s) => s.atividade_id === 'at-ele-fio' && s.semana === semana), ['status', 'nao_realizada', 'causa', 'progresso_antes'])
const avanco = (d, id) => d.atividades.find((x) => x.id === id).progresso
conferir('concluir: a tela mostra o que o banco grava', [daSemana(local), avanco(local, 'at-ele-fio')], [daSemana(banco), avanco(banco, 'at-ele-fio')])
local = comStatusNaSemana(banco, 'at-ele-fio', semana, 'A fazer')
await dados.moverNaSemana('at-ele-fio', semana, 'A fazer')
banco = await ler()
conferir('voltar de Concluído: idem (o avanço volta a 20)', [daSemana(local), avanco(local, 'at-ele-fio')], [daSemana(banco), avanco(banco, 'at-ele-fio')])
local = comNaoRealizada(banco, 'at-ele-fio', semana, 'Clima')
await dados.marcarNaoRealizada('at-ele-fio', semana, 'Clima')
conferir('não realizada: idem', daSemana(local), daSemana(await ler()))

// Subtarefas.
const sub = (d, id) => campos(d.subtarefas.find((s) => s.id === id), ['feita', 'nao_realizada', 'causa'])
for (const mudanca of [{ causa: 'Material' }, { feita: true }, { causa: 'Projeto' }, { causa: null }, { feita: false }]) {
  local = comSubtarefa(await ler(), 'st-reb-int-3', mudanca)
  await dados.marcarSubtarefa('st-reb-int-3', mudanca)
  conferir(`subtarefa ${JSON.stringify(mudanca)}: idem`, sub(local, 'st-reb-int-3'), sub(await ler(), 'st-reb-int-3'))
}
local = novaSubtarefa(await ler(), 'at-reb-int', ' Nova ')
const criada = (await dados.criarSubtarefa('at-reb-int', ' Nova ')).data
conferir('subtarefa nova: mesmo título e ordem', campos(local.subtarefas.at(-1), ['titulo', 'ordem', 'feita']), campos(criada, ['titulo', 'ordem', 'feita']))
conferir('id provisório até o banco responder', local.subtarefas.at(-1).id.startsWith('tmp-'), true)
conferir('excluir some da tela', semSubtarefa(local, 'st-reb-int-3').subtarefas.some((s) => s.id === 'st-reb-int-3'), false)

// Restrições.
const rs = (d, id) => campos(d.restricoes.find((r) => r.id === id), ['prazo', 'resolvida', 'resolvida_em', 'tipo'])
local = comResolvida(await ler(), 'rs-pintor', true, hoje)
await dados.resolverRestricao('rs-pintor', true)
conferir('resolver: idem', rs(local, 'rs-pintor'), rs(await ler(), 'rs-pintor'))
const movida = (await dados.moverRestricao('rs-porcelanato', 1)).data
conferir('mover de semana: a tela recebe o mesmo prazo', rs(comPrazo(await ler(), 'rs-porcelanato', movida.prazo), 'rs-porcelanato').prazo, movida.prazo)
conferir('restrição nova entra aberta', campos(comRestricao(await ler(), { atividade_id: 'at-aca-pin', descricao: ' x ', tipo: 'Projeto', prazo: hoje, responsavel: 'Eu' }).restricoes.at(-1), ['descricao', 'resolvida']),
  { descricao: 'x', resolvida: false })
conferir('excluir restrição some da tela', semRestricao(await ler(), 'rs-pintor').restricoes.some((r) => r.id === 'rs-pintor'), false)

// EAP e Longo prazo.
const f = { titulo: ' Nova ', data_inicio: hoje, data_fim: hoje, pai_id: 'at-aca' }
local = comAtividade(await ler(), f)
const criadaAt = (await dados.salvarAtividade(f)).data
conferir('atividade nova: mesmos campos', campos(local.atividades.at(-1), ['titulo', 'pai_id', 'ordem', 'progresso', 'arquivada']),
  campos({ ...criadaAt, progresso: 0, arquivada: false }, ['titulo', 'pai_id', 'ordem', 'progresso', 'arquivada']))
const mudouDeLugar = { id: 'at-aca-pin', titulo: 'P', data_inicio: hoje, data_fim: hoje, pai_id: '' }
local = comAtividade(await ler(), mudouDeLugar)
conferir('mudar de "dentro de" vai para o fim das novas irmãs, como no banco',
  local.atividades.find((x) => x.id === 'at-aca-pin').ordem, (await dados.salvarAtividade(mudouDeLugar)).data.ordem)
conferir('arquivar na tela', comArquivadas(await ler(), ['at-reb', 'at-reb-int'], true).atividades.filter((x) => x.arquivada).map((x) => x.id).sort(), ['at-dem-chur', 'at-reb', 'at-reb-int'])
conferir('avanço na tela', avanco(comProgresso(await ler(), 'at-reb-fach', 55, semana), 'at-reb-fach'), 55)

// Achado da revisão: Longo e Curto prazo não podem discordar. Lançar 100% no Longo prazo conclui
// no Kanban desta semana (e entra no PPC); baixar de 100% reabre. Tela e banco, lado a lado.
const { itensDaSemana, calcularPpc } = await import('../src/lib/curtoPrazo.js')
const { montarEap } = await import('../src/lib/planejamento.js')
const noKanban = (d, id) => itensDaSemana(montarEap(d.atividades), d.semanas, semana).find((x) => x.atividade.id === id)?.status
const ppc = (d) => calcularPpc(itensDaSemana(montarEap(d.atividades), d.semanas, semana)).concluidas
const antesDos100 = await ler()
local = comProgresso(antesDos100, 'at-reb-fach', 100, semana)
await dados.salvarProgresso('at-reb-fach', '100')
banco = await ler()
conferir('100% no Longo prazo: Concluído no Kanban, na tela e no banco', [noKanban(local, 'at-reb-fach'), noKanban(banco, 'at-reb-fach')], ['Concluído', 'Concluído'])
conferir('e o PPC da semana conta mais uma', [ppc(local) - ppc(antesDos100), ppc(banco) - ppc(antesDos100)], [1, 1])
local = comProgresso(banco, 'at-reb-fach', 60, semana)
await dados.salvarProgresso('at-reb-fach', '60')
banco = await ler()
conferir('baixar para 60%: sai de Concluído, na tela e no banco', [noKanban(local, 'at-reb-fach'), noKanban(banco, 'at-reb-fach')], ['Em andamento', 'Em andamento'])
conferir('e o PPC volta', ppc(banco), ppc(antesDos100))

console.log(`${ok}/${tot} — planejamentoLocal`)
process.exit(ok === tot ? 0 : 1)
