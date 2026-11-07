// Painel de admin: tudo o que mexe em login passa por aqui, com a chave de serviço, que só existe
// como segredo do Supabase. A cada chamada, quem chama é descoberto pelo token da sessão e conferido
// NO BANCO; nada do que vem escrito no pedido decide permissão. Publicada com verify_jwt ligado.
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  AUTORIA, FRASE_INTERNA, PERFIS_VALIDOS, ehAdminAtivo, fraseDoBanco, gerarSenha, nomeConfere, recusaSobreConta,
  situacaoAoDesbloquear, situacaoAoMudarPerfil, validarNovoUsuario,
} from './regras.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const BLOQUEIO_NO_LOGIN = '876000h' // cem anos: o Supabase Auth não tem "para sempre"

const banco = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// Recusa com frase para a tela. Qualquer outro erro vira FRASE_INTERNA, e o detalhe fica no log.
class Recusa extends Error {
  constructor(frase: string, public status = 400) { super(frase) }
}

function exigir<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error
  return data
}

async function contaDe(id: string) {
  const conta = exigir(await banco.from('profiles').select('id, nome, email, role, status').eq('id', id).maybeSingle())
  if (!conta) throw new Recusa('Usuário não encontrado.', 404)
  return conta
}

async function contarAdminsAtivos() {
  const { count, error } = await banco.from('profiles').select('id', { count: 'exact', head: true })
    .eq('role', 'admin_master').eq('status', 'ativo')
  if (error) throw error
  return count ?? 0
}

async function conferirTrava(acao: string, quem: { id: string }, alvo: { id: string; role: string; status: string }, novoPerfil?: string) {
  const frase = recusaSobreConta({ acao, quem, alvo, novoPerfil, adminsAtivos: await contarAdminsAtivos() })
  if (frase) throw new Recusa(frase, 403)
}

async function gravarObras(id: string, obras: string[], quem: string) {
  const pedidas = [...new Set(obras ?? [])]
  const existem = pedidas.length ? exigir(await banco.from('obras').select('id').in('id', pedidas)) : []
  if (existem.length !== pedidas.length) throw new Recusa('Alguma obra escolhida não existe mais.')
  const atuais = exigir(await banco.from('membros').select('id, obra_id').eq('profile_id', id))
  const sair = atuais.filter((m) => !pedidas.includes(m.obra_id)).map((m) => m.id)
  const entrar = pedidas.filter((o) => !atuais.some((m) => m.obra_id === o))
  if (sair.length) exigir(await banco.from('membros').delete().in('id', sair))
  if (entrar.length) exigir(await banco.from('membros').insert(entrar.map((obra_id) => ({ obra_id, profile_id: id, criado_por: quem }))))
}

async function contarRegistros(id: string) {
  const contagens = await Promise.all(AUTORIA.map(async ([tabela, coluna]) => {
    const { count, error } = await banco.from(tabela).select('id', { count: 'exact', head: true }).eq(coluna, id)
    if (error) throw error
    return count ?? 0
  }))
  return contagens.reduce((a, b) => a + b, 0)
}

type Pedido = Record<string, any>
type Quem = { id: string; role: string; status: string }

