// PEDIDO COM MATERIAL ESCRITO À MÃO (09/11/2026): o material entra no catálogo (igual para todas as
// obras) e o pedido fica só na obra atual. Escrever de novo o mesmo nome não duplica o catálogo.
import * as dados from '../src/lib/dados.js'
import { reiniciarMock } from './apoio/bancoMemoria.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')

const escrito = { manual: true, material_nome: ' Caixa  de passagem 4x2 ', unidade: 'un', categoria: 'Instalações', quantidade: '12', frente: 'Elétrica', prioridade: 'Normal' }
const antes = (await dados.listarQuadroMateriais()).data.catalogo.length
const r = await dados.salvarPedido(escrito)
conferir('pedido com material escrito é salvo, e diz que o material é novo', [r.erro, r.data?.material, r.data?.materialNovo], [null, { nome: 'Caixa de passagem 4x2', unidade: 'un', categoria: 'Instalações' }, true])
const serra = (await dados.listarQuadroMateriais()).data
conferir('o material entra na lista', serra.catalogo.length, antes + 1)
conferir('o pedido aparece no quadro da Serra', serra.pedidos.some((p) => p.id === r.data.id && p.obra_id === 'obra-serra'), true)

// Tela aberta antes de o material entrar na lista (outro aparelho): o banco decide.
const outraUnidade = await dados.salvarPedido({ ...escrito, material_nome: 'CAIXA DE PASSAGEM 4X2', unidade: 'pç', categoria: 'Acabamento' })
conferir('mesmo nome com outra unidade é recusado (trocaria a quantidade)', outraUnidade.erro, '"Caixa de passagem 4x2" já está na lista, medido em un. Escolha da lista e confira a quantidade.')
const deNovo = await dados.salvarPedido({ ...escrito, material_nome: 'CAIXA DE PASSAGEM 4X2', categoria: 'Acabamento' })
conferir('mesmo nome e mesma unidade usa o material que já existe', [deNovo.erro, deNovo.data?.material_id, deNovo.data?.materialNovo], [null, r.data.material_id, false])
conferir('e não duplica o catálogo', (await dados.listarQuadroMateriais()).data.catalogo.length, antes + 1)

const vazio = await dados.salvarPedido({ ...escrito, material_nome: '  ' })
conferir('sem nome é recusado com frase', vazio.erro, 'Escreva o nome do material.')

dados.definirObraAtual('obra-ubs')
const ubs = (await dados.listarQuadroMateriais()).data
conferir('o material novo aparece na lista da UBS (catálogo é de todas)', ubs.catalogo.some((m) => m.id === r.data.material_id), true)
conferir('o pedido da Serra não aparece na UBS', ubs.pedidos.some((p) => p.id === r.data.id || p.id === deNovo.data.id), false)

console.log(`${ok}/${tot} — material escrito à mão`)
process.exit(ok === tot ? 0 : 1)
