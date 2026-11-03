-- TESTE DE PERMISSÕES NO BANCO (AGENTS.md, "Teste de permissões automático").
-- Rodar depois de QUALQUER mudança de RLS, grant ou gatilho de perfil, pelo agente (execute_sql).
-- Tudo acontece dentro de um bloco que termina em erro de propósito: NADA fica gravado.
-- A resposta é a última linha do erro: "RESULTADO: N de N" e a lista do que falhou.
--
-- Pessoas de teste: o Engenheiro é o primeiro admin_master do banco; o resto nasce aqui.
-- Gerente liberado só na UBS; Cliente liberado só na Serra; uma conta pendente; um gerente bloqueado.
do $$
declare
  adm uuid; ger uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  pen uuid := gen_random_uuid(); blq uuid := gen_random_uuid();
  ubs uuid; serra uuid; n int; falhas text := ''; total int := 0; certos int := 0;
  pedido_ubs uuid; pedido_novo uuid;
begin
  select id into adm from public.profiles where role = 'admin_master' and status = 'ativo' order by created_at limit 1;
  select id into ubs from public.obras where codigo = 'UBS-NE';
  select id into serra from public.obras where codigo = 'SERRA4';
  if adm is null or ubs is null or serra is null then raise exception 'faltam o admin ou as obras de exemplo'; end if;

  insert into auth.users (id, email, raw_user_meta_data, aud, role, instance_id) values
    (ger, 'ger@teste.test', '{"nome":"Gerente T"}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (cli, 'cli@teste.test', '{"nome":"Cliente T"}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (pen, 'pen@teste.test', '{"nome":"Pendente T"}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (blq, 'blq@teste.test', '{"nome":"Bloqueado T"}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  update public.profiles set role = 'gerente', status = 'ativo' where id = ger;
  update public.profiles set role = 'cliente', status = 'ativo' where id = cli;
  update public.profiles set role = 'gerente', status = 'bloqueado' where id = blq;
  insert into public.membros (obra_id, profile_id) values (ubs, ger), (serra, cli), (ubs, blq);
  select id into pedido_ubs from public.pedidos_material where obra_id = ubs and status <> 'Solicitar' limit 1;

  create temp table _r (caso text, ok boolean) on commit drop;
  grant all on _r to anon, authenticated;

  -- ── Quem não fez login ──
  set local role anon;
  begin perform 1 from public.obras limit 1; insert into _r values ('anon não lê obras', false);
  exception when insufficient_privilege then insert into _r values ('anon não lê obras', true); end;
  begin perform 1 from public.rdos limit 1; insert into _r values ('anon não lê diários', false);
  exception when insufficient_privilege then insert into _r values ('anon não lê diários', true); end;
  reset role;

  -- ── Pendente ──
  perform set_config('request.jwt.claims', json_build_object('sub', pen, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.obras; insert into _r values ('pendente não vê obra', n = 0);
  select count(*) into n from public.rdos; insert into _r values ('pendente não vê diário', n = 0);
  select count(*) into n from public.funcionarios; insert into _r values ('pendente não vê funcionário', n = 0);
  begin insert into public.materiais (nome, unidade, categoria) values ('X teste', 'un', 'Material grosso'); insert into _r values ('pendente não grava', false);
  exception when insufficient_privilege then insert into _r values ('pendente não grava', true); end;
  reset role;

  -- ── Bloqueado (gerente liberado na UBS) ──
  perform set_config('request.jwt.claims', json_build_object('sub', blq, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.rdos; insert into _r values ('bloqueado não vê diário', n = 0);
  select count(*) into n from public.pedidos_material; insert into _r values ('bloqueado não vê pedido', n = 0);
  reset role;

  -- ── Cliente (liberado na Serra) ──
  perform set_config('request.jwt.claims', json_build_object('sub', cli, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.obras; insert into _r values ('cliente vê só a obra dele', n = 1);
  select count(*) into n from public.rdos; insert into _r values ('cliente ainda não vê diário (v1.1)', n = 0);
  select count(*) into n from public.medicoes; insert into _r values ('cliente nunca vê medição', n = 0);
  select count(*) into n from public.efetivo_do_dia((now() at time zone 'America/Fortaleza')::date); insert into _r values ('cliente não vê o efetivo do dia', n = 0);
  select count(*) into n from public.fotos; insert into _r values ('cliente ainda não vê foto (v1.1)', n = 0);
  reset role;

  -- ── Gerente (liberado só na UBS) ──
  perform set_config('request.jwt.claims', json_build_object('sub', ger, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.obras; insert into _r values ('gerente vê só a UBS', n = 1);
  select count(*) into n from public.rdos where obra_id = serra; insert into _r values ('gerente não vê diário da Serra', n = 0);
  select count(*) into n from public.rdos where obra_id = ubs; insert into _r values ('gerente vê diário da UBS', n > 0);
  select count(*) into n from public.pedidos_material where obra_id = serra; insert into _r values ('gerente não vê pedido da Serra', n = 0);
  select count(*) into n from public.medicoes; insert into _r values ('gerente não vê medição', n = 0);
  select count(*) into n from public.medicao_itens; insert into _r values ('gerente não vê linha de medição', n = 0);
  select count(*) into n from public.funcionarios; insert into _r values ('gerente vê os funcionários (nome e função)', n > 0);
  select count(*) into n from public.profiles; insert into _r values ('gerente lê só o próprio perfil', n = 1);
  begin
    insert into public.pedidos_material (obra_id, material_id, quantidade, frente, prioridade, status, historico)
      select serra, material_id, 1, frente, prioridade, 'Solicitar', '[]'::jsonb from public.pedidos_material limit 1;
    insert into _r values ('gerente não cria pedido na Serra', false);
  exception when insufficient_privilege then insert into _r values ('gerente não cria pedido na Serra', true); end;
  insert into public.pedidos_material (obra_id, material_id, quantidade, frente, prioridade, status, historico)
    select ubs, material_id, 1, frente, prioridade, 'Solicitar', '[]'::jsonb from public.pedidos_material where obra_id = ubs limit 1
    returning id into pedido_novo;
  insert into _r values ('gerente cria pedido na UBS', pedido_novo is not null);
  insert into _r select 'pedido do gerente nasce com ele como quem criou', criado_por = ger from public.pedidos_material where id = pedido_novo;
  begin
    update public.pedidos_material set obra_id = serra where id = pedido_novo;
    insert into _r values ('gerente não muda pedido para a Serra', false);
  exception when insufficient_privilege then insert into _r values ('gerente não muda pedido para a Serra', true); end;
  delete from public.pedidos_material where id = pedido_ubs; get diagnostics n = row_count;
  insert into _r values ('gerente não apaga pedido que passou de Solicitar', n = 0);
  delete from public.pedidos_material where id = pedido_novo; get diagnostics n = row_count;
  insert into _r values ('gerente apaga pedido em Solicitar', n = 1);
  delete from public.rdos where obra_id = ubs; get diagnostics n = row_count;
  insert into _r values ('gerente não apaga diário', n = 0);
  delete from public.movimentos_estoque where obra_id = ubs and origem = 'Manual'; get diagnostics n = row_count;
  insert into _r values ('gerente não apaga baixa manual', n = 0);
  update public.materiais set nome = nome where true; get diagnostics n = row_count;
  insert into _r values ('gerente não muda o catálogo', n = 0);
  update public.obras set nome = nome where id = ubs; get diagnostics n = row_count;
  insert into _r values ('gerente não edita a obra', n = 0);
  begin
    insert into public.membros (obra_id, profile_id) values (serra, ger);
    insert into _r values ('gerente não se libera em outra obra', false);
  exception when insufficient_privilege then insert into _r values ('gerente não se libera em outra obra', true); end;
  begin
    update public.profiles set role = 'admin_master' where id = ger;
    insert into _r values ('gerente não vira admin', false);
  exception when insufficient_privilege then insert into _r values ('gerente não vira admin', true); end;
  begin
    update public.movimentos_estoque set origem = 'Pedido' where obra_id = ubs and origem = 'Manual';
    get diagnostics n = row_count;
    insert into _r values ('gerente não transforma baixa manual em de pedido', n = 0);
  exception when others then insert into _r values ('gerente não transforma baixa manual em de pedido', true); end;
  update public.funcionarios set nome = nome where obra_id = serra; get diagnostics n = row_count;
  insert into _r values ('gerente não muda funcionário lotado na Serra', n = 0);
  update public.funcionarios set nome = nome where obra_id = ubs; get diagnostics n = row_count;
  insert into _r values ('gerente muda funcionário lotado na UBS', n > 0);
  update public.equipamentos set nome = nome where obra_id = serra; get diagnostics n = row_count;
  insert into _r values ('gerente não mexe em equipamento da Serra', n = 0);
  select count(distinct obra_id) into n from public.efetivo_do_dia((now() at time zone 'America/Fortaleza')::date);
  insert into _r values ('gerente enxerga quem está presente em qualquer obra hoje (trava)', n >= 1);
  select count(*) into n from public.rdo_efetivo where obra_id = serra; insert into _r values ('mas não lê o efetivo da Serra direto', n = 0);
  insert into _r values ('gerente abre foto do diário da UBS', privado.pode_foto(ubs || '/diario/' || gen_random_uuid() || '.jpg'));
  insert into _r values ('gerente não abre nota fiscal', not privado.pode_foto(ubs || '/nota-fiscal/' || gen_random_uuid() || '.jpg'));
  insert into _r values ('gerente não abre foto da Serra', not privado.pode_foto(serra || '/diario/' || gen_random_uuid() || '.jpg'));
  reset role;

  -- ── Engenheiro (admin) ──
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.obras; insert into _r values ('engenheiro vê as duas obras', n >= 2);
  select count(*) into n from public.medicoes; insert into _r values ('engenheiro vê medições', n > 0);
  select count(*) into n from public.profiles; insert into _r values ('engenheiro vê todos os perfis', n >= 5);
  update public.obras set nome = nome where id = ubs; get diagnostics n = row_count;
  insert into _r values ('engenheiro edita a obra', n = 1);
  delete from public.rdos where status = 'Fechado'; get diagnostics n = row_count;
  insert into _r values ('nem o engenheiro apaga diário fechado', n = 0);
  insert into _r values ('engenheiro abre nota fiscal', privado.pode_foto(ubs || '/nota-fiscal/' || gen_random_uuid() || '.jpg'));
  reset role;

  select count(*), count(*) filter (where ok) into total, certos from _r;
  select coalesce(string_agg('  ✗ ' || caso, E'\n'), '') into falhas from _r where not ok;
  raise exception E'RESULTADO: % de % (tudo desfeito)\n%', certos, total, falhas;
end
$$;
