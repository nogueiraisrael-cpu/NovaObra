// CAMADA DE DADOS — a única porta do banco. Nenhuma tela lê ou grava fora daqui,
// e só este arquivo chama supabase.from(...).
//
// MULTI-OBRA: a obra escolhida vive aqui dentro (definirObraAtual). Toda função
// de lançamento usa obraAtual() por dentro; as telas NUNCA passam obra_id.
// Assim nenhuma tela consegue esquecer o filtro.
//
// As regras abaixo conversam com o banco por cinco verbos (ler, inserir,
// atualizar, apagar, existe). Quem atende é o Supabase; nos testes, um banco em memória
// (tests/apoio/bancoMemoria.js) que os próprios testes encaixam aqui.
//
// O LOGIN é o Supabase Auth; no banco dos testes, as pessoas vêm dos dados de exemplo.
import { supabase } from './supabase.js'
import { hojeISO, somarDias } from './datas.js'
import { montarEfetivo, podeMarcarPresenca, mensagemTrava, contaComoPresenca } from './efetivo.js'
import { aplicarFechamento, validarPreenchimento, validarFrente } from './frentes.js'
import { statusRdoHoje, cobraRdoDeOntem, validarObra, normalizarCodigo, motivoParaNaoApagarObra, OBRA_COM_LANCAMENTOS } from './obras.js'
import { ordenarDiarios, resumirDiario } from './diarios.js'
import { montarQuadro } from './quadroEfetivo.js'
import { validarNovoPedido, validarMovimento, aplicarMovimento, novoPedido, lerQuantidade, podeExcluirPedido } from './materiais.js'
import {
  montarEstoque, saldoDe, validarBaixa, lerMinimo, validarMinimo, efeitoNoEstoque, saidaDoQueSobrou, bloqueioNoEstoque, ordenarHistorico,
} from './estoque.js'
import {
  validarAtividade, proximaOrdem, trocaDeOrdem, idsParaArquivar, idsParaDesarquivar, calendarioDaObra, validarCalendario, lerProgresso,
  segundaDaSemana, ordemNoFim,
} from './planejamento.js'
import { validarRestricao, novoPrazo, podeMover } from './restricoes.js'
import { validarCausa, REGISTRO_VAZIO, mudancaDeColuna, efeitoDoAvanco, camposDaSubtarefa } from './curtoPrazo.js'
import { nomesDeEmpreiteiros, nomeDoEmpreiteiro, conferirParaGravar } from './medicoes.js'
import { STATUS_SEMANA } from './listas.js'
import {
  validarEntrada, validarSenha, mensagemDoLogin, AVISO_BLOQUEADO,
} from './login.js'
import { fraseDoErroInterno } from './erros.js'
import { lerTudo } from './paginas.js'
import { ordenarUsuarios } from './painelAdmin.js'
import { PASTA_DE_FOTOS, VALIDADE_DO_ENDERECO, caminhoDaFoto, caminhoEhDe, estaNoStorage, mensagemDoEnvio } from './fotos.js'
import { encolherFoto } from './imagem.js'
import { pode, podeAbrir, obrasVisiveis, veTodasAsObras, textosDeObras, fonteDosNomes } from './permissoes.js'

// Tabelas de lançamento: obra_id obrigatório. Toda tabela nova de módulo novo entra aqui.
export const TABELAS_DA_OBRA = [
  'rdos', 'rdo_efetivo', 'rdo_equipamentos', 'frentes_servico', 'rdo_frentes', 'rdo_frente_equipe', 'fotos',
  'pedidos_material', 'insumos', 'movimentos_estoque', 'atividades', 'restricoes', 'semana_atividades', 'subtarefas',
  'medicoes', 'medicao_itens',
]

// ---------------------------------------------------------------------------
// O banco de verdade (Supabase)
// ---------------------------------------------------------------------------

function filtrar(q, filtros) {
  for (const [c, v] of Object.entries(filtros)) {
    q = Array.isArray(v) ? q.in(c, v) : v === null ? q.is(c, null) : q.eq(c, v)
  }
  return q
}

// O Supabase não estoura exceção: devolve { data, error }. Aqui o error vira exceção,
// e executar() lá embaixo a transforma numa frase para a tela.
function resposta({ data, error }) {
  if (error) throw Object.assign(new Error(error.message), { doBanco: true, code: error.code, detalhe: error.details })
  return data
}

const exigirFiltro = (filtros) => {
  if (!Object.keys(filtros).length) throw new Error('Alteração sem filtro recusada (mexeria na tabela inteira).')
}

const bancoSupabase = {
  ler(tabela, filtros = {}) {
    return lerTudo(async (de, ate) => resposta(await filtrar(supabase.from(tabela).select('*'), filtros).order('id').range(de, ate)))
  },
  async inserir(tabela, linhas) {
    return resposta(await supabase.from(tabela).insert(linhas).select())
  },
  async atualizar(tabela, filtros, campos) {
    return resposta(await filtrar(supabase.from(tabela).update(campos), filtros).select())
  },
  async apagar(tabela, filtros) {
    return resposta(await filtrar(supabase.from(tabela).delete(), filtros).select())
  },
  // "Tem pelo menos um?" sem trazer a tabela inteira (apagar obra pergunta isso a 19 tabelas).
  async existe(tabela, filtros) {
    return resposta(await filtrar(supabase.from(tabela).select('id'), filtros).limit(1)).length > 0
  },
  // Contas: a função admin-usuarios (chave de serviço só no servidor). A frase de recusa vem dela.
  async admin(acao, dados) {
    const { data, error } = await supabase.functions.invoke('admin-usuarios', { body: { acao, ...dados } })
    if (!error) return data
    const corpo = await error.context?.json?.().catch(() => null)
    throw new Error(corpo?.erro ?? 'Não foi possível falar com o servidor. Verifique a internet e tente de novo.')
  },
}

const semBanco = {
  async ler() { throw new Error('Banco não configurado: falta o arquivo .env.local com a URL e a chave do Supabase.') },
}
semBanco.inserir = semBanco.atualizar = semBanco.apagar = semBanco.existe = semBanco.admin = semBanco.ler

let banco = supabase ? bancoSupabase : semBanco
let perfis = []
let obraAtualId = null
let usuario = null

// Só para os testes: encaixa um banco em memória (tests/apoio/bancoMemoria.js).
export function _usarBancoDeTeste(bancoDeTeste) {
  banco = bancoDeTeste
  perfis = bancoDeTeste.perfis
  obraAtualId = null
  usuario = null
}

// Só para o tests/check-schema.mjs: as colunas que as regras usaram no banco em memória.
export const _colunasUsadas = () => banco.colunasUsadas?.() ?? []

const ok = (data) => ({ data, erro: null })
const falha = (erro) => ({ data: null, erro })
const hoje = () => hojeISO()
const copia = (x) => structuredClone(x)
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')

// Erro do banco em frase de gente. A trava de duas obras e o "um RDO por dia" têm frase própria.
function traduzirErro(e) {
  if (/fetch|network|Load failed/i.test(e.message)) return 'Não foi possível falar com o banco. Verifique a internet e tente de novo.'
  if (!e.doBanco) return fraseDoErroInterno(e)
  if (e.code === '23505' && /uma_presenca_por_dia/.test(e.message)) return 'Esse funcionário já está presente hoje em outra obra.'
  if (/saldo_negativo/.test(e.message)) return 'O estoque ficaria negativo: alguém mexeu neste insumo ao mesmo tempo. Confira o saldo e tente de novo.'
  if (e.code === '23505' && /medicoes_um_numero/.test(e.message)) return 'Já existe medição com esse número. Use outro número.'
  if (e.code === '23505') return 'Isso já está gravado (registro repetido).'
  if (e.code === '23514') return 'O banco recusou um valor fora da lista permitida.'
  if (e.code === '23503' && /on table "obras"/.test(e.message)) return OBRA_COM_LANCAMENTOS
  if (e.code === '23503') return 'Este registro aponta para algo que não existe mais.'
  if (e.code === '42501') return 'Sem permissão para gravar aqui.'
  if (e.code === 'nao_gravou') return 'Não foi gravado: você não tem permissão aqui, ou este registro mudou. Recarregue a tela e confira.'
  return 'Não foi possível salvar. Verifique a internet e tente de novo.'
}

// Toda função pública passa por aqui: qualquer falha volta como { erro } com frase para a tela.
async function executar(fn) {
  try {
    return await fn()
  } catch (e) {
    console.error('[dados]', e)
    return falha(traduzirErro(e))
  }
}

const ler = (tabela, filtros) => banco.ler(tabela, filtros)
const um = async (tabela, filtros) => (await banco.ler(tabela, filtros))[0] ?? null
const existe = (tabela, filtros) => banco.existe(tabela, filtros)
// Alterar ou apagar sem filtro mexeria na tabela inteira: recusado aqui, para os dois bancos.
const atualizar = (tabela, filtros, campos) => { exigirFiltro(filtros); return banco.atualizar(tabela, filtros, campos) }
const apagar = (tabela, filtros) => { exigirFiltro(filtros); return banco.apagar(tabela, filtros) }

// Quando a regra do banco recusa uma alteração, ele não dá erro: só muda 0 linhas. Sem esta
// conferência a tela diria "salvo" sem ter salvo. Quem tem frase própria para o "não achei"
// (ex.: o pedido que mudou de coluna em outro aparelho) usa atualizar e confere o resultado.
const naoGravou = () => Object.assign(new Error('Nenhuma linha mudou'), { doBanco: true, code: 'nao_gravou' })
async function gravar(tabela, filtros, campos) {
  const linhas = await atualizar(tabela, filtros, campos)
  if (!linhas.length) throw naoGravou()
  return linhas
}
async function apagarDeVerdade(tabela, filtros) {
  const linhas = await apagar(tabela, filtros)
  if (!linhas.length) throw naoGravou()
  return linhas
}

async function inserirVarios(tabela, linhas) {
  if (!linhas.length) return []
  if (TABELAS_DA_OBRA.includes(tabela) && linhas.some((l) => !l.obra_id)) {
    throw new Error(`Lançamento em ${tabela} sem obra_id`)
  }
  return banco.inserir(tabela, linhas)
}
const inserir = async (tabela, linha) => (await inserirVarios(tabela, [linha]))[0]

// ---------------------------------------------------------------------------
// Obra atual
// ---------------------------------------------------------------------------

export function definirObraAtual(id) {
  obraAtualId = id
}

