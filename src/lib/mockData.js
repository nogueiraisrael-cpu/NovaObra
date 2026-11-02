// Dados de mentira, com os mesmos nomes de tabela e coluna do PRD-BACKEND.
// Na Etapa 7 eles viram o seed do banco.
//
// DUAS obras, de propósito e bem diferentes (o-segundo): a Serra tem RDO de hoje
// em andamento, 8 funcionários e equipamentos; a UBS não tem RDO de hoje, tem
// outra equipe e NENHUM equipamento. Se aparecer equipamento na UBS, vazou dado.
// Nos materiais, a UBS tem só 2 pedidos (aço e bloco); a Serra, 10. No estoque, a Serra tem
// 2 insumos críticos; a UBS, só o cimento e nenhum crítico.
//
// As datas são relativas a hoje, para o exemplo continuar fazendo sentido amanhã.
// O supabase-seed.sql foi gerado a partir daqui (01/11/2026): os ids viram uuid fixos.
import { hojeISO, somarDias } from './datas.js'

// As pessoas de exemplo já têm id no formato do banco (uuid): é o que vai em
// criado_por / fechado_por / enviada_por. O login de verdade chega no passo 10.
export const P = {
  israel: '00000000-0000-4000-8000-00000000a001',
  ricardo: '00000000-0000-4000-8000-00000000a002',
  fulano: '00000000-0000-4000-8000-00000000f001',
  helena: '00000000-0000-4000-8000-00000000c001',
}

