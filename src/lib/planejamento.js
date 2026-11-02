// Planejamento (Last Planner): as regras da lista de atividades da obra.
// As quatro sub-abas (EAP, Longo, Médio e Curto prazo) leem a MESMA lista; aqui
// fica o que vale para todas. Sem React, sem banco.
import { somarDias, diasEntre, formatarDiaMes, MESES } from './datas.js'

const irmasEmOrdem = (lista, paiId) => lista
  .filter((x) => (x.pai_id ?? null) === (paiId ?? null))
  .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR'))

// A árvore ativa, achatada na ordem de leitura, com o código (1, 1.2, 1.2.1) e o nível.
// O código sai da posição: arquivar uma atividade renumera as de baixo, sem buraco.
// Quem tem filha é grupo: o período dele vai do primeiro início ao último fim das filhas.
export function montarEap(lista) {
  const ativas = lista.filter((x) => !x.arquivada)
  const saida = []
  function descer(paiId, prefixo, nivel) {
    let inicio = null
    let fim = null
    irmasEmOrdem(ativas, paiId).forEach((x, i) => {
      const codigo = prefixo ? `${prefixo}.${i + 1}` : String(i + 1)
      const linha = { ...x, codigo, nivel }
      saida.push(linha)
      const filhas = descer(x.id, codigo, nivel + 1)
      linha.grupo = filhas.inicio !== null
      linha.inicio = filhas.inicio ?? x.data_inicio
      linha.fim = filhas.fim ?? x.data_fim
      if (inicio === null || linha.inicio < inicio) inicio = linha.inicio
      if (fim === null || linha.fim > fim) fim = linha.fim
    })
    return { inicio, fim }
  }
  descer(null, '', 0)
  return saida
}

function descendentes(lista, id) {
  const filhas = lista.filter((x) => x.pai_id === id)
  return filhas.flatMap((x) => [x.id, ...descendentes(lista, x.id)])
}

// As arquivadas que aparecem na lista "Arquivadas": a de cima de cada galho, e quantas vão junto.
export function listarArquivadas(lista) {
  const porId = new Map(lista.map((x) => [x.id, x]))
  return lista
    .filter((x) => x.arquivada && !porId.get(x.pai_id)?.arquivada)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .map((x) => ({ ...x, junto: descendentes(lista, x.id).length }))
}

// Arquivar leva as filhas junto: uma filha ativa debaixo de mãe arquivada sumiria da EAP.
export const idsParaArquivar = (lista, id) => [id, ...descendentes(lista, id)]

// Desarquivar traz as filhas e também as mães que estavam arquivadas (senão ela não aparece).
export function idsParaDesarquivar(lista, id) {
  const porId = new Map(lista.map((x) => [x.id, x]))
  const ids = [id, ...descendentes(lista, id)]
  for (let mae = porId.get(porId.get(id)?.pai_id); mae?.arquivada; mae = porId.get(mae.pai_id)) ids.push(mae.id)
  return ids
}

// Onde a atividade pode ficar "dentro de": qualquer ativa, menos ela mesma e as filhas dela
// (seria um laço). `id` null = atividade nova.
export function maesPossiveis(lista, id) {
  const fora = new Set(id ? idsParaArquivar(lista, id) : [])
  return montarEap(lista).filter((x) => !fora.has(x.id))
}

// Nova atividade entra no fim das irmãs. Conta as arquivadas para nunca repetir o número.
export function proximaOrdem(lista, paiId) {
  const irmas = lista.filter((x) => (x.pai_id ?? null) === (paiId ?? null))
  return irmas.length ? Math.max(...irmas.map((x) => x.ordem)) + 1 : 0
}