function obraAtual() {
  if (!obraAtualId) throw new Error('Nenhuma obra escolhida')
  return obraAtualId
}

async function nomesDasObras() {
  return new Map((await ler('obras')).map((o) => [o.id, o.nome]))
}

// ---------------------------------------------------------------------------
// Login: Supabase Auth. Com o banco em memória dos testes, as pessoas vêm dos
// dados de exemplo e qualquer senha serve.
// ---------------------------------------------------------------------------

const authReal = () => banco === bancoSupabase

// Depois de entrar (ou ao reabrir o app): o próprio perfil decide a porta. Bloqueado não
// fica com sessão aberta. Os nomes da equipe vêm junto (a regra do banco só entrega o que pode).
// Cada Sair (e cada nova entrada) muda a "vez". Uma conferência que começou antes e termina
// depois não pode trazer de volta quem acabou de sair.
let vezDaSessao = 0
// Quem caiu fora por bloqueio já não tem sessão: o aviso espera aqui até a tela de Entrar mostrar.
let avisoDaSaida = null

async function abrirSessao(id, vez = vezDaSessao) {
  const meu = await um('profiles', { id })
  if (vez !== vezDaSessao) return ok(null)
  if (!meu) {
    usuario = null
    await supabase.auth.signOut()
    return falha('Conta sem perfil. Fale com o administrador.')
  }
  if (meu.status === 'bloqueado') {
    usuario = null // o aviso é o de bloqueado, não o de "sessão acabou"
    avisoDaSaida = AVISO_BLOQUEADO
    await supabase.auth.signOut()
    return falha(AVISO_BLOQUEADO)
  }
  const nomes = await nomesDaEquipe(meu)
  if (vez !== vezDaSessao) return ok(null)
  usuario = meu
  perfis = nomes
  return ok(copia(meu))
}

// Nomes de quem lançou ("fechado por Eng. Ricardo"). O admin lê os perfis inteiros; o gerente,
// só id e nome (função nomes_da_equipe, migration -15); o cliente, só o dele.
async function nomesDaEquipe(meu) {
  const fonte = fonteDosNomes(meu)
  if (fonte === 'perfis') return ler('profiles')
  if (fonte === 'equipe') return resposta(await supabase.rpc('nomes_da_equipe'))
  return [meu]
}

// Ao abrir o app: a sessão fica guardada no aparelho (F5 não desloga).
export const sessaoAtual = () => executar(async () => {
  const vez = vezDaSessao
  if (!authReal()) return ok(usuario ? copia(usuario) : null)
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    const aviso = avisoDaSaida
    avisoDaSaida = null
    return aviso ? falha(aviso) : ok(null)
  }
  return abrirSessao(data.session.user.id, vez)
})

export const entrar = (email, senha) => executar(async () => {
  if (!authReal()) {
    const p = perfis.find((x) => x.email.toLowerCase() === (email ?? '').trim().toLowerCase())
    if (!p) return falha('E-mail ou senha incorretos.')
    if (p.status === 'bloqueado') return falha(AVISO_BLOQUEADO)
    usuario = p
    return ok(copia(p))
  }
  const invalido = validarEntrada({ email, senha })
  if (invalido) return falha(invalido)
  avisoDaSaida = null
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
  if (error) return falha(mensagemDoLogin(error))
  vezDaSessao++
  return abrirSessao(data.user.id)
})

// A própria senha (Perfil): quem recebeu uma senha provisória põe a dele.
export const trocarSenha = (senha) => executar(async () => {
  const invalido = validarSenha(senha)
  if (invalido) return falha(invalido)
  if (!authReal()) return ok(true)
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) return falha(mensagemDoLogin(error, 'Não foi possível trocar a senha agora. Tente de novo em instantes.'))
  return ok(true)
})

// Ouve a sessão que acaba sozinha (expirou, saiu em outra aba). Devolve a função de parar de ouvir.
export function ouvirSessao({ aoAcabarASessao }) {
  if (!authReal()) return () => {}
  const { data } = supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT' && usuario) {
      usuario = null
      perfis = []
      obraAtualId = null
      aoAcabarASessao()
    }
  })
  return () => data.subscription.unsubscribe()
}

export const sair = () => executar(async () => {
  vezDaSessao++
  avisoDaSaida = null
  // Antes do signOut: o aviso de "sessão acabou" é só para quando ela acaba sozinha.
  usuario = null
  obraAtualId = null
  if (authReal()) {
    await supabase.auth.signOut()
    perfis = []
  }
  return ok(true)
})

const nomeDoPerfil = (id) => perfis.find((p) => p.id === id)?.nome ?? null

// ---------------------------------------------------------------------------
// Obras (cadastro e comparativos — as únicas leituras de várias obras juntas)
// ---------------------------------------------------------------------------

// As obras que quem está logado enxerga (quadro: o admin todas; os outros, as liberadas em membros).
// Toda lista de obras passa por aqui. A barreira de verdade é a regra do banco.
async function minhasObras(filtros) {
  const obras = await ler('obras', filtros)
  if (veTodasAsObras(usuario)) return obras
  return obrasVisiveis(obras, usuario, usuario ? await ler('membros', { profile_id: usuario.id }) : [])
}

export const listarObras = () => executar(async () => ok((await minhasObras()).sort(porNome)))

// COMPARATIVO ENTRE OBRAS: uma linha por obra, numa chamada só (nunca um laço na tela).
export const listarResumoObras = () => executar(async () => {
  const h = hoje()
  const ontem = somarDias(h, -1)
  const [obras, rdos, paradas] = await Promise.all([
    minhasObras(), ler('rdos', { data: [h, ontem] }), ler('frentes_servico', { situacao: 'Parada' }),
  ])
  const rdosHoje = rdos.filter((r) => r.data === h)
  const quebrados = rdosHoje.length ? await ler('rdo_equipamentos', { rdo_id: rdosHoje.map((r) => r.id), situacao: 'Quebrado' }) : []
  return ok(obras.map((o) => {
    const rdoHoje = rdosHoje.find((r) => r.obra_id === o.id)
    const rdoOntem = rdos.find((r) => r.obra_id === o.id && r.data === ontem)
    return {
      obra: o,
      rdo_hoje: statusRdoHoje(rdoHoje),
      frentes_paradas: paradas.filter((f) => f.obra_id === o.id).length,
      equipamentos_quebrados: rdoHoje ? quebrados.filter((x) => x.rdo_id === rdoHoje.id).length : 0,
      rdo_ontem_nao_fechado: cobraRdoDeOntem(o, rdoOntem, ontem),
    }
  }))
})

// COMPARATIVO ENTRE OBRAS: o efetivo lotado por função, de todas as obras, numa chamada só.
export const listarQuadroEfetivo = () => executar(async () => {
  const [funcionarios, obras] = await Promise.all([ler('funcionarios'), minhasObras()])
  return ok(montarQuadro(funcionarios, obras))
})

export const salvarObra = (dados) => executar(async () => {
  const obra = { ...dados, codigo: normalizarCodigo(dados.codigo) }
  const erro = validarObra(obra)
  if (erro) return falha(erro)
  const mesmoCodigo = await um('obras', { codigo: obra.codigo })
  if (mesmoCodigo && mesmoCodigo.id !== obra.id) return falha('Já existe obra com este código.')
  const campos = {
    nome: obra.nome, codigo: obra.codigo, tipo: obra.tipo, endereco: obra.endereco || null, cidade: obra.cidade,
    cliente: obra.cliente || null, numero_contrato: obra.numero_contrato || null, data_inicio: obra.data_inicio,
    data_meta_entrega: obra.data_meta_entrega || null, situacao: obra.situacao,
  }
  if (obra.id) return ok((await gravar('obras', { id: obra.id }, campos))[0])
  return ok(await inserir('obras', campos))
})

// Quadro (obra.apagar): só o Engenheiro, e só obra sem nada lançado. Aqui se pergunta antes para
// dizer O QUE a obra tem; a trava de verdade é o banco (nenhuma ligação com obras apaga em
// cascata, só a lista de acesso em membros, migration -24).
export const apagarObra = (id) => executar(async () => {
  if (!posso('obra.apagar')) return falha('Só o Engenheiro apaga obra.')
  const perguntas = [
    ...TABELAS_DA_OBRA.map((t) => [t, { obra_id: id }]),
    ['funcionarios', { obra_id: id }], ['equipamentos', { obra_id: id }], ['rdo_efetivo', { obra_destino_id: id }],
  ]
  const tem = await Promise.all(perguntas.map(([t, f]) => existe(t, f)))
  const motivo = motivoParaNaoApagarObra(perguntas.filter((_, i) => tem[i]).map(([t]) => t))
  if (motivo) return falha(motivo)
  await apagarDeVerdade('obras', { id })
  return ok(true)
})

// ---------------------------------------------------------------------------
// RDO de hoje da obra atual
// ---------------------------------------------------------------------------

const rdoDeHoje = (obraId) => um('rdos', { obra_id: obraId, data: hoje() })
// Todas as linhas de efetivo do dia, de TODAS as obras: a trava de duas obras precisa delas.
// O efetivo de hoje de TODAS as obras: a trava "presente em duas obras" lê as outras de propósito.
// O admin lê a tabela; o gerente, que não vê as outras obras, pela função efetivo_do_dia
// (migration -20), que entrega só quem está em qual obra.
const linhasDoDia = async () => (authReal() && !veTodasAsObras(usuario)
  ? resposta(await supabase.rpc('efetivo_do_dia', { dia: hoje() }))
  : ler('rdo_efetivo', { data: hoje() }))
const equipamentosNaObra = (obraId) => ler('equipamentos', { situacao: 'Na obra', obra_id: obraId })

async function efetivoDaObraHoje(obraId) {
  const [lidos, linhas] = await Promise.all([ler('funcionarios'), linhasDoDia()])
  const funcionarios = lidos.sort(porNome)
  return { funcionarios, linhas, efetivo: montarEfetivo({ obraId, funcionarios, linhasDoDia: linhas }) }
}

export const obterRdoHoje = () => executar(async () => {
  const rdo = await rdoDeHoje(obraAtual())
  return ok(rdo ? { ...rdo, fechado_por_nome: nomeDoPerfil(rdo.fechado_por) } : null)
})

