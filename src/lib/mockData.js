// Dados de mentira, com os mesmos nomes de tabela e coluna do PRD-BACKEND.
// Na Etapa 7 eles viram o seed do banco.
//
// DUAS obras, de propósito e bem diferentes (o-segundo): a Serra tem RDO de hoje
// em andamento, 8 funcionários e equipamentos; a UBS não tem RDO de hoje, tem
// outra equipe e NENHUM equipamento. Se aparecer equipamento na UBS, vazou dado.
//
// As datas são relativas a hoje, para o exemplo continuar fazendo sentido amanhã.
import { hojeISO, somarDias } from './datas.js'

export function criarMock(hoje = hojeISO()) {
  const d = (n) => somarDias(hoje, n)

  const profiles = [
    { id: 'p-eng', nome: 'Eng. Israel', email: 'eng@novaobra.test', role: 'Engenheiro', ativo: true },
    { id: 'p-ricardo', nome: 'Eng. Ricardo', email: 'ricardo@novaobra.test', role: 'Engenheiro', ativo: true },
    { id: 'p-fulano', nome: 'Fulano Silva', email: 'fulano@novaobra.test', role: 'Pendente', ativo: true },
    { id: 'p-helena', nome: 'Dra. Helena Duarte', email: 'helena@novaobra.test', role: 'Cliente', ativo: true },
  ]

  const obras = [
    {
      id: 'obra-serra', nome: 'Casa Alto da Serra 4', codigo: 'SERRA4', tipo: 'Alto padrão',
      endereco: 'Rua das Acácias, 410 — Alto da Serra', cidade: 'Natal',
      cliente: 'Dra. Helena Duarte', numero_contrato: null,
      data_inicio: d(-150), data_meta_entrega: d(120), situacao: 'Em andamento',
    },
    {
      id: 'obra-ubs', nome: 'UBS Nova Esperança', codigo: 'UBS-NE', tipo: 'Licitação',
      endereco: 'Av. Tenente Medeiros, s/n — Nova Esperança', cidade: 'Parnamirim',
      cliente: 'Prefeitura de Parnamirim', numero_contrato: 'CT 042/2026',
      data_inicio: d(-75), data_meta_entrega: d(210), situacao: 'Em andamento',
    },
  ]

  const membros = [
    { id: 'm1', obra_id: 'obra-serra', profile_id: 'p-helena', papel: 'Cliente' },
  ]

  const f = (id, nome, funcao, obra_id) => ({ id, nome, funcao, obra_id, ativo: true })
  const funcionarios = [
    f('f-joao', 'João', 'Pedreiro', 'obra-serra'),
    f('f-marcos', 'Marcos', 'Pedreiro', 'obra-serra'),
    f('f-tiago', 'Tiago', 'Servente', 'obra-serra'),
    f('f-paulo', 'Paulo', 'Servente', 'obra-serra'),
    f('f-rafael', 'Rafael', 'Carpinteiro', 'obra-serra'),
    f('f-luis', 'Luís', 'Armador', 'obra-serra'),
    f('f-edson', 'Edson', 'Encanador', 'obra-serra'),
    f('f-bruno', 'Bruno', 'Eletricista', 'obra-serra'),
    f('f-severino', 'Severino', 'Mestre', 'obra-ubs'),
    f('f-francisco', 'Francisco', 'Pedreiro', 'obra-ubs'),
    f('f-antonio', 'Antônio', 'Servente', 'obra-ubs'),
    f('f-damiao', 'Damião', 'Armador', 'obra-ubs'),
    f('f-cicero', 'Cícero', 'Carpinteiro', 'obra-ubs'),
    f('f-geraldo', 'Geraldo', 'Pintor', null),
  ]

  const equipamentos = [
    { id: 'e-betoneira', nome: 'Betoneira 400 L', codigo: 'BT-01', situacao: 'Na obra', obra_id: 'obra-serra', situacao_desde: d(-30) },
    { id: 'e-andaime', nome: 'Andaime tubular 12 m', codigo: 'AD-03', situacao: 'Na obra', obra_id: 'obra-serra', situacao_desde: d(-12) },
    { id: 'e-fachadeiro', nome: 'Andaime fachadeiro 30 m', codigo: 'AF-30', situacao: 'No depósito', obra_id: null, situacao_desde: d(-11) },
    { id: 'e-vibrador', nome: 'Vibrador de imersão', codigo: 'VB-02', situacao: 'No conserto', obra_id: null, situacao_desde: d(-19), oficina: 'Oficina Tec Máquinas', previsao_retorno: d(-6), defeito: 'Motor queimado' },
  ]

  const fr = (id, obra_id, nome, etapa, executor, empreiteiro, situacao, extra = {}) =>
    ({ id, obra_id, nome, etapa, executor, empreiteiro, situacao, parada_desde: null, motivo_parada: null, data_inicio: null, data_conclusao: null, ...extra })
  const frentes_servico = [
    fr('fs-sapatas', 'obra-serra', 'Fundação — sapatas', 'Estrutura / Concretagem', 'Equipe própria', null, 'Concluída', { data_inicio: d(-140), data_conclusao: d(-26) }),
    fr('fs-reboco', 'obra-serra', 'Reboco fachada norte', 'Reboco de fachada', 'Terceirizado', 'Reboco Forte', 'Parada', { parada_desde: d(-6), motivo_parada: 'Falta de material', data_inicio: d(-20) }),
    fr('fs-revest', 'obra-serra', 'Revestimento banheiros', 'Revestimento cerâmico', 'Terceirizado', 'Cerâmica Silva', 'Em execução', { data_inicio: d(-8) }),
    fr('fs-hidro', 'obra-serra', 'Tubulação água fria e esgoto', 'Instalações hidrossanitárias', 'Equipe própria', null, 'Em execução', { data_inicio: d(-15) }),
    fr('fs-imper', 'obra-serra', 'Impermeabilização laje cobertura', 'Impermeabilização', 'Terceirizado', 'Imperme RN', 'Parada', { parada_desde: d(-2), motivo_parada: 'Chuva', data_inicio: d(-5) }),
    fr('fs-pintura', 'obra-serra', 'Pintura interna', 'Pintura', 'Equipe própria', null, 'Não iniciada'),
    fr('fs-ubs-sapatas', 'obra-ubs', 'Fundação — sapatas', 'Fundação', 'Equipe própria', null, 'Em execução', { data_inicio: d(-40) }),
    fr('fs-ubs-alv', 'obra-ubs', 'Alvenaria térreo — bloco A', 'Alvenaria', 'Equipe própria', null, 'Parada', { parada_desde: d(-4), motivo_parada: 'Falta de mão de obra', data_inicio: d(-18) }),
    fr('fs-ubs-agua', 'obra-ubs', 'Tubulação água fria', 'Instalações hidrossanitárias', 'Terceirizado', 'Hidro Natal', 'Parada', { parada_desde: d(-9), motivo_parada: 'Aguardando projeto', data_inicio: d(-12) }),
  ]

  const agora = new Date()
  const ontemFechado = new Date(agora.getTime() - 86400000)
  ontemFechado.setHours(17, 42, 0, 0)
  const rdo = (id, obra_id, data, status, extra = {}) => ({
    id, obra_id, data, clima_manha: 'Bom', clima_tarde: 'Bom', praticavel_manha: true, praticavel_tarde: true,
    observacoes: '', status, criado_por: 'p-eng', fechado_por: null, fechado_em: null, ...extra,
  })
  const rdos = [
    rdo('rdo-serra-ontem', 'obra-serra', d(-1), 'Fechado', { fechado_por: 'p-ricardo', fechado_em: ontemFechado.toISOString() }),
    rdo('rdo-serra-hoje', 'obra-serra', hoje, 'Em andamento', { clima_tarde: 'Nublado' }),
    // UBS: o de ontem ficou aberto (aviso "RDO de ontem não fechado") e o de hoje não existe.
    rdo('rdo-ubs-ontem', 'obra-ubs', d(-1), 'Em andamento', { criado_por: 'p-ricardo' }),
  ]

  const ef = (id, funcionario_id, situacao, obra_destino_id = null) =>
    ({ id, rdo_id: 'rdo-serra-hoje', obra_id: 'obra-serra', data: hoje, funcionario_id, situacao, obra_destino_id })
  const rdo_efetivo = [
    ef('ef1', 'f-joao', 'Presente'),
    ef('ef2', 'f-marcos', 'Presente'),
    ef('ef3', 'f-tiago', 'Presente'),
    ef('ef4', 'f-paulo', 'Falta'),
    ef('ef5', 'f-rafael', 'Presente'),
    ef('ef6', 'f-luis', 'Presente'),
    // Edson foi para a UBS só hoje. O RDO da UBS ainda não existe:
    // quando abrir, ele aparece lá como "Veio de outra obra".
    ef('ef7', 'f-edson', 'Deslocado', 'obra-ubs'),
    ef('ef8', 'f-bruno', 'Presente'),
  ]

  const rdo_equipamentos = [
    { id: 're1', rdo_id: 'rdo-serra-hoje', obra_id: 'obra-serra', equipamento_id: 'e-betoneira', situacao: 'Operando', observacao: '' },
    { id: 're2', rdo_id: 'rdo-serra-hoje', obra_id: 'obra-serra', equipamento_id: 'e-andaime', situacao: 'Parado', observacao: 'Aguardando a fachada' },
  ]

  const rdo_frentes = [
    { id: 'rf1', rdo_id: 'rdo-serra-hoje', obra_id: 'obra-serra', frente_id: 'fs-revest', situacao: 'Em execução', motivo_parada: null, descricao: 'Assentamento do porcelanato do banheiro social' },
  ]
  const rdo_frente_equipe = [
    { id: 'rq1', rdo_frente_id: 'rf1', obra_id: 'obra-serra', funcionario_id: 'f-joao' },
    { id: 'rq2', rdo_frente_id: 'rf1', obra_id: 'obra-serra', funcionario_id: 'f-marcos' },
    { id: 'rq3', rdo_frente_id: 'rf1', obra_id: 'obra-serra', funcionario_id: 'f-tiago' },
  ]

  return {
    profiles, obras, membros, funcionarios, equipamentos, frentes_servico,
    rdos, rdo_efetivo, rdo_equipamentos, rdo_frentes, rdo_frente_equipe, fotos: [],
  }
}
