// Planejamento — EAP: código automático, período dos grupos, dias úteis, arquivar e mover.
import {
  montarEap, listarArquivadas, idsParaArquivar, idsParaDesarquivar, maesPossiveis, proximaOrdem, trocaDeOrdem,
  validarAtividade, diasUteis, andamento, previstoAte, escalaDoCronograma, posicaoNaEscala, posicaoDeHoje,
  lerProgresso, filtrarInteiro, validarCalendario, calendarioDaObra, descreverCalendario,
} from '../src/lib/planejamento.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const a = (id, pai_id, ordem, titulo, data_inicio, data_fim, arquivada = false) => ({ id, pai_id, ordem, titulo, data_inicio, data_fim, arquivada })
const lista = [
  a('dem', null, 0, 'Demolição', '2026-11-02', '2026-11-06'),
  a('hid', null, 1, 'Hidráulica', '2026-11-09', '2026-11-20'),
  a('dem-reboco', 'dem', 1, 'Retirar reboco', '2026-11-04', '2026-11-10'),
  a('dem-piso', 'dem', 0, 'Retirar piso', '2026-11-02', '2026-11-03'),
  a('dem-velha', 'dem', 2, 'Churrasqueira', '2026-11-02', '2026-11-02', true),
  a('dem-piso-a', 'dem-piso', 0, 'Sala', '2026-11-02', '2026-11-02'),
  a('dem-piso-b', 'dem-piso', 1, 'Cozinha', '2026-11-03', '2026-11-03'),
  a('ele', null, 2, 'Elétrica', '2026-11-16', '2026-11-27', true),
  a('ele-fio', 'ele', 0, 'Fiação', '2026-11-16', '2026-11-20', true),
]

const eap = montarEap(lista)
conferir('ordem e código automático (arquivada fica de fora e não abre buraco)', eap.map((x) => `${x.codigo} ${x.titulo}`),
  ['1 Demolição', '1.1 Retirar piso', '1.1.1 Sala', '1.1.2 Cozinha', '1.2 Retirar reboco', '2 Hidráulica'])
conferir('nível na árvore', eap.map((x) => x.nivel), [0, 1, 2, 2, 1, 0])
conferir('grupo: período vem das filhas', ['inicio', 'fim'].map((k) => eap[0][k]), ['2026-11-02', '2026-11-10'])
conferir('grupo do meio também', ['inicio', 'fim'].map((k) => eap[1][k]), ['2026-11-02', '2026-11-03'])
conferir('atividade sem filhas usa as próprias datas', [eap[5].inicio, eap[5].fim, eap[5].grupo], ['2026-11-09', '2026-11-20', false])
conferir('quem tem filha é grupo', eap.map((x) => x.grupo), [true, true, false, false, false, false])
conferir('lista vazia', montarEap([]), [])

conferir('arquivadas: só a de cima de cada galho arquivado, com quantas vão junto', listarArquivadas(lista).map((x) => [x.id, x.junto]),
  [['dem-velha', 0], ['ele', 1]])

conferir('arquivar leva as filhas junto', idsParaArquivar(lista, 'dem-piso').sort(), ['dem-piso', 'dem-piso-a', 'dem-piso-b'])
conferir('desarquivar a filha traz a mãe arquivada de volta', idsParaDesarquivar(lista, 'ele-fio').sort(), ['ele', 'ele-fio'])
conferir('desarquivar a mãe traz as filhas', idsParaDesarquivar(lista, 'ele').sort(), ['ele', 'ele-fio'])

conferir('mãe possível: nem ela mesma, nem as filhas dela, nem arquivada', maesPossiveis(lista, 'dem-piso').map((x) => x.id), ['dem', 'dem-reboco', 'hid'])
conferir('atividade nova pode ir dentro de qualquer ativa', maesPossiveis(lista, null).length, 6)

conferir('próxima ordem conta as arquivadas (não repete número)', [proximaOrdem(lista, 'dem'), proximaOrdem(lista, null), proximaOrdem(lista, 'dem-reboco')], [3, 3, 0])

conferir('subir troca com a irmã de cima', trocaDeOrdem(lista, 'dem-reboco', -1), [{ id: 'dem-reboco', ordem: 0 }, { id: 'dem-piso', ordem: 1 }])
conferir('descer pula a irmã arquivada: não tem mais ninguém', trocaDeOrdem(lista, 'dem-reboco', 1), null)
conferir('a primeira não sobe', trocaDeOrdem(lista, 'dem', -1), null)
conferir('descer a primeira raiz', trocaDeOrdem(lista, 'dem', 1), [{ id: 'dem', ordem: 1 }, { id: 'hid', ordem: 0 }])

conferir('validação: tudo certo', validarAtividade({ titulo: 'Reboco', data_inicio: '2026-11-02', data_fim: '2026-11-02' }), {})
conferir('validação: título vazio e datas faltando', Object.keys(validarAtividade({ titulo: '  ', data_inicio: '', data_fim: '' })), ['titulo', 'data_inicio', 'data_fim'])
conferir('validação: fim antes do início', validarAtividade({ titulo: 'X', data_inicio: '2026-11-05', data_fim: '2026-11-04' }),
  { data_fim: 'O fim não pode ser antes do início.' })

conferir('dias úteis: semana de segunda a sexta', diasUteis('2026-11-02', '2026-11-08'), 5)
conferir('dias úteis: sábado e domingo não contam', diasUteis('2026-11-07', '2026-11-08'), 0)
conferir('dias úteis: feriado não conta', diasUteis('2026-11-02', '2026-11-06', { feriados: ['2026-11-02'] }), 4)
conferir('dias úteis: com sábado de trabalho', diasUteis('2026-11-02', '2026-11-08', { dias: [1, 2, 3, 4, 5, 6] }), 6)

