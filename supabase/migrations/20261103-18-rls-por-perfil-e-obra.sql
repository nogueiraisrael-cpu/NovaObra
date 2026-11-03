-- fecha-provisorio-passo-10 (marca lida por tests/check-grants.mjs)
-- Passo 10, fase 5 (03/11/2026): o banco deixa de estar aberto. Desfaz a liberação provisória
-- das migrations -02, -05, -06, -09, -11, -12 e -13 e põe as regras definitivas, tiradas de
-- docs/permissoes/QUEM-PODE-O-QUE.md.
--
-- Quem não fez login (anon): nada. Conta pendente ou bloqueada: nada (privado.meu_perfil() só
-- devolve perfil de conta ATIVA). Cliente (v1.1): só vê as obras dele, nenhum lançamento ainda.
-- Engenheiro (admin_master): tudo, em todas as obras. Gerente: o dia a dia, só nas obras
-- liberadas em `membros`, sem Medições (dinheiro) e sem apagar o que o quadro reserva ao admin.

-- ── 1. Fora as regras provisórias e qualquer liberação para quem não fez login ────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'obras', 'funcionarios', 'equipamentos', 'frentes_servico', 'rdos', 'rdo_efetivo',
    'rdo_equipamentos', 'rdo_frentes', 'rdo_frente_equipe', 'fotos', 'materiais',
    'pedidos_material', 'insumos', 'movimentos_estoque', 'atividades', 'restricoes',
    'semana_atividades', 'subtarefas', 'medicoes', 'medicao_itens'] loop
    execute format('drop policy if exists "dev_provisorio_aberto" on public.%I', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  end loop;
end
$$;

-- ── 2. Quem é da equipe (Engenheiro ou Gerente, ativo) ────────────────────────────────────────
create function privado.sou_equipe() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(privado.meu_perfil() in ('admin_master', 'gerente'), false)
$$;
revoke execute on function privado.sou_equipe() from public, anon;
grant execute on function privado.sou_equipe() to authenticated, service_role;

-- ── 3. Lançamentos de obra: a equipe lê e grava nas obras que vê ──────────────────────────────
-- Apagar: o que o quadro dá ao gerente vai na lista "apaga_a_equipe"; o resto, só o admin.
do $$
declare
  t text;
  apaga_a_equipe text[] := array['rdo_efetivo', 'rdo_equipamentos', 'rdo_frente_equipe', 'fotos',
                                 'restricoes', 'semana_atividades', 'subtarefas'];
begin
  foreach t in array array[
    'frentes_servico', 'rdos', 'rdo_efetivo', 'rdo_equipamentos', 'rdo_frentes', 'rdo_frente_equipe',
    'fotos', 'insumos', 'atividades', 'restricoes', 'semana_atividades', 'subtarefas'] loop
    execute format($p$create policy "equipe_le" on public.%I for select to authenticated
      using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))$p$, t);
    execute format($p$create policy "equipe_cria" on public.%I for insert to authenticated
      with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))$p$, t);
    execute format($p$create policy "equipe_edita" on public.%I for update to authenticated
      using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))
      with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))$p$, t);
    if t = any (apaga_a_equipe) then
      execute format($p$create policy "equipe_apaga" on public.%I for delete to authenticated
        using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))$p$, t);
    else
      execute format($p$create policy "admin_apaga" on public.%I for delete to authenticated
        using ((select privado.sou_admin()))$p$, t);
    end if;
  end loop;
end
$$;

-- Pedidos de material: a equipe apaga só pedido ainda em "Solicitar" (quadro, pedidos.apagar).
create policy "equipe_le" on public.pedidos_material for select to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "equipe_cria" on public.pedidos_material for insert to authenticated
  with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "equipe_edita" on public.pedidos_material for update to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))
  with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "equipe_apaga_solicitar" on public.pedidos_material for delete to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id) and status = 'Solicitar');

-- Estoque: a equipe desfaz o movimento de um pedido (voltar a coluna); a baixa manual, só o admin
-- apaga (quadro, estoque.apagar_movimento).
create policy "equipe_le" on public.movimentos_estoque for select to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "equipe_cria" on public.movimentos_estoque for insert to authenticated
  with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "equipe_edita" on public.movimentos_estoque for update to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))
  with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "apaga_pedido_equipe_manual_admin" on public.movimentos_estoque for delete to authenticated
  using ((select privado.sou_admin()) or ((select privado.sou_equipe()) and privado.vejo_obra(obra_id) and origem = 'Pedido'));

-- ── 4. Medições (dinheiro): só o Engenheiro, em tudo ──────────────────────────────────────────
create policy "admin_tudo" on public.medicoes for all to authenticated
  using ((select privado.sou_admin())) with check ((select privado.sou_admin()));
create policy "admin_tudo" on public.medicao_itens for all to authenticated
  using ((select privado.sou_admin())) with check ((select privado.sou_admin()));

-- ── 5. Obras: cada um vê as dele (o admin, todas); só o admin cria, muda e apaga ─────────────
create policy "ve_as_suas" on public.obras for select to authenticated
  using (privado.vejo_obra(id));
create policy "admin_cria" on public.obras for insert to authenticated
  with check ((select privado.sou_admin()));
create policy "admin_edita" on public.obras for update to authenticated
  using ((select privado.sou_admin())) with check ((select privado.sou_admin()));
create policy "admin_apaga" on public.obras for delete to authenticated
  using ((select privado.sou_admin()));

-- ── 6. Cadastros que circulam entre obras: a equipe vê todos (só nome e função, sem dado
-- pessoal) porque o efetivo de um dia mostra quem veio de outra obra ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['funcionarios', 'equipamentos'] loop
    execute format($p$create policy "equipe_le" on public.%I for select to authenticated
      using ((select privado.sou_equipe()))$p$, t);
    execute format($p$create policy "equipe_cria" on public.%I for insert to authenticated
      with check ((select privado.sou_equipe()))$p$, t);
    execute format($p$create policy "equipe_edita" on public.%I for update to authenticated
      using ((select privado.sou_equipe())) with check ((select privado.sou_equipe()))$p$, t);
    execute format($p$create policy "admin_apaga" on public.%I for delete to authenticated
      using ((select privado.sou_admin()))$p$, t);
  end loop;
end
$$;

-- Catálogo de materiais: a equipe vê e cria; mudar ou apagar (vale para todas as obras), só o admin.
create policy "equipe_le" on public.materiais for select to authenticated
  using ((select privado.sou_equipe()));
create policy "equipe_cria" on public.materiais for insert to authenticated
  with check ((select privado.sou_equipe()));
create policy "admin_edita" on public.materiais for update to authenticated
  using ((select privado.sou_admin())) with check ((select privado.sou_admin()));
create policy "admin_apaga" on public.materiais for delete to authenticated
  using ((select privado.sou_admin()));
