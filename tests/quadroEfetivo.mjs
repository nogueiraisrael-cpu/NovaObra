// Efetivo geral: contagem por função, por obra e as fatias da pizza.
import { readFileSync, readdirSync } from 'node:fs'
import { FUNCOES } from '../src/lib/listas.js'
import { contarPorFuncao, montarQuadro, fatiasDaPizza, percentual, grupoDaPizza } from '../src/lib/quadroEfetivo.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const f = (id, funcao, obra_id, ativo = true) => ({ id, nome: id, funcao, obra_id, ativo })
const funcionarios = [
  f('a', 'Pedreiro', 'o1'), f('b', 'Pedreiro', 'o1'), f('c', 'Servente', 'o1'), f('d', 'Mestre', 'o1'),
  f('e', 'Pedreiro', 'o2'), f('g', 'Pintor', 'o2'), f('h', 'Armador', 'o2', false),
  f('i', 'Pintor', null),
]
const obras = [{ id: 'o2', nome: 'UBS', codigo: 'U' }, { id: 'o1', nome: 'Casa', codigo: 'C' }]

conferir('conta por função na ordem da lista, sem zeros', contarPorFuncao(funcionarios.filter((x) => x.obra_id === 'o1')),
  [{ funcao: 'Pedreiro', quantidade: 2 }, { funcao: 'Servente', quantidade: 1 }, { funcao: 'Mestre', quantidade: 1 }])
conferir('inativo não conta', contarPorFuncao([f('x', 'Armador', 'o2', false)]), [])

const q = montarQuadro(funcionarios, obras)
conferir('obras por nome', q.obras.map((o) => o.nome), ['Casa', 'UBS'])
conferir('total de cada obra', q.obras.map((o) => o.total), [4, 2])
conferir('total geral não inclui quem está sem obra', q.geral.total, 6)
conferir('geral soma as obras por função', q.geral.contagem.find((x) => x.funcao === 'Pedreiro').quantidade, 3)
conferir('sem obra separado', q.semObra, { contagem: [{ funcao: 'Pintor', quantidade: 1 }], total: 1 })

const fatias = fatiasDaPizza(q.geral.contagem)
conferir('Mestre e Pintor viram Outras, no fim', fatias.map((x) => [x.rotulo, x.quantidade]), [['Pedreiro', 3], ['Servente', 1], ['Outras', 2]])
conferir('frações somam 1', Math.round(fatias.reduce((s, x) => s + x.fracao, 0) * 1000) / 1000, 1)
conferir('cada fatia começa onde a anterior terminou', fatias.map((x) => Math.round(x.inicio * 1000) / 1000), [0, 0.5, 0.667])
conferir('obra sem ninguém não tem fatia', fatiasDaPizza([]), [])
conferir('percentual arredondado', percentual(1 / 3), '33%')
conferir('a tela pinta pela mesma regra da pizza', ['Pedreiro', 'Mestre', 'Pintor'].map(grupoDaPizza), ['Pedreiro', 'Outras', 'Outras'])

// Funções novas da equipe real (migration -23): contam e caem em "Outras".
conferir('função nova conta', contarPorFuncao([f('n', 'Encarregado', 'o1'), f('m', 'Betoneiro', 'o1')]),
  [{ funcao: 'Encarregado', quantidade: 1 }, { funcao: 'Betoneiro', quantidade: 1 }])
conferir('função nova vai para Outras', grupoDaPizza('Operador de máquina'), 'Outras')

// FUNCOES tem que ser idêntica ao CHECK mais recente de funcionarios.funcao nas migrations.
const pasta = new URL('../supabase/migrations/', import.meta.url)
const ultimoCheck = readdirSync(pasta).sort()
  .map((n) => readFileSync(new URL(n, pasta), 'utf8').match(/(?:funcao text not null|funcionarios_funcao_check) check \(funcao in \(([^)]*)\)/))
  .filter(Boolean).pop()[1]
conferir('FUNCOES igual ao CHECK do banco', [...ultimoCheck.matchAll(/'([^']+)'/g)].map((x) => x[1]), FUNCOES)

console.log(`${ok}/${tot} — quadroEfetivo`)
process.exit(ok === tot ? 0 : 1)
