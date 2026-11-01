// CAMADA DE DADOS — a única porta do banco. Nenhuma tela lê ou grava fora daqui.
//
// MULTI-OBRA: a obra escolhida vive aqui dentro (definirObraAtual). Toda função
// de lançamento usa obraAtual() por dentro; as telas NUNCA passam obra_id.
// Assim nenhuma tela consegue esquecer o filtro.
//
// Por enquanto (Etapas 3–6) tudo roda num banco de mentira em memória: recarregar
// a página volta aos dados de exemplo. Na Etapa 7 USAR_MOCK vira false e o miolo
// destas funções passa a chamar o Supabase (src/lib/supabase.js); as telas não mudam.
import { criarMock } from './mockData.js'
import { hojeISO, somarDias } from './datas.js'
import { montarEfetivo, podeMarcarPresenca, mensagemTrava, contaComoPresenca } from './efetivo.js'
import { aplicarFechamento, validarPreenchimento, validarFrente } from './frentes.js'
import { statusRdoHoje, validarObra, normalizarCodigo } from './obras.js'

export const USAR_MOCK = true

// Tabelas de lançamento: obra_id obrigatório. Toda tabela nova de módulo novo entra aqui.
export const TABELAS_DA_OBRA = [
  'rdos', 'rdo_efetivo', 'rdo_equipamentos', 'frentes_servico', 'rdo_frentes', 'rdo_frente_equipe', 'fotos',
]

let db = criarMock()
let obraAtualId = null
let usuario = null
let seq = 0

// Só para os testes: volta o banco de mentira ao estado inicial.
export function _reiniciarMock(hoje) {
  db = criarMock(hoje)
  obraAtualId = null
  usuario = null
}

const ok = (data) => Promise.resolve({ data, erro: null })
const falha = (erro) => Promise.resolve({ data: null, erro })
const novoId = (prefixo) => `${prefixo}-${Date.now().toString(36)}-${(seq++).toString(36)}`
const copia = (x) => structuredClone(x)
const hoje = () => hojeISO()

function inserir(tabela, linha) {
  if (TABELAS_DA_OBRA.includes(tabela) && !linha.obra_id) {
    throw new Error(`Lançamento em ${tabela} sem obra_id`)
  }
  const nova = { id: novoId(tabela), created_at: new Date().toISOString(), ...linha }
  db[tabela].push(nova)
  return nova
}

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

const nomeDaObra = (id) => db.obras.find((o) => o.id === id)?.nome ?? 'outra obra'

// ---------------------------------------------------------------------------
// Login (mock: qualquer senha serve; o e-mail escolhe a pessoa)
// ---------------------------------------------------------------------------

export function entrar(email, _senha) {
  const p = db.profiles.find((x) => x.email.toLowerCase() === (email ?? '').trim().toLowerCase())
  if (!p) return falha('E-mail ou senha incorretos.')
  if (!p.ativo) return falha('Conta desativada. Fale com o engenheiro.')
  usuario = p
  return ok(copia(p))
}

export function criarConta({ nome, email, senha }) {
  if (!nome?.trim() || !email?.trim() || !senha) return falha('Preencha nome, e-mail e senha.')
  if (db.profiles.some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) return falha('Já existe conta com este e-mail.')
  const p = { id: novoId('p'), nome: nome.trim(), email: email.trim(), role: 'Pendente', ativo: true }
  db.profiles.push(p)
  usuario = p
  return ok(copia(p))
}

export function sair() {
  usuario = null
  obraAtualId = null
  return ok(true)
}

// ---------------------------------------------------------------------------
// Obras (cadastro e comparativo — as únicas leituras de várias obras juntas)
// ---------------------------------------------------------------------------

export function listarObras() {
  return ok(copia([...db.obras].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))))
}

// COMPARATIVO ENTRE OBRAS: uma linha por obra, numa chamada só (nunca um laço na tela).
export function listarResumoObras() {
  const h = hoje()
  const ontem = somarDias(h, -1)
  return ok(db.obras.map((o) => {
    const rdoHoje = db.rdos.find((r) => r.obra_id === o.id && r.data === h)
    const rdoOntem = db.rdos.find((r) => r.obra_id === o.id && r.data === ontem)
    const quebradosHoje = rdoHoje
      ? db.rdo_equipamentos.filter((x) => x.rdo_id === rdoHoje.id && x.situacao === 'Quebrado').length
      : 0
    return {
      obra: copia(o),
      rdo_hoje: statusRdoHoje(rdoHoje),
      frentes_paradas: db.frentes_servico.filter((f) => f.obra_id === o.id && f.situacao === 'Parada').length,
      equipamentos_quebrados: quebradosHoje,
      rdo_ontem_nao_fechado: o.situacao === 'Em andamento' && rdoOntem?.status !== 'Fechado',
    }
  }))
}

