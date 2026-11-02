// Vocabulário fechado do sistema. Cada lista aqui vira um CHECK no banco,
// com o texto IDÊNTICO (acento e maiúscula inclusos). Mudou aqui, muda na migration.

export const SITUACOES_OBRA = ['Em andamento', 'Parada', 'Concluída']
export const TIPOS_OBRA = ['Licitação', 'Alto padrão']

export const ROLES = ['Engenheiro', 'Cliente', 'Pendente']

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

export const STATUS_RDO = ['Em andamento', 'Fechado']
// Como o RDO de hoje aparece no cartão da obra (inclui o caso "não existe RDO").
export const STATUS_RDO_HOJE = ['Não iniciado', 'Em andamento', 'Fechado']
