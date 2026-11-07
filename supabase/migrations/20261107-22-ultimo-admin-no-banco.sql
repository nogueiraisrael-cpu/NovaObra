-- Achado da revisão de código (07/11/2026): a trava "o último Engenheiro ativo não sai" morava só na
-- função admin-usuarios, que conta os admins e depois grava. Dois admins bloqueando um ao outro ao
-- mesmo tempo passavam os dois pela contagem, e o app ficava sem administrador.
--
-- Agora o banco garante, para qualquer caminho (função, painel do Supabase, SQL): mudar ou apagar
-- um perfil que deixa de ser admin ativo entra numa fila (trava nomeada), reconta e recusa se ele era o
-- último. O segundo pedido espera o primeiro terminar e reconta já vendo o que o primeiro gravou.

create function privado.manter_um_admin() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  saindo boolean := old.role = 'admin_master' and old.status = 'ativo'
    and (tg_op = 'DELETE' or new.role is distinct from 'admin_master' or new.status <> 'ativo');
begin
  if saindo then
    perform pg_advisory_xact_lock(hashtext('nova_obra.ultimo_admin'));
    if not exists (select 1 from public.profiles p
                   where p.id <> old.id and p.role = 'admin_master' and p.status = 'ativo') then
      raise exception 'ultimo_admin' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;
revoke execute on function privado.manter_um_admin() from public, anon, authenticated;

create trigger profiles_manter_um_admin before update or delete on public.profiles
  for each row execute function privado.manter_um_admin();
