// Regras da entidade OBRA. Puras.
import { SITUACOES_OBRA, TIPOS_OBRA } from './listas.js'
import { diasUteis, calendarioDaObra } from './planejamento.js'

// "RDO de ontem não fechado" só cobra o dia que devia ter diário: obra em andamento, já começada
// e ontem era dia de trabalho dela (calendário e feriados). Achado de 07/11/2026: obra criada hoje
// já nascia cobrando, e toda segunda-feira cobraria o domingo de todas as obras.
export function cobraRdoDeOntem(obra, rdoOntem, ontem) {
  if (obra.situacao !== 'Em andamento') return false
  if (obra.data_inicio && obra.data_inicio > ontem) return false
  if (!diasUteis(ontem, ontem, calendarioDaObra(obra))) return false
  return rdoOntem?.status !== 'Fechado'
}

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

// Quadro (obra.apagar): só se apaga obra sem nada lançado. Recebe as tabelas onde a obra
// tem algum registro e devolve a frase do porquê não, ou null se pode apagar.
const O_QUE_PRENDE = {
  rdos: 'diários', rdo_efetivo: 'diários', rdo_equipamentos: 'diários', rdo_frentes: 'diários',
  rdo_frente_equipe: 'diários', fotos: 'diários', frentes_servico: 'frentes de serviço',
  pedidos_material: 'pedidos de material', insumos: 'estoque', movimentos_estoque: 'estoque',
  atividades: 'planejamento', restricoes: 'planejamento', semana_atividades: 'planejamento', subtarefas: 'planejamento',
  medicoes: 'medições', medicao_itens: 'medições',
  funcionarios: 'funcionários lotados nela', equipamentos: 'equipamentos lotados nela',
}

const naoApaga = (lista) => `Esta obra não pode ser apagada: já tem ${lista}. Só se apaga obra sem nada lançado. Para tirá-la do dia a dia, marque a situação como Concluída.`
// Quando só o banco sabe (recusou com 23503) e não diz o quê.
export const OBRA_COM_LANCAMENTOS = naoApaga('lançamentos')

export function motivoParaNaoApagarObra(tabelasComRegistro) {
  const itens = [...new Set(tabelasComRegistro.map((t) => O_QUE_PRENDE[t] ?? 'lançamentos'))]
  if (!itens.length) return null
  return naoApaga(itens.length === 1 ? itens[0] : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`)
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
