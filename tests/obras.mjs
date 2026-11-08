// Entidade OBRA: validação, obra inicial (a guardada) e ordem do comparativo.
import { escolherObraInicial, validarObra, ordenarResumo, normalizarCodigo, cobraRdoDeOntem } from '../src/lib/obras.js'

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

console.log(`${ok}/${tot} — obras`)
process.exit(ok === tot ? 0 : 1)
