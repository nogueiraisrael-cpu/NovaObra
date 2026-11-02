// Planejamento — Curto prazo: a semana no nível da obra. Quais atividades entram, em
// que coluna do Kanban cada uma está e o PPC (Percentual do Plano Concluído), que mede
// quanto do que foi planejado para a semana foi cumprido. Sem React, sem banco.
import { somarDias, diasEntre, formatarDiaMes } from './datas.js'
import { segundaDaSemana } from './planejamento.js'
import { STATUS_SEMANA, CAUSAS_NAO_REALIZADO } from './listas.js'

// Em que semana a atividade foi concluída: a do registro "Concluído" mais antigo; sem
// registro, a da data de fim, se o avanço já está em 100% (lançado no Longo prazo).
function semanaDaConclusao(atividade, registros) {
  const concluidas = registros.filter((r) => r.status === 'Concluído').map((r) => r.semana).sort()
  if (concluidas.length) return concluidas[0]
  return (atividade.progresso ?? 0) >= 100 ? segundaDaSemana(atividade.fim) : null
}

// As atividades da semana (segunda `semana`): só as que não têm subatividade. Entra a que
// cruza a semana e a que devia ter terminado antes e ainda não terminou (acumulada).
// A que já foi concluída numa semana anterior não entra mais.
export function itensDaSemana(eap, registros, semana) {
  const domingo = somarDias(semana, 6)
  const itens = []
  for (const a of eap) {
    if (a.grupo) continue
    const dela = registros.filter((r) => r.atividade_id === a.id)
    const concluida = semanaDaConclusao(a, dela)
    if (concluida && concluida < semana) continue
    const cruza = a.inicio <= domingo && a.fim >= semana
    const acumulada = !cruza && a.fim < semana
    if (!cruza && !acumulada) continue
    const r = dela.find((x) => x.semana === semana)
    itens.push({
      atividade: a,
      status: r?.status ?? (concluida === semana ? 'Concluído' : 'A fazer'),
      nao_realizada: Boolean(r?.nao_realizada),
      causa: r?.causa ?? null,
      acumulada,
    })
  }
  return itens
}

export function montarKanban(itens) {
  return Object.fromEntries(STATUS_SEMANA.map((s) => [s, itens.filter((x) => x.status === s)]))
}

// PPC = concluídas / planejadas × 100. Semana sem nada planejado não tem PPC (null, não 0).
export function calcularPpc(itens) {
  const total = itens.length
  const concluidas = itens.filter((x) => x.status === 'Concluído').length
  return { concluidas, total, pct: total ? Math.round((100 * concluidas) / total) : null }
}

// O PPC das últimas `n` semanas, da mais antiga até `semanaAtual`.
export function historicoPpc(eap, registros, semanaAtual, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const semana = somarDias(semanaAtual, -7 * (n - 1 - i))
    return { semana, ...calcularPpc(itensDaSemana(eap, registros, semana)) }
  })
}

export const validarCausa = (causa) => (CAUSAS_NAO_REALIZADO.includes(causa) ? null : 'Escolha a causa.')

export const contarSubtarefas = (lista) => ({ feitas: lista.filter((s) => s.feita).length, total: lista.length })

// "Esta semana", "Semana passada", "Próxima semana" ou "Semana de 16/11".
export function rotuloDaSemana(semana, atual) {
  const diferenca = Math.round(diasEntre(atual, semana) / 7)
  if (diferenca === 0) return 'Esta semana'
  if (diferenca === -1) return 'Semana passada'
  if (diferenca === 1) return 'Próxima semana'
  return `Semana de ${formatarDiaMes(semana)}`
}
