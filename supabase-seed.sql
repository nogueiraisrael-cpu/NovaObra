-- Carga inicial (seed) do Diário de Obra: os mesmos dados de src/lib/mockData.js.
-- Duas obras de propósito (Casa Alto da Serra 4 e UBS Nova Esperança): a UBS não tem equipamento.
-- Gerado em 2026-11-01. As datas são relativas ao dia em que este arquivo RODA (fuso de Natal),
-- e os ids são fixos (md5 do id do mock): rodar de novo não duplica nada (on conflict do nothing).
-- Pode rodar no SQL Editor do Supabase ou pelo agente (execute_sql).
do $$
declare
  h date := (now() at time zone 'America/Fortaleza')::date;
begin

  insert into public.obras (id, nome, codigo, tipo, endereco, cidade, cliente, numero_contrato, data_inicio, data_meta_entrega, situacao, dias_trabalho, feriados) values
    (md5('obra-serra')::uuid, 'Casa Alto da Serra 4', 'SERRA4', 'Alto padrão', 'Rua das Acácias, 410 — Alto da Serra', 'Natal', 'Dra. Helena Duarte', null, h + -150, h + 120, 'Em andamento', '{1,2,3,4,5}'::smallint[], '{2026-11-20,2026-12-25}'::date[]),
    (md5('obra-ubs')::uuid, 'UBS Nova Esperança', 'UBS-NE', 'Licitação', 'Av. Tenente Medeiros, s/n — Nova Esperança', 'Parnamirim', 'Prefeitura de Parnamirim', 'CT 042/2026', h + -75, h + 210, 'Em andamento', '{1,2,3,4,5,6}'::smallint[], '{}'::date[])
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

  -- Materiais: catálogo e quadro de pedidos (migration 20261101-05).
  insert into public.materiais (id, nome, unidade, categoria, ativo) values
    (md5('mat-cimento')::uuid, 'Cimento CP-II 50 kg', 'saco', 'Material grosso', true),
    (md5('mat-argamassa')::uuid, 'Argamassa de reboco', 'saco', 'Material grosso', true),
    (md5('mat-areia')::uuid, 'Areia média', 'm³', 'Material grosso', true),
    (md5('mat-brita')::uuid, 'Brita 1', 'm³', 'Material grosso', true),
    (md5('mat-aco')::uuid, 'Aço CA-50 10 mm', 'barra', 'Material grosso', true),
    (md5('mat-bloco')::uuid, 'Bloco cerâmico 9×19×19', 'un', 'Material grosso', true),
    (md5('mat-porcelanato')::uuid, 'Porcelanato 60×60', 'm²', 'Acabamento', true),
    (md5('mat-rejunte')::uuid, 'Rejunte flexível', 'kg', 'Acabamento', true),
    (md5('mat-massa')::uuid, 'Massa corrida', 'lata', 'Acabamento', true),
    (md5('mat-tinta')::uuid, 'Tinta acrílica fosca 18 L', 'lata', 'Acabamento', true),
    (md5('mat-manta')::uuid, 'Manta líquida', 'balde', 'Acabamento', true),
    (md5('mat-tubo')::uuid, 'Tubo PVC esgoto 100 mm', 'barra', 'Instalações', true),
    (md5('mat-fio')::uuid, 'Cabo flexível 2,5 mm²', 'rolo', 'Instalações', true)
  on conflict do nothing;

  insert into public.pedidos_material (id, obra_id, material_id, quantidade, frente, prioridade, status, fornecedor, previsao_entrega, qtd_bate_nf, qtd_recebida, estado_ok, avarias, historico, criado_por) values
    (md5('ped-tubo')::uuid, md5('obra-serra')::uuid, md5('mat-tubo')::uuid, 12, 'Tubulação água fria e esgoto', 'Normal', 'Solicitar', null, null, null, null, null, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -1)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-massa')::uuid, md5('obra-serra')::uuid, md5('mat-massa')::uuid, 10, 'Pintura interna', 'Normal', 'Solicitar', null, null, null, null, null, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -5)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-manta')::uuid, md5('obra-serra')::uuid, md5('mat-manta')::uuid, 4, 'Impermeabilização laje cobertura', 'Crítico', 'Em cotação', null, null, null, null, null, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -3), jsonb_build_object('status', 'Em cotação', 'data', h + -2)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-fio')::uuid, md5('obra-serra')::uuid, md5('mat-fio')::uuid, 5, 'Elétrica — circuitos da suíte', 'Normal', 'Em cotação', null, null, null, null, null, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -9), jsonb_build_object('status', 'Em cotação', 'data', h + -6)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-argamassa')::uuid, md5('obra-serra')::uuid, md5('mat-argamassa')::uuid, 120, 'Reboco fachada norte', 'Crítico', 'Comprado', 'Depósito Boa Vista', h + -3, null, null, null, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -14), jsonb_build_object('status', 'Em cotação', 'data', h + -12), jsonb_build_object('status', 'Comprado', 'data', h + -10)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-areia')::uuid, md5('obra-serra')::uuid, md5('mat-areia')::uuid, 6, 'Reboco fachada norte', 'Normal', 'Comprado', 'Areal Rio Novo', h + 3, null, null, null, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -6), jsonb_build_object('status', 'Em cotação', 'data', h + -5), jsonb_build_object('status', 'Comprado', 'data', h + -2)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-porcelanato')::uuid, md5('obra-serra')::uuid, md5('mat-porcelanato')::uuid, 45, 'Revestimento banheiros', 'Normal', 'No almoxarifado', 'Revestir Acabamentos', h + -9, true, 45, true, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -20), jsonb_build_object('status', 'Em cotação', 'data', h + -18), jsonb_build_object('status', 'Comprado', 'data', h + -15), jsonb_build_object('status', 'No almoxarifado', 'data', h + -9)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-brita')::uuid, md5('obra-serra')::uuid, md5('mat-brita')::uuid, 4, 'Fundação — sapatas', 'Normal', 'No almoxarifado', 'Areal Rio Novo', h + -2, false, 3.5, true, 'Vieram 3,5 m³; a nota diz 4 m³.', jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -8), jsonb_build_object('status', 'Em cotação', 'data', h + -7), jsonb_build_object('status', 'Comprado', 'data', h + -5), jsonb_build_object('status', 'No almoxarifado', 'data', h + -2)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-rejunte')::uuid, md5('obra-serra')::uuid, md5('mat-rejunte')::uuid, 20, 'Revestimento banheiros', 'Normal', 'Entregue', 'Revestir Acabamentos', h + -11, true, 20, true, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -16), jsonb_build_object('status', 'Em cotação', 'data', h + -15), jsonb_build_object('status', 'Comprado', 'data', h + -13), jsonb_build_object('status', 'No almoxarifado', 'data', h + -11), jsonb_build_object('status', 'Entregue', 'data', h + -4)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-tinta')::uuid, md5('obra-serra')::uuid, md5('mat-tinta')::uuid, 6, 'Pintura interna', 'Normal', 'Entregue', 'Tintas Boa Cor', h + -6, true, 6, true, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -12), jsonb_build_object('status', 'Em cotação', 'data', h + -11), jsonb_build_object('status', 'Comprado', 'data', h + -9), jsonb_build_object('status', 'No almoxarifado', 'data', h + -6), jsonb_build_object('status', 'Entregue', 'data', h + -3)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-ubs-aco')::uuid, md5('obra-ubs')::uuid, md5('mat-aco')::uuid, 80, 'Fundação — sapatas', 'Normal', 'Comprado', 'Ferro Forte Distribuidora', h + 5, null, null, null, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -7), jsonb_build_object('status', 'Em cotação', 'data', h + -6), jsonb_build_object('status', 'Comprado', 'data', h + -4)), '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('ped-ubs-bloco')::uuid, md5('obra-ubs')::uuid, md5('mat-bloco')::uuid, 2000, 'Alvenaria térreo — bloco A', 'Normal', 'Solicitar', null, null, null, null, null, null, jsonb_build_array(jsonb_build_object('status', 'Solicitar', 'data', h + -2)), '00000000-0000-4000-8000-00000000a001'::uuid)
  on conflict do nothing;

  -- Estoque (migration 20261101-06).
  insert into public.insumos (id, obra_id, material_id, saldo_minimo) values
    (md5('ins-porcelanato')::uuid, md5('obra-serra')::uuid, md5('mat-porcelanato')::uuid, 10),
    (md5('ins-brita')::uuid, md5('obra-serra')::uuid, md5('mat-brita')::uuid, 2),
    (md5('ins-rejunte')::uuid, md5('obra-serra')::uuid, md5('mat-rejunte')::uuid, 5),
    (md5('ins-tinta')::uuid, md5('obra-serra')::uuid, md5('mat-tinta')::uuid, 0),
    (md5('ins-ubs-cimento')::uuid, md5('obra-ubs')::uuid, md5('mat-cimento')::uuid, 20)
  on conflict do nothing;

  insert into public.movimentos_estoque (id, obra_id, insumo_id, tipo, quantidade, data, frente, origem, pedido_id) values
    (md5('mv-porcelanato-e')::uuid, md5('obra-serra')::uuid, md5('ins-porcelanato')::uuid, 'Entrada', 45, h + -9, 'Revestimento banheiros', 'Pedido', md5('ped-porcelanato')::uuid),
    (md5('mv-porcelanato-s')::uuid, md5('obra-serra')::uuid, md5('ins-porcelanato')::uuid, 'Saída', 30, h + -4, 'Revestimento banheiros', 'Manual', null),
    (md5('mv-brita-e')::uuid, md5('obra-serra')::uuid, md5('ins-brita')::uuid, 'Entrada', 3.5, h + -2, 'Fundação — sapatas', 'Pedido', md5('ped-brita')::uuid),
    (md5('mv-brita-s')::uuid, md5('obra-serra')::uuid, md5('ins-brita')::uuid, 'Saída', 2, h + -1, 'Fundação — sapatas', 'Manual', null),
    (md5('mv-rejunte-e')::uuid, md5('obra-serra')::uuid, md5('ins-rejunte')::uuid, 'Entrada', 20, h + -11, 'Revestimento banheiros', 'Pedido', md5('ped-rejunte')::uuid),
    (md5('mv-rejunte-s')::uuid, md5('obra-serra')::uuid, md5('ins-rejunte')::uuid, 'Saída', 20, h + -4, 'Revestimento banheiros', 'Pedido', md5('ped-rejunte')::uuid),
    (md5('mv-tinta-e')::uuid, md5('obra-serra')::uuid, md5('ins-tinta')::uuid, 'Entrada', 6, h + -6, 'Pintura interna', 'Pedido', md5('ped-tinta')::uuid),
    (md5('mv-tinta-s')::uuid, md5('obra-serra')::uuid, md5('ins-tinta')::uuid, 'Saída', 6, h + -3, 'Pintura interna', 'Pedido', md5('ped-tinta')::uuid),
    (md5('mv-ubs-cimento-e')::uuid, md5('obra-ubs')::uuid, md5('ins-ubs-cimento')::uuid, 'Entrada', 40, h + -20, 'Saldo inicial', 'Manual', null),
    (md5('mv-ubs-cimento-s')::uuid, md5('obra-ubs')::uuid, md5('ins-ubs-cimento')::uuid, 'Saída', 15, h + -6, 'Fundação — sapatas', 'Manual', null)
  on conflict do nothing;

  -- Planejamento: EAP (migration 20261102-09). A mãe vem antes das filhas.
  insert into public.atividades (id, obra_id, pai_id, ordem, titulo, data_inicio, data_fim, progresso, arquivada) values
    (md5('at-dem')::uuid, md5('obra-serra')::uuid, null, 0, 'Demolição', h + -40, h + -30, 0, false),
    (md5('at-dem-rev')::uuid, md5('obra-serra')::uuid, md5('at-dem')::uuid, 0, 'Retirada de revestimentos antigos', h + -40, h + -33, 100, false),
    (md5('at-dem-ent')::uuid, md5('obra-serra')::uuid, md5('at-dem')::uuid, 1, 'Remoção de entulho', h + -34, h + -30, 100, false),
    (md5('at-dem-chur')::uuid, md5('obra-serra')::uuid, md5('at-dem')::uuid, 2, 'Demolição da churrasqueira', h + -36, h + -35, 0, true),
    (md5('at-hid')::uuid, md5('obra-serra')::uuid, null, 1, 'Hidráulica', h + -28, h + -6, 0, false),
    (md5('at-hid-af')::uuid, md5('obra-serra')::uuid, md5('at-hid')::uuid, 0, 'Tubulação de água fria', h + -28, h + -14, 100, false),
    (md5('at-hid-esg')::uuid, md5('obra-serra')::uuid, md5('at-hid')::uuid, 1, 'Esgoto dos banheiros', h + -20, h + -6, 100, false),
    (md5('at-ele')::uuid, md5('obra-serra')::uuid, null, 2, 'Elétrica', h + -21, h + 10, 0, false),
    (md5('at-ele-dut')::uuid, md5('obra-serra')::uuid, md5('at-ele')::uuid, 0, 'Eletrodutos e caixas', h + -21, h + -7, 100, false),
    (md5('at-ele-fio')::uuid, md5('obra-serra')::uuid, md5('at-ele')::uuid, 1, 'Fiação e quadro', h + -3, h + 10, 20, false),
    (md5('at-reb')::uuid, md5('obra-serra')::uuid, null, 3, 'Reboco', h + -10, h + 15, 0, false),
    (md5('at-reb-int')::uuid, md5('obra-serra')::uuid, md5('at-reb')::uuid, 0, 'Reboco interno', h + -10, h + 8, 40, false),
    (md5('at-reb-fach')::uuid, md5('obra-serra')::uuid, md5('at-reb')::uuid, 1, 'Reboco fachada norte', h + -5, h + 15, 30, false),
    (md5('at-aca')::uuid, md5('obra-serra')::uuid, null, 4, 'Acabamento', h + 5, h + 40, 0, false),
    (md5('at-aca-rev')::uuid, md5('obra-serra')::uuid, md5('at-aca')::uuid, 0, 'Revestimento cerâmico', h + 5, h + 25, 0, false),
    (md5('at-aca-rev-ban')::uuid, md5('obra-serra')::uuid, md5('at-aca-rev')::uuid, 0, 'Banheiros', h + 5, h + 16, 0, false),
    (md5('at-aca-rev-coz')::uuid, md5('obra-serra')::uuid, md5('at-aca-rev')::uuid, 1, 'Cozinha', h + 14, h + 25, 0, false),
    (md5('at-aca-pin')::uuid, md5('obra-serra')::uuid, md5('at-aca')::uuid, 1, 'Pintura interna', h + 20, h + 40, 0, false),
    (md5('at-ubs-fun')::uuid, md5('obra-ubs')::uuid, null, 0, 'Fundação', h + -10, h + 15, 0, false),
    (md5('at-ubs-sap')::uuid, md5('obra-ubs')::uuid, md5('at-ubs-fun')::uuid, 0, 'Sapatas', h + -10, h + 5, 50, false),
    (md5('at-ubs-vb')::uuid, md5('obra-ubs')::uuid, md5('at-ubs-fun')::uuid, 1, 'Vigas baldrame', h + 3, h + 15, 0, false)
  on conflict do nothing;

  -- Planejamento: restrições do Médio prazo (migration 20261102-11).
  insert into public.restricoes (id, obra_id, atividade_id, descricao, tipo, prazo, responsavel, resolvida, resolvida_em) values
    (md5('rs-andaime')::uuid, md5('obra-serra')::uuid, md5('at-reb-fach')::uuid, 'Trazer o andaime fachadeiro do depósito', 'Equipamento', h + -2, 'Eng. Ricardo', false, null),
    (md5('rs-linha-vida')::uuid, md5('obra-serra')::uuid, md5('at-reb-fach')::uuid, 'Instalar linha de vida na fachada', 'Segurança', h + 1, 'Téc. segurança Ana', false, null),
    (md5('rs-porcelanato')::uuid, md5('obra-serra')::uuid, md5('at-aca-rev-ban')::uuid, 'Porcelanato dos banheiros ainda não chegou', 'Material', h + 3, 'Eng. Israel', false, null),
    (md5('rs-caminhao')::uuid, md5('obra-serra')::uuid, md5('at-aca-rev-ban')::uuid, 'Combinar a descarga do caminhão pela rua lateral', 'Logística', h + 4, 'Eng. Israel', false, null),
    (md5('rs-paginacao')::uuid, md5('obra-serra')::uuid, md5('at-aca-rev-coz')::uuid, 'Cliente aprovar a paginação da cozinha', 'Projeto', h + 9, 'Dra. Helena', false, null),
    (md5('rs-pintor')::uuid, md5('obra-serra')::uuid, md5('at-aca-pin')::uuid, 'Contratar mais um pintor', 'Mão de obra', h + 15, 'Eng. Ricardo', false, null),
    (md5('rs-disjuntores')::uuid, md5('obra-serra')::uuid, md5('at-ele-fio')::uuid, 'Disjuntores do quadro em falta no fornecedor', 'Material', h + 22, 'Eng. Israel', false, null),
    (md5('rs-traco')::uuid, md5('obra-serra')::uuid, md5('at-reb-int')::uuid, 'Definir o traço do reboco com a argamassa nova', 'Método', h + -8, 'Eng. Israel', true, h + -9),
    (md5('rs-ubs-sondagem')::uuid, md5('obra-ubs')::uuid, md5('at-ubs-vb')::uuid, 'Laudo de sondagem atrasado', 'Projeto', h + 2, 'Prefeitura', false, null)
  on conflict do nothing;

  -- Planejamento: Curto prazo (migration 20261102-12). A semana é a segunda-feira da data.
  insert into public.semana_atividades (id, obra_id, atividade_id, semana, status, nao_realizada, causa) values
    (md5('sa-dem-rev')::uuid, md5('obra-serra')::uuid, md5('at-dem-rev')::uuid, date_trunc('week', h + -33)::date, 'Concluído', false, null),
    (md5('sa-dem-ent')::uuid, md5('obra-serra')::uuid, md5('at-dem-ent')::uuid, date_trunc('week', h + -30)::date, 'Concluído', false, null),
    (md5('sa-hid-af')::uuid, md5('obra-serra')::uuid, md5('at-hid-af')::uuid, date_trunc('week', h + -14)::date, 'Concluído', false, null),
    (md5('sa-ele-dut')::uuid, md5('obra-serra')::uuid, md5('at-ele-dut')::uuid, date_trunc('week', h + 0)::date, 'Concluído', false, null),
    (md5('sa-hid-esg')::uuid, md5('obra-serra')::uuid, md5('at-hid-esg')::uuid, date_trunc('week', h + -7)::date, 'Em andamento', true, 'Material'),
    (md5('sa-hid-esg-fim')::uuid, md5('obra-serra')::uuid, md5('at-hid-esg')::uuid, date_trunc('week', h + 0)::date, 'Concluído', false, null),
    (md5('sa-reb-int')::uuid, md5('obra-serra')::uuid, md5('at-reb-int')::uuid, date_trunc('week', h + 0)::date, 'Em andamento', false, null),
    (md5('sa-reb-fach')::uuid, md5('obra-serra')::uuid, md5('at-reb-fach')::uuid, date_trunc('week', h + 0)::date, 'Em andamento', false, null),
    (md5('sa-ubs-sap')::uuid, md5('obra-ubs')::uuid, md5('at-ubs-sap')::uuid, date_trunc('week', h + 0)::date, 'Em andamento', false, null)
  on conflict do nothing;

  insert into public.subtarefas (id, obra_id, atividade_id, titulo, ordem, feita, nao_realizada, causa) values
    (md5('st-reb-int-1')::uuid, md5('obra-serra')::uuid, md5('at-reb-int')::uuid, 'Taliscas e mestras', 0, true, false, null),
    (md5('st-reb-int-2')::uuid, md5('obra-serra')::uuid, md5('at-reb-int')::uuid, 'Chapisco das paredes', 1, true, false, null),
    (md5('st-reb-int-3')::uuid, md5('obra-serra')::uuid, md5('at-reb-int')::uuid, 'Reboco da sala', 2, false, false, null),
    (md5('st-reb-int-4')::uuid, md5('obra-serra')::uuid, md5('at-reb-int')::uuid, 'Reboco dos quartos', 3, false, false, null),
    (md5('st-reb-fach-1')::uuid, md5('obra-serra')::uuid, md5('at-reb-fach')::uuid, 'Montar o andaime fachadeiro', 0, false, true, 'Equipamento'),
    (md5('st-reb-fach-2')::uuid, md5('obra-serra')::uuid, md5('at-reb-fach')::uuid, 'Chapisco da fachada', 1, false, false, null),
    (md5('st-ubs-sap-1')::uuid, md5('obra-ubs')::uuid, md5('at-ubs-sap')::uuid, 'Escavação', 0, true, false, null),
    (md5('st-ubs-sap-2')::uuid, md5('obra-ubs')::uuid, md5('at-ubs-sap')::uuid, 'Armadura das sapatas', 1, false, false, null)
  on conflict do nothing;

  -- Medições (migration 20261102-13): UBS com 3 do contrato e 1 da Hidro Natal; Serra só de empreiteiro
  -- (Reboco Forte, Imperme RN, Gesso Natal por preço global e Drywall RN por escopo).
  insert into public.medicoes (id, obra_id, tipo, empreiteiro, numero, periodo_inicio, periodo_fim, data_medicao, arquivo_nome, caminho_planilha, aba_origem, valor_periodo, desconto, valor_a_pagar, observacao, avisos, importada_por) values
    (md5('med-ubs-1')::uuid, md5('obra-ubs')::uuid, 'Contrato', null, 1, h + -70, h + -48, h + -48, 'BM 1ª medição UBS.xlsm', null, 'BM', 139000, null, null, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-ubs-2')::uuid, md5('obra-ubs')::uuid, 'Contrato', null, 2, h + -47, h + -25, h + -25, 'BM 2ª medição UBS.xlsm', null, 'BM', 256000, null, null, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-ubs-3')::uuid, md5('obra-ubs')::uuid, 'Contrato', null, 3, h + -24, h + -2, h + -2, 'BM 3ª medição UBS.xlsm', null, 'BM', 376500, null, null, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-ubs-hidro-1')::uuid, md5('obra-ubs')::uuid, 'Empreiteiro', 'Hidro Natal', 1, null, null, h + -20, 'Medições Hidro Natal.xlsx', null, '01ª med', 4560, 0, 4560, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-serra-reboco-1')::uuid, md5('obra-serra')::uuid, 'Empreiteiro', 'Reboco Forte', 1, null, null, h + -30, 'Medições Reboco Forte.xlsx', null, '01ª med', 6060, 0, 6060, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-serra-reboco-2')::uuid, md5('obra-serra')::uuid, 'Empreiteiro', 'Reboco Forte', 2, null, null, h + -15, 'Medições Reboco Forte.xlsx', null, '02ª med', 2240, 0, 2240, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-serra-imperme-1')::uuid, md5('obra-serra')::uuid, 'Empreiteiro', 'Imperme RN', 1, null, null, h + -10, 'Medições Imperme RN.xlsx', null, '01ª med', 2700, 0, 2700, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-serra-gesso-1')::uuid, md5('obra-serra')::uuid, 'Empreiteiro', 'Gesso Natal', 1, null, null, h + -40, 'Medições Gesso Natal.xlsx', null, '01ª med', 12000, 0, 12000, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-serra-gesso-2')::uuid, md5('obra-serra')::uuid, 'Empreiteiro', 'Gesso Natal', 2, null, null, h + -12, 'Medições Gesso Natal.xlsx', null, '02ª med', 7500, 0, 7500, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-serra-drywall-1')::uuid, md5('obra-serra')::uuid, 'Empreiteiro', 'Drywall RN', 1, null, null, h + -25, 'Medições Drywall RN.xlsx', null, '01ª med', 8000, 0, 8000, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid),
    (md5('med-serra-drywall-2')::uuid, md5('obra-serra')::uuid, 'Empreiteiro', 'Drywall RN', 2, null, null, h + -5, 'Medições Drywall RN.xlsx', null, '02ª med', 10400, 0, 10400, null, '[]'::jsonb, '00000000-0000-4000-8000-00000000a001'::uuid)
  on conflict do nothing;

  insert into public.medicao_itens (id, obra_id, medicao_id, linha_planilha, item, etapa_codigo, etapa_nome, subetapa_codigo, subetapa_nome, descricao, unidade, preco_unitario, qtd_prevista, qtd_contratada, qtd_periodo, qtd_acumulada, valor_previsto, valor_contratado, valor_periodo, valor_acumulado) values
    (md5('mi-ubs-1-1.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 13, '1.1', '1.0', 'SERVIÇOS PRELIMINARES', null, null, 'Mobilização e instalação do canteiro', 'VB', 46000, 1, 1, 1, 1, 46000, 46000, 46000, 46000),
    (md5('mi-ubs-1-1.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 14, '1.2', '1.0', 'SERVIÇOS PRELIMINARES', null, null, 'Locação da obra', 'M2', 50, 1000, 1000, 600, 600, 50000, 50000, 30000, 30000),
    (md5('mi-ubs-1-2.1.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 17, '2.1.1', '2.0', 'FUNDAÇÃO', '2.1', 'SAPATAS', 'Escavação manual de valas', 'M3', 60, 400, 400, 400, 400, 24000, 24000, 24000, 24000),
    (md5('mi-ubs-1-2.1.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 18, '2.1.2', '2.0', 'FUNDAÇÃO', '2.1', 'SAPATAS', 'Armadura CA-50', 'KG', 13, 8000, 8000, 3000, 3000, 104000, 104000, 39000, 39000),
    (md5('mi-ubs-1-2.1.3')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 19, '2.1.3', '2.0', 'FUNDAÇÃO', '2.1', 'SAPATAS', 'Concreto fck 25 MPa em sapatas', 'M3', 750, 80, 86.4, 0, 0, 60000, 64800, 0, 0),
    (md5('mi-ubs-1-2.2.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 21, '2.2.1', '2.0', 'FUNDAÇÃO', '2.2', 'VIGAS BALDRAME', 'Forma e concreto de vigas baldrame', 'M3', 800, 274, 274, 0, 0, 219200, 219200, 0, 0),
    (md5('mi-ubs-1-3.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 23, '3.1', '3.0', 'ESTRUTURA', null, null, 'Pilares em concreto armado', 'M3', 1400, 200, 200, 0, 0, 280000, 280000, 0, 0),
    (md5('mi-ubs-1-3.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 24, '3.2', '3.0', 'ESTRUTURA', null, null, 'Laje pré-moldada', 'M2', 300, 1200, 1200, 0, 0, 360000, 360000, 0, 0),
    (md5('mi-ubs-1-4.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 26, '4.1', '4.0', 'ALVENARIA', null, null, 'Alvenaria de bloco cerâmico', 'M2', 100, 2800, 3100, 0, 0, 280000, 310000, 0, 0),
    (md5('mi-ubs-1-5.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 28, '5.1', '5.0', 'INSTALAÇÕES HIDROSSANITÁRIAS', null, null, 'Tubulação de água fria', 'M', 60, 1900, 1900, 0, 0, 114000, 114000, 0, 0),
    (md5('mi-ubs-1-5.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 29, '5.2', '5.0', 'INSTALAÇÕES HIDROSSANITÁRIAS', null, null, 'Tubulação de esgoto', 'M', 76, 1500, 1500, 0, 0, 114000, 114000, 0, 0),
    (md5('mi-ubs-1-6.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 31, '6.1', '6.0', 'IMPERMEABILIZAÇÃO', null, null, 'Manta asfáltica', 'M2', 74, 1000, 1000, 0, 0, 74000, 74000, 0, 0),
    (md5('mi-ubs-1-7.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 33, '7.1', '7.0', 'REVESTIMENTOS', null, null, 'Reboco interno e externo', 'M2', 40, 6000, 6000, 0, 0, 240000, 240000, 0, 0),
    (md5('mi-ubs-1-7.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 34, '7.2', '7.0', 'REVESTIMENTOS', null, null, 'Revestimento cerâmico', 'M2', 90, 2000, 2000, 0, 0, 180000, 180000, 0, 0),
    (md5('mi-ubs-1-8.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-1')::uuid, 36, '8.1', '8.0', 'PINTURA', null, null, 'Pintura látex acrílica', 'M2', 25, 9532, 9532, 0, 0, 238300, 238300, 0, 0),
    (md5('mi-ubs-2-1.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 13, '1.1', '1.0', 'SERVIÇOS PRELIMINARES', null, null, 'Mobilização e instalação do canteiro', 'VB', 46000, 1, 1, 0, 1, 46000, 46000, 0, 46000),
    (md5('mi-ubs-2-1.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 14, '1.2', '1.0', 'SERVIÇOS PRELIMINARES', null, null, 'Locação da obra', 'M2', 50, 1000, 1000, 400, 1000, 50000, 50000, 20000, 50000),
    (md5('mi-ubs-2-2.1.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 17, '2.1.1', '2.0', 'FUNDAÇÃO', '2.1', 'SAPATAS', 'Escavação manual de valas', 'M3', 60, 400, 400, 0, 400, 24000, 24000, 0, 24000),
    (md5('mi-ubs-2-2.1.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 18, '2.1.2', '2.0', 'FUNDAÇÃO', '2.1', 'SAPATAS', 'Armadura CA-50', 'KG', 13, 8000, 8000, 5000, 8000, 104000, 104000, 65000, 104000),
    (md5('mi-ubs-2-2.1.3')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 19, '2.1.3', '2.0', 'FUNDAÇÃO', '2.1', 'SAPATAS', 'Concreto fck 25 MPa em sapatas', 'M3', 750, 80, 86.4, 60, 60, 60000, 64800, 45000, 45000),
    (md5('mi-ubs-2-2.2.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 21, '2.2.1', '2.0', 'FUNDAÇÃO', '2.2', 'VIGAS BALDRAME', 'Forma e concreto de vigas baldrame', 'M3', 800, 274, 274, 80, 80, 219200, 219200, 64000, 64000),
    (md5('mi-ubs-2-3.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 23, '3.1', '3.0', 'ESTRUTURA', null, null, 'Pilares em concreto armado', 'M3', 1400, 200, 200, 40, 40, 280000, 280000, 56000, 56000),
    (md5('mi-ubs-2-3.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 24, '3.2', '3.0', 'ESTRUTURA', null, null, 'Laje pré-moldada', 'M2', 300, 1200, 1200, 0, 0, 360000, 360000, 0, 0),
    (md5('mi-ubs-2-4.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 26, '4.1', '4.0', 'ALVENARIA', null, null, 'Alvenaria de bloco cerâmico', 'M2', 100, 2800, 3100, 0, 0, 280000, 310000, 0, 0),
    (md5('mi-ubs-2-5.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 28, '5.1', '5.0', 'INSTALAÇÕES HIDROSSANITÁRIAS', null, null, 'Tubulação de água fria', 'M', 60, 1900, 1900, 100, 100, 114000, 114000, 6000, 6000),
    (md5('mi-ubs-2-5.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 29, '5.2', '5.0', 'INSTALAÇÕES HIDROSSANITÁRIAS', null, null, 'Tubulação de esgoto', 'M', 76, 1500, 1500, 0, 0, 114000, 114000, 0, 0),
    (md5('mi-ubs-2-6.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 31, '6.1', '6.0', 'IMPERMEABILIZAÇÃO', null, null, 'Manta asfáltica', 'M2', 74, 1000, 1000, 0, 0, 74000, 74000, 0, 0),
    (md5('mi-ubs-2-7.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 33, '7.1', '7.0', 'REVESTIMENTOS', null, null, 'Reboco interno e externo', 'M2', 40, 6000, 6000, 0, 0, 240000, 240000, 0, 0),
    (md5('mi-ubs-2-7.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 34, '7.2', '7.0', 'REVESTIMENTOS', null, null, 'Revestimento cerâmico', 'M2', 90, 2000, 2000, 0, 0, 180000, 180000, 0, 0),
    (md5('mi-ubs-2-8.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-2')::uuid, 36, '8.1', '8.0', 'PINTURA', null, null, 'Pintura látex acrílica', 'M2', 25, 9532, 9532, 0, 0, 238300, 238300, 0, 0),
    (md5('mi-ubs-3-1.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 13, '1.1', '1.0', 'SERVIÇOS PRELIMINARES', null, null, 'Mobilização e instalação do canteiro', 'VB', 46000, 1, 1, 0, 1, 46000, 46000, 0, 46000),
    (md5('mi-ubs-3-1.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 14, '1.2', '1.0', 'SERVIÇOS PRELIMINARES', null, null, 'Locação da obra', 'M2', 50, 1000, 1000, 0, 1000, 50000, 50000, 0, 50000),
    (md5('mi-ubs-3-2.1.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 17, '2.1.1', '2.0', 'FUNDAÇÃO', '2.1', 'SAPATAS', 'Escavação manual de valas', 'M3', 60, 400, 400, 0, 400, 24000, 24000, 0, 24000),
    (md5('mi-ubs-3-2.1.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 18, '2.1.2', '2.0', 'FUNDAÇÃO', '2.1', 'SAPATAS', 'Armadura CA-50', 'KG', 13, 8000, 8000, 0, 8000, 104000, 104000, 0, 104000),
    (md5('mi-ubs-3-2.1.3')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 19, '2.1.3', '2.0', 'FUNDAÇÃO', '2.1', 'SAPATAS', 'Concreto fck 25 MPa em sapatas', 'M3', 750, 80, 86.4, 31.2, 91.2, 60000, 64800, 23400, 68400),
    (md5('mi-ubs-3-2.2.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 21, '2.2.1', '2.0', 'FUNDAÇÃO', '2.2', 'VIGAS BALDRAME', 'Forma e concreto de vigas baldrame', 'M3', 800, 274, 274, 112.25, 192.25, 219200, 219200, 89800, 153800),
    (md5('mi-ubs-3-3.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 23, '3.1', '3.0', 'ESTRUTURA', null, null, 'Pilares em concreto armado', 'M3', 1400, 200, 200, 100, 140, 280000, 280000, 140000, 196000),
    (md5('mi-ubs-3-3.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 24, '3.2', '3.0', 'ESTRUTURA', null, null, 'Laje pré-moldada', 'M2', 300, 1200, 1200, 200, 200, 360000, 360000, 60000, 60000),
    (md5('mi-ubs-3-4.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 26, '4.1', '4.0', 'ALVENARIA', null, null, 'Alvenaria de bloco cerâmico', 'M2', 100, 2800, 3100, 465, 465, 280000, 310000, 46500, 46500),
    (md5('mi-ubs-3-5.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 28, '5.1', '5.0', 'INSTALAÇÕES HIDROSSANITÁRIAS', null, null, 'Tubulação de água fria', 'M', 60, 1900, 1900, 280, 380, 114000, 114000, 16800, 22800),
    (md5('mi-ubs-3-5.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 29, '5.2', '5.0', 'INSTALAÇÕES HIDROSSANITÁRIAS', null, null, 'Tubulação de esgoto', 'M', 76, 1500, 1500, 0, 0, 114000, 114000, 0, 0),
    (md5('mi-ubs-3-6.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 31, '6.1', '6.0', 'IMPERMEABILIZAÇÃO', null, null, 'Manta asfáltica', 'M2', 74, 1000, 1000, 0, 0, 74000, 74000, 0, 0),
    (md5('mi-ubs-3-7.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 33, '7.1', '7.0', 'REVESTIMENTOS', null, null, 'Reboco interno e externo', 'M2', 40, 6000, 6000, 0, 0, 240000, 240000, 0, 0),
    (md5('mi-ubs-3-7.2')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 34, '7.2', '7.0', 'REVESTIMENTOS', null, null, 'Revestimento cerâmico', 'M2', 90, 2000, 2000, 0, 0, 180000, 180000, 0, 0),
    (md5('mi-ubs-3-8.1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-3')::uuid, 36, '8.1', '8.0', 'PINTURA', null, null, 'Pintura látex acrílica', 'M2', 25, 9532, 9532, 0, 0, 238300, 238300, 0, 0),
    (md5('mi-ubs-hidro-1-1')::uuid, md5('obra-ubs')::uuid, md5('med-ubs-hidro-1')::uuid, 12, '1', null, null, null, null, 'Instalação de tubulação de água fria', 'm', 12, 1900, 1900, 380, 380, 22800, 22800, 4560, 4560),
    (md5('mi-serra-reboco-1-1')::uuid, md5('obra-serra')::uuid, md5('med-serra-reboco-1')::uuid, 12, '1', null, null, null, null, 'Reboco de fachada', 'm²', 28, 450, 450, 120, 120, 12600, 12600, 3360, 3360),
    (md5('mi-serra-reboco-1-2')::uuid, md5('obra-serra')::uuid, md5('med-serra-reboco-1')::uuid, 13, '2', null, null, null, null, 'Chapisco', 'm²', 6, 450, 450, 450, 450, 2700, 2700, 2700, 2700),
    (md5('mi-serra-reboco-2-1')::uuid, md5('obra-serra')::uuid, md5('med-serra-reboco-2')::uuid, 12, '1', null, null, null, null, 'Reboco de fachada', 'm²', 28, 450, 450, 80, 200, 12600, 12600, 2240, 5600),
    (md5('mi-serra-imperme-1-1')::uuid, md5('obra-serra')::uuid, md5('med-serra-imperme-1')::uuid, 12, '1', null, null, null, null, 'Manta asfáltica na laje de cobertura', 'm²', 45, 180, 180, 60, 60, 8100, 8100, 2700, 2700),
    (md5('mi-serra-gesso-1-1')::uuid, md5('obra-serra')::uuid, md5('med-serra-gesso-1')::uuid, 12, '1', null, null, null, null, 'Forro e sanca de gesso (preço global)', 'vb', 30000, 1, 1, 0.4, 0.4, 30000, 30000, 12000, 12000),
    (md5('mi-serra-gesso-2-1')::uuid, md5('obra-serra')::uuid, md5('med-serra-gesso-2')::uuid, 12, '1', null, null, null, null, 'Forro e sanca de gesso (preço global)', 'vb', 30000, 1, 1, 0.25, 0.65, 30000, 30000, 7500, 19500),
    (md5('mi-serra-drywall-1-1')::uuid, md5('obra-serra')::uuid, md5('med-serra-drywall-1')::uuid, 12, '1', null, null, null, null, 'Placas de drywall', 'm²', 80, 200, 200, 80, 80, 16000, 16000, 6400, 6400),
    (md5('mi-serra-drywall-1-2')::uuid, md5('obra-serra')::uuid, md5('med-serra-drywall-1')::uuid, 13, '2', null, null, null, null, 'Tratamento de juntas', 'm²', 40, 200, 200, 40, 40, 8000, 8000, 1600, 1600),
    (md5('mi-serra-drywall-1-3')::uuid, md5('obra-serra')::uuid, md5('med-serra-drywall-1')::uuid, 14, '3', null, null, null, null, 'Tabica', 'm', 120, 50, 50, 0, 0, 6000, 6000, 0, 0),
    (md5('mi-serra-drywall-2-1')::uuid, md5('obra-serra')::uuid, md5('med-serra-drywall-2')::uuid, 12, '1', null, null, null, null, 'Placas de drywall', 'm²', 80, 200, 200, 70, 150, 16000, 16000, 5600, 12000),
    (md5('mi-serra-drywall-2-2')::uuid, md5('obra-serra')::uuid, md5('med-serra-drywall-2')::uuid, 13, '2', null, null, null, null, 'Tratamento de juntas', 'm²', 40, 200, 200, 60, 100, 8000, 8000, 2400, 4000),
    (md5('mi-serra-drywall-2-3')::uuid, md5('obra-serra')::uuid, md5('med-serra-drywall-2')::uuid, 14, '3', null, null, null, null, 'Tabica', 'm', 120, 50, 50, 20, 20, 6000, 6000, 2400, 2400)
  on conflict do nothing;
end $$;
