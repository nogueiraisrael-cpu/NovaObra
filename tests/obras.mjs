// Entidade OBRA: validação, obra inicial (a guardada) e ordem do comparativo.
import { escolherObraInicial, validarObra, ordenarResumo, normalizarCodigo, cobraRdoDeOntem, motivoParaNaoApagarObra, frentesParadasDasObras } from '../src/lib/obras.js'
import * as dados from '../src/lib/dados.js'
import { reiniciarMock } from './apoio/bancoMemoria.js'
import { hojeISO } from '../src/lib/datas.js'
import { rotuloParada } from '../src/lib/frentes.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const obras = [{ id: 'a', situacao: 'Concluída' }, { id: 'b', situacao: 'Em andamento' }, { id: 'c', situacao: 'Em andamento' }]
conferir('volta na obra guardada', escolherObraInicial(obras, 'c'), 'c')
conferir('guardada que sumiu → primeira em andamento', escolherObraInicial(obras, 'apagada'), 'b')
conferir('sem guardada → primeira em andamento', escolherObraInicial(obras, null), 'b')
conferir('sem obra nenhuma → null', escolherObraInicial([], 'x'), null)

const boa = { nome: 'Casa', codigo: 'C1', tipo: 'Alto padrão', cidade: 'Natal', data_inicio: '2026-01-10', situacao: 'Em andamento' }
conferir('obra completa passa', validarObra(boa), null)
conferir('situação fora da lista é recusada', validarObra({ ...boa, situacao: 'Ativa' }), 'Escolha a situação.')
conferir('meta antes do início é recusada', validarObra({ ...boa, data_meta_entrega: '2025-12-01' }), 'A data-meta de entrega não pode ser antes do início.')
conferir('código normalizado', normalizarCodigo(' casa lagoa 12 '), 'CASA-LAGOA-12')

const r = (nome, rdo_hoje) => ({ obra: { nome }, rdo_hoje })
conferir('comparativo: sem RDO de hoje primeiro',
  ordenarResumo([r('B', 'Fechado'), r('A', 'Em andamento'), r('C', 'Não iniciado')]).map((x) => x.obra.nome), ['C', 'A', 'B'])

// RDO de ontem não fechado (bug de 07/11: obra nova e segunda-feira cobravam dia sem diário).
const andando = { situacao: 'Em andamento', data_inicio: '2026-10-01', dias_trabalho: [1, 2, 3, 4, 5], feriados: ['2026-11-02'] }
conferir('sexta sem diário cobra', cobraRdoDeOntem(andando, undefined, '2026-11-06'), true)
conferir('sexta com diário fechado não cobra', cobraRdoDeOntem(andando, { status: 'Fechado' }, '2026-11-06'), false)
conferir('sexta com diário aberto cobra', cobraRdoDeOntem(andando, { status: 'Em andamento' }, '2026-11-06'), true)
conferir('na segunda-feira não cobra o domingo', cobraRdoDeOntem(andando, undefined, '2026-11-08'), false)
conferir('obra que trabalha sábado cobra o sábado', cobraRdoDeOntem({ ...andando, dias_trabalho: [1, 2, 3, 4, 5, 6] }, undefined, '2026-11-07'), true)
conferir('obra que começou ontem cobra ontem', cobraRdoDeOntem({ ...andando, data_inicio: '2026-11-06' }, undefined, '2026-11-06'), true)
conferir('feriado não cobra', cobraRdoDeOntem(andando, undefined, '2026-11-02'), false)
conferir('obra que começou hoje não cobra ontem', cobraRdoDeOntem({ ...andando, data_inicio: '2026-11-07' }, undefined, '2026-11-06'), false)
conferir('obra concluída não cobra', cobraRdoDeOntem({ ...andando, situacao: 'Concluída' }, undefined, '2026-11-06'), false)
conferir('sem calendário vale seg a sex: sábado não cobra',cobraRdoDeOntem({ situacao: 'Em andamento' }, undefined, '2026-11-07'), false)

