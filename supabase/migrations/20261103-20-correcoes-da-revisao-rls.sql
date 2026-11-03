-- Achados da revisão de código da fase 5 (03/11/2026).

-- 1. Estoque: o gerente só mexe em movimento que veio de pedido. Antes, pela API, ele podia
--    trocar uma baixa manual para "Pedido" e depois apagá-la (quadro: apagar baixa manual só o admin).
drop policy "equipe_edita" on public.movimentos_estoque;
create policy "edita_pedido_equipe_manual_admin" on public.movimentos_estoque for update to authenticated
  using ((select privado.sou_admin()) or ((select privado.sou_equipe()) and privado.vejo_obra(obra_id) and origem = 'Pedido'))
  with check ((select privado.sou_admin()) or ((select privado.sou_equipe()) and privado.vejo_obra(obra_id) and origem = 'Pedido'));

-- 2. A trava "mesmo funcionário presente em duas obras no mesmo dia" lê as outras obras de
--    propósito (AGENTS.md, regra 3). Com a RLS, o gerente não via as obras que não são dele, e o
--    diário dele podia nascer sem efetivo. Esta função entrega SÓ o efetivo do dia (quem está em
--    qual obra), de todas as obras, para quem é da equipe. Nada além disso das outras obras.
create function public.efetivo_do_dia(dia date)
returns table (id uuid, rdo_id uuid, obra_id uuid, data date, funcionario_id uuid, situacao text, obra_destino_id uuid)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.rdo_id, e.obra_id, e.data, e.funcionario_id, e.situacao, e.obra_destino_id
  from public.rdo_efetivo e
  where e.data = dia and privado.sou_equipe()
$$;
revoke execute on function public.efetivo_do_dia(date) from public, anon;
grant execute on function public.efetivo_do_dia(date) to authenticated, service_role;

-- 3. Funcionários e equipamentos: o gerente LÊ todos (o efetivo mostra quem veio de outra obra),
--    mas só muda os das obras dele e os que estão sem obra (quadro, seção 2).
do $$
declare t text;
begin
  foreach t in array array['funcionarios', 'equipamentos'] loop
    execute format('drop policy "equipe_edita" on public.%I', t);
    execute format($p$create policy "equipe_edita_os_seus" on public.%I for update to authenticated
      using ((select privado.sou_admin()) or ((select privado.sou_equipe()) and (obra_id is null or privado.vejo_obra(obra_id))))
      with check ((select privado.sou_admin()) or ((select privado.sou_equipe()) and (obra_id is null or privado.vejo_obra(obra_id))))$p$, t);
    execute format('drop policy "equipe_cria" on public.%I', t);
    execute format($p$create policy "equipe_cria_nos_seus" on public.%I for insert to authenticated
      with check ((select privado.sou_admin()) or ((select privado.sou_equipe()) and (obra_id is null or privado.vejo_obra(obra_id))))$p$, t);
  end loop;
end
$$;

-- 4. Diário: nem o admin apaga dia fechado ou com fotos (quadro: "Apagar · só o dia não fechado e
--    sem fotos"; as fotos não saem junto com o diário).
drop policy "admin_apaga" on public.rdos;
create policy "admin_apaga_aberto_sem_foto" on public.rdos for delete to authenticated
  using ((select privado.sou_admin()) and status <> 'Fechado'
         and not exists (select 1 from public.fotos f where f.rdo_id = rdos.id));
