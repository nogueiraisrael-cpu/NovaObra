-- O TESTE DO INTRUSO LOGADO (par do teste-do-estranho.mjs, que testa quem NÃO fez login).
-- Rodar pelo agente (execute_sql) depois de qualquer mudança de RLS, grant, gatilho de perfil ou tabela nova.
-- Nenhuma conta de verdade é criada: as pessoas nascem aqui dentro e o bloco termina em erro de
-- propósito, então NADA fica gravado. A resposta é a mensagem do erro: uma linha por tentativa.
--
--   🔒 PORTA FECHADA     o banco recusou (ou não mostrou nada)
--   🚨 PORTA ABERTA      passou, e o quadro (docs/permissoes) diz que não devia
--   ✅ PERMITIDO (quadro) passou, e o quadro deixa (ex.: gerente apaga foto da obra dele)
--   ❔ INCONCLUSIVO       o teste não conseguiu provar nem um nem outro (conserte o teste)
--
-- Quem é quem: Gerente liberado só na UBS (vizinha = Serra); Cliente só na Serra; um Pendente;
-- um Bloqueado (gerente liberado na UBS). Tabela nova entra em "tabs" (e nas listas abaixo, se for o caso).
do $$
declare
  ger uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  pen uuid := gen_random_uuid(); blq uuid := gen_random_uuid();
  ubs uuid; serra uuid;
  tabs text[] := array['atividades','equipamentos','fotos','frentes_servico','funcionarios','insumos','materiais',
    'medicao_itens','medicoes','membros','movimentos_estoque','obras','pedidos_material','profiles','rdo_efetivo',
    'rdo_equipamentos','rdo_frente_equipe','rdo_frentes','rdos','restricoes','semana_atividades','subtarefas'];
  -- O que o quadro deixa o Gerente fazer na obra DELE (as demais tentativas têm que ser recusadas):
  gerente_le_todas text[] := array['funcionarios','equipamentos','materiais'];   -- cadastros que circulam entre obras
  gerente_cria_sem_obra text[] := array['materiais'];                             -- catálogo: criar pode
  gerente_apaga text[] := array['fotos','pedidos_material','rdo_efetivo','rdo_equipamentos','rdo_frente_equipe',
    'restricoes','semana_atividades','subtarefas','movimentos_estoque'];         -- foto, pedido em Solicitar e partes de editar
  dinheiro text[] := array['medicoes','medicao_itens'];                            -- só o Engenheiro, até na obra dele
  amostras jsonb := '{}'; amostra jsonb; p record; t text; filtro text; mudar text; alvo uuid;
  n int; tot int; r text[] := '{}'; est text; saida text := '';
  fechadas int := 0; abertas int := 0; permitidas int := 0; duvidas int := 0;