// Abre o RDO de hoje na primeira mexida e grava o efetivo e os equipamentos padrão.
// Recebe a obra de quem chamou: a obra lida no toque vale do começo ao fim da gravação,
// mesmo que o seletor mude no meio.
async function garantirRdoHoje(obraId) {
  const existente = await rdoDeHoje(obraId)
  if (existente) return existente
  let rdo
  try {
    rdo = await inserir('rdos', {
      obra_id: obraId, data: hoje(), clima_manha: 'Bom', clima_tarde: 'Bom', praticavel_manha: true, praticavel_tarde: true,
      observacoes: '', status: 'Em andamento', criado_por: usuario?.id ?? null,
    })
  } catch (e) {
    // Dois toques ao mesmo tempo: o outro já abriu o RDO de hoje. Usa o dele.
    if (e.code === '23505') return rdoDeHoje(obraId)
    throw e
  }
  const [{ efetivo }, equipamentos] = await Promise.all([efetivoDaObraHoje(obraId), equipamentosNaObra(obraId)])
  await inserirVarios('rdo_efetivo', efetivo.map((item) => ({
    rdo_id: rdo.id, obra_id: obraId, data: rdo.data, funcionario_id: item.funcionario.id,
    situacao: item.situacao, obra_destino_id: item.obra_destino_id,
  })))
  await inserirVarios('rdo_equipamentos', equipamentos.map((e) => (
    { rdo_id: rdo.id, obra_id: obraId, equipamento_id: e.id, situacao: 'Operando', observacao: '' })))
  return rdo
}

export const salvarRdo = (campos) => executar(async () => {
  const rdo = await garantirRdoHoje(obraAtual())
  const permitidos = ['clima_manha', 'clima_tarde', 'praticavel_manha', 'praticavel_tarde', 'observacoes']
  const mudancas = Object.fromEntries(permitidos.filter((k) => k in campos).map((k) => [k, campos[k]]))
  if (!Object.keys(mudancas).length) return ok(rdo)
  return ok((await gravar('rdos', { id: rdo.id }, mudancas))[0])
})

// ---- Efetivo ----

export const listarEfetivoHoje = () => executar(async () => {
  const [{ efetivo }, nomes] = await Promise.all([efetivoDaObraHoje(obraAtual()), nomesDasObras()])
  return ok(efetivo.map((i) => ({ ...i, obra_destino_nome: i.obra_destino_id ? nomes.get(i.obra_destino_id) ?? 'outra obra' : null })))
})

// Tira a linha "Veio de outra obra" que o deslocamento tinha criado na obra de destino.
const desfazerChegada = (funcionarioId, obraDestinoId) =>
  apagar('rdo_efetivo', { funcionario_id: funcionarioId, data: hoje(), obra_id: obraDestinoId, situacao: 'Veio de outra obra' })

async function tirarDasEquipes(rdoId, funcionarioId) {
  const rfs = await ler('rdo_frentes', { rdo_id: rdoId })
  if (rfs.length) await apagar('rdo_frente_equipe', { rdo_frente_id: rfs.map((rf) => rf.id), funcionario_id: funcionarioId })
}

export const marcarEfetivo = (funcionarioId, situacao, obraDestinoId = null) => executar(async () => {
  const obraId = obraAtual()
  const [funcionarios, linhas, nomes] = await Promise.all([ler('funcionarios'), linhasDoDia(), nomesDasObras()])
  const func = funcionarios.find((f) => f.id === funcionarioId)
  if (!func) return falha('Funcionário não encontrado.')
  if (situacao === 'Deslocado' && (!obraDestinoId || obraDestinoId === obraId)) return falha('Escolha para qual obra ele foi.')
  if (contaComoPresenca(situacao)) {
    // A chegada que o próprio deslocamento daqui criou não conta: desmarcar o
    // Deslocado é justamente desfazê-la.
    const atual = linhas.find((l) => l.obra_id === obraId && l.funcionario_id === funcionarioId)
    const consideradas = atual?.situacao === 'Deslocado'
      ? linhas.filter((l) => !(l.funcionario_id === funcionarioId && l.obra_id === atual.obra_destino_id && l.situacao === 'Veio de outra obra'))
      : linhas
    const trava = podeMarcarPresenca(funcionarioId, obraId, consideradas)
    if (!trava.ok) return falha(mensagemTrava(func.nome, nomes.get(trava.obraId) ?? 'outra obra'))
  }
  const rdo = await garantirRdoHoje(obraId)
  const novos = { situacao, obra_destino_id: situacao === 'Deslocado' ? obraDestinoId : null }
  const existente = await um('rdo_efetivo', { rdo_id: rdo.id, funcionario_id: funcionarioId })
  let linha
  if (existente) {
    // Antes de voltar a Presente aqui, a chegada no destino sai (senão a trava do banco recusa).
    if (existente.situacao === 'Deslocado' && existente.obra_destino_id) await desfazerChegada(funcionarioId, existente.obra_destino_id)
    linha = (await gravar('rdo_efetivo', { id: existente.id }, novos))[0]
  } else {
    linha = await inserir('rdo_efetivo', { rdo_id: rdo.id, obra_id: obraId, data: rdo.data, funcionario_id: funcionarioId, ...novos })
  }
  // Se já tem RDO de hoje no destino, ele entra lá agora; senão, entra quando abrirem.
  if (situacao === 'Deslocado') {
    const rdoDestino = await rdoDeHoje(obraDestinoId)
    if (rdoDestino && !(await um('rdo_efetivo', { rdo_id: rdoDestino.id, funcionario_id: funcionarioId }))) {
      await inserir('rdo_efetivo', { rdo_id: rdoDestino.id, obra_id: obraDestinoId, data: rdoDestino.data, funcionario_id: funcionarioId, situacao: 'Veio de outra obra', obra_destino_id: null })
    }
  }
  // Ao sair da presença, sai também das equipes das frentes de hoje.
  if (!contaComoPresenca(situacao)) await tirarDasEquipes(rdo.id, funcionarioId)
  return ok(linha)
})

// Para "+ Trazer funcionário de outra obra": a única lista com gente de outras obras.
export const listarFuncionariosParaTrazer = () => executar(async () => {
  const obraId = obraAtual()
  const [{ funcionarios, linhas, efetivo }, nomes, minhas] = await Promise.all([efetivoDaObraHoje(obraId), nomesDasObras(), minhasObras()])
  const jaAqui = new Set(efetivo.map((i) => i.funcionario.id))
  // O gerente traz só de obras dele (ou quem está sem obra).
  const deObraMinha = new Set(minhas.map((o) => o.id))
  return ok(funcionarios
    .filter((f) => f.ativo && !jaAqui.has(f.id) && (!f.obra_id || deObraMinha.has(f.obra_id)))
    .map((f) => {
      const trava = podeMarcarPresenca(f.id, obraId, linhas)
      return {
        ...f,
        lotacao_nome: f.obra_id ? nomes.get(f.obra_id) ?? 'outra obra' : 'Sem obra',
        presente_em: trava.ok ? null : nomes.get(trava.obraId) ?? 'outra obra',
      }
    })
    .sort(porNome))
})

export const trazerFuncionario = (funcionarioId) => executar(async () => {
  const obraId = obraAtual()
  const [funcionarios, linhas, nomes] = await Promise.all([ler('funcionarios'), linhasDoDia(), nomesDasObras()])
  const func = funcionarios.find((f) => f.id === funcionarioId)
  if (!func) return falha('Funcionário não encontrado.')
  const trava = podeMarcarPresenca(funcionarioId, obraId, linhas)
  if (!trava.ok) return falha(mensagemTrava(func.nome, nomes.get(trava.obraId) ?? 'outra obra'))
  const rdo = await garantirRdoHoje(obraId)
  // Na obra dele, fica Deslocado para cá (se o RDO de lá já existe).
  const rdoOrigem = func.obra_id ? await rdoDeHoje(func.obra_id) : null
  if (rdoOrigem) {
    const l = await um('rdo_efetivo', { rdo_id: rdoOrigem.id, funcionario_id: funcionarioId })
    if (l) await gravar('rdo_efetivo', { id: l.id }, { situacao: 'Deslocado', obra_destino_id: obraId })
    else await inserir('rdo_efetivo', { rdo_id: rdoOrigem.id, obra_id: func.obra_id, data: rdoOrigem.data, funcionario_id: funcionarioId, situacao: 'Deslocado', obra_destino_id: obraId })
  }
  await inserir('rdo_efetivo', { rdo_id: rdo.id, obra_id: obraId, data: rdo.data, funcionario_id: funcionarioId, situacao: 'Veio de outra obra', obra_destino_id: null })
  return ok(true)
})

// "Mandar de volta" quem veio de outra obra: some daqui e volta a Presente na obra dele.
export const devolverFuncionario = (funcionarioId) => executar(async () => {
  const obraId = obraAtual()
  const rdo = await garantirRdoHoje(obraId)
  await desfazerChegada(funcionarioId, obraId)
  await tirarDasEquipes(rdo.id, funcionarioId)
  const origem = await um('rdo_efetivo', { funcionario_id: funcionarioId, data: hoje(), situacao: 'Deslocado', obra_destino_id: obraId })
  if (origem) await gravar('rdo_efetivo', { id: origem.id }, { situacao: 'Presente', obra_destino_id: null })
  return ok(true)
})

// Obras para onde dá para deslocar alguém (só nome: é escolha, não é dado da outra obra).
export const listarDestinosDeslocamento = () => executar(async () => {
  const obraId = obraAtual()
  const obras = await minhasObras({ situacao: 'Em andamento' })
  return ok(obras.filter((o) => o.id !== obraId).sort(porNome).map((o) => ({ id: o.id, nome: o.nome })))
})

// ---- Equipamentos do dia ----

export const listarEquipamentosHoje = () => executar(async () => {
  const obraId = obraAtual()
  const [equipamentos, rdo] = await Promise.all([equipamentosNaObra(obraId), rdoDeHoje(obraId)])
  const linhas = rdo ? await ler('rdo_equipamentos', { rdo_id: rdo.id }) : []
  return ok(equipamentos.sort(porNome).map((e) => {
    const linha = linhas.find((x) => x.equipamento_id === e.id)
    return { equipamento: e, situacao: linha?.situacao ?? 'Operando', observacao: linha?.observacao ?? '' }
  }))
})

