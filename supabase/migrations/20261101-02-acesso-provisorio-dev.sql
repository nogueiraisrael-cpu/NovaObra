-- ⚠️ PROVISÓRIO — provisorio-passo-10
--
-- Regras ABERTAS de desenvolvimento, decididas pelo dono do produto em 01/11/2026:
-- o app ainda roda só no computador dele, SEM LOGIN, até o passo 10 do curso.
-- Enquanto isso, qualquer um que tenha a chave publicável lê e grava tudo,
-- de todas as obras. Isto contraria a regra 6 do AGENTS.md de propósito e por prazo.
--
-- O passo 10 (login e banco) APAGA este arquivo de efeito: cria profiles,
-- tira toda liberação de anon, e troca estas regras pelas de verdade
-- (Engenheiro vê todas as obras; Cliente só as dele em membros).
-- O check-grants deixa passar este arquivo por causa da marca acima,
-- mas avisa em toda rodada do npm run check enquanto ele existir.

do $$
declare
  t text;
begin
  foreach t in array array[
    'obras', 'funcionarios', 'equipamentos', 'frentes_servico', 'rdos',
    'rdo_efetivo', 'rdo_equipamentos', 'rdo_frentes', 'rdo_frente_equipe', 'fotos'
  ] loop
    execute format('create policy "dev_provisorio_aberto" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant select, insert, update, delete on public.obras to anon, authenticated, service_role;
grant select, insert, update, delete on public.funcionarios to anon, authenticated, service_role;
grant select, insert, update, delete on public.equipamentos to anon, authenticated, service_role;
grant select, insert, update, delete on public.frentes_servico to anon, authenticated, service_role;
grant select, insert, update, delete on public.rdos to anon, authenticated, service_role;
grant select, insert, update, delete on public.rdo_efetivo to anon, authenticated, service_role;
grant select, insert, update, delete on public.rdo_equipamentos to anon, authenticated, service_role;
grant select, insert, update, delete on public.rdo_frentes to anon, authenticated, service_role;
grant select, insert, update, delete on public.rdo_frente_equipe to anon, authenticated, service_role;
grant select, insert, update, delete on public.fotos to anon, authenticated, service_role;
