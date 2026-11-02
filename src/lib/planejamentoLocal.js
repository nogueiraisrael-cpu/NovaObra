// Planejamento — atualização OTIMISTA: o que a tela mostra no instante do toque, enquanto o
// banco grava. Cada função recebe tudo o que a tela tem ({ atividades, restricoes, semanas,
// subtarefas, calendario }) e devolve uma cópia já com a mudança. As regras são as MESMAS que
// dados.js usa (curtoPrazo.js); quando o banco responde, a lista é relida e vale a gravada.
// Se o banco recusar, a tela volta ao que era antes. Sem React, sem banco.
import { proximaOrdem, ordemNoFim } from './planejamento.js'
import { REGISTRO_VAZIO, mudancaDeColuna, efeitoDoAvanco, camposDaSubtarefa, subtarefasDe } from './curtoPrazo.js'

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

// O avanço também acerta o Kanban, como em dados.js (efeitoDoAvanco).
export function comProgresso(d, id, progresso, semanaAtual) {
  const antigo = d.atividades.find((x) => x.id === id)?.progresso ?? 0
  const efeito = efeitoDoAvanco(d.semanas.filter((s) => s.atividade_id === id), progresso, antigo, semanaAtual)
  let semanas = d.semanas.map((s) => (efeito.reabrir.includes(s.id) ? { ...s, status: 'Em andamento', progresso_antes: null } : s))
  if (efeito.concluir) semanas = naSemana({ ...d, semanas }, id, efeito.concluir.semana, (s) => ({ ...s, ...efeito.concluir.campos }))
  return { ...d, semanas, atividades: trocar(d.atividades, id, (x) => ({ ...x, progresso })) }
}

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
  const base = atual ?? { id: provisorio(), atividade_id: atividadeId, semana, ...REGISTRO_VAZIO }
  const nova = mudar(base)
  return atual ? d.semanas.map((s) => (s === atual ? nova : s)) : [...d.semanas, nova]
}

// Mudar de coluna: mesma regra de dados.js (mudancaDeColuna).
export function comStatusNaSemana(d, atividadeId, semana, status) {
  const at = d.atividades.find((x) => x.id === atividadeId)
  const antes = d.semanas.find((s) => s.atividade_id === atividadeId && s.semana === semana)
  const { campos, progresso } = mudancaDeColuna(antes, status, at?.progresso ?? 0)
  return {
    ...d,
    semanas: naSemana(d, atividadeId, semana, (s) => ({ ...s, ...campos })),
    atividades: progresso === null ? d.atividades : trocar(d.atividades, atividadeId, (x) => ({ ...x, progresso })),
  }
}

export const comNaoRealizada = (d, atividadeId, semana, causa) => ({
  ...d, semanas: naSemana(d, atividadeId, semana, (s) => ({ ...s, nao_realizada: causa !== null, causa })),
})

export function novaSubtarefa(d, atividadeId, titulo) {
  const ordem = ordemNoFim(subtarefasDe(d.subtarefas, atividadeId))
  return { ...d, subtarefas: [...d.subtarefas, { id: provisorio(), atividade_id: atividadeId, titulo: titulo.trim(), ordem, feita: false, nao_realizada: false, causa: null }] }
}

export const comSubtarefa = (d, id, mudanca) => ({ ...d, subtarefas: trocar(d.subtarefas, id, (s) => ({ ...s, ...camposDaSubtarefa(mudanca) })) })

export const semSubtarefa = (d, id) => ({ ...d, subtarefas: d.subtarefas.filter((s) => s.id !== id) })