export const marcarEquipamentoDia = (equipamentoId, situacao, observacao) => executar(async () => {
  const obraId = obraAtual()
  // O banco só confere que o equipamento existe; quem confere que ele está NESTA obra é aqui.
  if (!(await um('equipamentos', { id: equipamentoId, situacao: 'Na obra', obra_id: obraId }))) return falha('Equipamento não está nesta obra.')
  const rdo = await garantirRdoHoje(obraId)
  const mudancas = { situacao }
  if (observacao !== undefined) mudancas.observacao = observacao
  if (situacao === 'Operando') mudancas.observacao = ''
  const existente = await um('rdo_equipamentos', { rdo_id: rdo.id, equipamento_id: equipamentoId })
  if (existente) return ok((await gravar('rdo_equipamentos', { id: existente.id }, mudancas))[0])
  return ok(await inserir('rdo_equipamentos', { rdo_id: rdo.id, obra_id: obraId, equipamento_id: equipamentoId, observacao: '', ...mudancas }))
})

// ---------------------------------------------------------------------------
// Frentes de serviço (passo 2)
// ---------------------------------------------------------------------------

export const listarFrentes = () => executar(async () => {
  const obraId = obraAtual()
  const [frentes, rdo] = await Promise.all([ler('frentes_servico', { obra_id: obraId }), rdoDeHoje(obraId)])
  const rfs = rdo ? await ler('rdo_frentes', { rdo_id: rdo.id }) : []
  const equipe = rfs.length ? await ler('rdo_frente_equipe', { rdo_frente_id: rfs.map((rf) => rf.id) }) : []
  return ok(frentes.map((f) => {
    const rf = rfs.find((x) => x.frente_id === f.id)
    return {
      ...f,
      preenchida_hoje: Boolean(rf),
      situacao_hoje: rf?.situacao ?? null,
      equipe_hoje: rf ? equipe.filter((q) => q.rdo_frente_id === rf.id).length : 0,
    }
  }))
})

export const salvarFrente = (dados) => executar(async () => {
  const erro = validarFrente(dados)
  if (erro) return falha(erro)
  return ok(await inserir('frentes_servico', {
    obra_id: obraAtual(), nome: dados.nome.trim(), etapa: dados.etapa, executor: dados.executor,
    empreiteiro: dados.executor === 'Terceirizado' ? dados.empreiteiro.trim() : null,
    situacao: 'Não iniciada', parada_desde: null, motivo_parada: null, data_inicio: null, data_conclusao: null,
  }))
})

// O que já foi preenchido hoje numa frente, e quem pode entrar na equipe.
export const obterPreenchimento = (frenteId) => executar(async () => {
  const obraId = obraAtual()
  const [frentes, rdo, { efetivo }] = await Promise.all([ler('frentes_servico', { obra_id: obraId }), rdoDeHoje(obraId), efetivoDaObraHoje(obraId)])
  const frente = frentes.find((f) => f.id === frenteId)
  if (!frente) return falha('Frente não encontrada nesta obra.')
  const rfs = rdo ? await ler('rdo_frentes', { rdo_id: rdo.id }) : []
  const [equipe, fotos] = rfs.length
    ? await Promise.all([ler('rdo_frente_equipe', { rdo_frente_id: rfs.map((x) => x.id) }), ler('fotos', { rdo_id: rdo.id })])
    : [[], []]
  const rf = rfs.find((x) => x.frente_id === frenteId)
  const nomeDaFrente = (id) => frentes.find((f) => f.id === id)?.nome
  const presentes = efetivo.filter((i) => contaComoPresenca(i.situacao)).map((i) => ({
    id: i.funcionario.id,
    nome: i.funcionario.nome,
    tambem_em: rfs
      .filter((x) => x.frente_id !== frenteId && equipe.some((q) => q.rdo_frente_id === x.id && q.funcionario_id === i.funcionario.id))
      .map((x) => nomeDaFrente(x.frente_id)),
  }))
  return ok({
    frente,
    situacao: rf?.situacao ?? (frente.situacao === 'Não iniciada' ? 'Em execução' : frente.situacao),
    motivo_parada: rf?.motivo_parada ?? frente.motivo_parada ?? null,
    descricao: rf?.descricao ?? '',
    equipe: rf ? equipe.filter((q) => q.rdo_frente_id === rf.id).map((q) => q.funcionario_id) : [],
    fotos: rf ? await comEndereco(fotos.filter((ft) => ft.rdo_frente_id === rf.id), 'caminho', 'url') : [],
    presentes,
  })
})

export const salvarPreenchimento = (frenteId, { situacao, motivo_parada, descricao, equipe = [], fotos = [] }) => executar(async () => {
  const erro = validarPreenchimento({ situacao, motivo_parada })
  if (erro) return falha(erro)
  if (fotos.length > 5) return falha('No máximo 5 fotos por frente.')
  const obraId = obraAtual()
  if (!(await um('frentes_servico', { id: frenteId, obra_id: obraId }))) return falha('Frente não encontrada nesta obra.')
  // Equipe: só quem está presente hoje nesta obra. Confere antes de gravar qualquer coisa.
  const { efetivo } = await efetivoDaObraHoje(obraId)
  const presentes = new Set(efetivo.filter((i) => contaComoPresenca(i.situacao)).map((i) => i.funcionario.id))
  if (equipe.some((id) => !presentes.has(id))) return falha('Só quem está presente hoje pode entrar na equipe.')
  const rdo = await garantirRdoHoje(obraId)
  const campos = { situacao, motivo_parada: situacao === 'Parada' ? motivo_parada : null, descricao: descricao ?? '' }
  const existente = await um('rdo_frentes', { rdo_id: rdo.id, frente_id: frenteId })
  const rf = existente
    ? (await gravar('rdo_frentes', { id: existente.id }, campos))[0]
    : await inserir('rdo_frentes', { rdo_id: rdo.id, obra_id: obraId, frente_id: frenteId, ...campos })
  await apagar('rdo_frente_equipe', { rdo_frente_id: rf.id })
  await inserirVarios('rdo_frente_equipe', equipe.map((id) => ({ rdo_frente_id: rf.id, obra_id: obraId, funcionario_id: id })))
  const antes = await ler('fotos', { rdo_frente_id: rf.id })
  await apagar('fotos', { rdo_frente_id: rf.id })
  await inserirVarios('fotos', fotos.map((ft) => ({
    obra_id: obraId, rdo_id: rdo.id, rdo_frente_id: rf.id, caminho: ft.caminho, legenda: ft.legenda ?? '', visivel_cliente: true, enviada_por: usuario?.id ?? null,
  })))
  const ficaram = new Set(fotos.map((ft) => ft.caminho))
  await apagarArquivos(antes.map((ft) => ft.caminho).filter((c) => !ficaram.has(c)), obraId, 'diario')
  return ok(rf)
})

// ---------------------------------------------------------------------------
// Fechar o RDO (processo 1)
// ---------------------------------------------------------------------------

export const resumoFechamento = () => executar(async () => {
  const obraId = obraAtual()
  const [rdo, { efetivo }] = await Promise.all([rdoDeHoje(obraId), efetivoDaObraHoje(obraId)])
  const [rfs, fotos, equips] = rdo
    ? await Promise.all([ler('rdo_frentes', { rdo_id: rdo.id }), ler('fotos', { rdo_id: rdo.id }), ler('rdo_equipamentos', { rdo_id: rdo.id, situacao: 'Quebrado' })])
    : [[], [], []]
  return ok({ ...resumirDiario({ efetivo, frentes: rfs, fotos }), equipamentos_quebrados: equips.length })
})

// O RDO só vira "Fechado" no último passo: se a internet cair no meio, ele continua
// aberto e fechar de novo refaz o que faltou.
export const fecharRdo = () => executar(async () => {
  const obraId = obraAtual()
  const rdo = await garantirRdoHoje(obraId)
  if (!rdo.clima_manha || !rdo.clima_tarde) return falha('Preencha o clima da manhã e da tarde antes de fechar.')
  const [rfs, daObra, { efetivo }] = await Promise.all([
    ler('rdo_frentes', { rdo_id: rdo.id }), ler('frentes_servico', { obra_id: obraId }), efetivoDaObraHoje(obraId),
  ])
  const antes = new Map(daObra.map((f) => [f.id, f]))
  const campos = ['situacao', 'parada_desde', 'motivo_parada', 'data_inicio', 'data_conclusao']
  for (const f of aplicarFechamento(daObra, rfs, rdo.data)) {
    const mudou = campos.filter((c) => f[c] !== antes.get(f.id)[c])
    if (mudou.length) await gravar('frentes_servico', { id: f.id }, Object.fromEntries(mudou.map((c) => [c, f[c]])))
  }
  // Quem está no efetivo só pelo padrão (lotado depois que o RDO abriu, ou vindo
  // de outra obra) ganha linha agora: o diário fechado guarda o mesmo que a tela mostrou.
  await inserirVarios('rdo_efetivo', efetivo.filter((item) => !item.gravada).map((item) => ({
    rdo_id: rdo.id, obra_id: obraId, data: rdo.data, funcionario_id: item.funcionario.id,
    situacao: item.situacao, obra_destino_id: item.obra_destino_id,
  })))
  return ok((await gravar('rdos', { id: rdo.id }, {
    status: 'Fechado', fechado_por: usuario?.id ?? null, fechado_em: new Date().toISOString(),
  }))[0])
})

// ---------------------------------------------------------------------------
// Diários (histórico dos RDOs da obra atual, só leitura)
// ---------------------------------------------------------------------------

async function linhasDosRdos(ids) {
  if (!ids.length) return { efetivo: [], frentes: [], fotos: [] }
  const [efetivo, frentes, fotos] = await Promise.all([
    ler('rdo_efetivo', { rdo_id: ids }), ler('rdo_frentes', { rdo_id: ids }), ler('fotos', { rdo_id: ids }),
  ])
  return { efetivo, frentes, fotos: await comEndereco(fotos, 'caminho', 'url') }
}
const doRdo = (linhas, rdoId) => ({
  efetivo: linhas.efetivo.filter((l) => l.rdo_id === rdoId),
  frentes: linhas.frentes.filter((x) => x.rdo_id === rdoId),
  fotos: linhas.fotos.filter((ft) => ft.rdo_id === rdoId),
})

export const listarDiarios = () => executar(async () => {
  const rdos = ordenarDiarios(await ler('rdos', { obra_id: obraAtual() }))
  const linhas = await linhasDosRdos(rdos.map((r) => r.id))
  return ok(rdos.map((rdo) => {
    const dele = doRdo(linhas, rdo.id)
    return { ...rdo, ...resumirDiario(dele), miniaturas: dele.fotos.slice(0, 4) }
  }))
})

