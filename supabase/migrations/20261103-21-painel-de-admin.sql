-- Painel de admin (03/11/2026). Quem cuida das contas é a função admin-usuarios, com a chave de
-- serviço. O navegador deixa de mudar perfil e situação, mesmo o do admin: as travas (último admin,
-- a própria conta, bloquear também no login) moram na função, e nenhum caminho passa por fora dela.

create or replace function privado.proteger_perfil() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    if tg_op = 'UPDATE' then new.updated_at := now(); end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'perfil_so_pelo_cadastro' using errcode = '42501';
  end if;

  if new.id <> old.id or new.email <> old.email or new.created_at <> old.created_at then
    raise exception 'perfil_campo_travado' using errcode = '42501';
  end if;
  if new.role is distinct from old.role or new.status <> old.status then
    raise exception 'perfil_so_pelo_painel' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end
$$;

-- Excluir é um passo só: apagar o login leva o perfil e as obras liberadas dele. Os lançamentos NÃO
-- vão junto: as ligações de "quem criou" continuam sem cascata, então conta que lançou algo o banco
-- recusa inteira (nada fica pela metade).
alter table public.membros drop constraint membros_profile_id_fkey;
alter table public.membros add constraint membros_profile_id_fkey
  foreign key (profile_id) references public.profiles (id) on delete cascade;
alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;
