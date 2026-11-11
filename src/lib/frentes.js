// Regras das frentes de serviço (RDO passo 2 e processo 1). Puras.
import { diasEntre } from './datas.js'

// "Parada há N dias" = hoje − parada_desde. Null se a frente não está parada.
export function diasParada(frente, hoje) {
  if (frente.situacao !== 'Parada' || !frente.parada_desde) return null
  return Math.max(0, diasEntre(frente.parada_desde, hoje))
}

// O texto do cartão e da lista do comparativo. Sem a data da parada, só "Parada".
export function rotuloParada(dias) {
  return dias == null ? 'Parada' : `Parada há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
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

// A situação que a frente ganha num dia em que ninguém escolheu outra: a que ela já tem;
// a que nunca começou passa a "Em execução" (pôr gente nela é começá-la).
export const situacaoPadraoDoDia = (frente) => (frente.situacao === 'Não iniciada' ? 'Em execução' : frente.situacao)

// ---- Equipe que continua de um dia para o outro (decisão do Israel, 10/11/2026) ----
// A frente em execução começa o dia com a equipe do último lançamento dela, sem ninguém tocar.
// O último lançamento é procurado só nos diários mais novos da obra: frente que ficou este
// tanto de diários sem ser lançada não puxa mais ninguém.
export const DIARIOS_PARA_HERDAR = 7

// Os diários da obra anteriores a hoje onde se procura o último lançamento, do mais novo ao mais velho.
export function diariosParaHerdar(rdos, hoje) {
  return rdos.filter((r) => r.data < hoje).sort((a, b) => b.data.localeCompare(a.data)).slice(0, DIARIOS_PARA_HERDAR)
}

// Para cada frente que herda equipe, o lançamento de onde ela vem (frente_id → linha de rdo_frentes).
// Herda quem: hoje começaria "Em execução" (`situacaoPadraoDoDia`: inclui a "Não iniciada" que
// foi lançada num dia que ficou sem fechar), ainda não foi lançada hoje, e no último lançamento
// estava "Em execução". Frente parada ou concluída começa o dia sem ninguém.
// `anteriores` = diariosParaHerdar(...); `rdoFrentes` = os lançamentos desses diários.
export function lancamentosHerdados(frentes, anteriores, rdoFrentes, lancadasHoje) {
  const dataDo = new Map(anteriores.map((r) => [r.id, r.data]))
  const hoje = new Set(lancadasHoje)
  const ultimo = new Map()
  for (const rf of rdoFrentes) {
    const data = dataDo.get(rf.rdo_id)
    if (!data) continue
    const atual = ultimo.get(rf.frente_id)
    if (!atual || data > dataDo.get(atual.rdo_id)) ultimo.set(rf.frente_id, rf)
  }
  const herdados = new Map()
  for (const f of frentes) {
    const rf = ultimo.get(f.id)
    if (situacaoPadraoDoDia(f) === 'Em execução' && !hoje.has(f.id) && rf?.situacao === 'Em execução') herdados.set(f.id, rf)
  }
  return herdados
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

// Fechar atrasado um dia que já passou (aba Diários). A situação da frente é a do último dia
// fechado: frente lançada num diário fechado DEPOIS deste não muda de situação (o dia mais novo
// já decidiu por ela); só puxa o início para trás, se ela já trabalhava neste dia.
// `decididasDepois`: ids das frentes com registro em diário fechado mais novo que `dataRdo`.
export function aplicarFechamentoAtrasado(frentes, rdoFrentes, dataRdo, decididasDepois) {
  const depois = new Set(decididasDepois)
  const livres = aplicarFechamento(frentes, rdoFrentes.filter((rf) => !depois.has(rf.frente_id)), dataRdo)
  const trabalhou = new Set(rdoFrentes.filter((rf) => rf.situacao !== 'Parada').map((rf) => rf.frente_id))
  return livres.map((f) => {
    if (!depois.has(f.id) || !trabalhou.has(f.id) || (f.data_inicio && f.data_inicio <= dataRdo)) return f
    return { ...f, data_inicio: dataRdo }
  })
}