// O dia inteiro, já com os nomes, para a leitura e a impressão.
export const obterDiario = (rdoId) => executar(async () => {
  const obraId = obraAtual()
  const rdo = (await ler('rdos', { obra_id: obraId })).find((r) => r.id === rdoId)
  if (!rdo) return falha('Diário não encontrado nesta obra.')
  const [linhas, funcionarios, equipamentos, frentesDaObra, rdoEquip, nomes] = await Promise.all([
    linhasDosRdos([rdo.id]), ler('funcionarios'), ler('equipamentos'), ler('frentes_servico', { obra_id: obraId }),
    ler('rdo_equipamentos', { rdo_id: rdo.id }), nomesDasObras(),
  ])
  const equipe = linhas.frentes.length ? await ler('rdo_frente_equipe', { rdo_frente_id: linhas.frentes.map((rf) => rf.id) }) : []
  const nomeFunc = (id) => funcionarios.find((f) => f.id === id)
  const efetivo = linhas.efetivo.map((l) => {
    const f = nomeFunc(l.funcionario_id)
    return {
      id: l.id, nome: f?.nome ?? 'Funcionário removido', funcao: f?.funcao ?? '', situacao: l.situacao,
      obra_destino_nome: l.obra_destino_id ? nomes.get(l.obra_destino_id) ?? 'outra obra' : null,
    }
  }).sort(porNome)
  const equipDoDia = rdoEquip.map((x) => {
    const e = equipamentos.find((y) => y.id === x.equipamento_id)
    return { id: x.id, nome: e?.nome ?? 'Equipamento removido', codigo: e?.codigo ?? null, situacao: x.situacao, observacao: x.observacao }
  }).sort(porNome)
  const frentes = linhas.frentes.map((rf) => {
    const fs = frentesDaObra.find((y) => y.id === rf.frente_id)
    return {
      id: rf.id, nome: fs?.nome ?? 'Frente removida', etapa: fs?.etapa ?? '', executor: fs?.executor ?? '', empreiteiro: fs?.empreiteiro ?? null,
      situacao: rf.situacao, motivo_parada: rf.motivo_parada, descricao: rf.descricao,
      equipe: equipe.filter((q) => q.rdo_frente_id === rf.id).map((q) => nomeFunc(q.funcionario_id)?.nome).filter(Boolean),
      fotos: linhas.fotos.filter((ft) => ft.rdo_frente_id === rf.id),
    }
  }).sort(porNome)
  // Foto do dia que não está presa a nenhuma frente: aparece num bloco próprio.
  const idsFrentes = new Set(linhas.frentes.map((rf) => rf.id))
  return ok({
    ...rdo, ...resumirDiario(linhas),
    criado_por_nome: nomeDoPerfil(rdo.criado_por), fechado_por_nome: nomeDoPerfil(rdo.fechado_por),
    efetivo, equipamentos: equipDoDia, frentes,
    fotos_soltas: linhas.fotos.filter((ft) => !idsFrentes.has(ft.rdo_frente_id)),
  })
})

// ---------------------------------------------------------------------------
// Pessoas e equipamentos (cadastros que circulam entre obras: obra_id é opcional)
// Cada tela mostra só o que está na obra atual + o que não está em obra nenhuma.
// ---------------------------------------------------------------------------

export const listarPessoas = () => executar(async () => {
  const obraId = obraAtual()
  const [daObra, semObra] = await Promise.all([ler('funcionarios', { obra_id: obraId }), ler('funcionarios', { obra_id: null })])
  return ok({ daObra: daObra.sort(porNome), semObra: semObra.sort(porNome) })
})

export const salvarFuncionario = (dados) => executar(async () => {
  if (!dados.nome?.trim()) return falha('Informe o nome.')
  if (!dados.funcao) return falha('Escolha a função.')
  const f = { nome: dados.nome.trim(), funcao: dados.funcao, obra_id: dados.obra_id || null, ativo: dados.ativo ?? true }
  if (dados.id) return ok((await gravar('funcionarios', { id: dados.id }, f))[0])
  return ok(await inserir('funcionarios', f))
})

export const listarEquipamentos = () => executar(async () => {
  const obraId = obraAtual()
  const [naObra, noDeposito] = await Promise.all([equipamentosNaObra(obraId), ler('equipamentos', { situacao: 'No depósito' })])
  return ok({ naObra: naObra.sort(porNome), noDeposito: noDeposito.sort(porNome) })
})

export const salvarEquipamento = ({ nome, codigo, nesta_obra }) => executar(async () => {
  if (!nome?.trim()) return falha('Informe o nome do equipamento.')
  return ok(await inserir('equipamentos', {
    nome: nome.trim(), codigo: codigo?.trim() || null,
    situacao: nesta_obra ? 'Na obra' : 'No depósito', obra_id: nesta_obra ? obraAtual() : null, situacao_desde: hoje(),
  }))
})

export const mandarEquipamentoParaObra = (equipamentoId) => executar(async () => {
  const obraId = obraAtual()
  // Só sai do depósito: o que está em outra obra (ou no conserto) não é puxado sem querer.
  const [e] = await atualizar('equipamentos', { id: equipamentoId, situacao: 'No depósito' },
    { situacao: 'Na obra', obra_id: obraId, situacao_desde: hoje(), oficina: null, previsao_retorno: null, defeito: null })
  if (e) return ok(e)
  const atual = await um('equipamentos', { id: equipamentoId })
  if (!atual) return falha('Equipamento não encontrado.')
  if (atual.situacao === 'Na obra') {
    return falha(`${atual.nome} está na obra ${(await nomesDasObras()).get(atual.obra_id) ?? 'outra obra'}. Mande para o depósito de lá primeiro.`)
  }
  return falha(`${atual.nome} não está no depósito (${atual.situacao.toLowerCase()}).`)
})

export const mandarEquipamentoParaDeposito = (equipamentoId) => executar(async () => {
  const [e] = await atualizar('equipamentos', { id: equipamentoId, obra_id: obraAtual() },
    { situacao: 'No depósito', obra_id: null, situacao_desde: hoje() })
  return e ? ok(e) : falha('Equipamento não está nesta obra.')
})

// ---------------------------------------------------------------------------
// Materiais: o quadro de pedidos da obra atual. O catálogo é igual para todas as obras.
// ---------------------------------------------------------------------------

const comMaterial = (pedido, catalogo) => {
  const m = catalogo.find((x) => x.id === pedido.material_id)
  return {
    ...pedido,
    quantidade: Number(pedido.quantidade),
    material: m ? { nome: m.nome, unidade: m.unidade, categoria: m.categoria } : { nome: 'Material removido', unidade: '', categoria: null },
  }
}

// O quadro e o estoque vêm numa chamada só: o contador "Insumos críticos" fica no topo dos dois.
export const listarQuadroMateriais = () => executar(async () => {
  const obraId = obraAtual()
  const [pedidos, catalogo, frentes, insumos, movimentos] = await Promise.all([
    ler('pedidos_material', { obra_id: obraId }), ler('materiais'), ler('frentes_servico', { obra_id: obraId }),
    ler('insumos', { obra_id: obraId }), ler('movimentos_estoque', { obra_id: obraId }),
  ])
  return ok({
    // A foto da nota mostra preço (quadro, pedidos.ver_nota_fiscal). O arquivo está no Storage, numa
    // pasta que só o admin abre (migration -16); para os outros, nem o caminho sai daqui.
    pedidos: (posso('pedidos.ver_nota_fiscal') ? await comEndereco(pedidos, 'foto_nf', 'foto_nf_url') : pedidos.map((p) => ({ ...p, foto_nf: null })))
      .map((p) => comMaterial(p, catalogo)),
    catalogo: catalogo.filter((m) => m.ativo).sort(porNome),
    // Sugestões para o campo "frente" (o pedido aceita texto livre, ex.: "Banheiro suíte").
    frentes: frentes.filter((f) => f.situacao !== 'Concluída').sort(porNome).map((f) => f.nome),
    estoque: montarEstoque(insumos, movimentos, catalogo),
  })
})

export const salvarPedido = (dados) => executar(async () => {
  // A obra lida no toque vale até o fim, mesmo que o seletor mude enquanto o banco responde.
  const obraId = obraAtual()
  const erro = Object.values(validarNovoPedido(dados))[0]
  if (erro) return falha(erro)
  const material = await um('materiais', { id: dados.material_id, ativo: true })
  if (!material) return falha('Material não encontrado no catálogo.')
  const novo = await inserir('pedidos_material', { ...novoPedido(dados, hoje()), obra_id: obraId, criado_por: usuario?.id ?? null })
  return ok(comMaterial(novo, [material]))
})

// Mudar de coluna grava o pedido (status + histórico + o que a coluna pede) e, quando
// for o caso, mexe no estoque: chegar no almoxarifado dá entrada, entregar na frente dá
// saída do que sobrou do lote, e voltar desfaz. O estoque é conferido ANTES de o pedido
// mudar; a movimentação vem DEPOIS, numa segunda gravação. Se a internet cair entre as
// duas, o pedido fica na coluna nova sem a movimentação: voltar a coluna e avançar de
// novo completa (voltar sem movimentação lançada não mexe no estoque).
export const moverPedido = (pedidoId, novoStatus, extras = {}) => executar(async () => {
  const obraId = obraAtual()
  const pedido = await um('pedidos_material', { id: pedidoId, obra_id: obraId })
  if (!pedido) return falha('Pedido não encontrado nesta obra.')
  const erro = Object.values(validarMovimento(pedido, novoStatus, extras, hoje()))[0]
  if (erro) return falha(erro)
  // Quem não pode ver a nota fiscal não mexe nela: receber de novo não apaga a que o admin pôs.
  const { foto_nf, ...semNota } = extras
  const campos = aplicarMovimento(pedido, novoStatus, posso('pedidos.ver_nota_fiscal') ? { ...semNota, foto_nf } : semNota, hoje())
  const material = await um('materiais', { id: pedido.material_id })
  const estoque = await efeitoDoPedido(obraId, pedido, { ...pedido, ...campos })
  const bloqueio = estoque && bloqueioNoEstoque(estoque.efeito, estoque.saldo, material?.unidade ?? '')
  if (bloqueio) return falha(bloqueio)
  // O filtro pelo status lido protege do toque duplo e do outro aparelho: se o pedido já andou, nada muda.
  const [salvo] = await atualizar('pedidos_material', { id: pedidoId, obra_id: obraId, status: pedido.status }, campos)
  if (!salvo) return falha('Este pedido já tinha mudado de coluna (outro toque ou outro aparelho).')
  // Recebido de novo (depois de voltar a coluna): a nota antiga deu lugar à nova, ou a nenhuma.
  if ('foto_nf' in campos && pedido.foto_nf !== campos.foto_nf) await apagarArquivos([pedido.foto_nf], obraId, 'nota-fiscal')
  if (estoque) await aplicarNoEstoque(obraId, salvo, estoque)
  return ok(comMaterial(salvo, [material]))
})

