// Regras das frentes de serviço (RDO passo 2 e processo 1). Puras.
import { diasEntre } from './datas.js'

// "Parada há N dias" = hoje − parada_desde. Null se a frente não está parada.
export function diasParada(frente, hoje) {
  if (frente.situacao !== 'Parada' || !frente.parada_desde) return null
  return Math.max(0, diasEntre(frente.parada_desde, hoje))
}

const ORDEM_SITUACAO = { 'Parada': 0, 'Em execução': 1, 'Não iniciada': 2 }

// Paradas primeiro (mais dias no topo), depois em execução, depois não iniciadas.
// Concluídas saem da lista principal e vão para o grupo recolhido.
export function separarFrentes(frentes, hoje) {
  const ativas = frentes
    .filter((f) => f.situacao !== 'Concluída')
    .sort((a, b) =>
      (ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao])
      || ((diasParada(b, hoje) ?? 0) - (diasParada(a, hoje) ?? 0))
      || a.nome.localeCompare(b.nome, 'pt-BR'))
  const concluidas = frentes.filter((f) => f.situacao === 'Concluída')
  return { ativas, concluidas }
}

export function validarPreenchimento({ situacao, motivo_parada }) {
  if (!situacao) return 'Escolha a situação de hoje.'
  if (situacao === 'Parada' && !motivo_parada) return 'Escolha o motivo da parada.'
  return null
}

export function validarFrente({ nome, etapa, executor, empreiteiro }) {
  if (!nome?.trim()) return 'Dê um nome à frente.'
  if (!etapa) return 'Escolha a etapa.'
  if (!executor) return 'Escolha quem executa.'
  if (executor === 'Terceirizado' && !empreiteiro?.trim()) return 'Informe o empreiteiro.'
  return null
}

export function rotuloExecutor(frente) {
  return frente.executor === 'Terceirizado' ? `Terceirizado — ${frente.empreiteiro}` : 'Equipe própria'
}

// Processo 1 — ao fechar o RDO, atualizar as frentes da obra.
// Devolve as frentes novas; as que não têm registro no dia ficam como estão.
export function aplicarFechamento(frentes, rdoFrentes, dataRdo) {
  const doDia = new Map(rdoFrentes.map((rf) => [rf.frente_id, rf]))
  return frentes.map((f) => {
    const rf = doDia.get(f.id)
    if (!rf) return f
    if (rf.situacao === 'Parada') {
      return {
        ...f,
        situacao: 'Parada',
        parada_desde: f.situacao === 'Parada' && f.parada_desde ? f.parada_desde : dataRdo,
        motivo_parada: rf.motivo_parada,
      }
    }
    if (rf.situacao === 'Em execução') {
      return { ...f, situacao: 'Em execução', parada_desde: null, motivo_parada: null, data_inicio: f.data_inicio ?? dataRdo }
    }
    if (rf.situacao === 'Concluída') {
      return { ...f, situacao: 'Concluída', parada_desde: null, motivo_parada: null, data_conclusao: dataRdo, data_inicio: f.data_inicio ?? dataRdo }
    }
    return f
  })
}