// APAGAR OBRA (quadro obra.apagar): só o Engenheiro, só obra sem nada lançado.
conferir('obra vazia pode apagar', motivoParaNaoApagarObra([]), null)
conferir('a frase diz o que a obra tem, sem repetir', motivoParaNaoApagarObra(['rdos', 'fotos', 'pedidos_material', 'funcionarios']),
  'Esta obra não pode ser apagada: já tem diários, pedidos de material e funcionários lotados nela. Só se apaga obra sem nada lançado. Para tirá-la do dia a dia, marque a situação como Concluída.')
const semNome = [...dados.TABELAS_DA_OBRA, 'funcionarios', 'equipamentos']
  .filter((t) => motivoParaNaoApagarObra([t]).includes('já tem lançamentos'))
conferir('toda tabela que prende a obra tem nome na frase (tabela nova entra em O_QUE_PRENDE)', semNome, [])

reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
const vazia = (await dados.salvarObra({ nome: 'Obra vazia', codigo: 'vazia', tipo: 'Licitação', cidade: 'Natal', data_inicio: '2026-01-10', situacao: 'Em andamento' })).data
conferir('obra com lançamentos é recusada, dizendo o quê', /^Esta obra não pode ser apagada: já tem .*diários/.test((await dados.apagarObra('obra-ubs')).erro), true)
conferir('a obra recusada continua lá', (await dados.listarObras()).data.some((o) => o.id === 'obra-ubs'), true)
await dados.entrar('helena@novaobra.test', 'x')
conferir('cliente não apaga obra', (await dados.apagarObra(vazia.id)).erro, 'Só o Engenheiro apaga obra.')
await dados.entrar('eng@novaobra.test', 'x')
conferir('engenheiro apaga obra vazia', (await dados.apagarObra(vazia.id)).erro, null)
conferir('a obra apagada sumiu da lista', (await dados.listarObras()).data.some((o) => o.id === vazia.id), false)
conferir('apagar de novo avisa que não achou', Boolean((await dados.apagarObra(vazia.id)).erro), true)

// Quadro "frentes paradas" do comparativo: a lista de todas as obras, a mais antiga no topo.
reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
const resumoObras = (await dados.listarResumoObras()).data
const hojeTeste = hojeISO()
const paradasTodas = frentesParadasDasObras(resumoObras, hojeTeste)
conferir('lista as paradas das duas obras, a mais antiga primeiro',
  paradasTodas.map((p) => [p.obra_id, p.frente_id, p.dias, p.motivo]),
  [['obra-ubs', 'fs-ubs-agua', 9, 'Aguardando projeto'], ['obra-serra', 'fs-reboco', 6, 'Falta de material'],
    ['obra-ubs', 'fs-ubs-alv', 4, 'Falta de mão de obra'], ['obra-serra', 'fs-imper', 2, 'Chuva']])
conferir('o total bate com o número de cada cartão', paradasTodas.length, resumoObras.reduce((s, x) => s + x.frentes_paradas, 0))
conferir('cada linha leva o nome da obra dela', paradasTodas.find((p) => p.frente_id === 'fs-reboco').obra_nome, 'Casa Alto da Serra 4')
conferir('frente parada sem data não ganha "0 dias" e vai para o fim',
  frentesParadasDasObras([{ obra: { id: 'o', nome: 'O' }, paradas: [
    { id: 'a', nome: 'A', situacao: 'Parada', parada_desde: null, motivo_parada: 'Chuva' },
    { id: 'b', nome: 'B', situacao: 'Parada', parada_desde: hojeTeste, motivo_parada: 'Chuva' }] }], hojeTeste).map((p) => [p.frente_id, p.dias]),
  [['a', null], ['b', 0]])
conferir('texto da parada: singular, plural e sem data', [rotuloParada(1), rotuloParada(3), rotuloParada(null)], ['Parada há 1 dia', 'Parada há 3 dias', 'Parada'])
conferir('sem frente parada, lista vazia', frentesParadasDasObras([{ obra: { id: 'o', nome: 'O' }, paradas: [] }], hojeTeste), [])

console.log(`${ok}/${tot} — obras`)
process.exit(ok === tot ? 0 : 1)