const ACOES: Record<string, (pedido: Pedido, quem: Quem) => Promise<unknown>> = {
  async listar() {
    const [contas, membros, logins] = await Promise.all([
      banco.from('profiles').select('id, nome, email, role, status, created_at').then(exigir),
      banco.from('membros').select('profile_id, obra_id').then(exigir),
      banco.auth.admin.listUsers({ perPage: 1000 }),
    ])
    if (logins.error) throw logins.error
    const acessos = new Map(logins.data.users.map((u) => [u.id, u.last_sign_in_at ?? null]))
    return {
      usuarios: contas.map((c) => ({
        ...c,
        ultimo_acesso: acessos.get(c.id) ?? null,
        obras: membros.filter((m) => m.profile_id === c.id).map((m) => m.obra_id),
      })),
    }
  },

  async criar({ nome, email, role, obras }, quem) {
    const invalido = validarNovoUsuario({ nome, email, role })
    if (invalido) throw new Recusa(invalido)
    const senha = gerarSenha()
    const { data, error } = await banco.auth.admin.createUser({
      email: email.trim(), password: senha, email_confirm: true, user_metadata: { nome: nome.trim() },
    })
    if (error) {
      if (/already|exists|registered/i.test(error.message)) throw new Recusa('Já existe conta com este e-mail.', 409)
      throw error
    }
    const id = data.user.id
    try {
      exigir(await banco.from('profiles').update({ role, status: 'ativo' }).eq('id', id))
      if (role !== 'admin_master') await gravarObras(id, obras, quem.id)
    } catch (e) {
      // Sem meio cadastro: quem falhou aqui não fica com login sem perfil ou sem obra.
      await banco.auth.admin.deleteUser(id)
      throw e
    }
    return { id, senha }
  },

  async redefinir_senha({ id }) {
    await contaDe(id)
    const senha = gerarSenha()
    const { error } = await banco.auth.admin.updateUserById(id, { password: senha })
    if (error) throw error
    return { senha }
  },

  // Escolher o perfil de uma conta pendente é o que libera a conta.
  async perfil({ id, role }, quem) {
    if (!PERFIS_VALIDOS.includes(role)) throw new Recusa('Escolha o perfil.')
    const alvo = await contaDe(id)
    await conferirTrava('perfil', quem, alvo, role)
    exigir(await banco.from('profiles').update({ role, status: situacaoAoMudarPerfil(alvo) }).eq('id', id))
    // Virou admin: vê todas, e a lista antiga não pode voltar se um dia for rebaixado.
    if (role === 'admin_master') exigir(await banco.from('membros').delete().eq('profile_id', id))
    return { ok: true }
  },

  async obras({ id, obras }, quem) {
    const alvo = await contaDe(id)
    if (alvo.role === 'admin_master') throw new Recusa('O Engenheiro já vê todas as obras.')
    await gravarObras(id, obras, quem.id)
    return { ok: true }
  },

  // A situação primeiro: a regra do banco corta o acesso na hora; o login para de abrir em seguida.
  async bloquear({ id }, quem) {
    const alvo = await contaDe(id)
    await conferirTrava('bloquear', quem, alvo)
    exigir(await banco.from('profiles').update({ status: 'bloqueado' }).eq('id', id))
    const { error } = await banco.auth.admin.updateUserById(id, { ban_duration: BLOQUEIO_NO_LOGIN })
    if (error) throw error
    return { ok: true }
  },

  async desbloquear({ id }) {
    const alvo = await contaDe(id)
    const { error } = await banco.auth.admin.updateUserById(id, { ban_duration: 'none' })
    if (error) throw error
    exigir(await banco.from('profiles').update({ status: situacaoAoDesbloquear(alvo) }).eq('id', id))
    return { ok: true }
  },

  async excluir({ id, confirmacao }, quem) {
    const alvo = await contaDe(id)
    await conferirTrava('excluir', quem, alvo)
    if (!nomeConfere(confirmacao, alvo.nome)) throw new Recusa('Digite o nome da pessoa, igual ao da lista, para confirmar.')
    const registros = await contarRegistros(id)
    if (registros > 0) {
      throw new Recusa(`${alvo.nome} tem ${registros} ${registros === 1 ? 'registro lançado' : 'registros lançados'} no app: a conta não pode ser excluída. Bloqueie no lugar.`, 409)
    }
    // Um passo só: o perfil e as obras liberadas saem junto (migration -21).
    const { error } = await banco.auth.admin.deleteUser(id)
    if (error) throw error
    return { ok: true }
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder({ erro: 'Pedido inválido.' }, 405)
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: sessao, error: semSessao } = await banco.auth.getUser(token)
    if (semSessao || !sessao?.user) return responder({ erro: 'A sua sessão acabou. Entre de novo.' }, 401)
    const quem = exigir(await banco.from('profiles').select('id, role, status').eq('id', sessao.user.id).maybeSingle())
    if (!ehAdminAtivo(quem)) return responder({ erro: 'Só o Engenheiro administrador cuida dos usuários.' }, 403)

    const pedido = await req.json().catch(() => ({}))
    const acao = Object.hasOwn(ACOES, pedido.acao) ? ACOES[pedido.acao] : null
    if (!acao) return responder({ erro: 'Pedido inválido.' }, 400)
    return responder(await acao(pedido, quem))
  } catch (e) {
    if (e instanceof Recusa) return responder({ erro: e.message }, e.status)
    const doBanco = fraseDoBanco(e)
    if (doBanco) return responder({ erro: doBanco }, 403)
    console.error('[admin-usuarios]', e)
    return responder({ erro: FRASE_INTERNA }, 500)
  }
})