export function salvarObra(dados) {
  const obra = { ...dados, codigo: normalizarCodigo(dados.codigo) }
  const erro = validarObra(obra)
  if (erro) return falha(erro)
  if (db.obras.some((o) => o.codigo === obra.codigo && o.id !== obra.id)) return falha('Já existe obra com este código.')
  if (obra.id) {
    const i = db.obras.findIndex((o) => o.id === obra.id)
    db.obras[i] = { ...db.obras[i], ...obra }
    return ok(copia(db.obras[i]))
  }
  const nova = { ...obra, id: novoId('obra'), created_at: new Date().toISOString() }
  db.obras.push(nova)
  return ok(copia(nova))
}

// ---------------------------------------------------------------------------
// RDO de hoje da obra atual
// ---------------------------------------------------------------------------

const rdoDeHoje = (obraId) => db.rdos.find((r) => r.obra_id === obraId && r.data === hoje())
const linhasDoDia = () => db.rdo_efetivo.filter((l) => l.data === hoje())

export function obterRdoHoje() {
  const rdo = rdoDeHoje(obraAtual())
  if (!rdo) return ok(null)
  const quem = db.profiles.find((p) => p.id === rdo.fechado_por)
  return ok({ ...copia(rdo), fechado_por_nome: quem?.nome ?? null })
}

// Abre o RDO de hoje na primeira mexida e grava o efetivo e os equipamentos padrão.
function garantirRdoHoje() {
  const obraId = obraAtual()
  const existente = rdoDeHoje(obraId)
  if (existente) return existente
  const rdo = inserir('rdos', {
    obra_id: obraId, data: hoje(), clima_manha: 'Bom', clima_tarde: 'Bom', praticavel_manha: true, praticavel_tarde: true,
    observacoes: '', status: 'Em andamento', criado_por: usuario?.id ?? null, fechado_por: null, fechado_em: null,
  })
  for (const item of montarEfetivo({ obraId, funcionarios: db.funcionarios, linhasDoDia: linhasDoDia() })) {
    inserir('rdo_efetivo', {
      rdo_id: rdo.id, obra_id: obraId, data: rdo.data, funcionario_id: item.funcionario.id,
      situacao: item.situacao, obra_destino_id: item.obra_destino_id,
    })
  }
  for (const e of equipamentosNaObra(obraId)) {
    inserir('rdo_equipamentos', { rdo_id: rdo.id, obra_id: obraId, equipamento_id: e.id, situacao: 'Operando', observacao: '' })
  }
  return rdo
}

export function salvarRdo(campos) {
  const rdo = garantirRdoHoje()
  const permitidos = ['clima_manha', 'clima_tarde', 'praticavel_manha', 'praticavel_tarde', 'observacoes']
  for (const k of permitidos) if (k in campos) rdo[k] = campos[k]
  return ok(copia(rdo))
}

// ---- Efetivo ----

export function listarEfetivoHoje() {
  const obraId = obraAtual()
  const lista = montarEfetivo({ obraId, funcionarios: db.funcionarios, linhasDoDia: linhasDoDia() })
  return ok(lista.map((i) => ({ ...copia(i), obra_destino_nome: i.obra_destino_id ? nomeDaObra(i.obra_destino_id) : null })))
}

function linhaEfetivo(rdoId, funcionarioId) {
  return db.rdo_efetivo.find((l) => l.rdo_id === rdoId && l.funcionario_id === funcionarioId)
}

// Tira a linha "Veio de outra obra" que o deslocamento tinha criado na obra de destino.
function desfazerChegada(funcionarioId, obraDestinoId) {
  db.rdo_efetivo = db.rdo_efetivo.filter((l) =>
    !(l.funcionario_id === funcionarioId && l.data === hoje() && l.obra_id === obraDestinoId && l.situacao === 'Veio de outra obra'))
}

