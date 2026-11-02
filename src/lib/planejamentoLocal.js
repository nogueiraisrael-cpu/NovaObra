// Planejamento — atualização OTIMISTA: o que a tela mostra no instante do toque, enquanto o
// banco grava. Cada função recebe tudo o que a tela tem ({ atividades, restricoes, semanas,
// subtarefas, calendario }) e devolve uma cópia já com a mudança. Espelha, de forma simples,
// o que dados.js grava; quando o banco responde, a lista é relida e vale a que ficou gravada.
// Se o banco recusar, a tela volta ao que era antes. Sem React, sem banco.
import { proximaOrdem } from './planejamento.js'

let contador = 0
// Id provisório de quem acabou de ser criado: some quando a lista é relida do banco.
const provisorio = () => `tmp-${++contador}`
const trocar = (lista, id, fn) => lista.map((x) => (x.id === id ? fn(x) : x))

// ---- EAP e Longo prazo ----

export function comAtividade(d, f) {
  const pai_id = f.pai_id || null
  const campos = { titulo: f.titulo.trim(), data_inicio: f.data_inicio, data_fim: f.data_fim, pai_id }
  if (f.id) {
    return {
      ...d,
      atividades: trocar(d.atividades, f.id, (x) => ({
        ...x, ...campos, ordem: (x.pai_id ?? null) === pai_id ? x.ordem : proximaOrdem(d.atividades, pai_id),
      })),
    }
  }
  const nova = { id: provisorio(), ...campos, ordem: proximaOrdem(d.atividades, pai_id), progresso: 0, arquivada: false }
  return { ...d, atividades: [...d.atividades, nova] }
}

export const comOrdens = (d, troca) => ({
  ...d, atividades: d.atividades.map((x) => ({ ...x, ordem: troca.find((t) => t.id === x.id)?.ordem ?? x.ordem })),
})

export const comArquivadas = (d, ids, arquivada) => ({
  ...d, atividades: d.atividades.map((x) => (ids.includes(x.id) ? { ...x, arquivada } : x)),
})

export const comProgresso = (d, id, progresso) => ({ ...d, atividades: trocar(d.atividades, id, (x) => ({ ...x, progresso })) })

export const comCalendario = (d, { dias, feriados }) => ({ ...d, calendario: { dias: [...dias].sort(), feriados: [...feriados].sort() } })

// ---- Médio prazo ----

export function comRestricao(d, f) {
  const campos = { atividade_id: f.atividade_id, descricao: f.descricao.trim(), tipo: f.tipo, prazo: f.prazo, responsavel: f.responsavel.trim() }
  if (f.id) return { ...d, restricoes: trocar(d.restricoes, f.id, (r) => ({ ...r, ...campos })) }
  return { ...d, restricoes: [...d.restricoes, { id: provisorio(), ...campos, resolvida: false, resolvida_em: null }] }
}

export const comPrazo = (d, id, prazo) => ({ ...d, restricoes: trocar(d.restricoes, id, (r) => ({ ...r, prazo })) })

export const comResolvida = (d, id, resolvida, hoje) => ({
  ...d, restricoes: trocar(d.restricoes, id, (r) => ({ ...r, resolvida, resolvida_em: resolvida ? hoje : null })),
})

export const semRestricao = (d, id) => ({ ...d, restricoes: d.restricoes.filter((r) => r.id !== id) })

// ---- Curto prazo ----

function naSemana(d, atividadeId, semana, mudar) {
  const atual = d.semanas.find((s) => s.atividade_id === atividadeId && s.semana === semana)
  const base = atual ?? { id: provisorio(), atividade_id: atividadeId, semana, status: 'A fazer', nao_realizada: false, causa: null, progresso_antes: null }
  const nova = mudar(base)
  return atual ? d.semanas.map((s) => (s === atual ? nova : s)) : [...d.semanas, nova]
}

// Concluir põe o avanço em 100% (e guarda o de antes); sair de Concluído devolve.
export function comStatusNaSemana(d, atividadeId, semana, status) {
  const at = d.atividades.find((x) => x.id === atividadeId)
  const antes = d.semanas.find((s) => s.atividade_id === atividadeId && s.semana === semana)
  const eraConcluida = antes?.status === 'Concluído'
  let progresso = at?.progresso
  const semanas = naSemana(d, atividadeId, semana, (s) => {
    if (status === 'Concluído') {
      progresso = 100
      return { ...s, status, nao_realizada: false, causa: null, progresso_antes: eraConcluida ? s.progresso_antes : at?.progresso ?? 0 }
    }
    if (eraConcluida && s.progresso_antes !== null) progresso = s.progresso_antes
    return { ...s, status, progresso_antes: eraConcluida ? null : s.progresso_antes }
  })
  return { ...d, semanas, atividades: trocar(d.atividades, atividadeId, (x) => ({ ...x, progresso })) }
}

export const comNaoRealizada = (d, atividadeId, semana, causa) => ({
  ...d, semanas: naSemana(d, atividadeId, semana, (s) => ({ ...s, nao_realizada: causa !== null, causa })),
})

export function novaSubtarefa(d, atividadeId, titulo) {
  const irmas = d.subtarefas.filter((s) => s.atividade_id === atividadeId)
  const ordem = irmas.length ? Math.max(...irmas.map((s) => s.ordem)) + 1 : 0
  return { ...d, subtarefas: [...d.subtarefas, { id: provisorio(), atividade_id: atividadeId, titulo: titulo.trim(), ordem, feita: false, nao_realizada: false, causa: null }] }
}

// Mesma regra de dados.js: feita tira o "não realizada"; não realizada (com causa) tira o feita.
export function comSubtarefa(d, id, { feita, causa }) {
  const campos = causa ? { feita: false, nao_realizada: true, causa }
    : causa === null ? { nao_realizada: false, causa: null }
      : { feita: Boolean(feita), ...(feita ? { nao_realizada: false, causa: null } : {}) }
  return { ...d, subtarefas: trocar(d.subtarefas, id, (s) => ({ ...s, ...campos })) }
}

export const semSubtarefa = (d, id) => ({ ...d, subtarefas: d.subtarefas.filter((s) => s.id !== id) })