// ---- Longo prazo: previsto x real, escala do cronograma e calendário ----
const SEG_SEX = { dias: [1, 2, 3, 4, 5], feriados: [] }
const p = (id, pai_id, ordem, ini, fim, progresso) => ({ ...a(id, pai_id, ordem, id, ini, fim), progresso })
const obra = [
  p('g', null, 0, '2026-11-02', '2026-11-20', 0),
  p('x1', 'g', 0, '2026-11-02', '2026-11-06', 100),
  p('x2', 'g', 1, '2026-11-09', '2026-11-20', 0),
  p('y', null, 1, '2026-11-16', '2026-11-20', 0),
]
const hoje = '2026-11-11'
const and = andamento(montarEap(obra), hoje, SEG_SEX)
const ver = (id) => [and.linhas[id].real, and.linhas[id].previsto, and.linhas[id].situacao]
conferir('terminada no prazo: concluída', ver('x1'), [100, 100, 'Concluída'])
conferir('2 de 10 dias úteis já terminados (hoje ainda não conta) e nada feito: atrasada', ver('x2'), [0, 20, 'Atrasada'])
conferir('grupo: média pesada pelos dias úteis das filhas', ver('g'), [33, 47, 'Atrasada'])
conferir('ainda não começou', ver('y'), [0, 0, 'Não iniciada'])
conferir('avanço geral da obra (só as atividades sem filhas contam)', [and.geral.real, and.geral.previsto], [25, 35])
conferir('atrasadas não contam o grupo duas vezes', and.atrasadas, 1)
conferir('previsto direto pelas datas', previstoAte('2026-11-09', '2026-11-20', hoje, SEG_SEX), 20)
conferir('previsto respeita o feriado', previstoAte('2026-11-09', '2026-11-20', hoje, { dias: [1, 2, 3, 4, 5], feriados: ['2026-11-10'] }), 11)
conferir('no primeiro dia o previsto é 0: começou hoje não é atraso', [previstoAte(hoje, '2026-11-20', hoje, SEG_SEX), andamento(montarEap([p('n', null, 0, hoje, '2026-11-20', 0)]), hoje, SEG_SEX).linhas.n.situacao], [0, 'Não iniciada'])
conferir('no último dia ainda falta o último dia', previstoAte('2026-11-09', hoje, hoje, SEG_SEX), 67)
conferir('depois do término o previsto é 100', previstoAte('2026-11-09', '2026-11-10', hoje, SEG_SEX), 100)
conferir('obra sem atividade', andamento([], hoje, SEG_SEX).geral, { real: 0, previsto: 0 })

const sem = escalaDoCronograma(montarEap(obra), 'semana')
conferir('semanas começam na segunda', sem.colunas.map((c) => c.rotulo), ['02/11', '09/11', '16/11'])
conferir('escala semanal vai da 1ª segunda ao último domingo', [sem.inicio, sem.fim, sem.dias], ['2026-11-02', '2026-11-22', 21])
conferir('barra: começo e largura em %', posicaoNaEscala(sem, '2026-11-09', '2026-11-20'), { esquerda: 33.33, largura: 57.14 })
conferir('linha de hoje', [posicaoDeHoje(sem, hoje), posicaoDeHoje(sem, '2026-12-01')], [42.86, null])
const mes = escalaDoCronograma(montarEap([...obra, p('z', null, 2, '2026-12-28', '2027-01-05', 0)]), 'mês')
conferir('escala por mês, virando o ano', mes.colunas.map((c) => c.rotulo), ['nov/26', 'dez/26', 'jan/27'])
conferir('mês tem a largura dos seus dias', mes.colunas.map((c) => c.dias), [30, 31, 31])
conferir('escala vazia', escalaDoCronograma([], 'semana').colunas, [])

conferir('progresso aceita 0 a 100', [lerProgresso('0'), lerProgresso('45'), lerProgresso('100')], [0, 45, 100])
conferir('progresso recusa vazio e acima de 100', [lerProgresso(''), lerProgresso('101'), lerProgresso('4,5')], [null, null, null])
conferir('campo de progresso só aceita número', [filtrarInteiro('4a5'), filtrarInteiro('1000')], ['45', '100'])

conferir('calendário: precisa de ao menos um dia', validarCalendario({ dias: [], feriados: [] }), 'Escolha pelo menos um dia de trabalho.')
conferir('calendário certo', validarCalendario({ dias: [1, 2, 3, 4, 5, 6], feriados: ['2026-11-20'] }), null)
conferir('calendário da obra: vem do cadastro, com padrão', [calendarioDaObra({ dias_trabalho: [1, 2, 3, 4, 5, 6], feriados: ['2026-12-25', '2026-11-20'] }), calendarioDaObra({})],
  [{ dias: [1, 2, 3, 4, 5, 6], feriados: ['2026-11-20', '2026-12-25'] }, { dias: [1, 2, 3, 4, 5], feriados: [] }])

conferir('rótulo do calendário', [descreverCalendario({ dias: [1, 2, 3, 4, 5], feriados: [] }), descreverCalendario({ dias: [1, 2, 3, 4, 5, 6], feriados: ['2026-11-20'] }), descreverCalendario({ dias: [1, 3, 5], feriados: ['a', 'b'] })],
  ['seg a sex', 'seg a sáb · 1 feriado', 'seg, qua, sex · 2 feriados'])

console.log(`${ok}/${tot} — planejamento`)
process.exit(ok === tot ? 0 : 1)
