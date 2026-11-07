// Recusa calada: a regra do banco recusa uma alteração mudando 0 linhas, sem erro. A camada de dados
// precisa transformar isso em frase; "salvo" sem ter salvo é o pior defeito possível.
import * as dados from '../src/lib/dados.js'
import { criarBancoMemoria } from './apoio/bancoMemoria.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const FRASE = 'Não foi gravado: você não tem permissão aqui, ou este registro mudou. Recarregue a tela e confira.'

const memoria = criarBancoMemoria()
dados._usarBancoDeTeste(memoria)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')
const pessoa = (await dados.listarPessoas()).data.daObra[0]
const obra = (await dados.listarObras()).data.find((o) => o.id === 'obra-serra')
const quadro = (await dados.listarQuadroMateriais()).data
const pedido = quadro.pedidos.find((p) => p.status === 'Solicitar')

// Daqui em diante o banco "recusa": toda alteração e toda exclusão mudam 0 linhas.
memoria.atualizar = async () => []
memoria.apagar = async () => []
conferir('editar funcionário recusado avisa', (await dados.salvarFuncionario({ ...pessoa, nome: 'Outro' })).erro, FRASE)
conferir('editar obra recusado avisa', (await dados.salvarObra({ ...obra, nome: 'Outra' })).erro, FRASE)
conferir('calendário recusado avisa', (await dados.salvarCalendario({ dias: [1, 2, 3], feriados: [] })).erro, FRASE)
conferir('apagar pedido recusado avisa', (await dados.apagarPedido(pedido.id)).erro, FRASE)

console.log(`${ok}/${tot} — recusaCalada`)
if (ok !== tot) process.exit(1)
