// CAMADA DE DADOS — a única porta do banco. Nenhuma tela lê ou grava fora daqui,
// e só este arquivo chama supabase.from(...).
//
// MULTI-OBRA: a obra escolhida vive aqui dentro (definirObraAtual). Toda função
// de lançamento usa obraAtual() por dentro; as telas NUNCA passam obra_id.
// Assim nenhuma tela consegue esquecer o filtro.
//
// As regras abaixo conversam com o banco por quatro verbos (ler, inserir,
// atualizar, apagar). Quem atende é o Supabase (USAR_MOCK = false) ou o banco
// em memória de bancoMemoria.js (USAR_MOCK = true, e sempre nos testes).
//
// O LOGIN ainda é de mentira (passo 10): as pessoas vêm do mockData, em memória,
// nos dois modos.
import { supabase } from './supabase.js'
import { criarMock } from './mockData.js'
import { criarBancoMemoria } from './bancoMemoria.js'
import { hojeISO, somarDias } from './datas.js'
import { montarEfetivo, podeMarcarPresenca, mensagemTrava, contaComoPresenca } from './efetivo.js'
import { aplicarFechamento, validarPreenchimento, validarFrente } from './frentes.js'
import { statusRdoHoje, validarObra, normalizarCodigo } from './obras.js'
import { ordenarDiarios, resumirDiario } from './diarios.js'
import { montarQuadro } from './quadroEfetivo.js'
import { validarNovoPedido, validarMovimento, aplicarMovimento, novoPedido } from './materiais.js'

export const USAR_MOCK = false

// Tabelas de lançamento: obra_id obrigatório. Toda tabela nova de módulo novo entra aqui.
export const TABELAS_DA_OBRA = [
  'rdos', 'rdo_efetivo', 'rdo_equipamentos', 'frentes_servico', 'rdo_frentes', 'rdo_frente_equipe', 'fotos',
  'pedidos_material',
]

// ---------------------------------------------------------------------------
// O banco de verdade (Supabase)
// ---------------------------------------------------------------------------

// O Supabase devolve no máximo 1.000 linhas por pedido, sem avisar: lemos em páginas.
const PAGINA = 1000

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
  async ler(tabela, filtros = {}) {
    const linhas = []
    for (let de = 0; ; de += PAGINA) {
      const pagina = resposta(await filtrar(supabase.from(tabela).select('*'), filtros).order('id').range(de, de + PAGINA - 1))
      linhas.push(...pagina)
      if (pagina.length < PAGINA) return linhas
    }
  },
  async inserir(tabela, linhas) {
    return resposta(await supabase.from(tabela).insert(linhas).select())
  },
  async atualizar(tabela, filtros, campos) {
    return resposta(await filtrar(supabase.from(tabela).update(campos), filtros).select())
  },
  async apagar(tabela, filtros) {
    resposta(await filtrar(supabase.from(tabela).delete(), filtros))
  },
}

const semBanco = {
  async ler() { throw new Error('Banco não configurado: falta o arquivo .env.local com a URL e a chave do Supabase.') },
}
semBanco.inserir = semBanco.atualizar = semBanco.apagar = semBanco.ler

let banco = USAR_MOCK ? criarBancoMemoria() : supabase ? bancoSupabase : semBanco
let perfis = banco.perfis ?? criarMock().profiles
let obraAtualId = null
let usuario = null

