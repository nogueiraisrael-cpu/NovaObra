-- Achado da revisão de código (03/11/2026): a regra de profiles deixava o gerente ler o
-- e-mail, o perfil e a situação de todo mundo, mas o quadro diz que só o admin vê a lista de
-- usuários (usuarios.ver). O gerente precisa só dos NOMES ("fechado por Eng. Ricardo").
--
-- Agora: cada um lê o próprio perfil; só o admin lê os outros. Os nomes da equipe saem por
-- uma função que devolve apenas id e nome, para quem é admin ou gerente ativo.

drop policy "le_o_proprio_ou_equipe" on public.profiles;
create policy "le_o_proprio_ou_admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or privado.sou_admin());

create function public.nomes_da_equipe() returns table (id uuid, nome text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.nome from public.profiles p
  where privado.meu_perfil() in ('admin_master', 'gerente')
$$;
revoke execute on function public.nomes_da_equipe() from public, anon;
grant execute on function public.nomes_da_equipe() to authenticated, service_role;
