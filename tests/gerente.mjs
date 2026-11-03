// GERENTE: o admin libera um gerente só na UBS, e a camada de dados entrega a ele só a UBS,
// sem a foto da nota fiscal. Roda no banco em memória. No banco real, a tranca por obra (RLS)
// das tabelas de lançamento só chega na fase 5 do passo 10: até lá, isto é só o que a tela mostra.
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
const conta = (await dados.criarConta({ nome: 'Gerente Teste', email: 'gerente@novaobra.test', senha: '123456' })).data
conferir('conta nova nasce pendente, sem perfil', [conta.status, conta.role], ['pendente', null])
conferir('pendente não pode ver obra', dados.posso('obra.ver'), false)

await dados.entrar('eng@novaobra.test', 'x')
conferir('liberar sem perfil é recusado', (await dados.salvarUsuario({ id: conta.id, role: null, status: 'ativo' })).erro, 'Escolha o perfil antes de liberar.')
await dados.salvarUsuario({ id: conta.id, role: 'gerente', status: 'ativo' })
await dados.salvarObrasDoUsuario(conta.id, ['obra-ubs'])
conferir('a lista de obras do usuário marca só a UBS',
  (await dados.listarObrasDoUsuario(conta.id)).data.filter((o) => o.liberada).map((o) => o.id), ['obra-ubs'])
conferir('admin continua vendo as duas obras', ids((await dados.listarObras()).data), ['obra-serra', 'obra-ubs'])

await dados.entrar('gerente@novaobra.test', 'x')
conferir('gerente vê só a UBS no seletor', ids((await dados.listarObras()).data), ['obra-ubs'])
conferir('comparativo do gerente só tem a UBS', (await dados.listarResumoObras()).data.map((r) => r.obra.id), ['obra-ubs'])
conferir('efetivo geral do gerente só tem a UBS', (await dados.listarQuadroEfetivo()).data.obras.map((o) => o.id), ['obra-ubs'])
conferir('gerente não abre Medições', dados.posso('medicoes.ver'), false)
conferir('gerente não vê Usuários', dados.posso('usuarios.ver'), false)

dados.definirObraAtual('obra-ubs')
const trazer = (await dados.listarFuncionariosParaTrazer()).data
conferir('gerente só traz funcionário sem obra ou de obra dele', trazer.every((f) => !f.obra_id || f.obra_id === 'obra-ubs'), true)
const pedidos = (await dados.listarQuadroMateriais()).data.pedidos
conferir('gerente não recebe a foto da nota fiscal', pedidos.every((p) => p.foto_nf === null), true)

// Tirar a obra: o gerente fica sem nenhuma.
await dados.entrar('eng@novaobra.test', 'x')
await dados.salvarObrasDoUsuario(conta.id, [])
await dados.entrar('gerente@novaobra.test', 'x')
conferir('sem obra liberada, o gerente não vê nenhuma', (await dados.listarObras()).data, [])

// Bloqueado não entra.
await dados.entrar('eng@novaobra.test', 'x')
await dados.salvarUsuario({ id: conta.id, role: 'gerente', status: 'bloqueado' })
conferir('bloqueado não entra', (await dados.entrar('gerente@novaobra.test', 'x')).erro, 'Conta bloqueada. Contate o administrador.')

console.log(`${ok}/${tot} — gerente`)
if (ok !== tot) process.exit(1)