// Só para os testes: troca para um banco em memória novo, com os dados de exemplo.
export function _reiniciarMock(hoje) {
  banco = criarBancoMemoria(hoje)
  perfis = banco.perfis
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
  if (!e.doBanco) return e.message
  if (/fetch|network|Load failed/i.test(e.message)) return 'Não foi possível falar com o banco. Verifique a internet e tente de novo.'
  if (e.code === '23505' && /uma_presenca_por_dia/.test(e.message)) return 'Esse funcionário já está presente hoje em outra obra.'
  if (e.code === '23505') return 'Isso já está gravado (registro repetido).'
  if (e.code === '23514') return 'O banco recusou um valor fora da lista permitida.'
  if (e.code === '23503') return 'Este registro aponta para algo que não existe mais.'
  if (e.code === '42501') return 'Sem permissão para gravar aqui.'
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
// Alterar ou apagar sem filtro mexeria na tabela inteira: recusado aqui, para os dois bancos.
const atualizar = (tabela, filtros, campos) => { exigirFiltro(filtros); return banco.atualizar(tabela, filtros, campos) }
const apagar = (tabela, filtros) => { exigirFiltro(filtros); return banco.apagar(tabela, filtros) }

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
// Login (ainda de mentira, até o passo 10: qualquer senha serve; o e-mail escolhe a pessoa)
// ---------------------------------------------------------------------------

export async function entrar(email, _senha) {
  const p = perfis.find((x) => x.email.toLowerCase() === (email ?? '').trim().toLowerCase())
  if (!p) return falha('E-mail ou senha incorretos.')
  if (!p.ativo) return falha('Conta desativada. Fale com o engenheiro.')
  usuario = p
  return ok(copia(p))
}

export async function criarConta({ nome, email, senha }) {
  if (!nome?.trim() || !email?.trim() || !senha) return falha('Preencha nome, e-mail e senha.')
  if (perfis.some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) return falha('Já existe conta com este e-mail.')
  const p = { id: crypto.randomUUID(), nome: nome.trim(), email: email.trim(), role: 'Pendente', ativo: true }
  perfis.push(p)
  usuario = p
  return ok(copia(p))
}

export async function sair() {
  usuario = null
  obraAtualId = null
  return ok(true)
}

const nomeDoPerfil = (id) => perfis.find((p) => p.id === id)?.nome ?? null

// ---------------------------------------------------------------------------
// Obras (cadastro e comparativos — as únicas leituras de várias obras juntas)
// ---------------------------------------------------------------------------

export const listarObras = () => executar(async () => ok((await ler('obras')).sort(porNome)))

// COMPARATIVO ENTRE OBRAS: uma linha por obra, numa chamada só (nunca um laço na tela).
export const listarResumoObras = () => executar(async () => {
  const h = hoje()
  const ontem = somarDias(h, -1)
  const [obras, rdos, paradas] = await Promise.all([
    ler('obras'), ler('rdos', { data: [h, ontem] }), ler('frentes_servico', { situacao: 'Parada' }),
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
      rdo_ontem_nao_fechado: o.situacao === 'Em andamento' && rdoOntem?.status !== 'Fechado',
    }
  }))
})

// COMPARATIVO ENTRE OBRAS: o efetivo lotado por função, de todas as obras, numa chamada só.
export const listarQuadroEfetivo = () => executar(async () => {
  const [funcionarios, obras] = await Promise.all([ler('funcionarios'), ler('obras')])
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
  if (obra.id) return ok((await atualizar('obras', { id: obra.id }, campos))[0])
  return ok(await inserir('obras', campos))
})

// ---------------------------------------------------------------------------
// RDO de hoje da obra atual
// ---------------------------------------------------------------------------

const rdoDeHoje = (obraId) => um('rdos', { obra_id: obraId, data: hoje() })
// Todas as linhas de efetivo do dia, de TODAS as obras: a trava de duas obras precisa delas.
const linhasDoDia = () => ler('rdo_efetivo', { data: hoje() })
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
  return ok((await atualizar('rdos', { id: rdo.id }, mudancas))[0])
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
    linha = (await atualizar('rdo_efetivo', { id: existente.id }, novos))[0]
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
  const [{ funcionarios, linhas, efetivo }, nomes] = await Promise.all([efetivoDaObraHoje(obraId), nomesDasObras()])
  const jaAqui = new Set(efetivo.map((i) => i.funcionario.id))
  return ok(funcionarios
    .filter((f) => f.ativo && !jaAqui.has(f.id))
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
    if (l) await atualizar('rdo_efetivo', { id: l.id }, { situacao: 'Deslocado', obra_destino_id: obraId })
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
  if (origem) await atualizar('rdo_efetivo', { id: origem.id }, { situacao: 'Presente', obra_destino_id: null })
  return ok(true)
})