// ---- Estoque (aba Materiais → Estoque). O saldo é a soma das movimentações. ----

async function saldoDoInsumo(obraId, insumoId) {
  return saldoDe(await ler('movimentos_estoque', { obra_id: obraId, insumo_id: insumoId }), insumoId)
}

// O que o movimento do pedido faz no estoque, com o insumo e o saldo de agora. Null = nada.
async function efeitoDoPedido(obraId, antes, depois) {
  let efeito = efeitoNoEstoque(antes, depois)
  if (!efeito) return null
  const insumo = await um('insumos', { obra_id: obraId, material_id: antes.material_id })
  // Desfazer só existe se a movimentação existe, e desfaz exatamente o que ela lançou.
  if (efeito.desfazer) {
    const lancado = insumo && await um('movimentos_estoque', { obra_id: obraId, pedido_id: antes.id, tipo: efeito.tipo })
    if (!lancado) return null
    efeito = { ...efeito, quantidade: Number(lancado.quantidade) }
  }
  const saldo = insumo ? await saldoDoInsumo(obraId, insumo.id) : 0
  efeito = saidaDoQueSobrou(efeito, saldo)
  return efeito && { efeito, insumo, saldo }
}

// O insumo do material nesta obra; nasce sem mínimo na primeira entrada.
async function garantirInsumo(obraId, materialId) {
  const existente = await um('insumos', { obra_id: obraId, material_id: materialId })
  if (existente) return existente
  try {
    return await inserir('insumos', { obra_id: obraId, material_id: materialId, saldo_minimo: 0 })
  } catch (e) {
    // Dois toques ao mesmo tempo: o outro já criou. Usa o dele.
    if (e.code === '23505') return um('insumos', { obra_id: obraId, material_id: materialId })
    throw e
  }
}

async function aplicarNoEstoque(obraId, pedido, { efeito, insumo }) {
  const { tipo, desfazer, quantidade } = efeito
  if (desfazer) return apagar('movimentos_estoque', { obra_id: obraId, pedido_id: pedido.id, tipo })
  const alvo = insumo ?? await garantirInsumo(obraId, pedido.material_id)
  const campos = { quantidade, data: hoje(), frente: pedido.frente }
  const existente = await um('movimentos_estoque', { obra_id: obraId, pedido_id: pedido.id, tipo })
  if (existente) return gravar('movimentos_estoque', { id: existente.id, obra_id: obraId }, campos)
  return inserir('movimentos_estoque', { ...campos, obra_id: obraId, insumo_id: alvo.id, tipo, origem: 'Pedido', pedido_id: pedido.id })
}

// Baixa manual. O saldo nunca fica negativo.
export const registrarBaixa = (dados) => executar(async () => {
  const obraId = obraAtual()
  const insumo = dados.insumo_id ? await um('insumos', { id: dados.insumo_id, obra_id: obraId }) : null
  if (dados.insumo_id && !insumo) return falha('Insumo não encontrado nesta obra.')
  const [linha] = insumo
    ? montarEstoque([insumo], await ler('movimentos_estoque', { obra_id: obraId, insumo_id: insumo.id }), await ler('materiais', { id: insumo.material_id }))
    : []
  const erro = Object.values(validarBaixa(dados, linha, hoje()))[0]
  if (erro) return falha(erro)
  return ok(await inserir('movimentos_estoque', {
    obra_id: obraId, insumo_id: insumo.id, tipo: 'Saída', quantidade: lerQuantidade(dados.quantidade),
    data: dados.data, frente: dados.frente.trim(), origem: 'Manual', pedido_id: null,
  }))
})

// Desfaz uma baixa manual lançada errado. Só baixa manual: o que veio de pedido se desfaz
// voltando o pedido de coluna, e apagar uma saída nunca deixa o saldo negativo.
export const desfazerBaixa = (movimentoId) => executar(async () => {
  const filtro = { id: movimentoId, obra_id: obraAtual(), tipo: 'Saída', origem: 'Manual' }
  const mov = await um('movimentos_estoque', filtro)
  if (!mov) return falha('Baixa não encontrada nesta obra.')
  await apagarDeVerdade('movimentos_estoque', filtro)
  return ok(true)
})

// Histórico de um insumo, do mais novo para o mais antigo.
export const obterHistoricoInsumo = (insumoId) => executar(async () => {
  const obraId = obraAtual()
  if (!(await um('insumos', { id: insumoId, obra_id: obraId }))) return falha('Insumo não encontrado nesta obra.')
  const movimentos = await ler('movimentos_estoque', { obra_id: obraId, insumo_id: insumoId })
  return ok(ordenarHistorico(movimentos.map((m) => ({ ...m, quantidade: Number(m.quantidade) }))))
})

export const salvarMinimo = (insumoId, texto) => executar(async () => {
  const obraId = obraAtual()
  const erro = validarMinimo(texto)
  if (erro) return falha(erro)
  const [salvo] = await atualizar('insumos', { id: insumoId, obra_id: obraId }, { saldo_minimo: lerMinimo(texto) })
  return salvo ? ok(salvo) : falha('Insumo não encontrado nesta obra.')
})

export const apagarPedido = (pedidoId) => executar(async () => {
  const filtro = { id: pedidoId, obra_id: obraAtual() }
  const pedido = await um('pedidos_material', filtro)
  if (!pedido) return falha('Pedido não encontrado nesta obra.')
  if (!podeExcluirPedido(pedido)) return falha('Só dá para excluir pedido em Solicitar. Para desfazer, volte ele de coluna.')
  await apagarDeVerdade('pedidos_material', filtro)
  await apagarArquivos([pedido.foto_nf], filtro.obra_id, 'nota-fiscal')
  return ok(true)
})

// ---------------------------------------------------------------------------
// Planejamento: a lista de atividades da obra atual. As quatro sub-abas leem esta
// mesma lista (montarEap e companhia, em planejamento.js, fazem o resto).
// ---------------------------------------------------------------------------

const atividadesDaObra = (obraId) => ler('atividades', { obra_id: obraId })

// Tudo do Planejamento da obra numa chamada só: atividades, calendário (dias de trabalho e
// feriados), restrições, a situação de cada atividade em cada semana e as subtarefas.
export const listarPlanejamento = () => executar(async () => {
  const obraId = obraAtual()
  const [atividades, obra, restricoes, semanas, subtarefas] = await Promise.all([
    atividadesDaObra(obraId), um('obras', { id: obraId }), ler('restricoes', { obra_id: obraId }),
    ler('semana_atividades', { obra_id: obraId }), ler('subtarefas', { obra_id: obraId }),
  ])
  return ok({ atividades, calendario: calendarioDaObra(obra), restricoes, semanas, subtarefas })
})

// Avanço real (0 a 100), só em atividade sem subatividade: o do grupo sai das filhas.
// Também acerta o Kanban (efeitoDoAvanco): 100% conclui na semana de hoje; sair de 100%
// reabre. São gravações separadas: se a internet cair no meio, lançar o mesmo avanço completa.
export const salvarProgresso = (id, texto) => executar(async () => {
  const obraId = obraAtual()
  const progresso = lerProgresso(texto)
  if (progresso === null) return falha('Informe um número de 0 a 100.')
  const lista = await atividadesDaObra(obraId)
  const atual = lista.find((x) => x.id === id)
  if (!atual) return falha('Atividade não encontrada nesta obra.')
  if (lista.some((x) => x.pai_id === id && !x.arquivada)) return falha('O avanço de um grupo vem das subatividades.')
  const [salva] = await gravar('atividades', { id, obra_id: obraId }, { progresso })
  const registros = await ler('semana_atividades', { obra_id: obraId, atividade_id: id })
  const efeito = efeitoDoAvanco(registros, progresso, atual.progresso, segundaDaSemana(hoje()))
  if (efeito.concluir) await gravarNaSemana(obraId, id, efeito.concluir.semana, efeito.concluir.campos)
  if (efeito.reabrir.length) await gravar('semana_atividades', { id: efeito.reabrir, obra_id: obraId }, { status: 'Em andamento', progresso_antes: null })
  return ok(salva)
})

export const salvarCalendario = ({ dias, feriados }) => executar(async () => {
  const erro = validarCalendario({ dias })
  if (erro) return falha(erro)
  const cal = calendarioDaObra({ dias_trabalho: [...new Set(dias)].sort(), feriados })
  const [obra] = await gravar('obras', { id: obraAtual() }, { dias_trabalho: cal.dias, feriados: cal.feriados })
  return ok(calendarioDaObra(obra))
})

// Cria ou edita. Mudar de "dentro de" leva a atividade para o fim das novas irmãs.
export const salvarAtividade = (dados) => executar(async () => {
  const obraId = obraAtual()
  const erro = Object.values(validarAtividade(dados))[0]
  if (erro) return falha(erro)
  const lista = await atividadesDaObra(obraId)
  const atual = dados.id ? lista.find((x) => x.id === dados.id) : null
  if (dados.id && !atual) return falha('Atividade não encontrada nesta obra.')
  const paiId = dados.pai_id || null
  if (paiId) {
    const mae = lista.find((x) => x.id === paiId)
    if (!mae || mae.arquivada) return falha('A atividade-mãe não existe nesta obra (ou está arquivada).')
    if (atual && idsParaArquivar(lista, atual.id).includes(paiId)) return falha('Uma atividade não pode ficar dentro dela mesma.')
  }
  const campos = { titulo: dados.titulo.trim(), data_inicio: dados.data_inicio, data_fim: dados.data_fim, pai_id: paiId }
  if (!atual || (atual.pai_id ?? null) !== paiId) campos.ordem = proximaOrdem(lista, paiId)
  if (atual) return ok((await gravar('atividades', { id: atual.id, obra_id: obraId }, campos))[0])
  return ok(await inserir('atividades', { ...campos, obra_id: obraId }))
})