export function marcarEfetivo(funcionarioId, situacao, obraDestinoId = null) {
  const obraId = obraAtual()
  const func = db.funcionarios.find((f) => f.id === funcionarioId)
  if (!func) return falha('Funcionário não encontrado.')
  if (situacao === 'Deslocado' && (!obraDestinoId || obraDestinoId === obraId)) return falha('Escolha para qual obra ele foi.')
  if (contaComoPresenca(situacao)) {
    // A chegada que o próprio deslocamento daqui criou não conta: desmarcar o
    // Deslocado é justamente desfazê-la.
    const atual = linhasDoDia().find((l) => l.obra_id === obraId && l.funcionario_id === funcionarioId)
    const linhas = atual?.situacao === 'Deslocado'
      ? linhasDoDia().filter((l) => !(l.funcionario_id === funcionarioId && l.obra_id === atual.obra_destino_id && l.situacao === 'Veio de outra obra'))
      : linhasDoDia()
    const trava = podeMarcarPresenca(funcionarioId, obraId, linhas)
    if (!trava.ok) return falha(mensagemTrava(func.nome, nomeDaObra(trava.obraId)))
  }
  const rdo = garantirRdoHoje()
  let linha = linhaEfetivo(rdo.id, funcionarioId)
  if (!linha) linha = inserir('rdo_efetivo', { rdo_id: rdo.id, obra_id: obraId, data: rdo.data, funcionario_id: funcionarioId, situacao, obra_destino_id: null })
  if (linha.situacao === 'Deslocado' && linha.obra_destino_id) desfazerChegada(funcionarioId, linha.obra_destino_id)
  linha.situacao = situacao
  linha.obra_destino_id = situacao === 'Deslocado' ? obraDestinoId : null
  // Se já tem RDO de hoje no destino, ele entra lá agora; senão, entra quando abrirem.
  if (situacao === 'Deslocado') {
    const rdoDestino = rdoDeHoje(obraDestinoId)
    const jaEstaLa = rdoDestino && linhaEfetivo(rdoDestino.id, funcionarioId)
    if (rdoDestino && !jaEstaLa) {
      inserir('rdo_efetivo', { rdo_id: rdoDestino.id, obra_id: obraDestinoId, data: rdoDestino.data, funcionario_id: funcionarioId, situacao: 'Veio de outra obra', obra_destino_id: null })
    }
  }
  // Ao sair da presença, sai também das equipes das frentes de hoje.
  if (!contaComoPresenca(situacao)) tirarDasEquipes(rdo.id, funcionarioId)
  return ok(copia(linha))
}

function tirarDasEquipes(rdoId, funcionarioId) {
  const doRdo = new Set(db.rdo_frentes.filter((rf) => rf.rdo_id === rdoId).map((rf) => rf.id))
  db.rdo_frente_equipe = db.rdo_frente_equipe.filter((q) => !(doRdo.has(q.rdo_frente_id) && q.funcionario_id === funcionarioId))
}

