// Vocabulário fechado do sistema. Cada lista aqui vira um CHECK no banco,
// com o texto IDÊNTICO (acento e maiúscula inclusos). Mudou aqui, muda na migration.

export const SITUACOES_OBRA = ['Em andamento', 'Parada', 'Concluída']
export const TIPOS_OBRA = ['Licitação', 'Alto padrão']

// Perfil e situação da conta (docs/permissoes/QUEM-PODE-O-QUE.md). CHECK em profiles (migration -14).
export const ROLES = ['admin_master', 'gerente', 'cliente']
export const SITUACOES_CONTA = ['pendente', 'ativo', 'bloqueado']
// Como cada perfil aparece na tela: o admin_master é "Engenheiro" para quem usa.
export const NOME_PERFIL = { admin_master: 'Engenheiro', gerente: 'Gerente', cliente: 'Cliente' }

export const CLIMAS = ['Bom', 'Nublado', 'Chuva leve', 'Chuva forte']

export const SITUACOES_EFETIVO = ['Presente', 'Falta', 'Atestado', 'Deslocado', 'Veio de outra obra']
// As quatro que o engenheiro marca com um toque; "Veio de outra obra" o app põe sozinho.
export const SITUACOES_EFETIVO_TOQUE = ['Presente', 'Falta', 'Atestado', 'Deslocado']

export const SITUACOES_EQUIPAMENTO_DIA = ['Operando', 'Parado', 'Quebrado']
export const SITUACOES_EQUIPAMENTO = ['Na obra', 'No conserto', 'No depósito']

export const FUNCOES = ['Pedreiro', 'Servente', 'Carpinteiro', 'Armador', 'Eletricista', 'Encanador', 'Pintor', 'Mestre', 'Outro']

export const ETAPAS = [
  'Fundação', 'Estrutura / Concretagem', 'Alvenaria', 'Reboco de fachada', 'Reboco interno',
  'Revestimento cerâmico', 'Instalações hidrossanitárias', 'Instalações elétricas',
  'Impermeabilização', 'Cobertura', 'Pintura', 'Outro',
]
export const EXECUTORES = ['Equipe própria', 'Terceirizado']
export const SITUACOES_FRENTE = ['Não iniciada', 'Em execução', 'Parada', 'Concluída']
export const SITUACOES_FRENTE_DIA = ['Em execução', 'Parada', 'Concluída']
export const MOTIVOS_PARADA = [
  'Falta de material', 'Falta de mão de obra', 'Chuva', 'Aguardando projeto',
  'Aguardando cliente', 'Aguardando terceirizado', 'Outro',
]

// Materiais (quadro de pedidos). A ordem de STATUS_PEDIDO é a ordem das colunas.
export const CATEGORIAS_MATERIAL = ['Material grosso', 'Acabamento', 'Instalações']
export const PRIORIDADES_PEDIDO = ['Normal', 'Crítico']
export const STATUS_PEDIDO = ['Solicitar', 'Em cotação', 'Comprado', 'No almoxarifado', 'Entregue']
// Estoque (movimentos_estoque).
export const TIPOS_MOVIMENTO = ['Entrada', 'Saída']
export const ORIGENS_MOVIMENTO = ['Pedido', 'Manual']

// Planejamento — Médio prazo: o tipo de cada restrição (impedimento) de uma atividade.
export const TIPOS_RESTRICAO = ['Material', 'Mão de obra', 'Método', 'Equipamento', 'Projeto', 'Segurança', 'Logística']

// Planejamento — Curto prazo: as colunas do Kanban da semana (nesta ordem) e a causa raiz
// de uma atividade ou subtarefa "Não realizada".
export const STATUS_SEMANA = ['A fazer', 'Em andamento', 'Concluído']
export const CAUSAS_NAO_REALIZADO = [
  'Material', 'Mão de obra', 'Projeto', 'Clima', 'Equipamento', 'Serviço anterior', 'Restrição não resolvida', 'Outro',
]

// Medições (v1.3): de onde veio a planilha.
export const TIPOS_MEDICAO = ['Contrato', 'Empreiteiro']

export const STATUS_RDO = ['Em andamento', 'Fechado']
// Como o RDO de hoje aparece no cartão da obra (inclui o caso "não existe RDO").
export const STATUS_RDO_HOJE = ['Não iniciado', 'Em andamento', 'Fechado']
