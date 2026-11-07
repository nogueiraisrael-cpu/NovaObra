// GERENTE: o admin libera um gerente só na UBS, e a camada de dados entrega a ele só a UBS,
// sem a foto da nota fiscal. Roda no banco em memória. No banco real, a tranca por obra (RLS)
// das tabelas de lançamento só chega na fase 5 do passo 10: até lá, isto é só o que a tela mostra.
import * as dados from '../src/lib/dados.js'
import { reiniciarMock } from './apoio/bancoMemoria.js'
import { P } from './apoio/mockData.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const ids = (lista) => lista.map((x) => x.id).sort()
const ricardo = () => P.ricardo

reiniciarMock(dados)
const conta = (await dados.entrar('fulano@novaobra.test', 'x')).data
conferir('conta nova nasce pendente, sem perfil', [conta.status, conta.role], ['pendente', null])
conferir('pendente não pode ver obra', dados.posso('obra.ver'), false)

await dados.entrar('eng@novaobra.test', 'x')
conferir('liberar sem perfil é recusado', (await dados.mudarPerfil(conta.id, null)).erro, 'Escolha o perfil.')
await dados.mudarPerfil(conta.id, 'gerente')
await dados.mudarObras(conta.id, ['obra-ubs'])
const doGerente = async () => (await dados.listarUsuarios()).data.find((u) => u.id === conta.id)
conferir('a lista de usuários mostra só a UBS liberada', (await doGerente()).obras, ['obra-ubs'])
conferir('admin continua vendo as duas obras', ids((await dados.listarObras()).data), ['obra-serra', 'obra-ubs'])

await dados.entrar('fulano@novaobra.test', 'x')
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
await dados.mudarObras(conta.id, [])
await dados.entrar('fulano@novaobra.test', 'x')
conferir('sem obra liberada, o gerente não vê nenhuma', (await dados.listarObras()).data, [])

// Virou Engenheiro: a lista antiga de obras some (não volta se um dia for rebaixado).
await dados.entrar('eng@novaobra.test', 'x')
await dados.mudarObras(conta.id, ['obra-ubs'])
await dados.mudarPerfil(conta.id, 'admin_master')
conferir('virar Engenheiro apaga a lista de obras', (await doGerente()).obras, [])

// Bloqueado não entra.
await dados.entrar('eng@novaobra.test', 'x')
await dados.mudarPerfil(conta.id, 'gerente')
await dados.bloquearUsuario(conta.id)
conferir('bloqueado não entra', (await dados.entrar('fulano@novaobra.test', 'x')).erro, 'Conta bloqueada. Contate o administrador.')

// Desbloquear devolve o acesso.
await dados.entrar('eng@novaobra.test', 'x')
await dados.desbloquearUsuario(conta.id)
conferir('desbloqueado volta a entrar', (await dados.entrar('fulano@novaobra.test', 'x')).erro, null)

// Conta comum não mexe em ninguém, nem pela camada de dados.
conferir('gerente não cria usuário', (await dados.criarUsuario({ nome: 'X', email: 'x@y.com', role: 'admin_master' })).erro, 'Só o Engenheiro administrador cuida dos usuários.')
conferir('gerente não se promove', (await dados.mudarPerfil(conta.id, 'admin_master')).erro, 'Só o Engenheiro administrador cuida dos usuários.')

// Novo usuário pelo painel, e os dois caminhos de excluir.
await dados.entrar('eng@novaobra.test', 'x')
const novo = (await dados.criarUsuario({ nome: 'Teste Novo', email: 'novo@novaobra.test', role: 'gerente', obras: ['obra-ubs'] })).data
conferir('senha provisória com 8 ou mais', novo.senha.length >= 8, true)
conferir('e-mail repetido é recusado', (await dados.criarUsuario({ nome: 'Outro', email: 'novo@novaobra.test', role: 'gerente' })).erro, 'Já existe conta com este e-mail.')
conferir('excluir sem o nome certo é recusado', (await dados.excluirUsuario(novo.id, 'errado')).erro, 'Digite o nome da pessoa, igual ao da lista, para confirmar.')
conferir('excluir com o nome certo passa', (await dados.excluirUsuario(novo.id, 'teste novo')).erro, null)
conferir('quem lançou algo não se exclui', /não pode ser excluída/.test((await dados.excluirUsuario(ricardo(), 'Eng. Ricardo')).erro), true)

console.log(`${ok}/${tot} — gerente`)
if (ok !== tot) process.exit(1)
