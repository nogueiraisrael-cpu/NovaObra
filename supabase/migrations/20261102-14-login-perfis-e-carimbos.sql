-- Passo 10, fase 1 (02/11/2026): quem é quem, quem vê qual obra, e o carimbo
-- "quem criou / última alteração" em toda tabela. Segue docs/permissoes/QUEM-PODE-O-QUE.md.
--
-- Ainda NÃO troca as regras provisórias das 20 tabelas (fase 5): o app continua
-- funcionando sem login enquanto o login é construído.

-- ── Funções das regras: num schema que o app não enxerga pela API ──────────────
create schema privado;
grant usage on schema privado to authenticated, service_role;

-- ── profiles: uma linha por login ─────────────────────────────────────────────
-- Perfil e situação são duas coisas (quadro, seção 1). Conta pendente ainda não tem
-- perfil: quem escolhe é o admin, ao liberar. Ninguém se apaga: bloqueia.
create table public.profiles (
  id uuid primary key references auth.users (id),
  nome text not null default '',
  email text not null default '',
  role text check (role in ('admin_master', 'gerente', 'cliente')),
  status text not null default 'pendente' check (status in ('pendente', 'ativo', 'bloqueado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ativo_tem_perfil check (status <> 'ativo' or role is not null)
);

-- ── membros: quais obras o gerente e o cliente veem (o admin vê todas) ─────────
create table public.membros (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  profile_id uuid not null references public.profiles (id),
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (obra_id, profile_id)
);
create index membros_profile on public.membros (profile_id);

-- ── Quem está pedindo (usadas nas regras; security definer para não cair em laço de RLS) ──
create function privado.meu_perfil() returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid()) and status = 'ativo'
$$;

create function privado.sou_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(privado.meu_perfil() = 'admin_master', false)
$$;

create function privado.vejo_obra(obra uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select privado.sou_admin() or exists (
    select 1 from public.membros m
    join public.profiles p on p.id = m.profile_id and p.status = 'ativo'
    where m.obra_id = obra and m.profile_id = (select auth.uid())
  )
$$;

revoke execute on function privado.meu_perfil(), privado.sou_admin(), privado.vejo_obra(uuid) from public, anon;
grant execute on function privado.meu_perfil(), privado.sou_admin(), privado.vejo_obra(uuid) to authenticated, service_role;

-- ── Cadastro novo vira perfil sozinho ─────────────────────────────────────────
-- O PRIMEIRO cadastro do app vira admin_master ativo (o Israel). Os demais nascem
-- pendentes, sem perfil, até o admin liberar. A trava da tabela impede que dois
-- cadastros ao mesmo tempo virem dois "primeiros".
create function privado.criar_perfil() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  primeiro boolean;
begin
  lock table public.profiles in share row exclusive mode;
  primeiro := not exists (select 1 from public.profiles);
  insert into public.profiles (id, nome, email, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    case when primeiro then 'admin_master' end,
    case when primeiro then 'ativo' else 'pendente' end
  );
  return new;
end
$$;
revoke execute on function privado.criar_perfil() from public, anon, authenticated;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function privado.criar_perfil();

-- ── A porta mais esquecida: ninguém se promove nem se aprova pelo navegador ────
-- Vale para quem chega pela API (anon/authenticated). O painel e os gatilhos do
-- próprio banco passam direto.
create function privado.proteger_perfil() returns trigger
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
    if not privado.sou_admin() then
      raise exception 'so_admin_muda_perfil' using errcode = '42501';
    end if;
    -- Ninguém muda o próprio perfil nem a própria situação: assim o app nunca fica
    -- sem um admin ativo (o último não consegue se rebaixar nem se bloquear).
    if new.id = (select auth.uid()) then
      raise exception 'nao_muda_o_proprio_perfil' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger profiles_proteger before insert or update on public.profiles
  for each row execute function privado.proteger_perfil();

-- ── Regras de profiles e membros (definitivas, não provisórias) ───────────────
alter table public.profiles enable row level security;
alter table public.membros enable row level security;

-- Cada um lê o próprio perfil (o pendente precisa, para ver o aviso). O admin e o
-- gerente leem os nomes de todos ("fechado por Eng. Ricardo"); o cliente não.
create policy "le_o_proprio_ou_equipe" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or privado.meu_perfil() in ('admin_master', 'gerente'));
-- O ativo muda o próprio nome; o admin muda os outros. O gatilho acima trava o resto.
create policy "edita_o_proprio_ou_admin" on public.profiles for update to authenticated
  using ((id = (select auth.uid()) and privado.meu_perfil() is not null) or privado.sou_admin())
  with check ((id = (select auth.uid()) and privado.meu_perfil() is not null) or privado.sou_admin());

create policy "le_as_proprias_ou_admin" on public.membros for select to authenticated
  using ((profile_id = (select auth.uid()) and privado.meu_perfil() is not null) or privado.sou_admin());
create policy "so_admin_libera_obra" on public.membros for insert to authenticated
  with check (privado.sou_admin());
create policy "so_admin_muda_obra" on public.membros for update to authenticated
  using (privado.sou_admin()) with check (privado.sou_admin());
create policy "so_admin_tira_obra" on public.membros for delete to authenticated
  using (privado.sou_admin());

-- Ninguém cria nem apaga perfil pelo app (nasce do cadastro, sai por bloqueio).
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.membros to authenticated, service_role;

-- ── Carimbo em toda tabela: quem criou e a última alteração ───────────────────
-- O banco preenche: quem criou é sempre quem está logado (o app não escolhe, e
-- ninguém troca o dono depois); a última alteração é a hora de cada mudança.
-- Substitui tocar_updated_at (migration -08).
create function privado.carimbar() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if current_user in ('anon', 'authenticated') then new.criado_por := (select auth.uid()); end if;
  else
    new.criado_por := old.criado_por;
    new.updated_at := now();
  end if;
  return new;
end
$$;
revoke execute on function privado.carimbar() from public;

do $$
declare
  t text;
begin
  foreach t in array array[
    'obras', 'funcionarios', 'equipamentos', 'frentes_servico', 'rdos', 'rdo_efetivo',
    'rdo_equipamentos', 'rdo_frentes', 'rdo_frente_equipe', 'fotos', 'materiais',
    'pedidos_material', 'insumos', 'movimentos_estoque', 'atividades', 'restricoes',
    'semana_atividades', 'subtarefas', 'medicoes', 'medicao_itens', 'membros'] loop
    execute format('alter table public.%I add column if not exists criado_por uuid', t);
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);
    -- NOT VALID: as linhas de exemplo antigas guardam códigos de pessoa que ainda não
    -- têm login (Eng. Israel, Eng. Ricardo). Linha nova é conferida normalmente.
    execute format('alter table public.%I add constraint %I foreign key (criado_por) references public.profiles (id) not valid',
      t, t || '_criado_por_fkey');
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
  end loop;
