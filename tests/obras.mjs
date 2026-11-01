// Entidade OBRA: validação, obra inicial (a guardada) e ordem do comparativo.
import { escolherObraInicial, validarObra, ordenarResumo, normalizarCodigo } from '../src/lib/obras.js'

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

console.log(`${ok}/${tot} — obras`)
process.exit(ok === tot ? 0 : 1)
