// Regras do login: o que se confere antes de mandar ao Supabase Auth, a frase de cada
// erro e qual porta a pessoa encontra depois de entrar. Sem React e sem banco.

import { NOME_PERFIL } from './listas.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const SENHA_MINIMA = 8

export function validarEntrada({ email, senha }) {
  if (!EMAIL.test((email ?? '').trim())) return 'Informe um e-mail válido.'
  if (!senha) return 'Informe a senha.'
  return null
}

export function validarSenha(senha) {
  if ((senha ?? '').length < SENHA_MINIMA) return `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`
  return null
}

// Erro do Supabase Auth (code ou message) em frase de gente. Nunca o texto em inglês.
export function mensagemDoLogin(erro, padrao = 'Não foi possível entrar agora. Tente de novo em instantes.') {
  const code = erro?.code ?? ''
  const msg = erro?.message ?? ''
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (code === 'user_banned' || /banned/i.test(msg)) return AVISO_BLOQUEADO
  if (code === 'weak_password' || /password should be/i.test(msg)) return `Senha fraca: use pelo menos ${SENHA_MINIMA} caracteres.`
  if (code === 'same_password') return 'A senha nova precisa ser diferente da antiga.'
  if (/rate limit|over_email_send_rate_limit|too many/i.test(code + msg)) return 'Muitas tentativas agora. Espere alguns minutos e tente de novo.'
  if (/fetch|network|load failed/i.test(msg)) return 'Não foi possível falar com o servidor. Verifique a internet e tente de novo.'
  return padrao
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

// Como a conta aparece na lista de Usuários: a situação, se não está ativa; senão, o perfil.
export function rotuloDaConta(conta) {
  if (conta.status === 'pendente') return 'Pendente'
  if (conta.status === 'bloqueado') return 'Bloqueado'
  return NOME_PERFIL[conta.role] ?? 'Sem perfil'
}

// A letra do ícone redondo do topo.
export const inicialDoNome = (nome) => (nome ?? '').trim().charAt(0).toUpperCase() || '?'