end
$$;

-- Linhas que já existiam sem a coluna: a última alteração conhecida é a criação.
-- (Antes de ligar o carimbo, que trocaria pela hora de agora.)
update public.obras set updated_at = created_at;
update public.funcionarios set updated_at = created_at;
update public.equipamentos set updated_at = created_at;
update public.frentes_servico set updated_at = created_at;
update public.rdos set updated_at = created_at;
update public.rdo_efetivo set updated_at = created_at;
update public.rdo_equipamentos set updated_at = created_at;
update public.rdo_frentes set updated_at = created_at;
update public.rdo_frente_equipe set updated_at = created_at;
update public.fotos set updated_at = created_at;
update public.medicao_itens set updated_at = created_at;

do $$
declare
  t text;
begin
  foreach t in array array[
    'obras', 'funcionarios', 'equipamentos', 'frentes_servico', 'rdos', 'rdo_efetivo',
    'rdo_equipamentos', 'rdo_frentes', 'rdo_frente_equipe', 'fotos', 'materiais',
    'pedidos_material', 'insumos', 'movimentos_estoque', 'atividades', 'restricoes',
    'semana_atividades', 'subtarefas', 'medicoes', 'medicao_itens', 'membros'] loop
    execute format('create trigger %I before insert or update on public.%I for each row execute function privado.carimbar()',
      t || '_carimbo', t);
  end loop;
end
$$;

drop function public.tocar_updated_at();
