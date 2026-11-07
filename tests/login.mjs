// Login: validação, frases de erro do Supabase Auth e a porta de cada perfil.
import {
  validarEntrada, validarSenha, mensagemDoLogin, portaDoPerfil, rotuloDaConta, inicialDoNome,
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

conferir('senha de 7 é recusada', validarSenha('1234567'), 'A senha precisa de pelo menos 8 caracteres.')
conferir('senha de 8 passa', validarSenha('12345678'), null)
conferir('conta bloqueada no login', mensagemDoLogin({ code: 'user_banned', message: 'User is banned' }), 'Conta bloqueada. Contate o administrador.')
conferir('senha errada', mensagemDoLogin({ code: 'invalid_credentials', message: 'Invalid login credentials' }), 'E-mail ou senha incorretos.')
conferir('senha errada só com a mensagem', mensagemDoLogin({ message: 'Invalid login credentials' }), 'E-mail ou senha incorretos.')
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


conferir('conta pendente aparece como Pendente', rotuloDaConta({ role: null, status: 'pendente' }), 'Pendente')
conferir('admin bloqueado aparece como Bloqueado', rotuloDaConta({ role: 'admin_master', status: 'bloqueado' }), 'Bloqueado')
conferir('admin ativo aparece como Engenheiro', rotuloDaConta({ role: 'admin_master', status: 'ativo' }), 'Engenheiro')

conferir('inicial em maiúscula', inicialDoNome(' israel'), 'I')
conferir('sem nome não quebra', inicialDoNome(''), '?')

conferir('trocar senha tem a frase dela', mensagemDoLogin({ message: 'odd' }, 'Não foi possível trocar a senha agora.'), 'Não foi possível trocar a senha agora.')

console.log(`${ok}/${tot} — login`)
if (ok !== tot) process.exit(1)
