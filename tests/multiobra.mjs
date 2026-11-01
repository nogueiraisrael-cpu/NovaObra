// MULTI-OBRA: a camada de dados nunca devolve dado de uma obra na outra,
// e lançamento sem obra escolhida é recusado. É o teste que pega o filtro esquecido.
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const ids = (lista) => lista.map((x) => x.id).sort()

dados._reiniciarMock()
await dados.entrar('eng@novaobra.test', 'x')

dados.definirObraAtual('obra-serra')
const frentesSerra = (await dados.listarFrentes()).data
const pessoasSerra = (await dados.listarPessoas()).data
const equipSerra = (await dados.listarEquipamentos()).data

dados.definirObraAtual('obra-ubs')
const frentesUbs = (await dados.listarFrentes()).data
const pessoasUbs = (await dados.listarPessoas()).data
const equipUbs = (await dados.listarEquipamentos()).data

conferir('frentes da Serra são só da Serra', frentesSerra.every((f) => f.obra_id === 'obra-serra'), true)
conferir('frentes da UBS são só da UBS', frentesUbs.every((f) => f.obra_id === 'obra-ubs'), true)
conferir('nenhuma frente em comum', ids(frentesSerra).filter((id) => ids(frentesUbs).includes(id)), [])
conferir('pessoas lotadas na UBS são só da UBS', pessoasUbs.daObra.every((f) => f.obra_id === 'obra-ubs'), true)
conferir('nenhuma pessoa da Serra na UBS', ids(pessoasUbs.daObra).filter((id) => ids(pessoasSerra.daObra).includes(id)), [])
conferir('UBS não tem equipamento na obra (o da Serra não vaza)', equipUbs.naObra, [])
conferir('Serra tem os dela', equipSerra.naObra.length, 2)

// Edson foi deslocado da Serra para a UBS só hoje: aparece lá como vindo.
const efetivoUbs = (await dados.listarEfetivoHoje()).data
conferir('Edson veio da Serra para a UBS', efetivoUbs.find((i) => i.funcionario.id === 'f-edson')?.situacao, 'Veio de outra obra')

// Abrir o RDO da UBS grava o Edson lá. Aí a trava passa a valer de verdade.
await dados.salvarRdo({ clima_manha: 'Nublado' })
dados.definirObraAtual('obra-serra')
const trava = await dados.trazerFuncionario('f-severino')
conferir('não dá para trazer quem já está presente na obra dele', trava.erro, 'Severino já está presente hoje na obra UBS Nova Esperança')

// Desmarcar o Deslocado do próprio Edson desfaz a chegada na UBS, sem travar.
const volta = await dados.marcarEfetivo('f-edson', 'Presente')
conferir('Edson volta a Presente na Serra', volta.erro, null)
dados.definirObraAtual('obra-ubs')
conferir('e some da UBS', (await dados.listarEfetivoHoje()).data.some((i) => i.funcionario.id === 'f-edson'), false)

// Sem obra escolhida a camada se recusa, em vez de cair numa obra qualquer.
dados.definirObraAtual(null)
let semObra = null
try { await dados.listarFrentes() } catch (e) { semObra = e.message }
conferir('sem obra escolhida, a camada se recusa', semObra, 'Nenhuma obra escolhida')

console.log(`${ok}/${tot} — multiobra`)
process.exit(ok === tot ? 0 : 1)