// Obras para onde dá para deslocar alguém (só nome: é escolha, não é dado da outra obra).
export const listarDestinosDeslocamento = () => executar(async () => {
  const obraId = obraAtual()
  const obras = await ler('obras', { situacao: 'Em andamento' })
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
  if (existente) return ok((await atualizar('rdo_equipamentos', { id: existente.id }, mudancas))[0])
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
    fotos: rf ? fotos.filter((ft) => ft.rdo_frente_id === rf.id) : [],
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
    ? (await atualizar('rdo_frentes', { id: existente.id }, campos))[0]
    : await inserir('rdo_frentes', { rdo_id: rdo.id, obra_id: obraId, frente_id: frenteId, ...campos })
  await apagar('rdo_frente_equipe', { rdo_frente_id: rf.id })
  await inserirVarios('rdo_frente_equipe', equipe.map((id) => ({ rdo_frente_id: rf.id, obra_id: obraId, funcionario_id: id })))
  await apagar('fotos', { rdo_frente_id: rf.id })
  await inserirVarios('fotos', fotos.map((ft) => ({
    obra_id: obraId, rdo_id: rdo.id, rdo_frente_id: rf.id, caminho: ft.caminho, legenda: ft.legenda ?? '', visivel_cliente: true, enviada_por: usuario?.id ?? null,
  })))
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
    if (mudou.length) await atualizar('frentes_servico', { id: f.id }, Object.fromEntries(mudou.map((c) => [c, f[c]])))
  }
  // Quem está no efetivo só pelo padrão (lotado depois que o RDO abriu, ou vindo
  // de outra obra) ganha linha agora: o diário fechado guarda o mesmo que a tela mostrou.
  await inserirVarios('rdo_efetivo', efetivo.filter((item) => !item.gravada).map((item) => ({
    rdo_id: rdo.id, obra_id: obraId, data: rdo.data, funcionario_id: item.funcionario.id,
    situacao: item.situacao, obra_destino_id: item.obra_destino_id,
  })))
  return ok((await atualizar('rdos', { id: rdo.id }, {
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
  return { efetivo, frentes, fotos }
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
  if (dados.id) return ok((await atualizar('funcionarios', { id: dados.id }, f))[0])
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

export const listarQuadroMateriais = () => executar(async () => {
  const obraId = obraAtual()
  const [pedidos, catalogo, frentes] = await Promise.all([
    ler('pedidos_material', { obra_id: obraId }), ler('materiais'), ler('frentes_servico', { obra_id: obraId }),
  ])
  return ok({
    pedidos: pedidos.map((p) => comMaterial(p, catalogo)),
    catalogo: catalogo.filter((m) => m.ativo).sort(porNome),
    // Sugestões para o campo "frente" (o pedido aceita texto livre, ex.: "Banheiro suíte").
    frentes: frentes.filter((f) => f.situacao !== 'Concluída').sort(porNome).map((f) => f.nome),
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

// Mudar de coluna é uma gravação só (status + histórico + o que a coluna pede).
export const moverPedido = (pedidoId, novoStatus, extras = {}) => executar(async () => {
  const obraId = obraAtual()
  const pedido = await um('pedidos_material', { id: pedidoId, obra_id: obraId })
  if (!pedido) return falha('Pedido não encontrado nesta obra.')
  const erro = Object.values(validarMovimento(pedido, novoStatus, extras, hoje()))[0]
  if (erro) return falha(erro)
  // O filtro pelo status lido protege do toque duplo e do outro aparelho: se o pedido já andou, nada muda.
  const [salvo] = await atualizar('pedidos_material', { id: pedidoId, obra_id: obraId, status: pedido.status },
    aplicarMovimento(pedido, novoStatus, extras, hoje()))
  if (!salvo) return falha('Este pedido já tinha mudado de coluna (outro toque ou outro aparelho).')
  return ok(comMaterial(salvo, [await um('materiais', { id: salvo.material_id })]))
})

export const apagarPedido = (pedidoId) => executar(async () => {
  const filtro = { id: pedidoId, obra_id: obraAtual() }
  if (!(await um('pedidos_material', filtro))) return falha('Pedido não encontrado nesta obra.')
  await apagar('pedidos_material', filtro)
  return ok(true)
})

// ---------------------------------------------------------------------------
// Usuários (só Engenheiro). Ainda de mentira, como o login, até o passo 10.
// ---------------------------------------------------------------------------

export async function listarUsuarios() {
  const ordem = { Pendente: 0, Engenheiro: 1, Cliente: 2 }
  return ok(copia([...perfis].sort((a, b) => (ordem[a.role] - ordem[b.role]) || a.nome.localeCompare(b.nome, 'pt-BR'))))
}

export async function salvarUsuario({ id, role, ativo }) {
  const p = perfis.find((x) => x.id === id)
  if (!p) return falha('Usuário não encontrado.')
  if (role) p.role = role
  if (ativo !== undefined) p.ativo = ativo
  return ok(copia(p))
}