// Subir (-1) ou descer (+1) entre as irmãs ativas: as duas trocam de ordem. Null = não dá.
export function trocaDeOrdem(lista, id, direcao) {
  const alvo = lista.find((x) => x.id === id)
  if (!alvo) return null
  const irmas = irmasEmOrdem(lista.filter((x) => !x.arquivada), alvo.pai_id)
  const vizinha = irmas[irmas.findIndex((x) => x.id === id) + direcao]
  if (!vizinha) return null
  // Ordens iguais (gravação antiga): a de cima fica com a menor, para a troca mudar algo.
  const [cima, baixo] = direcao < 0 ? [vizinha, alvo] : [alvo, vizinha]
  const ordemCima = Math.min(cima.ordem, baixo.ordem)
  const ordemBaixo = Math.max(cima.ordem, baixo.ordem, ordemCima + 1)
  return [{ id: alvo.id, ordem: alvo === cima ? ordemBaixo : ordemCima }, { id: vizinha.id, ordem: vizinha === cima ? ordemBaixo : ordemCima }]
}

export function validarAtividade(f) {
  const erros = {}
  if (!f.titulo?.trim()) erros.titulo = 'Dê um nome à atividade.'
  if (!f.data_inicio) erros.data_inicio = 'Informe o início.'
  if (!f.data_fim) erros.data_fim = 'Informe o fim.'
  else if (f.data_inicio && f.data_fim < f.data_inicio) erros.data_fim = 'O fim não pode ser antes do início.'
  return erros
}

// Calendário padrão da obra: segunda a sexta, sem feriado. (0 = domingo … 6 = sábado.)
export const CALENDARIO_PADRAO = { dias: [1, 2, 3, 4, 5], feriados: [] }

const diaDaSemana = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).getDay()
}

// No Planejamento a semana começa na segunda.
export const segundaDaSemana = (iso) => somarDias(iso, -((diaDaSemana(iso) + 6) % 7))

// Dias de trabalho de `inicio` a `fim`, contando os dois.
export function diasUteis(inicio, fim, { dias = CALENDARIO_PADRAO.dias, feriados = [] } = {}) {
  const folga = new Set(feriados)
  let n = 0
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
    if (dias.includes(diaDaSemana(d)) && !folga.has(d)) n++
  }
  return n
}

// O calendário guardado na obra (dias_trabalho, feriados), com o padrão quando falta.
export function calendarioDaObra(obra) {
  return {
    dias: obra?.dias_trabalho?.length ? [...obra.dias_trabalho] : [...CALENDARIO_PADRAO.dias],
    feriados: [...new Set(obra?.feriados ?? [])].sort(),
  }
}

export function validarCalendario({ dias }) {
  return dias?.length ? null : 'Escolha pelo menos um dia de trabalho.'
}

// ---------------------------------------------------------------------------
// Longo prazo: previsto x real
// ---------------------------------------------------------------------------

// Quanto já devia estar pronto hoje, pelas datas: a fração dos dias úteis JÁ TERMINADOS,
// até ontem. Hoje ainda está em andamento: contar hoje fazia a atividade nascer "atrasada"
// no primeiro dia (achado do teste de aceite, 02/11/2026).
export function previstoAte(inicio, fim, hoje, cal) {
  if (hoje <= inicio) return 0
  if (hoje > fim) return 100
  const total = diasUteis(inicio, fim, cal)
  return total ? Math.round((100 * diasUteis(inicio, somarDias(hoje, -1), cal)) / total) : 0
}

function situacao(real, previsto) {
  if (real >= 100) return 'Concluída'
  if (real < previsto) return 'Atrasada'
  if (real === 0 && previsto === 0) return 'Não iniciada'
  return 'Em dia'
}

