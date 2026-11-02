-- Materiais (quadro de pedidos) — aba Materiais dentro da obra.
-- Antecipado da v2 por decisão do dono em 01/11/2026. A comparação com a planilha
-- de medição e o aditivo continuam na v2, por cima destas tabelas.
--
-- materiais: o catálogo, igual para todas as obras (não é lançamento, não tem obra_id).
-- pedidos_material: cada pedido é um lote ("50 sacos de cimento") de UMA obra,
-- que anda pelas colunas Solicitar → Em cotação → Comprado → No almoxarifado → Entregue.
-- Os textos dos CHECK são IDÊNTICOS aos de src/lib/listas.js.
--
-- ⚠️ PROVISÓRIO — provisorio-passo-10: as regras de acesso no fim deste arquivo abrem as
-- duas tabelas para quem não fez login, como o arquivo -02- faz com as outras dez.
-- O passo 10 troca pelas regras de verdade (Engenheiro vê todas; Cliente não vê pedidos).

create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  unidade text not null,
  categoria text not null check (categoria in ('Material grosso', 'Acabamento', 'Instalações')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.pedidos_material (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  material_id uuid not null references public.materiais (id),
  quantidade numeric(12, 2) not null check (quantidade > 0),
  frente text not null check (length(trim(frente)) > 0),
  prioridade text not null default 'Normal' check (prioridade in ('Normal', 'Crítico')),
  status text not null default 'Solicitar'
    check (status in ('Solicitar', 'Em cotação', 'Comprado', 'No almoxarifado', 'Entregue')),
  fornecedor text,
  previsao_entrega date,
  -- Checklist de recebimento (ao entrar no almoxarifado).
  qtd_bate_nf boolean,
  estado_ok boolean,
  avarias text,
  -- Provisório até o Storage: a foto da NF encolhida, dentro do próprio endereço (como em fotos).
  foto_nf text,
  -- [{ "status": "...", "data": "AAAA-MM-DD" }, ...] — de onde saem o aging e o lead time.
  -- Mora na própria linha: mudar de coluna é UMA gravação, sem ficar pela metade.
  historico jsonb not null default '[]' check (jsonb_typeof(historico) = 'array'),
  criado_por uuid,
  created_at timestamptz not null default now(),
  constraint pedidos_comprado_tem_fornecedor check (
    status not in ('Comprado', 'No almoxarifado', 'Entregue')
    or (fornecedor is not null and previsao_entrega is not null)),
  constraint pedidos_recebido_tem_checklist check (
    status not in ('No almoxarifado', 'Entregue')
    or (qtd_bate_nf is not null and estado_ok is not null))
);
create index pedidos_material_obra_status_idx on public.pedidos_material (obra_id, status);
create index pedidos_material_material_idx on public.pedidos_material (material_id);

alter table public.materiais enable row level security;
alter table public.pedidos_material enable row level security;

create policy "dev_provisorio_aberto" on public.materiais for all to anon, authenticated using (true) with check (true);
create policy "dev_provisorio_aberto" on public.pedidos_material for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.materiais to anon, authenticated, service_role;
grant select, insert, update, delete on public.pedidos_material to anon, authenticated, service_role;
