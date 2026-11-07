// Travas do painel de admin (a função admin-usuarios decide por estas regras).
import {
  gerarSenha, TAMANHO_DA_SENHA, ehAdminAtivo, validarNovoUsuario, recusaSobreConta, nomeConfere, AUTORIA, PERFIS_VALIDOS,
  situacaoAoMudarPerfil, situacaoAoDesbloquear, fraseDoBanco, FRASE_ULTIMO_ADMIN,
} from '../supabase/functions/admin-usuarios/regras.js'
import { ROLES } from '../src/lib/listas.js'
import { validarEntrada } from '../src/lib/login.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const senha = gerarSenha()
conferir('senha tem pelo menos 8 caracteres', senha.length >= 8 && senha.length === TAMANHO_DA_SENHA, true)
conferir('senha sem letra que se confunde', /[lO01]/.test(senha), false)
conferir('duas senhas não se repetem', gerarSenha() === gerarSenha(), false)

conferir('admin ativo é admin', ehAdminAtivo({ role: 'admin_master', status: 'ativo' }), true)
conferir('admin bloqueado não é', ehAdminAtivo({ role: 'admin_master', status: 'bloqueado' }), false)
conferir('gerente não é', ehAdminAtivo({ role: 'gerente', status: 'ativo' }), false)
conferir('sem conta não é', ehAdminAtivo(null), false)

conferir('novo usuário completo passa', validarNovoUsuario({ nome: 'Ana', email: 'a@b.com', role: 'gerente' }), null)
conferir('sem nome', validarNovoUsuario({ nome: ' ', email: 'a@b.com', role: 'gerente' }), 'Informe o nome.')
conferir('e-mail torto', validarNovoUsuario({ nome: 'Ana', email: 'ab.com', role: 'gerente' }), 'Informe um e-mail válido.')
conferir('papel inventado', validarNovoUsuario({ nome: 'Ana', email: 'a@b.com', role: 'usuario' }), 'Escolha o perfil.')

const eu = { id: 'a', role: 'admin_master', status: 'ativo' }
const outro = { id: 'b', role: 'admin_master', status: 'ativo' }
const gerente = { id: 'g', role: 'gerente', status: 'ativo' }
const trava = (acao, alvo, adminsAtivos = 2, novoPerfil) => recusaSobreConta({ acao, quem: eu, alvo, novoPerfil, adminsAtivos })
conferir('não exclui a si', trava('excluir', eu), 'Você não pode excluir a própria conta.')
conferir('não bloqueia a si', trava('bloquear', eu), 'Você não pode bloquear a própria conta.')
conferir('não rebaixa a si', trava('perfil', eu, 2, 'gerente'), 'Você não pode mudar o próprio perfil.')
conferir('salvar o mesmo perfil em si passa', trava('perfil', eu, 2, 'admin_master'), null)
conferir('exclui outro admin se sobra um', trava('excluir', outro, 2), null)
conferir('último admin não se bloqueia', trava('bloquear', outro, 1), 'Este é o último Engenheiro ativo: o app não pode ficar sem administrador.')
conferir('último admin não se rebaixa', trava('perfil', outro, 1, 'gerente'), 'Este é o último Engenheiro ativo: o app não pode ficar sem administrador.')
conferir('gerente se bloqueia', trava('bloquear', gerente, 1), null)
conferir('gerente vira admin', trava('perfil', gerente, 1, 'admin_master'), null)
conferir('redefinir senha não é trava', trava('redefinir_senha', eu), null)

conferir('nome confere sem ligar para maiúscula', nomeConfere(' ana silva ', 'Ana Silva'), true)
conferir('nome errado não confere', nomeConfere('Ana', 'Ana Silva'), false)
conferir('vazio não confere', nomeConfere('', 'Ana'), false)

conferir('autoria cobre fechar diário, foto e medição', ['rdos.fechado_por', 'fotos.enviada_por', 'medicoes.importada_por'].every((c) => AUTORIA.some(([t, col]) => `${t}.${col}` === c)), true)

// A função não importa de src/ (é publicada sozinha): as cópias ficam presas às originais aqui.
conferir('os perfis da função são os do app', PERFIS_VALIDOS, ROLES)
for (const email of ['a@b.com', 'ab.com', 'a@b', ' x@y.com.br ', 'a b@c.com']) {
  conferir(`e-mail "${email}" igual no app e na função`, validarNovoUsuario({ nome: 'A', email, role: 'gerente' }) === null, validarEntrada({ email, senha: 'x' }) === null)
}

conferir('liberar conta pendente a ativa', situacaoAoMudarPerfil({ status: 'pendente' }), 'ativo')
conferir('trocar perfil de bloqueado mantém bloqueado', situacaoAoMudarPerfil({ status: 'bloqueado' }), 'bloqueado')
conferir('desbloquear quem tem perfil volta a ativo', situacaoAoDesbloquear({ role: 'gerente' }), 'ativo')
conferir('desbloquear quem nunca teve perfil volta a pendente', situacaoAoDesbloquear({ role: null }), 'pendente')
conferir('a recusa do banco vira frase', fraseDoBanco({ message: 'ultimo_admin' }), FRASE_ULTIMO_ADMIN)
conferir('outro erro do banco não vira essa frase', fraseDoBanco({ message: 'duplicate key' }), null)

console.log(`${ok}/${tot} — adminUsuarios`)
if (ok !== tot) process.exit(1)
