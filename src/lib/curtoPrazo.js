// Planejamento — Curto prazo: a semana no nível da obra. Quais atividades entram, em
// que coluna do Kanban cada uma está e o PPC (Percentual do Plano Concluído), que mede
// quanto do que foi planejado para a semana foi cumprido. Sem React, sem banco.
import { somarDias } from './datas.js'
import { segundaDaSemana } from './planejamento.js'
import { STATUS_SEMANA, CAUSAS_NAO_REALIZADO } from './listas.js'

// Em que semana a atividade foi concluída: a do registro "Concluído" mais antigo. Sem registro e
// com avanço em 100% (dado antigo ou importado, de antes de o Longo prazo concluir no Kanban
// sozinho), vale a semana da data de fim.
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

// Linha de uma atividade numa semana quando ainda não existe (sem linha = "A fazer").
export const REGISTRO_VAZIO = { status: 'A fazer', nao_realizada: false, causa: null, progresso_antes: null }

// Mudar de coluna: os campos da linha da semana e o novo avanço da atividade (null = não muda).
// Concluir põe 100% e guarda o avanço de antes; sair de Concluído devolve o guardado.
export function mudancaDeColuna(registro, status, progressoAtual) {
  const eraConcluida = registro?.status === 'Concluído'
  if (status === 'Concluído') {
    return {
      campos: { status, nao_realizada: false, causa: null, ...(eraConcluida ? {} : { progresso_antes: progressoAtual }) },
      progresso: progressoAtual === 100 ? null : 100,
    }
  }
  return {
    campos: { status, ...(eraConcluida ? { progresso_antes: null } : {}) },
    progresso: eraConcluida && registro.progresso_antes != null ? registro.progresso_antes : null,
  }
}

// Avanço lançado no Longo prazo acerta o Kanban, para as duas abas nunca discordarem:
// chegar a 100% conclui na semana de hoje; sair de 100% reabre a semana em que estava concluída.
export function efeitoDoAvanco(registros, progressoNovo, progressoAntigo, semanaAtual) {
  const concluidas = registros.filter((r) => r.status === 'Concluído')
  if (progressoNovo === 100) {
    if (concluidas.length) return { concluir: null, reabrir: [] }
    return { concluir: { semana: semanaAtual, campos: mudancaDeColuna(null, 'Concluído', progressoAntigo).campos }, reabrir: [] }
  }
  return { concluir: null, reabrir: concluidas.map((r) => r.id) }
}

// Os campos de uma subtarefa ao marcar: feita tira o "não realizada"; não realizada (com causa) tira o feita.
export function camposDaSubtarefa({ feita, causa }) {
  if (causa) return { feita: false, nao_realizada: true, causa }
  if (causa === null) return { nao_realizada: false, causa: null }
  return feita ? { feita: true, nao_realizada: false, causa: null } : { feita: false }
}

export const subtarefasDe = (lista, atividadeId) => lista.filter((s) => s.atividade_id === atividadeId).sort((a, b) => a.ordem - b.ordem)
