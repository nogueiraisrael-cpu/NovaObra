// Regras do painel de admin, sem banco e sem Deno: a função admin-usuarios decide por aqui, e os
// testes (tests/adminUsuarios.mjs) e o banco em memória usam o mesmo arquivo.

export const PERFIS_VALIDOS = ['admin_master', 'gerente', 'cliente']
export const FRASE_INTERNA = 'Não foi possível concluir agora. Tente de novo em instantes.'

// Onde uma pessoa deixa o nome ao lançar algo. Com qualquer linha aqui, a conta não se exclui.
export const AUTORIA = [
  ...['obras', 'funcionarios', 'equipamentos', 'frentes_servico', 'rdos', 'rdo_efetivo', 'rdo_equipamentos',
    'rdo_frentes', 'rdo_frente_equipe', 'fotos', 'materiais', 'pedidos_material', 'insumos', 'movimentos_estoque',
    'atividades', 'restricoes', 'semana_atividades', 'subtarefas', 'medicoes', 'medicao_itens', 'membros',
  ].map((tabela) => [tabela, 'criado_por']),
  ['rdos', 'fechado_por'], ['fotos', 'enviada_por'], ['medicoes', 'importada_por'],
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Sem letras e números que se confundem (l, 1, O, 0): a pessoa vai digitar esta senha.
const LETRAS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const TAMANHO_DA_SENHA = 12

export function gerarSenha(sortear = (n) => crypto.getRandomValues(new Uint32Array(n))) {
  return [...sortear(TAMANHO_DA_SENHA)].map((x) => LETRAS[x % LETRAS.length]).join('')
}

export const ehAdminAtivo = (conta) => conta?.role === 'admin_master' && conta?.status === 'ativo'

export function validarNovoUsuario({ nome, email, role }) {
  if (!(nome ?? '').trim()) return 'Informe o nome.'
  if (!EMAIL.test((email ?? '').trim())) return 'Informe um e-mail válido.'
  if (!PERFIS_VALIDOS.includes(role)) return 'Escolha o perfil.'
  return null
}

// Tirar poder de uma conta: excluir, bloquear ou mudar o perfil de um admin para outro.
// Devolve a frase da recusa, ou null. `adminsAtivos` conta os admins ativos, com o alvo incluso.
export function recusaSobreConta({ acao, quem, alvo, novoPerfil, adminsAtivos }) {
  const tiraPoder = acao === 'excluir' || acao === 'bloquear' || (acao === 'perfil' && novoPerfil !== alvo.role)
  if (!tiraPoder) return null
  if (alvo.id === quem.id) {
    if (acao === 'excluir') return 'Você não pode excluir a própria conta.'
    if (acao === 'bloquear') return 'Você não pode bloquear a própria conta.'
    return 'Você não pode mudar o próprio perfil.'
  }
  if (ehAdminAtivo(alvo) && adminsAtivos <= 1 && !(acao === 'perfil' && novoPerfil === 'admin_master')) {
    return FRASE_ULTIMO_ADMIN
  }
  return null
}

// Escolher o perfil de uma conta pendente é o que libera a conta; bloqueada continua bloqueada.
export const situacaoAoMudarPerfil = (conta) => (conta.status === 'pendente' ? 'ativo' : conta.status)

// Desbloquear devolve quem tinha perfil ao trabalho; quem nunca teve, volta a esperar o admin.
export const situacaoAoDesbloquear = (conta) => (conta.role ? 'ativo' : 'pendente')

// A trava do banco (migration -22) recusa tirar o último admin ativo, mesmo com dois pedidos juntos.
export const FRASE_ULTIMO_ADMIN = 'Este é o último Engenheiro ativo: o app não pode ficar sem administrador.'
export const fraseDoBanco = (erro) => (/ultimo_admin/.test(erro?.message ?? '') ? FRASE_ULTIMO_ADMIN : null)

// Excluir pede o nome digitado: maiúscula e espaço nas pontas não atrapalham.
export const nomeConfere = (digitado, nome) => (digitado ?? '').trim().toLowerCase() === (nome ?? '').trim().toLowerCase()