export function criarMock(hoje = hojeISO()) {
  const d = (n) => somarDias(hoje, n)

  const profiles = [
    { id: P.israel, nome: 'Eng. Israel', email: 'eng@novaobra.test', role: 'Engenheiro', ativo: true },
    { id: P.ricardo, nome: 'Eng. Ricardo', email: 'ricardo@novaobra.test', role: 'Engenheiro', ativo: true },
    { id: P.fulano, nome: 'Fulano Silva', email: 'fulano@novaobra.test', role: 'Pendente', ativo: true },
    { id: P.helena, nome: 'Dra. Helena Duarte', email: 'helena@novaobra.test', role: 'Cliente', ativo: true },
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
    { id: 'm1', obra_id: 'obra-serra', profile_id: P.helena, papel: 'Cliente' },
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
    observacoes: '', status, criado_por: P.israel, fechado_por: null, fechado_em: null, ...extra,
  })
  const rdos = [
    rdo('rdo-serra-ontem', 'obra-serra', d(-1), 'Fechado', { fechado_por: P.ricardo, fechado_em: ontemFechado.toISOString() }),
    rdo('rdo-serra-hoje', 'obra-serra', hoje, 'Em andamento', { clima_tarde: 'Nublado' }),
    // UBS: o de ontem ficou aberto (aviso "RDO de ontem não fechado") e o de hoje não existe.
    rdo('rdo-ubs-ontem', 'obra-ubs', d(-1), 'Em andamento', { criado_por: P.ricardo }),
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

  // ---- Dias passados, para a aba Diários ----
  // Serra: 4 dias fechados (o de ontem e mais 3). UBS: só o de ontem, aberto.
  // Coerentes com as frentes de hoje: reboco parado desde d(-6), impermeabilização desde d(-2).
  const fotos = []
  const as = (iso, h, min) => { const [a, m, dia] = iso.split('-').map(Number); return new Date(a, m - 1, dia, h, min).toISOString() }
  rdos.push(
    rdo('rdo-serra-4', 'obra-serra', d(-4), 'Fechado', { fechado_por: P.israel, fechado_em: as(d(-4), 17, 15) }),
    rdo('rdo-serra-3', 'obra-serra', d(-3), 'Fechado', {
      clima_tarde: 'Nublado', observacoes: 'Caminhão de areia chegou às 10h, descarregado no fundo do lote.',
      fechado_por: P.ricardo, fechado_em: as(d(-3), 17, 50),
    }),
    rdo('rdo-serra-2', 'obra-serra', d(-2), 'Fechado', {
      clima_manha: 'Nublado', clima_tarde: 'Chuva forte', praticavel_tarde: false,
      observacoes: 'Chuva forte às 14h. Equipe recolhida e impermeabilização suspensa.',
      fechado_por: P.israel, fechado_em: as(d(-2), 16, 40),
    }),
  )
  const ontemSerra = rdos.find((r) => r.id === 'rdo-serra-ontem')
  Object.assign(ontemSerra, { clima_manha: 'Chuva leve', clima_tarde: 'Nublado', observacoes: 'Laje da cobertura ainda molhada; impermeabilização segue parada.' })

  const efetivoDoDia = (rdoId, obraId, data, ids, excecoes = {}) => ids.forEach((fid) =>
    rdo_efetivo.push({ id: `ef-${rdoId}-${fid}`, rdo_id: rdoId, obra_id: obraId, data, funcionario_id: fid, situacao: excecoes[fid] ?? 'Presente', obra_destino_id: null }))
  const daSerra = ['f-joao', 'f-marcos', 'f-tiago', 'f-paulo', 'f-rafael', 'f-luis', 'f-edson', 'f-bruno']
  efetivoDoDia('rdo-serra-4', 'obra-serra', d(-4), daSerra, { 'f-paulo': 'Falta' })
  efetivoDoDia('rdo-serra-3', 'obra-serra', d(-3), daSerra, { 'f-bruno': 'Atestado' })
  efetivoDoDia('rdo-serra-2', 'obra-serra', d(-2), daSerra, { 'f-tiago': 'Falta' })
  efetivoDoDia('rdo-serra-ontem', 'obra-serra', d(-1), daSerra)
  efetivoDoDia('rdo-ubs-ontem', 'obra-ubs', d(-1), ['f-severino', 'f-francisco', 'f-antonio', 'f-damiao', 'f-cicero'], { 'f-cicero': 'Falta' })

  const equipDoDia = (rdoId, extra = {}) => ['e-betoneira', 'e-andaime'].forEach((eid) =>
    rdo_equipamentos.push({ id: `re-${rdoId}-${eid}`, rdo_id: rdoId, obra_id: 'obra-serra', equipamento_id: eid, situacao: 'Operando', observacao: '', ...extra[eid] }))
  equipDoDia('rdo-serra-4')
  equipDoDia('rdo-serra-3', { 'e-betoneira': { situacao: 'Parado', observacao: 'Sem areia até as 10h' } })
  equipDoDia('rdo-serra-2', { 'e-andaime': { situacao: 'Parado', observacao: 'Chuva' } })
  equipDoDia('rdo-serra-ontem', { 'e-andaime': { situacao: 'Parado', observacao: 'Aguardando a fachada' } })

  // Foto de exemplo: um desenho, nunca foto real de obra.
  const fotoExemplo = (cor) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${cor}"/>` +
    '<path d="M0 300 130 150l90 80 70-60 110 100v30z" fill="rgba(0,0,0,.28)"/><circle cx="320" cy="70" r="28" fill="rgba(255,255,255,.35)"/>' +
    '<text x="20" y="44" font-family="sans-serif" font-size="22" font-weight="700" fill="#fff">FOTO DE EXEMPLO</text></svg>')
  const frenteDoDia = (rdoId, obraId, frenteId, situacao, descricao, equipe = [], legendas = [], motivo = null) => {
    const id = `rf-${rdoId}-${frenteId}`
    rdo_frentes.push({ id, rdo_id: rdoId, obra_id: obraId, frente_id: frenteId, situacao, motivo_parada: motivo, descricao })
    equipe.forEach((fid) => rdo_frente_equipe.push({ id: `rq-${id}-${fid}`, rdo_frente_id: id, obra_id: obraId, funcionario_id: fid }))
    legendas.forEach(([legenda, cor], i) => fotos.push({
      id: `ft-${id}-${i}`, obra_id: obraId, rdo_id: rdoId, rdo_frente_id: id, caminho: fotoExemplo(cor), legenda, visivel_cliente: true, enviada_por: P.israel,
    }))
  }
  frenteDoDia('rdo-serra-4', 'obra-serra', 'fs-revest', 'Em execução', 'Assentamento do piso do banheiro da suíte', ['f-joao', 'f-marcos', 'f-tiago'], [['Piso da suíte', '#3D6B78'], ['Recortes do ralo', '#56707A']])
  frenteDoDia('rdo-serra-4', 'obra-serra', 'fs-hidro', 'Em execução', 'Ramal de esgoto da cozinha', ['f-edson'], [['Ramal da cozinha', '#5B6E4A']])
  frenteDoDia('rdo-serra-4', 'obra-serra', 'fs-imper', 'Em execução', 'Primeira demão da manta líquida', ['f-rafael', 'f-luis'])
  frenteDoDia('rdo-serra-4', 'obra-serra', 'fs-reboco', 'Parada', 'Aguardando entrega de argamassa', [], [], 'Falta de material')
  frenteDoDia('rdo-serra-3', 'obra-serra', 'fs-revest', 'Em execução', 'Parede do box da suíte', ['f-joao', 'f-marcos', 'f-tiago'], [['Box da suíte', '#3D6B78']])
  frenteDoDia('rdo-serra-3', 'obra-serra', 'fs-imper', 'Em execução', 'Segunda demão e reforço nos ralos', ['f-rafael', 'f-luis'], [['Ralos da laje', '#6B5B4A'], ['Laje — vista geral', '#4A5A63']])
  frenteDoDia('rdo-serra-3', 'obra-serra', 'fs-reboco', 'Parada', 'Argamassa prometida para a semana que vem', [], [], 'Falta de material')
  frenteDoDia('rdo-serra-2', 'obra-serra', 'fs-revest', 'Em execução', 'Rejunte do banheiro da suíte', ['f-joao', 'f-marcos'], [['Rejunte', '#3D6B78']])
  frenteDoDia('rdo-serra-2', 'obra-serra', 'fs-imper', 'Parada', 'Chuva forte a partir das 14h', [], [['Laje molhada', '#4A5A63']], 'Chuva')
  frenteDoDia('rdo-serra-2', 'obra-serra', 'fs-reboco', 'Parada', '', [], [], 'Falta de material')
  frenteDoDia('rdo-serra-ontem', 'obra-serra', 'fs-revest', 'Em execução', 'Início do banheiro social', ['f-joao', 'f-marcos', 'f-tiago'], [['Banheiro social', '#3D6B78']])
  frenteDoDia('rdo-serra-ontem', 'obra-serra', 'fs-hidro', 'Em execução', 'Teste de estanqueidade da água fria', ['f-edson', 'f-paulo'])
  frenteDoDia('rdo-serra-ontem', 'obra-serra', 'fs-imper', 'Parada', 'Laje ainda molhada', [], [], 'Chuva')
  frenteDoDia('rdo-serra-ontem', 'obra-serra', 'fs-reboco', 'Parada', '', [], [], 'Falta de material')
  frenteDoDia('rdo-ubs-ontem', 'obra-ubs', 'fs-ubs-sapatas', 'Em execução', 'Armação das sapatas S7 a S10', ['f-damiao', 'f-francisco'], [['Sapatas S7 a S10', '#6B5B4A']])

  // ---- Materiais: catálogo (igual para todas as obras) e o quadro de pedidos ----
  // Serra: 10 pedidos em todas as colunas, 2 críticos, 1 atrasado, 2 entregues e 1 recebido com problema.
  // UBS: só 2, de outros materiais. Pedido da Serra na UBS é vazamento.
  const mat = (id, nome, unidade, categoria) => ({ id, nome, unidade, categoria, ativo: true })
  const materiais = [
    mat('mat-cimento', 'Cimento CP-II 50 kg', 'saco', 'Material grosso'),
    mat('mat-argamassa', 'Argamassa de reboco', 'saco', 'Material grosso'),
    mat('mat-areia', 'Areia média', 'm³', 'Material grosso'),
    mat('mat-brita', 'Brita 1', 'm³', 'Material grosso'),
    mat('mat-aco', 'Aço CA-50 10 mm', 'barra', 'Material grosso'),
    mat('mat-bloco', 'Bloco cerâmico 9×19×19', 'un', 'Material grosso'),
    mat('mat-porcelanato', 'Porcelanato 60×60', 'm²', 'Acabamento'),
    mat('mat-rejunte', 'Rejunte flexível', 'kg', 'Acabamento'),
    mat('mat-massa', 'Massa corrida', 'lata', 'Acabamento'),
    mat('mat-tinta', 'Tinta acrílica fosca 18 L', 'lata', 'Acabamento'),
    mat('mat-manta', 'Manta líquida', 'balde', 'Acabamento'),
    mat('mat-tubo', 'Tubo PVC esgoto 100 mm', 'barra', 'Instalações'),
    mat('mat-fio', 'Cabo flexível 2,5 mm²', 'rolo', 'Instalações'),
  ]
  const hist = (...passos) => passos.map(([status, dia]) => ({ status, data: d(dia) }))
  const ped = (id, obra_id, material_id, quantidade, frente, prioridade, status, historico, extra = {}) => ({
    id, obra_id, material_id, quantidade, frente, prioridade, status, fornecedor: null, previsao_entrega: null,
    qtd_bate_nf: null, qtd_recebida: null, estado_ok: null, avarias: null, foto_nf: null, historico, criado_por: P.israel, ...extra,
  })
  const recebido = (fornecedor, previsao, qtd_recebida, qtd_bate_nf = true, estado_ok = true, avarias = null) =>
    ({ fornecedor, previsao_entrega: d(previsao), qtd_recebida, qtd_bate_nf, estado_ok, avarias })
  const pedidos_material = [
    ped('ped-tubo', 'obra-serra', 'mat-tubo', 12, 'Tubulação água fria e esgoto', 'Normal', 'Solicitar', hist(['Solicitar', -1])),
    ped('ped-massa', 'obra-serra', 'mat-massa', 10, 'Pintura interna', 'Normal', 'Solicitar', hist(['Solicitar', -5])),
    ped('ped-manta', 'obra-serra', 'mat-manta', 4, 'Impermeabilização laje cobertura', 'Crítico', 'Em cotação',
      hist(['Solicitar', -3], ['Em cotação', -2])),
    ped('ped-fio', 'obra-serra', 'mat-fio', 5, 'Elétrica — circuitos da suíte', 'Normal', 'Em cotação',
      hist(['Solicitar', -9], ['Em cotação', -6])),
    // O atrasado: previsão vencida há 3 dias e ainda em Comprado. É por ele que o reboco está parado.
    ped('ped-argamassa', 'obra-serra', 'mat-argamassa', 120, 'Reboco fachada norte', 'Crítico', 'Comprado',
      hist(['Solicitar', -14], ['Em cotação', -12], ['Comprado', -10]), { fornecedor: 'Depósito Boa Vista', previsao_entrega: d(-3) }),
    ped('ped-areia', 'obra-serra', 'mat-areia', 6, 'Reboco fachada norte', 'Normal', 'Comprado',
      hist(['Solicitar', -6], ['Em cotação', -5], ['Comprado', -2]), { fornecedor: 'Areal Rio Novo', previsao_entrega: d(3) }),
    ped('ped-porcelanato', 'obra-serra', 'mat-porcelanato', 45, 'Revestimento banheiros', 'Normal', 'No almoxarifado',
      hist(['Solicitar', -20], ['Em cotação', -18], ['Comprado', -15], ['No almoxarifado', -9]), recebido('Revestir Acabamentos', -9, 45)),
    ped('ped-brita', 'obra-serra', 'mat-brita', 4, 'Fundação — sapatas', 'Normal', 'No almoxarifado',
      hist(['Solicitar', -8], ['Em cotação', -7], ['Comprado', -5], ['No almoxarifado', -2]),
      recebido('Areal Rio Novo', -2, 3.5, false, true, 'Vieram 3,5 m³; a nota diz 4 m³.')),
    ped('ped-rejunte', 'obra-serra', 'mat-rejunte', 20, 'Revestimento banheiros', 'Normal', 'Entregue',
      hist(['Solicitar', -16], ['Em cotação', -15], ['Comprado', -13], ['No almoxarifado', -11], ['Entregue', -4]), recebido('Revestir Acabamentos', -11, 20)),
    ped('ped-tinta', 'obra-serra', 'mat-tinta', 6, 'Pintura interna', 'Normal', 'Entregue',
      hist(['Solicitar', -12], ['Em cotação', -11], ['Comprado', -9], ['No almoxarifado', -6], ['Entregue', -3]), recebido('Tintas Boa Cor', -6, 6)),
    ped('ped-ubs-aco', 'obra-ubs', 'mat-aco', 80, 'Fundação — sapatas', 'Normal', 'Comprado',
      hist(['Solicitar', -7], ['Em cotação', -6], ['Comprado', -4]), { fornecedor: 'Ferro Forte Distribuidora', previsao_entrega: d(5) }),
    ped('ped-ubs-bloco', 'obra-ubs', 'mat-bloco', 2000, 'Alvenaria térreo — bloco A', 'Normal', 'Solicitar', hist(['Solicitar', -2])),
  ]

  // ---- Estoque: insumos de cada obra e as movimentações (o saldo é a soma delas) ----
  // Serra: as entradas e saídas dos pedidos recebidos e entregues, mais duas baixas manuais.
  //   Brita (1,5 de mínimo 2) e Rejunte (0 de mínimo 5) ficam CRÍTICOS; a Tinta não tem mínimo.
  // UBS: só o cimento, com saldo inicial lançado à mão, sem nenhum crítico.
  const ins = (id, obra_id, material_id, saldo_minimo) => ({ id, obra_id, material_id, saldo_minimo })
  const insumos = [
    ins('ins-porcelanato', 'obra-serra', 'mat-porcelanato', 10),
    ins('ins-brita', 'obra-serra', 'mat-brita', 2),
    ins('ins-rejunte', 'obra-serra', 'mat-rejunte', 5),
    ins('ins-tinta', 'obra-serra', 'mat-tinta', 0),
    ins('ins-ubs-cimento', 'obra-ubs', 'mat-cimento', 20),
  ]
  const mv = (id, obra_id, insumo_id, tipo, quantidade, dia, frente, origem, pedido_id = null) =>
    ({ id, obra_id, insumo_id, tipo, quantidade, data: d(dia), frente, origem, pedido_id })
  const movimentos_estoque = [
    mv('mv-porcelanato-e', 'obra-serra', 'ins-porcelanato', 'Entrada', 45, -9, 'Revestimento banheiros', 'Pedido', 'ped-porcelanato'),
    mv('mv-porcelanato-s', 'obra-serra', 'ins-porcelanato', 'Saída', 30, -4, 'Revestimento banheiros', 'Manual'),
    mv('mv-brita-e', 'obra-serra', 'ins-brita', 'Entrada', 3.5, -2, 'Fundação — sapatas', 'Pedido', 'ped-brita'),
    mv('mv-brita-s', 'obra-serra', 'ins-brita', 'Saída', 2, -1, 'Fundação — sapatas', 'Manual'),
    mv('mv-rejunte-e', 'obra-serra', 'ins-rejunte', 'Entrada', 20, -11, 'Revestimento banheiros', 'Pedido', 'ped-rejunte'),
    mv('mv-rejunte-s', 'obra-serra', 'ins-rejunte', 'Saída', 20, -4, 'Revestimento banheiros', 'Pedido', 'ped-rejunte'),
    mv('mv-tinta-e', 'obra-serra', 'ins-tinta', 'Entrada', 6, -6, 'Pintura interna', 'Pedido', 'ped-tinta'),
    mv('mv-tinta-s', 'obra-serra', 'ins-tinta', 'Saída', 6, -3, 'Pintura interna', 'Pedido', 'ped-tinta'),
    mv('mv-ubs-cimento-e', 'obra-ubs', 'ins-ubs-cimento', 'Entrada', 40, -20, 'Saldo inicial', 'Manual'),
    mv('mv-ubs-cimento-s', 'obra-ubs', 'ins-ubs-cimento', 'Saída', 15, -6, 'Fundação — sapatas', 'Manual'),
  ]

  return {
    profiles, obras, membros, funcionarios, equipamentos, frentes_servico,
    rdos, rdo_efetivo, rdo_equipamentos, rdo_frentes, rdo_frente_equipe, fotos,
    materiais, pedidos_material, insumos, movimentos_estoque,
  }
}
