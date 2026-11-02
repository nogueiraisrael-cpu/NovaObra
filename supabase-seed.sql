-- Carga inicial (seed) do Diário de Obra: os mesmos dados de src/lib/mockData.js.
-- Duas obras de propósito (Casa Alto da Serra 4 e UBS Nova Esperança): a UBS não tem equipamento.
-- Gerado em 2026-11-01. As datas são relativas ao dia em que este arquivo RODA (fuso de Natal),
-- e os ids são fixos (md5 do id do mock): rodar de novo não duplica nada (on conflict do nothing).
-- Pode rodar no SQL Editor do Supabase ou pelo agente (execute_sql).
do $$
declare
  h date := (now() at time zone 'America/Fortaleza')::date;
begin

  insert into public.obras (id, nome, codigo, tipo, endereco, cidade, cliente, numero_contrato, data_inicio, data_meta_entrega, situacao) values
    (md5('obra-serra')::uuid, 'Casa Alto da Serra 4', 'SERRA4', 'Alto padrão', 'Rua das Acácias, 410 — Alto da Serra', 'Natal', 'Dra. Helena Duarte', null, h + -150, h + 120, 'Em andamento'),
    (md5('obra-ubs')::uuid, 'UBS Nova Esperança', 'UBS-NE', 'Licitação', 'Av. Tenente Medeiros, s/n — Nova Esperança', 'Parnamirim', 'Prefeitura de Parnamirim', 'CT 042/2026', h + -75, h + 210, 'Em andamento')
  on conflict do nothing;

  insert into public.funcionarios (id, nome, funcao, obra_id, ativo) values
    (md5('f-joao')::uuid, 'João', 'Pedreiro', md5('obra-serra')::uuid, true),
    (md5('f-marcos')::uuid, 'Marcos', 'Pedreiro', md5('obra-serra')::uuid, true),
    (md5('f-tiago')::uuid, 'Tiago', 'Servente', md5('obra-serra')::uuid, true),
    (md5('f-paulo')::uuid, 'Paulo', 'Servente', md5('obra-serra')::uuid, true),
    (md5('f-rafael')::uuid, 'Rafael', 'Carpinteiro', md5('obra-serra')::uuid, true),
    (md5('f-luis')::uuid, 'Luís', 'Armador', md5('obra-serra')::uuid, true),
    (md5('f-edson')::uuid, 'Edson', 'Encanador', md5('obra-serra')::uuid, true),
    (md5('f-bruno')::uuid, 'Bruno', 'Eletricista', md5('obra-serra')::uuid, true),
    (md5('f-severino')::uuid, 'Severino', 'Mestre', md5('obra-ubs')::uuid, true),
    (md5('f-francisco')::uuid, 'Francisco', 'Pedreiro', md5('obra-ubs')::uuid, true),
    (md5('f-antonio')::uuid, 'Antônio', 'Servente', md5('obra-ubs')::uuid, true),
    (md5('f-damiao')::uuid, 'Damião', 'Armador', md5('obra-ubs')::uuid, true),
    (md5('f-cicero')::uuid, 'Cícero', 'Carpinteiro', md5('obra-ubs')::uuid, true),
    (md5('f-geraldo')::uuid, 'Geraldo', 'Pintor', null, true)
  on conflict do nothing;

  insert into public.equipamentos (id, nome, codigo, situacao, obra_id, situacao_desde, oficina, previsao_retorno, defeito) values
    (md5('e-betoneira')::uuid, 'Betoneira 400 L', 'BT-01', 'Na obra', md5('obra-serra')::uuid, h + -30, null, null, null),
    (md5('e-andaime')::uuid, 'Andaime tubular 12 m', 'AD-03', 'Na obra', md5('obra-serra')::uuid, h + -12, null, null, null),
    (md5('e-fachadeiro')::uuid, 'Andaime fachadeiro 30 m', 'AF-30', 'No depósito', null, h + -11, null, null, null),
    (md5('e-vibrador')::uuid, 'Vibrador de imersão', 'VB-02', 'No conserto', null, h + -19, 'Oficina Tec Máquinas', h + -6, 'Motor queimado')
  on conflict do nothing;

  insert into public.frentes_servico (id, obra_id, nome, etapa, executor, empreiteiro, situacao, parada_desde, motivo_parada, data_inicio, data_conclusao) values
    (md5('fs-sapatas')::uuid, md5('obra-serra')::uuid, 'Fundação — sapatas', 'Estrutura / Concretagem', 'Equipe própria', null, 'Concluída', null, null, h + -140, h + -26),
    (md5('fs-reboco')::uuid, md5('obra-serra')::uuid, 'Reboco fachada norte', 'Reboco de fachada', 'Terceirizado', 'Reboco Forte', 'Parada', h + -6, 'Falta de material', h + -20, null),
    (md5('fs-revest')::uuid, md5('obra-serra')::uuid, 'Revestimento banheiros', 'Revestimento cerâmico', 'Terceirizado', 'Cerâmica Silva', 'Em execução', null, null, h + -8, null),
    (md5('fs-hidro')::uuid, md5('obra-serra')::uuid, 'Tubulação água fria e esgoto', 'Instalações hidrossanitárias', 'Equipe própria', null, 'Em execução', null, null, h + -15, null),
    (md5('fs-imper')::uuid, md5('obra-serra')::uuid, 'Impermeabilização laje cobertura', 'Impermeabilização', 'Terceirizado', 'Imperme RN', 'Parada', h + -2, 'Chuva', h + -5, null),
    (md5('fs-pintura')::uuid, md5('obra-serra')::uuid, 'Pintura interna', 'Pintura', 'Equipe própria', null, 'Não iniciada', null, null, null, null),
    (md5('fs-ubs-sapatas')::uuid, md5('obra-ubs')::uuid, 'Fundação — sapatas', 'Fundação', 'Equipe própria', null, 'Em execução', null, null, h + -40, null),
    (md5('fs-ubs-alv')::uuid, md5('obra-ubs')::uuid, 'Alvenaria térreo — bloco A', 'Alvenaria', 'Equipe própria', null, 'Parada', h + -4, 'Falta de mão de obra', h + -18, null),
    (md5('fs-ubs-agua')::uuid, md5('obra-ubs')::uuid, 'Tubulação água fria', 'Instalações hidrossanitárias', 'Terceirizado', 'Hidro Natal', 'Parada', h + -9, 'Aguardando projeto', h + -12, null)
  on conflict do nothing;

  insert into public.rdos (id, obra_id, data, clima_manha, clima_tarde, praticavel_manha, praticavel_tarde, observacoes, status, criado_por, fechado_por, fechado_em) values
    (md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, h + -1, 'Chuva leve', 'Nublado', true, true, 'Laje da cobertura ainda molhada; impermeabilização segue parada.', 'Fechado', '00000000-0000-4000-8000-00000000a001'::uuid, '00000000-0000-4000-8000-00000000a002'::uuid, ((h + -1) + time '17:42') at time zone 'America/Fortaleza'),
    (md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, h + 0, 'Bom', 'Nublado', true, true, '', 'Em andamento', '00000000-0000-4000-8000-00000000a001'::uuid, null, null),
    (md5('rdo-ubs-ontem')::uuid, md5('obra-ubs')::uuid, h + -1, 'Bom', 'Bom', true, true, '', 'Em andamento', '00000000-0000-4000-8000-00000000a002'::uuid, null, null),
    (md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, h + -4, 'Bom', 'Bom', true, true, '', 'Fechado', '00000000-0000-4000-8000-00000000a001'::uuid, '00000000-0000-4000-8000-00000000a001'::uuid, ((h + -4) + time '17:15') at time zone 'America/Fortaleza'),
    (md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, h + -3, 'Bom', 'Nublado', true, true, 'Caminhão de areia chegou às 10h, descarregado no fundo do lote.', 'Fechado', '00000000-0000-4000-8000-00000000a001'::uuid, '00000000-0000-4000-8000-00000000a002'::uuid, ((h + -3) + time '17:50') at time zone 'America/Fortaleza'),
    (md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, h + -2, 'Nublado', 'Chuva forte', true, false, 'Chuva forte às 14h. Equipe recolhida e impermeabilização suspensa.', 'Fechado', '00000000-0000-4000-8000-00000000a001'::uuid, '00000000-0000-4000-8000-00000000a001'::uuid, ((h + -2) + time '16:40') at time zone 'America/Fortaleza')
  on conflict do nothing;

  insert into public.rdo_efetivo (id, rdo_id, obra_id, data, funcionario_id, situacao, obra_destino_id) values
    (md5('ef1')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, h + 0, md5('f-joao')::uuid, 'Presente', null),
    (md5('ef2')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, h + 0, md5('f-marcos')::uuid, 'Presente', null),
    (md5('ef3')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, h + 0, md5('f-tiago')::uuid, 'Presente', null),
    (md5('ef4')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, h + 0, md5('f-paulo')::uuid, 'Falta', null),
    (md5('ef5')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, h + 0, md5('f-rafael')::uuid, 'Presente', null),
    (md5('ef6')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, h + 0, md5('f-luis')::uuid, 'Presente', null),
    (md5('ef7')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, h + 0, md5('f-edson')::uuid, 'Deslocado', md5('obra-ubs')::uuid),
    (md5('ef8')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, h + 0, md5('f-bruno')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-4-f-joao')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, h + -4, md5('f-joao')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-4-f-marcos')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, h + -4, md5('f-marcos')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-4-f-tiago')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, h + -4, md5('f-tiago')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-4-f-paulo')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, h + -4, md5('f-paulo')::uuid, 'Falta', null),
    (md5('ef-rdo-serra-4-f-rafael')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, h + -4, md5('f-rafael')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-4-f-luis')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, h + -4, md5('f-luis')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-4-f-edson')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, h + -4, md5('f-edson')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-4-f-bruno')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, h + -4, md5('f-bruno')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-3-f-joao')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, h + -3, md5('f-joao')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-3-f-marcos')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, h + -3, md5('f-marcos')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-3-f-tiago')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, h + -3, md5('f-tiago')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-3-f-paulo')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, h + -3, md5('f-paulo')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-3-f-rafael')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, h + -3, md5('f-rafael')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-3-f-luis')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, h + -3, md5('f-luis')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-3-f-edson')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, h + -3, md5('f-edson')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-3-f-bruno')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, h + -3, md5('f-bruno')::uuid, 'Atestado', null),
    (md5('ef-rdo-serra-2-f-joao')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, h + -2, md5('f-joao')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-2-f-marcos')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, h + -2, md5('f-marcos')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-2-f-tiago')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, h + -2, md5('f-tiago')::uuid, 'Falta', null),
    (md5('ef-rdo-serra-2-f-paulo')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, h + -2, md5('f-paulo')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-2-f-rafael')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, h + -2, md5('f-rafael')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-2-f-luis')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, h + -2, md5('f-luis')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-2-f-edson')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, h + -2, md5('f-edson')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-2-f-bruno')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, h + -2, md5('f-bruno')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-ontem-f-joao')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, h + -1, md5('f-joao')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-ontem-f-marcos')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, h + -1, md5('f-marcos')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-ontem-f-tiago')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, h + -1, md5('f-tiago')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-ontem-f-paulo')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, h + -1, md5('f-paulo')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-ontem-f-rafael')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, h + -1, md5('f-rafael')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-ontem-f-luis')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, h + -1, md5('f-luis')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-ontem-f-edson')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, h + -1, md5('f-edson')::uuid, 'Presente', null),
    (md5('ef-rdo-serra-ontem-f-bruno')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, h + -1, md5('f-bruno')::uuid, 'Presente', null),
    (md5('ef-rdo-ubs-ontem-f-severino')::uuid, md5('rdo-ubs-ontem')::uuid, md5('obra-ubs')::uuid, h + -1, md5('f-severino')::uuid, 'Presente', null),
    (md5('ef-rdo-ubs-ontem-f-francisco')::uuid, md5('rdo-ubs-ontem')::uuid, md5('obra-ubs')::uuid, h + -1, md5('f-francisco')::uuid, 'Presente', null),
    (md5('ef-rdo-ubs-ontem-f-antonio')::uuid, md5('rdo-ubs-ontem')::uuid, md5('obra-ubs')::uuid, h + -1, md5('f-antonio')::uuid, 'Presente', null),
    (md5('ef-rdo-ubs-ontem-f-damiao')::uuid, md5('rdo-ubs-ontem')::uuid, md5('obra-ubs')::uuid, h + -1, md5('f-damiao')::uuid, 'Presente', null),
    (md5('ef-rdo-ubs-ontem-f-cicero')::uuid, md5('rdo-ubs-ontem')::uuid, md5('obra-ubs')::uuid, h + -1, md5('f-cicero')::uuid, 'Falta', null)
  on conflict do nothing;

  insert into public.rdo_equipamentos (id, rdo_id, obra_id, equipamento_id, situacao, observacao) values
    (md5('re1')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, md5('e-betoneira')::uuid, 'Operando', ''),
    (md5('re2')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, md5('e-andaime')::uuid, 'Parado', 'Aguardando a fachada'),
    (md5('re-rdo-serra-4-e-betoneira')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, md5('e-betoneira')::uuid, 'Operando', ''),
    (md5('re-rdo-serra-4-e-andaime')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, md5('e-andaime')::uuid, 'Operando', ''),
    (md5('re-rdo-serra-3-e-betoneira')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, md5('e-betoneira')::uuid, 'Parado', 'Sem areia até as 10h'),
    (md5('re-rdo-serra-3-e-andaime')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, md5('e-andaime')::uuid, 'Operando', ''),
    (md5('re-rdo-serra-2-e-betoneira')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, md5('e-betoneira')::uuid, 'Operando', ''),
    (md5('re-rdo-serra-2-e-andaime')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, md5('e-andaime')::uuid, 'Parado', 'Chuva'),
    (md5('re-rdo-serra-ontem-e-betoneira')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, md5('e-betoneira')::uuid, 'Operando', ''),
    (md5('re-rdo-serra-ontem-e-andaime')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, md5('e-andaime')::uuid, 'Parado', 'Aguardando a fachada')
  on conflict do nothing;

  insert into public.rdo_frentes (id, rdo_id, obra_id, frente_id, situacao, motivo_parada, descricao) values
    (md5('rf1')::uuid, md5('rdo-serra-hoje')::uuid, md5('obra-serra')::uuid, md5('fs-revest')::uuid, 'Em execução', null, 'Assentamento do porcelanato do banheiro social'),
    (md5('rf-rdo-serra-4-fs-revest')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, md5('fs-revest')::uuid, 'Em execução', null, 'Assentamento do piso do banheiro da suíte'),
    (md5('rf-rdo-serra-4-fs-hidro')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, md5('fs-hidro')::uuid, 'Em execução', null, 'Ramal de esgoto da cozinha'),
    (md5('rf-rdo-serra-4-fs-imper')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, md5('fs-imper')::uuid, 'Em execução', null, 'Primeira demão da manta líquida'),
    (md5('rf-rdo-serra-4-fs-reboco')::uuid, md5('rdo-serra-4')::uuid, md5('obra-serra')::uuid, md5('fs-reboco')::uuid, 'Parada', 'Falta de material', 'Aguardando entrega de argamassa'),
    (md5('rf-rdo-serra-3-fs-revest')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, md5('fs-revest')::uuid, 'Em execução', null, 'Parede do box da suíte'),
    (md5('rf-rdo-serra-3-fs-imper')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, md5('fs-imper')::uuid, 'Em execução', null, 'Segunda demão e reforço nos ralos'),
    (md5('rf-rdo-serra-3-fs-reboco')::uuid, md5('rdo-serra-3')::uuid, md5('obra-serra')::uuid, md5('fs-reboco')::uuid, 'Parada', 'Falta de material', 'Argamassa prometida para a semana que vem'),
    (md5('rf-rdo-serra-2-fs-revest')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, md5('fs-revest')::uuid, 'Em execução', null, 'Rejunte do banheiro da suíte'),
    (md5('rf-rdo-serra-2-fs-imper')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, md5('fs-imper')::uuid, 'Parada', 'Chuva', 'Chuva forte a partir das 14h'),
    (md5('rf-rdo-serra-2-fs-reboco')::uuid, md5('rdo-serra-2')::uuid, md5('obra-serra')::uuid, md5('fs-reboco')::uuid, 'Parada', 'Falta de material', ''),
    (md5('rf-rdo-serra-ontem-fs-revest')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, md5('fs-revest')::uuid, 'Em execução', null, 'Início do banheiro social'),
    (md5('rf-rdo-serra-ontem-fs-hidro')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, md5('fs-hidro')::uuid, 'Em execução', null, 'Teste de estanqueidade da água fria'),
    (md5('rf-rdo-serra-ontem-fs-imper')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, md5('fs-imper')::uuid, 'Parada', 'Chuva', 'Laje ainda molhada'),
    (md5('rf-rdo-serra-ontem-fs-reboco')::uuid, md5('rdo-serra-ontem')::uuid, md5('obra-serra')::uuid, md5('fs-reboco')::uuid, 'Parada', 'Falta de material', ''),
    (md5('rf-rdo-ubs-ontem-fs-ubs-sapatas')::uuid, md5('rdo-ubs-ontem')::uuid, md5('obra-ubs')::uuid, md5('fs-ubs-sapatas')::uuid, 'Em execução', null, 'Armação das sapatas S7 a S10')
  on conflict do nothing;

  insert into public.rdo_frente_equipe (id, rdo_frente_id, obra_id, funcionario_id) values
    (md5('rq1')::uuid, md5('rf1')::uuid, md5('obra-serra')::uuid, md5('f-joao')::uuid),
    (md5('rq2')::uuid, md5('rf1')::uuid, md5('obra-serra')::uuid, md5('f-marcos')::uuid),
    (md5('rq3')::uuid, md5('rf1')::uuid, md5('obra-serra')::uuid, md5('f-tiago')::uuid),
    (md5('rq-rf-rdo-serra-4-fs-revest-f-joao')::uuid, md5('rf-rdo-serra-4-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-joao')::uuid),
    (md5('rq-rf-rdo-serra-4-fs-revest-f-marcos')::uuid, md5('rf-rdo-serra-4-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-marcos')::uuid),
    (md5('rq-rf-rdo-serra-4-fs-revest-f-tiago')::uuid, md5('rf-rdo-serra-4-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-tiago')::uuid),
    (md5('rq-rf-rdo-serra-4-fs-hidro-f-edson')::uuid, md5('rf-rdo-serra-4-fs-hidro')::uuid, md5('obra-serra')::uuid, md5('f-edson')::uuid),
    (md5('rq-rf-rdo-serra-4-fs-imper-f-rafael')::uuid, md5('rf-rdo-serra-4-fs-imper')::uuid, md5('obra-serra')::uuid, md5('f-rafael')::uuid),
    (md5('rq-rf-rdo-serra-4-fs-imper-f-luis')::uuid, md5('rf-rdo-serra-4-fs-imper')::uuid, md5('obra-serra')::uuid, md5('f-luis')::uuid),
    (md5('rq-rf-rdo-serra-3-fs-revest-f-joao')::uuid, md5('rf-rdo-serra-3-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-joao')::uuid),
    (md5('rq-rf-rdo-serra-3-fs-revest-f-marcos')::uuid, md5('rf-rdo-serra-3-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-marcos')::uuid),
    (md5('rq-rf-rdo-serra-3-fs-revest-f-tiago')::uuid, md5('rf-rdo-serra-3-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-tiago')::uuid),
    (md5('rq-rf-rdo-serra-3-fs-imper-f-rafael')::uuid, md5('rf-rdo-serra-3-fs-imper')::uuid, md5('obra-serra')::uuid, md5('f-rafael')::uuid),
    (md5('rq-rf-rdo-serra-3-fs-imper-f-luis')::uuid, md5('rf-rdo-serra-3-fs-imper')::uuid, md5('obra-serra')::uuid, md5('f-luis')::uuid),
    (md5('rq-rf-rdo-serra-2-fs-revest-f-joao')::uuid, md5('rf-rdo-serra-2-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-joao')::uuid),
    (md5('rq-rf-rdo-serra-2-fs-revest-f-marcos')::uuid, md5('rf-rdo-serra-2-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-marcos')::uuid),
    (md5('rq-rf-rdo-serra-ontem-fs-revest-f-joao')::uuid, md5('rf-rdo-serra-ontem-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-joao')::uuid),
    (md5('rq-rf-rdo-serra-ontem-fs-revest-f-marcos')::uuid, md5('rf-rdo-serra-ontem-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-marcos')::uuid),
    (md5('rq-rf-rdo-serra-ontem-fs-revest-f-tiago')::uuid, md5('rf-rdo-serra-ontem-fs-revest')::uuid, md5('obra-serra')::uuid, md5('f-tiago')::uuid),
    (md5('rq-rf-rdo-serra-ontem-fs-hidro-f-edson')::uuid, md5('rf-rdo-serra-ontem-fs-hidro')::uuid, md5('obra-serra')::uuid, md5('f-edson')::uuid),
    (md5('rq-rf-rdo-serra-ontem-fs-hidro-f-paulo')::uuid, md5('rf-rdo-serra-ontem-fs-hidro')::uuid, md5('obra-serra')::uuid, md5('f-paulo')::uuid),
    (md5('rq-rf-rdo-ubs-ontem-fs-ubs-sapatas-f-damiao')::uuid, md5('rf-rdo-ubs-ontem-fs-ubs-sapatas')::uuid, md5('obra-ubs')::uuid, md5('f-damiao')::uuid),
    (md5('rq-rf-rdo-ubs-ontem-fs-ubs-sapatas-f-francisco')::uuid, md5('rf-rdo-ubs-ontem-fs-ubs-sapatas')::uuid, md5('obra-ubs')::uuid, md5('f-francisco')::uuid)
  on conflict do nothing;

  insert into public.fotos (id, obra_id, rdo_id, rdo_frente_id, caminho, legenda, visivel_cliente, enviada_por) values
    (md5('ft-rf-rdo-serra-4-fs-revest-0')::uuid, md5('obra-serra')::uuid, md5('rdo-serra-4')::uuid, md5('rf-rdo-serra-4-fs-revest')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%233D6B78%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Piso da suíte', true, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ft-rf-rdo-serra-4-fs-revest-1')::uuid, md5('obra-serra')::uuid, md5('rdo-serra-4')::uuid, md5('rf-rdo-serra-4-fs-revest')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%2356707A%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Recortes do ralo', true, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ft-rf-rdo-serra-4-fs-hidro-0')::uuid, md5('obra-serra')::uuid, md5('rdo-serra-4')::uuid, md5('rf-rdo-serra-4-fs-hidro')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%235B6E4A%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Ramal da cozinha', true, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ft-rf-rdo-serra-3-fs-revest-0')::uuid, md5('obra-serra')::uuid, md5('rdo-serra-3')::uuid, md5('rf-rdo-serra-3-fs-revest')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%233D6B78%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Box da suíte', true, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ft-rf-rdo-serra-3-fs-imper-0')::uuid, md5('obra-serra')::uuid, md5('rdo-serra-3')::uuid, md5('rf-rdo-serra-3-fs-imper')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%236B5B4A%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Ralos da laje', true, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ft-rf-rdo-serra-3-fs-imper-1')::uuid, md5('obra-serra')::uuid, md5('rdo-serra-3')::uuid, md5('rf-rdo-serra-3-fs-imper')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%234A5A63%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Laje — vista geral', true, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ft-rf-rdo-serra-2-fs-revest-0')::uuid, md5('obra-serra')::uuid, md5('rdo-serra-2')::uuid, md5('rf-rdo-serra-2-fs-revest')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%233D6B78%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Rejunte', true, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ft-rf-rdo-serra-2-fs-imper-0')::uuid, md5('obra-serra')::uuid, md5('rdo-serra-2')::uuid, md5('rf-rdo-serra-2-fs-imper')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%234A5A63%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Laje molhada', true, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ft-rf-rdo-serra-ontem-fs-revest-0')::uuid, md5('obra-serra')::uuid, md5('rdo-serra-ontem')::uuid, md5('rf-rdo-serra-ontem-fs-revest')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%233D6B78%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Banheiro social', true, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ft-rf-rdo-ubs-ontem-fs-ubs-sapatas-0')::uuid, md5('obra-ubs')::uuid, md5('rdo-ubs-ontem')::uuid, md5('rf-rdo-ubs-ontem-fs-ubs-sapatas')::uuid, 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%236B5B4A%22%2F%3E%3Cpath%20d%3D%22M0%20300%20130%20150l90%2080%2070-60%20110%20100v30z%22%20fill%3D%22rgba(0%2C0%2C0%2C.28)%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%2270%22%20r%3D%2228%22%20fill%3D%22rgba(255%2C255%2C255%2C.35)%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%3EFOTO%20DE%20EXEMPLO%3C%2Ftext%3E%3C%2Fsvg%3E', 'Sapatas S7 a S10', true, '00000000-0000-4000-8000-00000000a001'::uuid)
  on conflict do nothing;
end $$;
