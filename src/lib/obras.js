// Regras da entidade OBRA. Puras.
import { SITUACOES_OBRA, TIPOS_OBRA } from './listas.js'

export function statusRdoHoje(rdoHoje) {
  if (!rdoHoje) return 'Não iniciado'
  return rdoHoje.status === 'Fechado' ? 'Fechado' : 'Em andamento'
}

const ORDEM_RDO = { 'Não iniciado': 0, 'Em andamento': 1, 'Fechado': 2 }

// Comparativo: sem RDO de hoje primeiro, depois em andamento, depois fechado; por nome.
export function ordenarResumo(resumos) {
  return [...resumos].sort((a, b) =>
    (ORDEM_RDO[a.rdo_hoje] - ORDEM_RDO[b.rdo_hoje]) || a.obra.nome.localeCompare(b.obra.nome, 'pt-BR'))
}

// Abas do comparativo: Ativas = Em andamento (com as Paradas num grupo recolhido); Concluídas.
export function separarPorSituacao(resumos) {
  return {
    andamento: resumos.filter((r) => r.obra.situacao === 'Em andamento'),
    paradas: resumos.filter((r) => r.obra.situacao === 'Parada'),
    concluidas: resumos.filter((r) => r.obra.situacao === 'Concluída'),
  }
}

// Qual obra abrir quando o app liga: a que estava guardada, se ainda existe;
// senão a primeira em andamento; senão a primeira da lista; senão nenhuma.
export function escolherObraInicial(obras, idGuardado) {
  if (idGuardado && obras.some((o) => o.id === idGuardado)) return idGuardado
  const andamento = obras.find((o) => o.situacao === 'Em andamento')
  return andamento?.id ?? obras[0]?.id ?? null
}

export function validarObra(o) {
  if (!o.nome?.trim()) return 'Dê um nome à obra.'
  if (!o.codigo?.trim()) return 'Dê um código ou apelido curto (ex.: SERRA4).'
  if (!TIPOS_OBRA.includes(o.tipo)) return 'Escolha o tipo da obra.'
  if (!o.cidade?.trim()) return 'Informe a cidade.'
  if (!o.data_inicio) return 'Informe a data de início.'
  if (!SITUACOES_OBRA.includes(o.situacao)) return 'Escolha a situação.'
  if (o.data_meta_entrega && o.data_meta_entrega < o.data_inicio) return 'A data-meta de entrega não pode ser antes do início.'
  return null
}

// Código sem espaços e em maiúsculas: é o que aparece no seletor de obra.
export const normalizarCodigo = (codigo) => (codigo ?? '').trim().toUpperCase().replace(/\s+/g, '-')
