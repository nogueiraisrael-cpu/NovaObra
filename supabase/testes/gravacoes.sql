-- TESTE DAS GRAVAÇÕES NO BANCO (Rodada 10): o que cada tela grava, feito como Engenheiro e como
-- Gerente, em bloco que termina em erro de propósito: NADA fica gravado. Rodar pelo agente
-- (execute_sql). Complementa supabase/testes/permissoes.sql, que confere quem lê o quê.
do $$
declare
  adm uuid; ger uuid := gen_random_uuid(); ubs uuid; serra uuid; n int; t text; d numeric; ok boolean;
  obra_t uuid; func uuid; func_serra uuid; equip uuid; v_frente uuid; rdo uuid; pedido uuid; mat uuid; ins uuid; mov uuid;
  ativ uuid; rest uuid; sub uuid; med uuid; total int; certos int; falhas text;
  acentos constant text := 'Fundação — ação nº 2, às 9h: 12 m³';
begin
  select id into adm from public.profiles where role = 'admin_master' and status = 'ativo' order by created_at limit 1;
  select id into ubs from public.obras where codigo = 'UBS-NE';
  select id into serra from public.obras where codigo = 'SERRA4';
  insert into auth.users (id, email, raw_user_meta_data, aud, role, instance_id)
    values (ger, 'ger@teste.test', '{"nome":"Gerente T"}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  update public.profiles set role = 'gerente', status = 'ativo' where id = ger;
  insert into public.membros (obra_id, profile_id) values (ubs, ger);
  select id into func_serra from public.funcionarios where obra_id = serra and ativo limit 1;
  create temp table _r (caso text, ok boolean) on commit drop;
  grant all on _r to authenticated;

  -- ── Engenheiro ──
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Obras
  insert into public.obras (nome, codigo, tipo, cidade, situacao, data_inicio, numero_contrato)
    values (acentos, 'TESTE9', 'Licitação', 'São Gonçalo do Amarante', 'Em andamento', '2026-11-04', 'CT 007/2026') returning id into obra_t;
  select nome = acentos and cidade = 'São Gonçalo do Amarante' and data_inicio = '2026-11-04' and criado_por = adm into ok from public.obras where id = obra_t;
  insert into _r values ('Obras: acento, data e quem criou voltam iguais', ok);
  begin insert into public.obras (nome, codigo, tipo, cidade, situacao, data_inicio) values ('x', 'SERRA4', 'Licitação', 'Natal', 'Em andamento', '2026-11-04');
    insert into _r values ('Obras: código repetido é recusado', false);
  exception when unique_violation then insert into _r values ('Obras: código repetido é recusado', true); end;
  begin delete from public.obras where id = serra; insert into _r values ('Obras: obra com lançamentos não se apaga', false);
  exception when foreign_key_violation then insert into _r values ('Obras: obra com lançamentos não se apaga', true); end;
  update public.obras set situacao = 'Concluída' where id = obra_t; get diagnostics n = row_count;
  insert into _r values ('Obras: concluir grava', n = 1);
  update public.obras set situacao = 'Em andamento' where id = obra_t;

  -- Diário
  insert into public.rdos (obra_id, data, clima_manha, clima_tarde, praticavel_manha, praticavel_tarde, observacoes, status)
    values (ubs, '2030-01-07', 'Nublado', 'Bom', true, true, acentos, 'Em andamento') returning id into rdo;
  select observacoes = acentos and criado_por = adm into ok from public.rdos where id = rdo;
  insert into _r values ('Diário: ocorrência e quem abriu voltam iguais', ok);
  begin insert into public.rdos (obra_id, data, clima_manha, clima_tarde, praticavel_manha, praticavel_tarde, observacoes, status)
      values (ubs, '2030-01-07', 'Bom', 'Bom', true, true, '', 'Em andamento');
    insert into _r values ('Diário: um só por obra por dia', false);
  exception when unique_violation then insert into _r values ('Diário: um só por obra por dia', true); end;
  begin update public.rdos set clima_manha = 'Granizo' where id = rdo; insert into _r values ('Diário: clima fora da lista é recusado', false);
  exception when check_violation then insert into _r values ('Diário: clima fora da lista é recusado', true); end;
  -- De preferência alguém da UBS; se a obra estiver sem ninguém lotado, serve qualquer funcionário ativo.
  select id into func from public.funcionarios where ativo order by (obra_id = ubs) desc nulls last limit 1;
  insert into public.rdo_efetivo (rdo_id, obra_id, data, funcionario_id, situacao) values (rdo, ubs, '2030-01-07', func, 'Falta');
  begin insert into public.rdo_efetivo (rdo_id, obra_id, data, funcionario_id, situacao) values (rdo, ubs, '2030-01-07', func, 'Presente');
    insert into _r values ('Efetivo: a pessoa não repete no diário', false);
  exception when unique_violation then insert into _r values ('Efetivo: a pessoa não repete no diário', true); end;
  update public.rdo_efetivo set situacao = 'Presente' where rdo_id = rdo and funcionario_id = func;
  declare rdo2 uuid; begin
    insert into public.rdos (obra_id, data, clima_manha, clima_tarde, praticavel_manha, praticavel_tarde, observacoes, status)
      values (serra, '2030-01-07', 'Bom', 'Bom', true, true, '', 'Em andamento') returning id into rdo2;
    begin insert into public.rdo_efetivo (rdo_id, obra_id, data, funcionario_id, situacao) values (rdo2, serra, '2030-01-07', func, 'Presente');
      insert into _r values ('Efetivo: presente em duas obras no mesmo dia é recusado', false);
    exception when unique_violation then insert into _r values ('Efetivo: presente em duas obras no mesmo dia é recusado', true); end;
  end;

  -- Frentes
  insert into public.frentes_servico (obra_id, nome, etapa, executor, situacao) select ubs, acentos, etapa, 'Equipe própria', 'Não iniciada' from public.frentes_servico where obra_id = ubs limit 1 returning id into v_frente;
  select nome = acentos into ok from public.frentes_servico where id = v_frente;
  insert into _r values ('Frentes: nome volta igual', ok);
  insert into public.rdo_frentes (rdo_id, obra_id, frente_id, situacao, descricao) values (rdo, ubs, v_frente, 'Em execução', acentos);
  begin insert into public.rdo_frentes (rdo_id, obra_id, frente_id, situacao, descricao) values (rdo, ubs, v_frente, 'Em execução', '');
    insert into _r values ('Frentes: uma linha por frente no diário', false);
  exception when unique_violation then insert into _r values ('Frentes: uma linha por frente no diário', true); end;
  begin update public.rdo_frentes set situacao = 'Parada' where rdo_id = rdo and frente_id = v_frente; insert into _r values ('Frentes: parada sem motivo é recusada', false);
  exception when check_violation then insert into _r values ('Frentes: parada sem motivo é recusada', true); end;
  begin delete from public.frentes_servico where id = v_frente; insert into _r values ('Frentes: frente que está em diário não se apaga', false);
  exception when foreign_key_violation then insert into _r values ('Frentes: frente que está em diário não se apaga', true); end;
  select id into equip from public.equipamentos limit 1;
  insert into public.rdo_equipamentos (rdo_id, obra_id, equipamento_id, situacao, observacao) values (rdo, ubs, equip, 'Concluído', acentos);
  select situacao = 'Concluído' and observacao = acentos into ok from public.rdo_equipamentos where rdo_id = rdo and equipamento_id = equip;
  insert into _r values ('Equipamentos: Concluído e a observação voltam iguais', ok);
  begin update public.rdo_equipamentos set situacao = 'Devolvido' where rdo_id = rdo and equipamento_id = equip; insert into _r values ('Equipamentos: situação fora da lista é recusada', false);
  exception when check_violation then insert into _r values ('Equipamentos: situação fora da lista é recusada', true); end;
  update public.rdos set status = 'Fechado', fechado_por = adm, fechado_em = now() where id = rdo; get diagnostics n = row_count;
  insert into _r values ('Fechar: o dia fecha', n = 1);
  delete from public.rdos where id = rdo; get diagnostics n = row_count;
  insert into _r values ('Fechar: dia fechado não se apaga', n = 0);

  -- Pessoas e equipamentos
  begin delete from public.funcionarios where id = func; insert into _r values ('Pessoas: quem está em diário não se apaga', false);
  exception when foreign_key_violation then insert into _r values ('Pessoas: quem está em diário não se apaga', true); end;
  update public.funcionarios set ativo = false where id = func;
  select count(*) into n from public.rdo_efetivo where funcionario_id = func and data = '2030-01-07';
  insert into _r values ('Pessoas: desativar não tira do diário', n = 1);
  update public.funcionarios set ativo = true where id = func;
  select id into equip from public.equipamentos where id in (select equipamento_id from public.rdo_equipamentos) limit 1;
  begin delete from public.equipamentos where id = equip; insert into _r values ('Equipamentos: o que está em diário não se apaga', false);
  exception when foreign_key_violation then insert into _r values ('Equipamentos: o que está em diário não se apaga', true); end;

  -- Pedidos
  select id into mat from public.materiais limit 1;
  insert into public.pedidos_material (obra_id, material_id, quantidade, frente, prioridade, status, historico)
    values (ubs, mat, 2.5, acentos, 'Normal', 'Solicitar', '[]'::jsonb) returning id into pedido;
  select quantidade = 2.5 and frente = acentos into ok from public.pedidos_material where id = pedido;
  insert into _r values ('Pedidos: quantidade quebrada e texto voltam iguais', ok);
  begin update public.pedidos_material set status = 'Inventado' where id = pedido; insert into _r values ('Pedidos: coluna fora da lista é recusada', false);
  exception when check_violation then insert into _r values ('Pedidos: coluna fora da lista é recusada', true); end;
  begin update public.pedidos_material set status = 'Comprado' where id = pedido; insert into _r values ('Pedidos: comprado sem fornecedor é recusado', false);
  exception when check_violation then insert into _r values ('Pedidos: comprado sem fornecedor é recusado', true); end;
  begin delete from public.materiais where id = mat; insert into _r values ('Catálogo: material com pedido não se apaga', false);
  exception when foreign_key_violation then insert into _r values ('Catálogo: material com pedido não se apaga', true); end;

  -- Estoque
  select id into ins from public.insumos where obra_id = ubs limit 1;
  update public.insumos set saldo_minimo = 2.5 where id = ins;
  select saldo_minimo = 2.5 into ok from public.insumos where id = ins;
  insert into _r values ('Estoque: mínimo quebrado volta igual', ok);
  begin insert into public.movimentos_estoque (obra_id, insumo_id, tipo, quantidade, data, frente, origem) values (ubs, ins, 'Saída', 999999, '2030-01-07', 'Teste', 'Manual');
    insert into _r values ('Estoque: saldo negativo é recusado', false);
  exception when others then insert into _r values ('Estoque: saldo negativo é recusado', sqlerrm ~ 'saldo_negativo'); end;
  begin insert into public.insumos (obra_id, material_id, saldo_minimo) select obra_id, material_id, 0 from public.insumos where id = ins;
    insert into _r values ('Estoque: material não repete na obra', false);
  exception when unique_violation then insert into _r values ('Estoque: material não repete na obra', true); end;

  -- Planejamento
  insert into public.atividades (obra_id, ordem, titulo, data_inicio, data_fim) values (ubs, 999, acentos, '2030-01-07', '2030-01-11') returning id into ativ;
  select titulo = acentos and data_fim = '2030-01-11' into ok from public.atividades where id = ativ;
  insert into _r values ('EAP: nome e datas voltam iguais', ok);
  begin update public.atividades set data_fim = '2029-01-01' where id = ativ; insert into _r values ('EAP: fim antes do início é recusado', false);
  exception when check_violation then insert into _r values ('EAP: fim antes do início é recusado', true); end;
  update public.atividades set progresso = 40 where id = ativ;
  update public.atividades set arquivada = true where id = ativ;
  select progresso = 40 into ok from public.atividades where id = ativ;
  insert into _r values ('EAP: arquivar mantém o avanço', ok);
  update public.atividades set arquivada = false where id = ativ;
  insert into public.restricoes (obra_id, atividade_id, descricao, tipo, prazo, responsavel, resolvida) values (ubs, ativ, acentos, 'Projeto', '2030-01-07', 'João Conceição', false) returning id into rest;
  select descricao = acentos and responsavel = 'João Conceição' into ok from public.restricoes where id = rest;
  insert into _r values ('Médio prazo: texto e responsável voltam iguais', ok);
  begin update public.restricoes set resolvida = true where id = rest; insert into _r values ('Médio prazo: resolvida sem data é recusada', false);
  exception when check_violation then insert into _r values ('Médio prazo: resolvida sem data é recusada', true); end;
  update public.restricoes set resolvida = true, resolvida_em = '2030-01-07' where id = rest;
  select count(*) into n from public.restricoes where id = rest;
  insert into _r values ('Médio prazo: resolver não apaga', n = 1);
  insert into public.semana_atividades (obra_id, atividade_id, semana, status) values (ubs, ativ, '2030-01-07', 'Concluído');
  begin insert into public.semana_atividades (obra_id, atividade_id, semana, status) values (ubs, ativ, '2030-01-07', 'A fazer');
    insert into _r values ('Curto prazo: uma linha por atividade na semana', false);
  exception when unique_violation then insert into _r values ('Curto prazo: uma linha por atividade na semana', true); end;
  begin insert into public.semana_atividades (obra_id, atividade_id, semana, status) values (ubs, ativ, '2030-01-08', 'A fazer');
    insert into _r values ('Curto prazo: semana sempre começa na segunda', false);
  exception when check_violation then insert into _r values ('Curto prazo: semana sempre começa na segunda', true); end;
  insert into public.subtarefas (obra_id, atividade_id, titulo, ordem) values (ubs, ativ, acentos, 1) returning id into sub;
  delete from public.subtarefas where id = sub; get diagnostics n = row_count;
  select count(*) into total from public.atividades where id = ativ;
  insert into _r values ('Curto prazo: excluir subtarefa não mexe na atividade', n = 1 and total = 1);
  begin delete from public.atividades where id = ativ; insert into _r values ('EAP: atividade com restrição não se apaga', false);
  exception when foreign_key_violation then insert into _r values ('EAP: atividade com restrição não se apaga', true); end;

  -- Medições
  insert into public.medicoes (obra_id, tipo, numero, data_medicao, arquivo_nome, aba_origem, valor_periodo)
    values (ubs, 'Contrato', 9001, '2030-01-07', 'teste.xlsx', 'BM', 1234.56) returning id into med;
  select valor_periodo = 1234.56 into ok from public.medicoes where id = med;
  insert into _r values ('Medições: valor volta igual ao centavo', ok);
  begin insert into public.medicoes (obra_id, tipo, numero, data_medicao, arquivo_nome, aba_origem, valor_periodo) values (ubs, 'Contrato', 9001, '2030-01-07', 'teste.xlsx', 'BM', 1);
    insert into _r values ('Medições: número repetido é recusado', false);
  exception when unique_violation then insert into _r values ('Medições: número repetido é recusado', true); end;
  begin insert into public.medicoes (obra_id, tipo, numero, data_medicao, arquivo_nome, aba_origem, valor_periodo) values (ubs, 'Inventado', 9002, '2030-01-07', 'x', 'BM', 1);
    insert into _r values ('Medições: tipo fora da lista é recusado', false);
  exception when check_violation then insert into _r values ('Medições: tipo fora da lista é recusado', true); end;
  select count(*) into total from public.medicoes where obra_id = ubs;
  delete from public.medicoes where id = med; get diagnostics n = row_count;
  select count(*) into certos from public.medicoes where obra_id = ubs;
  insert into _r values ('Medições: excluir leva só a medição dela', n = 1 and certos = total - 1);
  reset role;

  -- ── Gerente (só a UBS) ──
  perform set_config('request.jwt.claims', json_build_object('sub', ger, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.funcionarios (nome, funcao, obra_id, ativo) values ('João da Conceição', 'Pedreiro', ubs, true) returning id into func;
  select criado_por = ger into ok from public.funcionarios where id = func;
  insert into _r values ('Pessoas: o Gerente cadastra na obra dele', ok);
  begin insert into public.funcionarios (nome, funcao, obra_id, ativo) values ('x', 'Pedreiro', serra, true); insert into _r values ('Pessoas: o Gerente não lota em outra obra', false);
  exception when insufficient_privilege then insert into _r values ('Pessoas: o Gerente não lota em outra obra', true); end;
  update public.funcionarios set nome = nome where id = func_serra; get diagnostics n = row_count;
  insert into _r values ('Pessoas: o Gerente não muda quem é de outra obra', n = 0);
  delete from public.funcionarios where id = func; get diagnostics n = row_count;
  insert into _r values ('Pessoas: o Gerente não apaga funcionário', n = 0);
  insert into public.atividades (obra_id, ordem, titulo, data_inicio, data_fim) values (ubs, 998, 'Do gerente', '2030-01-07', '2030-01-11') returning id into ativ;
  update public.atividades set progresso = 10 where id = ativ; get diagnostics n = row_count;
  insert into _r values ('Planejamento: o Gerente cria e edita na obra dele', n = 1);
  begin insert into public.atividades (obra_id, ordem, titulo, data_inicio, data_fim) values (serra, 998, 'x', '2030-01-07', '2030-01-11'); insert into _r values ('Planejamento: o Gerente não cria em outra obra', false);
  exception when insufficient_privilege then insert into _r values ('Planejamento: o Gerente não cria em outra obra', true); end;
  begin insert into public.medicoes (obra_id, tipo, numero, data_medicao, arquivo_nome, aba_origem, valor_periodo) values (ubs, 'Contrato', 9003, '2030-01-07', 'x', 'BM', 1);
    insert into _r values ('Medições: o Gerente não grava', false);
  exception when insufficient_privilege then insert into _r values ('Medições: o Gerente não grava', true); end;
  update public.obras set dias_trabalho = '{1}' where id = ubs; get diagnostics n = row_count;
  insert into _r values ('Calendário: o Gerente não muda', n = 0);
  reset role;

  select count(*), count(*) filter (where r.ok) into total, certos from _r r;
  select coalesce(string_agg('  ✗ ' || caso, E'\n'), '') into falhas from _r r where r.ok is not true;
  raise exception E'RESULTADO: % de % (tudo desfeito)\n%', certos, total, falhas;
end
$$;