// Importação de planilha (já conferida na tela; ver importacao.js). `linhas` = paraGravar(...).
// As atividades entram numa gravação só (tudo ou nada): os ids nascem aqui para a filha já
// saber quem é a mãe. "substituir" arquiva as ativas DEPOIS de criar as novas: se a internet
// cair entre as duas, ficam as duas listas, e é só arquivar as antigas na EAP.
export const IMPORTACAO_MAXIMO = 500
export const importarCronograma = (linhas, modo) => executar(async () => {
  const obraId = obraAtual()
  if (!['adicionar', 'substituir'].includes(modo)) return falha('Escolha entre adicionar e substituir.')
  if (!linhas?.length) return falha('A planilha não tem nenhuma atividade.')
  if (linhas.length > IMPORTACAO_MAXIMO) return falha(`A planilha tem ${linhas.length} atividades; o máximo é ${IMPORTACAO_MAXIMO} por vez.`)
  for (const l of linhas) {
    const erro = Object.values(validarAtividade(l))[0]
    if (erro) return falha(`${l.chave}: ${erro}`)
  }
  const ids = new Map(linhas.map((l) => [l.chave, crypto.randomUUID()]))
  if (linhas.some((l) => l.paiChave && !ids.has(l.paiChave))) return falha('A planilha tem item sem o item de cima.')
  const lista = await atividadesDaObra(obraId)
  const antigas = lista.filter((x) => !x.arquivada).map((x) => x.id)
  const depoisDe = proximaOrdem(lista, null) // as de topo entram depois das que já existem
  const novas = await inserirVarios('atividades', linhas.map((l) => ({
    id: ids.get(l.chave), obra_id: obraId, pai_id: l.paiChave ? ids.get(l.paiChave) : null,
    ordem: l.paiChave ? l.ordem : depoisDe + l.ordem, titulo: l.titulo.trim(),
    data_inicio: l.data_inicio, data_fim: l.data_fim, progresso: 0, arquivada: false,
  })))
  if (modo === 'substituir' && antigas.length) await gravar('atividades', { id: antigas, obra_id: obraId }, { arquivada: true })
  return ok({ criadas: novas.length, arquivadas: modo === 'substituir' ? antigas.length : 0 })
})

// Subir (-1) ou descer (+1) entre as irmãs. São duas gravações: se a internet cair
// no meio, as duas ficam com a mesma ordem, e tocar de novo desempata.
export const moverAtividade = (id, direcao) => executar(async () => {
  const obraId = obraAtual()
  const lista = await atividadesDaObra(obraId)
  if (!lista.some((x) => x.id === id)) return falha('Atividade não encontrada nesta obra.')
  const troca = trocaDeOrdem(lista, id, direcao)
  if (!troca) return falha(direcao < 0 ? 'Ela já é a primeira.' : 'Ela já é a última.')
  for (const t of troca) await gravar('atividades', { id: t.id, obra_id: obraId }, { ordem: t.ordem })
  return ok(troca)
})

// Arquivar leva as filhas; desarquivar traz as filhas e as mães arquivadas. Nada se apaga.
export const arquivarAtividade = (id, arquivar = true) => executar(async () => {
  const obraId = obraAtual()
  const lista = await atividadesDaObra(obraId)
  if (!lista.some((x) => x.id === id)) return falha('Atividade não encontrada nesta obra.')
  const ids = arquivar ? idsParaArquivar(lista, id) : idsParaDesarquivar(lista, id)
  return ok(await gravar('atividades', { id: ids, obra_id: obraId }, { arquivada: arquivar }))
})

// ---- Médio prazo: as restrições das atividades ----

// A restrição precisa ser de uma atividade ativa desta obra.
async function atividadeAtiva(obraId, id) {
  const at = id ? await um('atividades', { id, obra_id: obraId }) : null
  return at && !at.arquivada ? at : null
}

// Cria ou edita. O prazo no passado só é recusado ao criar (editar uma vencida pode).
export const salvarRestricao = (dados) => executar(async () => {
  const obraId = obraAtual()
  const erro = Object.values(validarRestricao(dados, hoje()))[0]
  if (erro) return falha(erro)
  if (!(await atividadeAtiva(obraId, dados.atividade_id))) return falha('A atividade não existe nesta obra (ou está arquivada).')
  const campos = {
    atividade_id: dados.atividade_id, descricao: dados.descricao.trim(), tipo: dados.tipo,
    prazo: dados.prazo, responsavel: dados.responsavel.trim(),
  }
  if (!dados.id) return ok(await inserir('restricoes', { ...campos, obra_id: obraId, resolvida: false, resolvida_em: null }))
  const [salva] = await atualizar('restricoes', { id: dados.id, obra_id: obraId }, campos)
  return salva ? ok(salva) : falha('Restrição não encontrada nesta obra.')
})

// Semana anterior (-1) ou próxima (+1): muda o prazo. O filtro pelo prazo lido protege do
// toque duplo: se outro toque já mudou, este não muda de novo.
export const moverRestricao = (id, direcao) => executar(async () => {
  const obraId = obraAtual()
  const r = await um('restricoes', { id, obra_id: obraId })
  if (!r) return falha('Restrição não encontrada nesta obra.')
  if (!podeMover(r, direcao, hoje())) return falha(r.resolvida ? 'Restrição resolvida não muda de semana.' : 'Ela já está na semana atual.')
  const [salva] = await atualizar('restricoes', { id, obra_id: obraId, prazo: r.prazo }, { prazo: novoPrazo(r.prazo, direcao, hoje()) })
  return salva ? ok(salva) : falha('Esta restrição já tinha mudado (outro toque ou outro aparelho).')
})

export const resolverRestricao = (id, resolvida = true) => executar(async () => {
  const [salva] = await atualizar('restricoes', { id, obra_id: obraAtual() }, { resolvida, resolvida_em: resolvida ? hoje() : null })
  return salva ? ok(salva) : falha('Restrição não encontrada nesta obra.')
})

// Só para restrição lançada por engano: a tela pede confirmação antes.
export const apagarRestricao = (id) => executar(async () => {
  const filtro = { id, obra_id: obraAtual() }
  if (!(await um('restricoes', filtro))) return falha('Restrição não encontrada nesta obra.')
  await apagarDeVerdade('restricoes', filtro)
  return ok(true)
})

// ---- Curto prazo: o Kanban da semana e as subtarefas ----

// O Kanban só mexe em atividade ativa, desta obra e sem subatividade (a do grupo sai das filhas).
async function atividadeDoKanban(obraId, id) {
  const lista = await atividadesDaObra(obraId)
  const at = lista.find((x) => x.id === id && !x.arquivada)
  if (!at) return { erro: 'Atividade não encontrada nesta obra.' }
  if (lista.some((x) => x.pai_id === id && !x.arquivada)) return { erro: 'Um grupo não entra no Kanban: mova as subatividades dele.' }
  return { at }
}

const semanaValida = (semana) => Boolean(semana) && segundaDaSemana(semana) === semana

// Grava a linha da atividade naquela semana (cria na primeira mexida).
async function gravarNaSemana(obraId, atividadeId, semana, campos) {
  const filtro = { obra_id: obraId, atividade_id: atividadeId, semana }
  const existente = await um('semana_atividades', filtro)
  if (existente) return (await gravar('semana_atividades', { id: existente.id, obra_id: obraId }, campos))[0]
  try {
    return await inserir('semana_atividades', { ...REGISTRO_VAZIO, ...filtro, ...campos })
  } catch (e) {
    // Dois toques ao mesmo tempo: o outro já criou a linha. Atualiza a dele.
    if (e.code !== '23505') throw e
    const outra = await um('semana_atividades', filtro)
    return (await gravar('semana_atividades', { id: outra.id, obra_id: obraId }, campos))[0]
  }
}

// Mudar de coluna. Ir para Concluído põe o avanço da atividade em 100% (o Longo prazo vê na
// hora) e guarda o avanço de antes; sair de Concluído devolve. São duas gravações: se a
// internet cair entre elas, mover de novo para a mesma coluna completa.
export const moverNaSemana = (atividadeId, semana, status) => executar(async () => {
  const obraId = obraAtual()
  if (!STATUS_SEMANA.includes(status)) return falha('Coluna inválida.')
  if (!semanaValida(semana)) return falha('Semana inválida.')
  const { at, erro } = await atividadeDoKanban(obraId, atividadeId)
  if (erro) return falha(erro)
  const antes = await um('semana_atividades', { obra_id: obraId, atividade_id: atividadeId, semana })
  const { campos, progresso } = mudancaDeColuna(antes, status, at.progresso)
  const salva = await gravarNaSemana(obraId, atividadeId, semana, campos)
  if (progresso !== null) await gravar('atividades', { id: atividadeId, obra_id: obraId }, { progresso })
  return ok(salva)
})

// "Não realizada" naquela semana, com a causa raiz. causa null = desmarcar.
export const marcarNaoRealizada = (atividadeId, semana, causa) => executar(async () => {
  const obraId = obraAtual()
  if (causa !== null) {
    const erro = validarCausa(causa)
    if (erro) return falha(erro)
  }
  if (!semanaValida(semana)) return falha('Semana inválida.')
  const { erro } = await atividadeDoKanban(obraId, atividadeId)
  if (erro) return falha(erro)
  const atual = await um('semana_atividades', { obra_id: obraId, atividade_id: atividadeId, semana })
  if (causa !== null && atual?.status === 'Concluído') return falha('Atividade concluída não pode ser marcada como não realizada.')
  return ok(await gravarNaSemana(obraId, atividadeId, semana, { nao_realizada: causa !== null, causa }))
})

export const criarSubtarefa = (atividadeId, titulo) => executar(async () => {
  const obraId = obraAtual()
  if (!titulo?.trim()) return falha('Escreva a subtarefa.')
  const { erro } = await atividadeDoKanban(obraId, atividadeId)
  if (erro) return falha(erro)
  const irmas = await ler('subtarefas', { obra_id: obraId, atividade_id: atividadeId })
  return ok(await inserir('subtarefas', {
    obra_id: obraId, atividade_id: atividadeId, titulo: titulo.trim(),
    ordem: ordemNoFim(irmas), feita: false, nao_realizada: false, causa: null,
  }))
})

export const marcarSubtarefa = (id, { feita, causa }) => executar(async () => {
  if (causa) {
    const erro = validarCausa(causa)
    if (erro) return falha(erro)
  }
  const [salva] = await atualizar('subtarefas', { id, obra_id: obraAtual() }, camposDaSubtarefa({ feita, causa }))
  return salva ? ok(salva) : falha('Subtarefa não encontrada nesta obra.')
})

export const apagarSubtarefa = (id) => executar(async () => {
  const filtro = { id, obra_id: obraAtual() }
  if (!(await um('subtarefas', filtro))) return falha('Subtarefa não encontrada nesta obra.')
  await apagarDeVerdade('subtarefas', filtro)
  return ok(true)
})

