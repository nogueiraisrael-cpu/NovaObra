// Login: validação, frases de erro do Supabase Auth e a porta de cada perfil.
import {
  validarEntrada, validarCadastro, validarSenha, mensagemDoLogin, portaDoPerfil, mensagemDoPerfil,
} from '../src/lib/login.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('entrar completo passa', validarEntrada({ email: 'a@b.com', senha: 'x' }), null)
conferir('e-mail sem @ é recusado', validarEntrada({ email: 'ab.com', senha: 'x' }), 'Informe um e-mail válido.')
conferir('senha vazia é recusada', validarEntrada({ email: 'a@b.com', senha: '' }), 'Informe a senha.')
conferir('cadastro sem nome', validarCadastro({ nome: '  ', email: 'a@b.com', senha: '123456' }), 'Informe o seu nome.')
conferir('cadastro com senha curta', validarCadastro({ nome: 'Ana', email: 'a@b.com', senha: '123' }), 'A senha precisa de pelo menos 6 caracteres.')
conferir('cadastro completo passa', validarCadastro({ nome: 'Ana', email: ' a@b.com ', senha: '123456' }), null)
conferir('senha de 6 passa', validarSenha('abcdef'), null)

conferir('senha errada', mensagemDoLogin({ code: 'invalid_credentials', message: 'Invalid login credentials' }), 'E-mail ou senha incorretos.')
conferir('senha errada só com a mensagem', mensagemDoLogin({ message: 'Invalid login credentials' }), 'E-mail ou senha incorretos.')
conferir('e-mail não confirmado', mensagemDoLogin({ code: 'email_not_confirmed' }), 'Falta confirmar o e-mail: abra o link que enviamos para você.')
conferir('conta repetida', mensagemDoLogin({ code: 'user_already_exists' }), 'Já existe conta com este e-mail. Use "Entrar" ou "Esqueci minha senha".')
conferir('limite de e-mails', mensagemDoLogin({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }), 'Muitas tentativas agora. Espere alguns minutos e tente de novo.')
conferir('sem internet', mensagemDoLogin({ message: 'Failed to fetch' }), 'Não foi possível falar com o servidor. Verifique a internet e tente de novo.')
conferir('erro desconhecido não vaza inglês', mensagemDoLogin({ message: 'Something odd' }), 'Não foi possível entrar agora. Tente de novo em instantes.')

conferir('sem perfil → login', portaDoPerfil(null), 'login')
conferir('pendente → aguardando', portaDoPerfil({ role: null, status: 'pendente' }), 'pendente')
conferir('bloqueado → aviso, mesmo com perfil', portaDoPerfil({ role: 'admin_master', status: 'bloqueado' }), 'bloqueado')
conferir('ativo sem perfil → aguardando (o banco não deixa, mas a tela não confia)', portaDoPerfil({ role: null, status: 'ativo' }), 'pendente')
conferir('admin → equipe', portaDoPerfil({ role: 'admin_master', status: 'ativo' }), 'equipe')
conferir('gerente → equipe', portaDoPerfil({ role: 'gerente', status: 'ativo' }), 'equipe')
conferir('cliente → cliente', portaDoPerfil({ role: 'cliente', status: 'ativo' }), 'cliente')

conferir('trava do próprio perfil', mensagemDoPerfil('nao_muda_o_proprio_perfil'), 'Você não pode mudar o seu próprio perfil nem a sua situação.')
conferir('outro erro não é do perfil', mensagemDoPerfil('duplicate key'), null)

console.log(`${ok}/${tot} — login`)
if (ok !== tot) process.exit(1)