// Real e previsto de cada linha da EAP. Só a atividade sem filhas tem avanço lançado; o
// grupo e a obra inteira são a média delas, pesada pelos dias úteis (um serviço de 20
// dias pesa mais que um de 2).
export function andamento(eap, hoje, cal) {
  const folhas = eap.filter((x) => !x.grupo).map((x) => ({
    linha: x,
    peso: Math.max(1, diasUteis(x.inicio, x.fim, cal)),
    real: x.progresso ?? 0,
    previsto: previstoAte(x.inicio, x.fim, hoje, cal),
  }))
  const media = (lista) => {
    const peso = lista.reduce((s, f) => s + f.peso, 0)
    if (!peso) return { real: 0, previsto: 0 }
    const soma = (k) => Math.round(lista.reduce((s, f) => s + f[k] * f.peso, 0) / peso)
    return { real: soma('real'), previsto: soma('previsto') }
  }
  const linhas = {}
  for (const x of eap) {
    const minhas = x.grupo ? folhas.filter((f) => f.linha.codigo.startsWith(`${x.codigo}.`)) : folhas.filter((f) => f.linha === x)
    const m = media(minhas)
    linhas[x.id] = { ...m, situacao: situacao(m.real, m.previsto) }
  }
  return {
    linhas,
    geral: media(folhas),
    atrasadas: folhas.filter((f) => linhas[f.linha.id].situacao === 'Atrasada').length,
  }
}

// ---------------------------------------------------------------------------
// Longo prazo: a escala das barras (por semana ou por mês). Posição em dias corridos.
// ---------------------------------------------------------------------------

const diaDoMes1 = (iso) => `${iso.slice(0, 8)}01`
const proximoMes = (iso) => {
  const [a, m] = iso.split('-').map(Number)
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`
}

export function escalaDoCronograma(eap, modo) {
  if (!eap.length) return { inicio: null, fim: null, dias: 0, colunas: [] }
  const menor = eap.reduce((m, x) => (x.inicio < m ? x.inicio : m), eap[0].inicio)
  const maior = eap.reduce((m, x) => (x.fim > m ? x.fim : m), eap[0].fim)
  const colunas = []
  if (modo === 'mês') {
    for (let c = diaDoMes1(menor); c <= maior; c = proximoMes(c)) {
      const [a, m] = c.split('-').map(Number)
      colunas.push({ inicio: c, dias: diasEntre(c, proximoMes(c)), rotulo: `${MESES[m - 1]}/${String(a).slice(2)}` })
    }
  } else {
    for (let c = segundaDaSemana(menor); c <= maior; c = somarDias(c, 7)) {
      colunas.push({ inicio: c, dias: 7, rotulo: formatarDiaMes(c) })
    }
  }
  const dias = colunas.reduce((s, c) => s + c.dias, 0)
  return { inicio: colunas[0].inicio, fim: somarDias(colunas[0].inicio, dias - 1), dias, colunas }
}

const pct = (n) => Math.round(n * 10000) / 100

// Onde a barra começa e quanto ocupa, em % da largura (o último dia conta inteiro).
export function posicaoNaEscala(escala, inicio, fim) {
  return {
    esquerda: pct(diasEntre(escala.inicio, inicio) / escala.dias),
    largura: pct((diasEntre(inicio, fim) + 1) / escala.dias),
  }
}

export function posicaoDeHoje(escala, hoje) {
  if (!escala.inicio || hoje < escala.inicio || hoje > escala.fim) return null
  return pct(diasEntre(escala.inicio, hoje) / escala.dias)
}

// Avanço lançado à mão: número inteiro de 0 a 100. Null = inválido.
export function lerProgresso(texto) {
  if (!/^\d{1,3}$/.test(String(texto ?? '').trim())) return null
  const n = Number(texto)
  return n <= 100 ? n : null
}

export const filtrarInteiro = (texto) => String(texto ?? '').replace(/\D/g, '').slice(0, 3)

export const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// "seg a sex · 2 feriados" — para o rótulo do calendário.
export function descreverCalendario({ dias, feriados }) {
  const ordem = [1, 2, 3, 4, 5, 6, 0].filter((d) => dias.includes(d))
  const nomes = ordem.map((d) => NOMES_DIAS[d].toLowerCase())
  const seguidos = ordem.every((d, i) => i === 0 || d === (ordem[i - 1] + 1) % 7)
  const txt = seguidos && ordem.length > 2 ? `${nomes[0]} a ${nomes.at(-1)}` : nomes.join(', ')
  const f = feriados.length
  return f ? `${txt} · ${f} ${f === 1 ? 'feriado' : 'feriados'}` : txt
}
