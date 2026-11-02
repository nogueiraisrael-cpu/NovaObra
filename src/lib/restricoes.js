// Planejamento — Médio prazo (lookahead): as restrições das atividades num quadro de
// semanas. Cada restrição mora na coluna da semana do prazo; mover de semana é mudar o
// prazo. A que venceu sem ser resolvida fica na semana atual, marcada. Sem React, sem banco.
import { somarDias, diasEntre, formatarDiaMes } from './datas.js'
import { segundaDaSemana } from './planejamento.js'
import { TIPOS_RESTRICAO } from './listas.js'

const daEap = (eap) => new Map(eap.map((x) => [x.id, x]))
const porPrazo = (a, b) => a.prazo.localeCompare(b.prazo) || a.descricao.localeCompare(b.descricao, 'pt-BR')
export const estaVencida = (r, hoje) => !r.resolvida && r.prazo < hoje

// O quadro: `semanas` colunas a partir da semana de hoje. Só entram restrições de atividade
// ativa (a da atividade arquivada some junto com ela). `depois` = quantas ficam além do horizonte.
export function montarLookahead(lista, eap, hoje, { semanas = 4, responsavel = '', verResolvidas = false } = {}) {
  const inicio = segundaDaSemana(hoje)
  const atividades = daEap(eap)
  const colunas = Array.from({ length: semanas }, (_, i) => {
    const c = somarDias(inicio, 7 * i)
    return { inicio: c, fim: somarDias(c, 6), rotulo: formatarDiaMes(c), itens: [] }
  })
  let depois = 0
  for (const r of [...lista].sort(porPrazo)) {
    const at = atividades.get(r.atividade_id)
    if (!at || (responsavel && r.responsavel !== responsavel)) continue
    if (r.resolvida && (!verResolvidas || r.prazo < inicio)) continue
    const i = r.prazo < inicio ? 0 : Math.floor(diasEntre(inicio, r.prazo) / 7)
    if (i >= semanas) { depois++; continue }
    colunas[i].itens.push({ ...r, vencida: estaVencida(r, hoje), atividade: { codigo: at.codigo, titulo: at.titulo } })
  }
  return { colunas, depois }
}

// Próxima semana: 7 dias a partir do prazo (ou de hoje, se já venceu). Semana anterior:
// 7 dias antes, mas nunca antes de hoje.
export function novoPrazo(prazo, direcao, hoje) {
  if (direcao > 0) return somarDias(prazo < hoje ? hoje : prazo, 7)
  const antes = somarDias(prazo, -7)
  return antes < hoje ? hoje : antes
}

// Voltar só se a restrição está numa semana depois da atual.
export function podeMover(r, direcao, hoje) {
  if (r.resolvida) return false
  return direcao > 0 || segundaDaSemana(r.prazo) > segundaDaSemana(hoje)
}

export function validarRestricao(f, hoje) {
  const erros = {}
  if (!f.atividade_id) erros.atividade_id = 'Escolha a atividade.'
  if (!f.descricao?.trim()) erros.descricao = 'Descreva a restrição.'
  if (!TIPOS_RESTRICAO.includes(f.tipo)) erros.tipo = 'Escolha o tipo.'
  if (!f.prazo) erros.prazo = 'Informe o prazo para resolver.'
  else if (!f.id && f.prazo < hoje) erros.prazo = 'O prazo não pode ser antes de hoje.'
  if (!f.responsavel?.trim()) erros.responsavel = 'Informe quem resolve.'
  return erros
}

export const responsaveis = (lista) => [...new Set(lista.map((r) => r.responsavel))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

export function contarRestricoes(lista, eap, hoje) {
  const atividades = daEap(eap)
  const validas = lista.filter((r) => atividades.has(r.atividade_id))
  return {
    abertas: validas.filter((r) => !r.resolvida).length,
    vencidas: validas.filter((r) => estaVencida(r, hoje)).length,
    resolvidas: validas.filter((r) => r.resolvida).length,
  }
}

// Uma restrição com a atividade dela (código e nome) e se venceu. Null se a atividade não está na EAP ativa.
export function detalharRestricao(lista, eap, id, hoje) {
  const r = lista.find((x) => x.id === id)
  const at = r && eap.find((x) => x.id === r.atividade_id)
  return at ? { ...r, vencida: estaVencida(r, hoje), atividade: { codigo: at.codigo, titulo: at.titulo } } : null
}
