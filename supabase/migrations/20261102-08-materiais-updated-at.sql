-- "Última alteração" automática nas tabelas do módulo Materiais (pedido do dono em 02/11/2026).
-- updated_at nasce com a hora da criação e o próprio banco atualiza a cada mudança:
-- o app não precisa (nem deve) gravar essa coluna.

create function public.tocar_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

alter table public.materiais add column updated_at timestamptz not null default now();
alter table public.pedidos_material add column updated_at timestamptz not null default now();
alter table public.insumos add column updated_at timestamptz not null default now();
alter table public.movimentos_estoque add column updated_at timestamptz not null default now();

-- Linhas que já existiam: a última alteração conhecida é a criação.
update public.materiais set updated_at = created_at;
update public.pedidos_material set updated_at = created_at;
update public.insumos set updated_at = created_at;
update public.movimentos_estoque set updated_at = created_at;

create trigger materiais_updated_at before update on public.materiais
  for each row execute function public.tocar_updated_at();
create trigger pedidos_material_updated_at before update on public.pedidos_material
  for each row execute function public.tocar_updated_at();
create trigger insumos_updated_at before update on public.insumos
  for each row execute function public.tocar_updated_at();
create trigger movimentos_estoque_updated_at before update on public.movimentos_estoque
  for each row execute function public.tocar_updated_at();
