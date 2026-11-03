// Regras do login: o que se confere antes de mandar ao Supabase Auth, a frase de cada
// erro e qual porta a pessoa encontra depois de entrar. Sem React e sem banco.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const SENHA_MINIMA = 6

export function validarEntrada({ email, senha }) {
  if (!EMAIL.test((email ?? '').trim())) return 'Informe um e-mail válido.'
  if (!senha) return 'Informe a senha.'
  return null
}

export function validarCadastro({ nome, email, senha }) {
  if (!(nome ?? '').trim()) return 'Informe o seu nome.'
  if (!EMAIL.test((email ?? '').trim())) return 'Informe um e-mail válido.'
  return validarSenha(senha)
}

export function validarSenha(senha) {
  if ((senha ?? '').length < SENHA_MINIMA) return `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`
  return null
}

export function validarEmail(email) {
  return EMAIL.test((email ?? '').trim()) ? null : 'Informe um e-mail válido.'
}

// Erro do Supabase Auth (code ou message) em frase de gente. Nunca o texto em inglês.
export function mensagemDoLogin(erro) {
  const code = erro?.code ?? ''
  const msg = erro?.message ?? ''
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) return 'Falta confirmar o e-mail: abra o link que enviamos para você.'
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(msg)) return 'Já existe conta com este e-mail. Use "Entrar" ou "Esqueci minha senha".'
  if (code === 'weak_password' || /password should be/i.test(msg)) return `Senha fraca: use pelo menos ${SENHA_MINIMA} caracteres.`
  if (code === 'same_password') return 'A senha nova precisa ser diferente da antiga.'
  if (/rate limit|over_email_send_rate_limit|too many/i.test(code + msg)) return 'Muitas tentativas agora. Espere alguns minutos e tente de novo.'
  if (code === 'signup_disabled' || /signups not allowed/i.test(msg)) return 'O cadastro está fechado. Peça ao administrador para criar o seu acesso.'
  if (/fetch|network|load failed/i.test(msg)) return 'Não foi possível falar com o servidor. Verifique a internet e tente de novo.'
  return 'Não foi possível entrar agora. Tente de novo em instantes.'
}

// Qual tela a pessoa encontra depois de entrar (quadro, seção 1: perfil + situação).
export function portaDoPerfil(perfil) {
  if (!perfil) return 'login'
  if (perfil.status === 'bloqueado') return 'bloqueado'
  if (perfil.status !== 'ativo' || !perfil.role) return 'pendente'
  if (perfil.role === 'cliente') return 'cliente'
  return 'equipe'
}

export const AVISO_BLOQUEADO = 'Conta bloqueada. Contate o administrador.'

// As travas de profiles (migration -14) em frase de gente.
export function mensagemDoPerfil(texto) {
  if (/nao_muda_o_proprio_perfil/.test(texto)) return 'Você não pode mudar o seu próprio perfil nem a sua situação.'
  if (/so_admin_muda_perfil/.test(texto)) return 'Só o Engenheiro administrador libera contas e muda perfis.'
  if (/ativo_tem_perfil/.test(texto)) return 'Escolha o perfil antes de liberar.'
  return null
}