// ---------------------------------------------------------------------------
// Medições (v1.3): o que foi lido das planilhas de medição da obra atual. Nada é digitado
// aqui além do nº e das datas conferidos na tela. Só o Engenheiro vê (o Cliente não vê custo).
// ---------------------------------------------------------------------------

const porNumero = (a, b) => a.numero - b.numero

// A lista das medições da obra (sem os itens) e os empreiteiros que dá para escolher.
export const listarMedicoes = () => executar(async () => {
  const obraId = obraAtual()
  const [medicoes, frentes] = await Promise.all([ler('medicoes', { obra_id: obraId }), ler('frentes_servico', { obra_id: obraId })])
  return ok({
    contrato: medicoes.filter((m) => m.tipo === 'Contrato').sort(porNumero),
    empreiteiro: medicoes.filter((m) => m.tipo === 'Empreiteiro')
      .sort((a, b) => a.empreiteiro.localeCompare(b.empreiteiro, 'pt-BR') || porNumero(a, b)),
    empreiteiros: nomesDeEmpreiteiros(frentes, medicoes),
  })
})

// Uma medição com as linhas dela, na ordem da planilha.
export const obterMedicao = (id) => executar(async () => {
  const obraId = obraAtual()
  const medicao = await um('medicoes', { id, obra_id: obraId })
  if (!medicao) return falha('Medição não encontrada nesta obra.')
  const itens = (await ler('medicao_itens', { medicao_id: id, obra_id: obraId })).sort((a, b) => a.linha_planilha - b.linha_planilha)
  return ok({ ...medicao, itens })
})

// O painel: as medições do contrato (tipo 'Contrato') ou de um empreiteiro (sem nome = todos
// os empreiteiros) da obra atual, com as linhas de todas. As contas ficam em painelMedicao.js.
// As linhas vêm em lotes de 50 medições: a lista de ids vai no endereço do pedido.
export const obterPainelMedicoes = ({ tipo, empreiteiro = null }) => executar(async () => {
  const obraId = obraAtual()
  const filtro = { obra_id: obraId, tipo }
  if (tipo === 'Empreiteiro' && empreiteiro) filtro.empreiteiro = empreiteiro
  const medicoes = (await ler('medicoes', filtro)).sort(porNumero)
  const itens = []
  for (let i = 0; i < medicoes.length; i += 50) {
    itens.push(...await ler('medicao_itens', { obra_id: obraId, medicao_id: medicoes.slice(i, i + 50).map((m) => m.id) }))
  }
  return ok({ medicoes, itens })
})

// As medições do mesmo contrato (ou do mesmo empreiteiro) já gravadas nesta obra.
const medicoesIrmas = (obraId, { tipo, empreiteiro }) => ler('medicoes', { obra_id: obraId, tipo, empreiteiro: tipo === 'Contrato' ? null : empreiteiro })

// Grava medições (cabeçalho e linhas). São duas gravações: se as linhas falharem, a medição
// recém-criada é desfeita aqui, para não ficar uma medição sem linhas.
async function gravarMedicoes(obraId, medicoes) {
  const ids = medicoes.map(() => crypto.randomUUID())
  await inserirVarios('medicoes', medicoes.map((m, i) => ({ id: ids[i], obra_id: obraId, ...m.campos, importada_por: usuario?.id ?? null })))
  try {
    await inserirVarios('medicao_itens', medicoes.flatMap((m, i) => m.itens.map((it) => ({ ...it, medicao_id: ids[i], obra_id: obraId }))))
  } catch (e) {
    await apagar('medicoes', { id: ids, obra_id: obraId }).catch((x) => console.error('[dados] desfazer medição', x))
    throw e
  }
  return ids
}

// `medicoes` = [{ campos, itens }] já montadas por medicaoDoContrato / medicaoDaAba (medicoes.js).
// Todas do mesmo tipo e do mesmo empreiteiro.
export const importarMedicoes = (pacotes) => executar(async () => {
  const obraId = obraAtual()
  // O mesmo empreiteiro escrito com outra maiúscula vira o nome que já existe (nada duplica).
  const conhecidos = nomesDeEmpreiteiros(await ler('frentes_servico', { obra_id: obraId }), await ler('medicoes', { obra_id: obraId, tipo: 'Empreiteiro' }))
  const medicoes = pacotes.map((m) => (m.campos.tipo === 'Empreiteiro'
    ? { ...m, campos: { ...m.campos, empreiteiro: nomeDoEmpreiteiro(m.campos.empreiteiro, conhecidos) } }
    : m))
  const existentes = medicoes.length ? await medicoesIrmas(obraId, medicoes[0].campos) : []
  const erro = conferirParaGravar(medicoes, existentes)
  if (erro) return falha(erro)
  return ok({ ids: await gravarMedicoes(obraId, medicoes) })
})

// "Trocar planilha" do contrato: apaga as linhas da medição e grava as da planilha nova.
// Não é atômico: se a internet cair depois de apagar, a medição fica sem linhas; trocar de
// novo completa.
export const trocarPlanilhaMedicao = (id, { campos, itens }) => executar(async () => {
  const obraId = obraAtual()
  const atual = await um('medicoes', { id, obra_id: obraId })
  if (!atual) return falha('Medição não encontrada nesta obra.')
  const erro = conferirParaGravar([{ campos, itens }], await medicoesIrmas(obraId, atual), id)
  if (erro) return falha(erro)
  await apagar('medicao_itens', { medicao_id: id, obra_id: obraId })
  await inserirVarios('medicao_itens', itens.map((it) => ({ ...it, medicao_id: id, obra_id: obraId })))
  const { tipo: _tipo, empreiteiro: _empreiteiro, ...resto } = campos
  await gravar('medicoes', { id, obra_id: obraId }, { ...resto, importada_por: usuario?.id ?? null })
  return ok(true)
})

// Apaga a medição e as linhas dela (a tela pede confirmação antes). A planilha continua com você.
export const excluirMedicao = (id) => executar(async () => {
  const filtro = { id, obra_id: obraAtual() }
  if (!(await um('medicoes', filtro))) return falha('Medição não encontrada nesta obra.')
  // No Supabase, apagar a medição já leva as linhas (on delete cascade), numa gravação só. A
  // segunda serve ao banco em memória, que não tem cascata; no Supabase não acha nada.
  await apagarDeVerdade('medicoes', filtro)
  await apagar('medicao_itens', { medicao_id: id, obra_id: filtro.obra_id })
  return ok(true)
})

// ---------------------------------------------------------------------------
// Fotos (Storage, pasta privada "fotos"). A tela entrega o arquivo escolhido; aqui ele encolhe e
// sobe, e a tabela guarda só o caminho que volta. Falhou o envio: a tela avisa e salva o resto.
// ---------------------------------------------------------------------------

export const uploadFoto = (arquivo, modulo) => executar(async () => {
  // A obra é a do toque: trocar de obra enquanto a foto encolhe não manda para a pasta da outra.
  const caminho = caminhoDaFoto(obraAtual(), modulo, crypto.randomUUID())
  let foto
  try { foto = await encolherFoto(arquivo) } catch (_) { return falha('Não foi possível ler essa foto. Tente outra.') }
  if (!authReal()) return ok({ caminho })
  const { error } = await supabase.storage.from(PASTA_DE_FOTOS).upload(caminho, foto, { contentType: 'image/jpeg', upsert: false })
  if (error) return falha(mensagemDoEnvio(error))
  return ok({ caminho })
})

// Põe em `destino` o endereço para mostrar a foto de `campo`: assinado (1 hora) para as do Storage,
// o próprio valor para as antigas. Sem endereço (arquivo sumiu), fica null e a tela não quebra.
async function comEndereco(linhas, campo, destino) {
  const doStorage = [...new Set(linhas.map((l) => l[campo]).filter(estaNoStorage))]
  let assinados = new Map()
  if (doStorage.length && authReal()) {
    const { data, error } = await supabase.storage.from(PASTA_DE_FOTOS).createSignedUrls(doStorage, VALIDADE_DO_ENDERECO)
    if (error) console.error('[dados] endereço das fotos não saiu', error)
    assinados = new Map((data ?? []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl]))
  }
  return linhas.map((l) => ({ ...l, [destino]: estaNoStorage(l[campo]) ? assinados.get(l[campo]) ?? null : l[campo] ?? null }))
}

// Apaga do Storage os arquivos que saíram da tabela, só os desta obra e deste módulo. Se falhar,
// sobra só um arquivo solto (ocupa espaço, não aparece): não desfaz a gravação que já deu certo.
async function apagarArquivos(caminhos, obraId, modulo) {
  const doStorage = caminhos.filter((c) => caminhoEhDe(c, obraId, modulo))
  if (!doStorage.length || !authReal()) return
  const { error } = await supabase.storage.from(PASTA_DE_FOTOS).remove(doStorage)
  if (error) console.error('[dados] arquivo de foto não apagado', error)
}

// O que quem está logado pode fazer (src/lib/permissoes.js). As telas perguntam aqui.
export const posso = (acao, dono = null) => pode(acao, usuario, dono)
export const possoAbrir = (tela) => podeAbrir(tela, usuario)
export const textosDasObras = () => textosDeObras(usuario)

// ---------------------------------------------------------------------------
// Usuários (só o admin): tudo passa pela função admin-usuarios, que confere no servidor quem pede.
// ---------------------------------------------------------------------------

const admin = (acao, dados = {}) => banco.admin(acao, dados, usuario)

export const listarUsuarios = () => executar(async () => {
  const { usuarios } = await admin('listar')
  if (authReal()) perfis = usuarios
  return ok(ordenarUsuarios(usuarios))
})

// Devolve { id, senha }: a senha provisória só existe nesta resposta.
export const criarUsuario = (dados) => executar(async () => ok(await admin('criar', dados)))
export const redefinirSenha = (id) => executar(async () => ok(await admin('redefinir_senha', { id })))
export const mudarPerfil = (id, role) => executar(async () => ok(await admin('perfil', { id, role })))
export const mudarObras = (id, obras) => executar(async () => ok(await admin('obras', { id, obras })))
export const bloquearUsuario = (id) => executar(async () => ok(await admin('bloquear', { id })))
export const desbloquearUsuario = (id) => executar(async () => ok(await admin('desbloquear', { id })))
export const excluirUsuario = (id, confirmacao) => executar(async () => ok(await admin('excluir', { id, confirmacao })))
