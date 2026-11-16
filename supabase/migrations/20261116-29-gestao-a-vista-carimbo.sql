-- Gestão à Vista no padrão das outras tabelas (decisão do Israel, 16/11/2026): no lugar de
-- created_by (ligado a auth.users, migration -27), o carimbo da migration -14:
--   criado_por  ligado a profiles, preenchido pelo próprio banco com quem está logado
--               (o app não escolhe) e que ninguém troca depois;
--   updated_at  a hora da última alteração.
-- As tabelas ainda não têm nenhuma linha: a troca não mexe em dado.
--
-- Saem junto o gatilho privado.planta_nao_muda_dono (o carimbo já segura o autor; mudar a obra
-- da planta o banco recusa pela ligação das marcações) e a condição "created_by = auth.uid()"
-- das regras de criar: com o carimbo, o autor é sempre quem está logado.

do $$
declare t text;
begin
  foreach t in array array['plantas_visuais', 'planta_etapas', 'planta_marcacoes'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_dono', t);
    execute format('drop policy "equipe_cria" on public.%I', t);
    execute format('alter table public.%I drop constraint %I', t, t || '_created_by_fkey');
    execute format('alter table public.%I rename column created_by to criado_por', t);
    execute format('alter table public.%I add constraint %I foreign key (criado_por) references public.profiles (id)', t, t || '_criado_por_fkey');
    execute format('alter table public.%I add column updated_at timestamptz not null default now()', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function privado.carimbar()', t || '_carimbo', t);
    execute format($p$create policy "equipe_cria" on public.%I for insert to authenticated
      with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))$p$, t);
  end loop;
end
$$;

drop function privado.planta_nao_muda_dono();