begin
  select id into ubs from public.obras where codigo = 'UBS-NE';
  select id into serra from public.obras where codigo = 'SERRA4';
  if ubs is null or serra is null then raise exception 'faltam as obras de exemplo (UBS-NE e SERRA4)'; end if;

  insert into auth.users (id, email, raw_user_meta_data, aud, role, instance_id) values
    (ger, 'ger@intruso.test', '{"nome":"Gerente Intruso"}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (cli, 'cli@intruso.test', '{"nome":"Cliente Intruso"}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (pen, 'pen@intruso.test', '{"nome":"Pendente Intruso"}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (blq, 'blq@intruso.test', '{"nome":"Bloqueado Intruso"}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  update public.profiles set role = 'gerente', status = 'ativo' where id = ger;
  update public.profiles set role = 'cliente', status = 'ativo' where id = cli;
  update public.profiles set role = 'gerente', status = 'bloqueado' where id = blq;
  insert into public.membros (obra_id, profile_id) values (ubs, ger), (serra, cli), (ubs, blq);

  -- Uma linha de exemplo de cada tabela, para tentar inserir uma cópia como intruso.
  foreach t in array tabs loop
    execute format('select to_jsonb(x) from public.%I x limit 1', t) into amostra;
    amostras := amostras || jsonb_build_object(t, amostra);
  end loop;

  -- Gerente por último: o que ele pode apagar na obra dele não atrapalha a contagem dos outros.
  for p in select * from (values ('Pendente', pen), ('Bloqueado', blq), ('Cliente', cli), ('Gerente', ger)) v(nome, id) loop
    perform set_config('request.jwt.claims', json_build_object('sub', p.id, 'role', 'authenticated')::text, true);

    foreach t in array tabs loop
      -- O que este perfil NÃO pode ver nesta tabela.
      if p.nome = 'Gerente' then
        filtro := case when t = any(dinheiro) then 'true'
                       when t = 'materiais' then 'true'
                       when t = 'obras' then format('id = %L', serra)
                       when t = 'profiles' then format('id <> %L', p.id)
                       when t = 'membros' then format('profile_id <> %L', p.id)
                       else format('obra_id = %L', serra) end;
      else
        filtro := case when t = 'obras' and p.nome = 'Cliente' then format('id <> %L', serra)
                       when t = 'profiles' then format('id <> %L', p.id)
                       when t = 'membros' then format('profile_id <> %L', p.id)
                       else 'true' end;
      end if;

      -- LER
      reset role;
      execute format('select count(*) from public.%I where %s', t, filtro) into tot;
      set local role authenticated;
      execute format('select count(*) from public.%I where %s', t, filtro) into n;
      est := case when n = 0 then 'F' when p.nome = 'Gerente' and t = any(gerente_le_todas) then 'P' else 'A' end;
      r := r || format('%s|%s|%s|LER|(viu %s de %s)', est, p.nome, t, n, tot);

      -- INSERIR (cópia de uma linha real, na obra que não é dele; na do Gerente, só onde é dinheiro)
      amostra := amostras -> t;
      alvo := case when p.nome = 'Gerente' and t = any(dinheiro) then ubs when p.nome = 'Gerente' then serra
                   when p.nome = 'Cliente' then ubs else serra end;
      if amostra is null then
        r := r || format('?|%s|%s|INSERIR|(tabela vazia: sem exemplo para copiar)', p.nome, t);
      else
        amostra := amostra || jsonb_build_object('id', gen_random_uuid());
        if amostra ? 'obra_id' then amostra := amostra || jsonb_build_object('obra_id', alvo); end if;
        if t = 'membros' then amostra := amostra || jsonb_build_object('profile_id', p.id); end if;
        if t = 'obras' then amostra := amostra || jsonb_build_object('codigo', 'INTRUSO-' || left(p.id::text, 8)); end if;
        if t = 'materiais' then amostra := amostra || jsonb_build_object('nome', 'Intruso ' || left(p.id::text, 8)); end if;
        begin
          execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', t, t) using amostra;
          est := case when p.nome = 'Gerente' and t = any(gerente_cria_sem_obra) then 'P' else 'A' end;
          r := r || format('%s|%s|%s|INSERIR|(o banco gravou)', est, p.nome, t);
        exception
          when insufficient_privilege then r := r || format('F|%s|%s|INSERIR|(%s)', p.nome, t, sqlerrm);
          when others then
            r := r || format('?|%s|%s|INSERIR|(passou da regra, parou em: %s)', p.nome, t, sqlerrm);
        end;
      end if;

      -- ALTERAR (nas medições, mexendo no valor)
      mudar := case t when 'medicoes' then 'valor_periodo = valor_periodo + 1, valor_a_pagar = coalesce(valor_a_pagar, 0) + 1, desconto = coalesce(desconto, 0) + 1'
                      else 'id = id' end;
      begin
        execute format('update public.%I set %s where %s', t, mudar, filtro);
        get diagnostics n = row_count;
        r := r || format('%s|%s|%s|ALTERAR|(mudou %s de %s)', case when n = 0 then 'F' else 'A' end, p.nome, t, n, tot);
      exception
        when insufficient_privilege then r := r || format('F|%s|%s|ALTERAR|(%s)', p.nome, t, sqlerrm);
        when others then r := r || format('?|%s|%s|ALTERAR|(%s)', p.nome, t, sqlerrm);
      end;

      -- APAGAR o que não é dele
      begin
        execute format('delete from public.%I where %s', t, filtro);
        get diagnostics n = row_count;
        r := r || format('%s|%s|%s|APAGAR|(apagou %s de %s)', case when n = 0 then 'F' else 'A' end, p.nome, t, n, tot);
      exception
        when insufficient_privilege then r := r || format('F|%s|%s|APAGAR|(%s)', p.nome, t, sqlerrm);
        when foreign_key_violation then r := r || format('A|%s|%s|APAGAR|(passou da regra, parou na ligação)', p.nome, t);
        when others then r := r || format('?|%s|%s|APAGAR|(%s)', p.nome, t, sqlerrm);
      end;

      -- Gerente: na obra DELE, pedido fora de "Solicitar" e baixa que não veio de pedido NÃO se apagam
      -- (quadro). Isso é conferido antes, separado: o "permitido" de baixo só vale para o resto.
      if p.nome = 'Gerente' and t in ('pedidos_material', 'movimentos_estoque') then
        filtro := format('obra_id = %L and ', ubs) || case t when 'pedidos_material' then $q$status <> 'Solicitar'$q$ else $q$origem <> 'Pedido'$q$ end;
        reset role;
        execute format('select count(*) from public.%I where %s', t, filtro) into tot;
        set local role authenticated;
        begin
          execute format('delete from public.%I where %s', t, filtro);
          get diagnostics n = row_count;
          r := r || format('%s|%s|%s|APAGAR proibido|(apagou %s de %s %s)', case when n = 0 then 'F' else 'A' end, p.nome, t, n, tot,
                           case t when 'pedidos_material' then 'fora de Solicitar' else 'baixas manuais' end);
        exception
          when insufficient_privilege then r := r || format('F|%s|%s|APAGAR proibido|(%s)', p.nome, t, sqlerrm);
          when others then r := r || format('A|%s|%s|APAGAR proibido|(passou da regra, parou em: %s)', p.nome, t, sqlerrm);
        end;
      end if;

      -- Gerente: APAGAR na obra DELE (só o que o quadro deixa)
      if p.nome = 'Gerente' and t <> all(dinheiro) then
        filtro := case t when 'materiais' then 'true' when 'obras' then format('id = %L', ubs)
                         when 'profiles' then format('id = %L', p.id) when 'membros' then format('profile_id = %L', p.id)
                         else format('obra_id = %L', ubs) end
                  || case t when 'pedidos_material' then $q$ and status = 'Solicitar'$q$
                            when 'movimentos_estoque' then $q$ and origem = 'Pedido'$q$ else '' end;
        begin
          execute format('delete from public.%I where %s', t, filtro);
          get diagnostics n = row_count;
          est := case when t = any(gerente_apaga) then 'P' when n = 0 then 'F' else 'A' end;
          r := r || format('%s|%s|%s|APAGAR na própria|(apagou %s)', est, p.nome, t, n);
        exception
          when insufficient_privilege then r := r || format('F|%s|%s|APAGAR na própria|(%s)', p.nome, t, sqlerrm);
          -- Passou da regra e parou noutra trava (ex.: estoque negativo): só é "permitido" onde o quadro deixa.
          when others then
            est := case when t = any(gerente_apaga) then 'P' else 'A' end;
            r := r || format('%s|%s|%s|APAGAR na própria|(passou da regra, parou em: %s)', est, p.nome, t, sqlerrm);
        end;
      end if;
    end loop;

    -- O próprio perfil: mudar papel e situação (pendente tentando se aprovar)
    begin
      update public.profiles set role = 'admin_master' where id = p.id; get diagnostics n = row_count;
      r := r || format('%s|%s|profiles|MUDAR O PRÓPRIO PAPEL|(mudou %s)', case when n = 0 then 'F' else 'A' end, p.nome, n);
    exception when insufficient_privilege then r := r || format('F|%s|profiles|MUDAR O PRÓPRIO PAPEL|(%s)', p.nome, sqlerrm); end;
    begin
      update public.profiles set status = case when status = 'ativo' then 'pendente' else 'ativo' end where id = p.id;
      get diagnostics n = row_count;
      r := r || format('%s|%s|profiles|MUDAR A PRÓPRIA SITUAÇÃO|(mudou %s)', case when n = 0 then 'F' else 'A' end, p.nome, n);
    exception when insufficient_privilege then r := r || format('F|%s|profiles|MUDAR A PRÓPRIA SITUAÇÃO|(%s)', p.nome, sqlerrm); end;

    -- Fotos no depósito, pela regra de verdade (storage.objects): mandar arquivo na pasta da obra vizinha.
    begin
      insert into storage.objects (bucket_id, name) values ('fotos', case when p.nome = 'Cliente' then ubs else serra end || '/diario/intruso.jpg');
      r := r || format('A|%s|storage fotos|MANDAR na obra vizinha|(o arquivo entrou)', p.nome);
    exception
      when insufficient_privilege then r := r || format('F|%s|storage fotos|MANDAR na obra vizinha|(%s)', p.nome, sqlerrm);
      when others then r := r || format('?|%s|storage fotos|MANDAR na obra vizinha|(%s)', p.nome, sqlerrm);
    end;
    -- A regra de abrir e apagar (privado.pode_foto): a da obra vizinha e a nota fiscal (só o Engenheiro abre)
    r := r || format('%s|%s|storage fotos|ABRIR foto da obra vizinha|', case when privado.pode_foto(serra || '/diario/x.jpg') and p.nome <> 'Cliente' or privado.pode_foto(ubs || '/diario/x.jpg') and p.nome <> 'Gerente' then 'A' else 'F' end, p.nome);
    r := r || format('%s|%s|storage fotos|ABRIR nota fiscal|', case when privado.pode_foto(ubs || '/nota-fiscal/x.jpg') or privado.pode_foto(serra || '/nota-fiscal/x.jpg') then 'A' else 'F' end, p.nome);
    reset role;
  end loop;

  -- O que não é 🔒 vem primeiro: a mensagem é longa e pode ser cortada no fim.
  select coalesce(array_agg(x order by split_part(x, '|', 1) = 'F', posicao), '{}') into r from unnest(r) with ordinality u(x, posicao);
  foreach est in array r loop
    case split_part(est, '|', 1)
      when 'F' then fechadas := fechadas + 1; saida := saida || '🔒 PORTA FECHADA      ';
      when 'A' then abertas := abertas + 1;   saida := saida || '🚨 PORTA ABERTA       ';
      when 'P' then permitidas := permitidas + 1; saida := saida || '✅ PERMITIDO (quadro) ';
      else duvidas := duvidas + 1;            saida := saida || '❔ INCONCLUSIVO       ';
    end case;
    saida := saida || rpad(split_part(est, '|', 2), 10) || rpad(split_part(est, '|', 3), 19)
             || rpad(split_part(est, '|', 4), 20) || split_part(est, '|', 5) || E'\n';
  end loop;
  raise exception E'RESULTADO: % fechadas · % abertas · % permitidas pelo quadro · % inconclusivas (tudo desfeito)\n%',
    fechadas, abertas, permitidas, duvidas, saida;
end
$$;
