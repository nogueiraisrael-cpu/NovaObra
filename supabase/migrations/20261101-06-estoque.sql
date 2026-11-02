-- Estoque (opcional) dentro da aba Materiais. Trazido de volta por decisão do dono em 01/11/2026
-- (o plano tinha cortado): a entrada sai sozinha do pedido recebido, a baixa é manual.
--
-- insumos: um material controlado no estoque de UMA obra, com o saldo mínimo.
-- movimentos_estoque: cada entrada ou saída. O saldo NÃO é guardado: é a soma das
-- movimentações, então nunca desencontra da história (nem se a internet cair no meio).
-- Os textos dos CHECK são IDÊNTICOS aos de src/lib/listas.js.
--
-- ⚠️ PROVISÓRIO — provisorio-passo-10: as regras de acesso no fim deste arquivo abrem as
-- tabelas para quem não fez login, como os arquivos -02- e -05-. O passo 10 troca.

-- Quanto chegou de fato (perguntado no checklist quando não bate com a nota).
-- Os pedidos já recebidos ganham a quantidade pedida.
alter table public.pedidos_material add column qtd_recebida numeric(12, 2) check (qtd_recebida > 0);
update public.pedidos_material set qtd_recebida = quantidade
  where status in ('No almoxarifado', 'Entregue') and qtd_recebida is null;
alter table public.pedidos_material add constraint pedidos_recebido_tem_quantidade check (
  status not in ('No almoxarifado', 'Entregue') or qtd_recebida is not null);

create table public.insumos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  material_id uuid not null references public.materiais (id),
  -- 0 = sem mínimo definido (nunca fica "Crítico").
  saldo_minimo numeric(12, 2) not null default 0 check (saldo_minimo >= 0),
  created_at timestamptz not null default now(),
  constraint insumos_um_por_material unique (obra_id, material_id),
  constraint insumos_id_obra unique (id, obra_id)
);
create index insumos_material_idx on public.insumos (material_id);

create table public.movimentos_estoque (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  insumo_id uuid not null,
  tipo text not null check (tipo in ('Entrada', 'Saída')),
  quantidade numeric(12, 2) not null check (quantidade > 0),
  data date not null,
  frente text,
  origem text not null check (origem in ('Pedido', 'Manual')),
  -- O pedido que gerou a movimentação. Excluir o pedido não apaga o histórico do estoque.
  pedido_id uuid references public.pedidos_material (id) on delete set null,
  created_at timestamptz not null default now(),
  -- A movimentação é da mesma obra do insumo.
  foreign key (insumo_id, obra_id) references public.insumos (id, obra_id) on delete cascade,
  -- Um pedido gera no máximo uma entrada e uma saída (receber de novo não duplica).
  constraint movimentos_um_por_pedido unique (pedido_id, tipo),
  constraint movimentos_manual_sem_pedido check (origem = 'Pedido' or pedido_id is null)
);
create index movimentos_estoque_obra_insumo_idx on public.movimentos_estoque (obra_id, insumo_id, data);
create index movimentos_estoque_insumo_idx on public.movimentos_estoque (insumo_id, obra_id);

alter table public.insumos enable row level security;
alter table public.movimentos_estoque enable row level security;

create policy "dev_provisorio_aberto" on public.insumos for all to anon, authenticated using (true) with check (true);
create policy "dev_provisorio_aberto" on public.movimentos_estoque for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.insumos to anon, authenticated, service_role;
grant select, insert, update, delete on public.movimentos_estoque to anon, authenticated, service_role;
