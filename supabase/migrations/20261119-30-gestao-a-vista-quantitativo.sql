-- Gestão à Vista: quadro de peças (quantitativo) e andamento contra a medição do contrato
-- (desenho aprovado pelo Israel em 19/11/2026: docs/superpowers/specs/2026-11-19-gestao-a-vista-quantitativo-design.md).
--
-- planta_quantitativos: quanto cada peça (rótulo, ex.: "S3") vale em cada etapa medida, numa planta.
--   Cada peça tem nome próprio; o valor de uma marcação é calculado na leitura a partir daqui
--   (src/lib/quantitativo.js), nunca gravado na marcação. `etapa` é texto, como em planta_marcacoes.
--   Um valor por (planta, peça, etapa); apagar a planta leva o quadro dela.
-- planta_etapas.item_medicao: o código do item do contrato (ex.: "2.1") que a etapa executa.
--   Texto, não ligação: as medições são reimportadas e os ids mudam.
-- plantas_visuais.conta_no_andamento: desligado numa planta substituída por revisão, para o
--   executado da obra não somar em dobro.
--
-- Quem pode: a equipe (Engenheiro e Gerente) lê, cria, edita e apaga o quadro nas obras que vê
-- (quadro: pranchas.editar). A ligação com a medição só aparece para o Engenheiro (a tela não
-- mostra ao Gerente; a medição já é só do Engenheiro pela migration -18).

create table public.planta_quantitativos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  planta_id uuid not null,
  rotulo text not null check (length(trim(rotulo)) > 0),
  etapa text not null check (length(trim(etapa)) > 0),
  quantidade numeric not null check (quantidade >= 0),
  criado_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planta_quantitativos_um_valor unique (planta_id, rotulo, etapa),
  foreign key (planta_id, obra_id) references public.plantas_visuais (id, obra_id) on delete cascade
);
create index planta_quantitativos_obra_planta_idx on public.planta_quantitativos (obra_id, planta_id);
create index planta_quantitativos_planta_obra_idx on public.planta_quantitativos (planta_id, obra_id);

alter table public.planta_quantitativos enable row level security;
grant select, insert, update, delete on public.planta_quantitativos to authenticated, service_role;
revoke all on public.planta_quantitativos from anon;

create policy "equipe_le" on public.planta_quantitativos for select to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "equipe_cria" on public.planta_quantitativos for insert to authenticated
  with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "equipe_edita" on public.planta_quantitativos for update to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))
  with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "equipe_apaga" on public.planta_quantitativos for delete to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));

create trigger planta_quantitativos_carimbo before insert or update on public.planta_quantitativos
  for each row execute function privado.carimbar();

alter table public.planta_etapas add column item_medicao text check (item_medicao is null or length(trim(item_medicao)) > 0);
alter table public.plantas_visuais add column conta_no_andamento boolean not null default true;