// Para "+ Trazer funcionário de outra obra": a única lista com gente de outras obras.
export function listarFuncionariosParaTrazer() {
  const obraId = obraAtual()
  const linhas = linhasDoDia()
  const jaAqui = new Set(montarEfetivo({ obraId, funcionarios: db.funcionarios, linhasDoDia: linhas }).map((i) => i.funcionario.id))
  return ok(db.funcionarios
    .filter((f) => f.ativo && !jaAqui.has(f.id))
    .map((f) => {
      const trava = podeMarcarPresenca(f.id, obraId, linhas)
      return {
        ...copia(f),
        lotacao_nome: f.obra_id ? nomeDaObra(f.obra_id) : 'Sem obra',
        presente_em: trava.ok ? null : nomeDaObra(trava.obraId),
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
}

export function trazerFuncionario(funcionarioId) {
  const obraId = obraAtual()
  const func = db.funcionarios.find((f) => f.id === funcionarioId)
  if (!func) return falha('Funcionário não encontrado.')
  const trava = podeMarcarPresenca(funcionarioId, obraId, linhasDoDia())
  if (!trava.ok) return falha(mensagemTrava(func.nome, nomeDaObra(trava.obraId)))
  const rdo = garantirRdoHoje()
  inserir('rdo_efetivo', { rdo_id: rdo.id, obra_id: obraId, data: rdo.data, funcionario_id: funcionarioId, situacao: 'Veio de outra obra', obra_destino_id: null })
  // Na obra dele, fica Deslocado para cá (se o RDO de lá já existe).
  const rdoOrigem = func.obra_id ? rdoDeHoje(func.obra_id) : null
  if (rdoOrigem) {
    const l = linhaEfetivo(rdoOrigem.id, funcionarioId)
    if (l) { l.situacao = 'Deslocado'; l.obra_destino_id = obraId }
    else inserir('rdo_efetivo', { rdo_id: rdoOrigem.id, obra_id: func.obra_id, data: rdoOrigem.data, funcionario_id: funcionarioId, situacao: 'Deslocado', obra_destino_id: obraId })
  }
  return ok(true)
}

// "Mandar de volta" quem veio de outra obra: some daqui e volta a Presente na obra dele.
export function devolverFuncionario(funcionarioId) {
  const obraId = obraAtual()
  const rdo = garantirRdoHoje()
  desfazerChegada(funcionarioId, obraId)
  tirarDasEquipes(rdo.id, funcionarioId)
  const origem = db.rdo_efetivo.find((l) =>
    l.funcionario_id === funcionarioId && l.data === hoje() && l.situacao === 'Deslocado' && l.obra_destino_id === obraId)
  if (origem) { origem.situacao = 'Presente'; origem.obra_destino_id = null }
  return ok(true)
}

// Obras para onde dá para deslocar alguém (só nome: é escolha, não é dado da outra obra).
export function listarDestinosDeslocamento() {
  const obraId = obraAtual()
  return ok(db.obras.filter((o) => o.id !== obraId && o.situacao === 'Em andamento').map((o) => ({ id: o.id, nome: o.nome })))
}

// ---- Equipamentos do dia ----

const equipamentosNaObra = (obraId) => db.equipamentos.filter((e) => e.situacao === 'Na obra' && e.obra_id === obraId)

export function listarEquipamentosHoje() {
  const obraId = obraAtual()
  const rdo = rdoDeHoje(obraId)
  return ok(equipamentosNaObra(obraId).map((e) => {
    const linha = rdo && db.rdo_equipamentos.find((x) => x.rdo_id === rdo.id && x.equipamento_id === e.id)
    return { equipamento: copia(e), situacao: linha?.situacao ?? 'Operando', observacao: linha?.observacao ?? '' }
  }))
}

export function marcarEquipamentoDia(equipamentoId, situacao, observacao) {
  const obraId = obraAtual()
  const rdo = garantirRdoHoje()
  let linha = db.rdo_equipamentos.find((x) => x.rdo_id === rdo.id && x.equipamento_id === equipamentoId)
  if (!linha) linha = inserir('rdo_equipamentos', { rdo_id: rdo.id, obra_id: obraId, equipamento_id: equipamentoId, situacao, observacao: '' })
  linha.situacao = situacao
  if (observacao !== undefined) linha.observacao = observacao
  if (situacao === 'Operando') linha.observacao = ''
  return ok(copia(linha))
}

// ---------------------------------------------------------------------------
// Frentes de serviço (passo 2)
// ---------------------------------------------------------------------------

export function listarFrentes() {
  const obraId = obraAtual()
  const rdo = rdoDeHoje(obraId)
  return ok(db.frentes_servico.filter((f) => f.obra_id === obraId).map((f) => {
    const rf = rdo && db.rdo_frentes.find((x) => x.rdo_id === rdo.id && x.frente_id === f.id)
    return {
      ...copia(f),
      preenchida_hoje: Boolean(rf),
      situacao_hoje: rf?.situacao ?? null,
      equipe_hoje: rf ? db.rdo_frente_equipe.filter((q) => q.rdo_frente_id === rf.id).length : 0,
    }
  }))
}

export function salvarFrente(dados) {
  const erro = validarFrente(dados)
  if (erro) return falha(erro)
  const nova = inserir('frentes_servico', {
    obra_id: obraAtual(), nome: dados.nome.trim(), etapa: dados.etapa, executor: dados.executor,
    empreiteiro: dados.executor === 'Terceirizado' ? dados.empreiteiro.trim() : null,
    situacao: 'Não iniciada', parada_desde: null, motivo_parada: null, data_inicio: null, data_conclusao: null,
  })
  return ok(copia(nova))
}

// O que já foi preenchido hoje numa frente, e quem pode entrar na equipe.
export function obterPreenchimento(frenteId) {
  const obraId = obraAtual()
  const frente = db.frentes_servico.find((f) => f.id === frenteId && f.obra_id === obraId)
  if (!frente) return falha('Frente não encontrada nesta obra.')
  const rdo = rdoDeHoje(obraId)
  const rf = rdo && db.rdo_frentes.find((x) => x.rdo_id === rdo.id && x.frente_id === frenteId)
  const presentes = montarEfetivo({ obraId, funcionarios: db.funcionarios, linhasDoDia: linhasDoDia() })
    .filter((i) => contaComoPresenca(i.situacao))
    .map((i) => {
      const outras = rdo ? db.rdo_frentes
        .filter((x) => x.rdo_id === rdo.id && x.frente_id !== frenteId)
        .filter((x) => db.rdo_frente_equipe.some((q) => q.rdo_frente_id === x.id && q.funcionario_id === i.funcionario.id))
        .map((x) => db.frentes_servico.find((f) => f.id === x.frente_id)?.nome)
        : []
      return { id: i.funcionario.id, nome: i.funcionario.nome, tambem_em: outras }
    })
  return ok({
    frente: copia(frente),
    situacao: rf?.situacao ?? (frente.situacao === 'Não iniciada' ? 'Em execução' : frente.situacao),
    motivo_parada: rf?.motivo_parada ?? frente.motivo_parada ?? null,
    descricao: rf?.descricao ?? '',
    equipe: rf ? db.rdo_frente_equipe.filter((q) => q.rdo_frente_id === rf.id).map((q) => q.funcionario_id) : [],
    fotos: rf ? copia(db.fotos.filter((ft) => ft.rdo_frente_id === rf.id)) : [],
    presentes,
  })
}

export function salvarPreenchimento(frenteId, { situacao, motivo_parada, descricao, equipe = [], fotos = [] }) {
  const erro = validarPreenchimento({ situacao, motivo_parada })
  if (erro) return falha(erro)
  if (fotos.length > 5) return falha('No máximo 5 fotos por frente.')
  const obraId = obraAtual()
  if (!db.frentes_servico.some((f) => f.id === frenteId && f.obra_id === obraId)) return falha('Frente não encontrada nesta obra.')
  const rdo = garantirRdoHoje()
  let rf = db.rdo_frentes.find((x) => x.rdo_id === rdo.id && x.frente_id === frenteId)
  if (!rf) rf = inserir('rdo_frentes', { rdo_id: rdo.id, obra_id: obraId, frente_id: frenteId, situacao, motivo_parada: null, descricao: '' })
  rf.situacao = situacao
  rf.motivo_parada = situacao === 'Parada' ? motivo_parada : null
  rf.descricao = descricao ?? ''
  // Equipe: só quem está presente hoje nesta obra.
  const presentes = new Set(montarEfetivo({ obraId, funcionarios: db.funcionarios, linhasDoDia: linhasDoDia() })
    .filter((i) => contaComoPresenca(i.situacao)).map((i) => i.funcionario.id))
  const fora = equipe.filter((id) => !presentes.has(id))
  if (fora.length) return falha('Só quem está presente hoje pode entrar na equipe.')
  db.rdo_frente_equipe = db.rdo_frente_equipe.filter((q) => q.rdo_frente_id !== rf.id)
  for (const id of equipe) inserir('rdo_frente_equipe', { rdo_frente_id: rf.id, obra_id: obraId, funcionario_id: id })
  db.fotos = db.fotos.filter((ft) => ft.rdo_frente_id !== rf.id)
  for (const ft of fotos) {
    inserir('fotos', { obra_id: obraId, rdo_id: rdo.id, rdo_frente_id: rf.id, caminho: ft.caminho, legenda: ft.legenda ?? '', visivel_cliente: true, enviada_por: usuario?.id ?? null })
  }
  return ok(copia(rf))
}

// ---------------------------------------------------------------------------
// Fechar o RDO (processo 1)
// ---------------------------------------------------------------------------

export function resumoFechamento() {
  const obraId = obraAtual()
  const rdo = rdoDeHoje(obraId)
  const efetivo = montarEfetivo({ obraId, funcionarios: db.funcionarios, linhasDoDia: linhasDoDia() })
  const rfs = rdo ? db.rdo_frentes.filter((x) => x.rdo_id === rdo.id) : []
  return ok({
    presentes: efetivo.filter((i) => contaComoPresenca(i.situacao)).length,
    total: efetivo.length,
    frentes_preenchidas: rfs.length,
    frentes_paradas: rfs.filter((x) => x.situacao === 'Parada').length,
    fotos: rdo ? db.fotos.filter((ft) => ft.rdo_id === rdo.id).length : 0,
    equipamentos_quebrados: rdo ? db.rdo_equipamentos.filter((x) => x.rdo_id === rdo.id && x.situacao === 'Quebrado').length : 0,
  })
}

export function fecharRdo() {
  const obraId = obraAtual()
  const rdo = garantirRdoHoje()
  if (!rdo.clima_manha || !rdo.clima_tarde) return falha('Preencha o clima da manhã e da tarde antes de fechar.')
  const rfs = db.rdo_frentes.filter((x) => x.rdo_id === rdo.id)
  const daObra = db.frentes_servico.filter((f) => f.obra_id === obraId)
  const novas = new Map(aplicarFechamento(daObra, rfs, rdo.data).map((f) => [f.id, f]))
  db.frentes_servico = db.frentes_servico.map((f) => novas.get(f.id) ?? f)
  rdo.status = 'Fechado'
  rdo.fechado_por = usuario?.id ?? null
  rdo.fechado_em = new Date().toISOString()
  return ok(copia(rdo))
}

// ---------------------------------------------------------------------------
// Pessoas e equipamentos (cadastros que circulam entre obras: obra_id é opcional)
// Cada tela mostra só o que está na obra atual + o que não está em obra nenhuma.
// ---------------------------------------------------------------------------

export function listarPessoas() {
  const obraId = obraAtual()
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')
  return ok({
    daObra: copia(db.funcionarios.filter((f) => f.obra_id === obraId).sort(porNome)),
    semObra: copia(db.funcionarios.filter((f) => !f.obra_id).sort(porNome)),
  })
}

export function salvarFuncionario(dados) {
  if (!dados.nome?.trim()) return falha('Informe o nome.')
  if (!dados.funcao) return falha('Escolha a função.')
  const f = { nome: dados.nome.trim(), funcao: dados.funcao, obra_id: dados.obra_id || null, ativo: dados.ativo ?? true }
  if (dados.id) {
    const i = db.funcionarios.findIndex((x) => x.id === dados.id)
    db.funcionarios[i] = { ...db.funcionarios[i], ...f }
    return ok(copia(db.funcionarios[i]))
  }
  const novo = { ...f, id: novoId('f'), created_at: new Date().toISOString() }
  db.funcionarios.push(novo)
  return ok(copia(novo))
}

export function listarEquipamentos() {
  const obraId = obraAtual()
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')
  return ok({
    naObra: copia(equipamentosNaObra(obraId).sort(porNome)),
    noDeposito: copia(db.equipamentos.filter((e) => e.situacao === 'No depósito').sort(porNome)),
  })
}

export function salvarEquipamento({ nome, codigo, nesta_obra }) {
  if (!nome?.trim()) return falha('Informe o nome do equipamento.')
  const novo = {
    id: novoId('e'), created_at: new Date().toISOString(), nome: nome.trim(), codigo: codigo?.trim() || null,
    situacao: nesta_obra ? 'Na obra' : 'No depósito', obra_id: nesta_obra ? obraAtual() : null, situacao_desde: hoje(),
  }
  db.equipamentos.push(novo)
  return ok(copia(novo))
}

export function mandarEquipamentoParaObra(equipamentoId) {
  const e = db.equipamentos.find((x) => x.id === equipamentoId)
  if (!e) return falha('Equipamento não encontrado.')
  Object.assign(e, { situacao: 'Na obra', obra_id: obraAtual(), situacao_desde: hoje(), oficina: null, previsao_retorno: null, defeito: null })
  return ok(copia(e))
}

export function mandarEquipamentoParaDeposito(equipamentoId) {
  const e = db.equipamentos.find((x) => x.id === equipamentoId && x.obra_id === obraAtual())
  if (!e) return falha('Equipamento não está nesta obra.')
  Object.assign(e, { situacao: 'No depósito', obra_id: null, situacao_desde: hoje() })
  return ok(copia(e))
}

// ---------------------------------------------------------------------------
// Usuários (só Engenheiro)
// ---------------------------------------------------------------------------

export function listarUsuarios() {
  const ordem = { Pendente: 0, Engenheiro: 1, Cliente: 2 }
  return ok(copia([...db.profiles].sort((a, b) => (ordem[a.role] - ordem[b.role]) || a.nome.localeCompare(b.nome, 'pt-BR'))))
}

export function salvarUsuario({ id, role, ativo }) {
  const p = db.profiles.find((x) => x.id === id)
  if (!p) return falha('Usuário não encontrado.')
  if (role) p.role = role
  if (ativo !== undefined) p.ativo = ativo
  return ok(copia(p))
}
