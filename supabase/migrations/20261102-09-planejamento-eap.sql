-- Planejamento (Last Planner), etapa 1: a EAP — a árvore de atividades da obra.
-- Antecipado por decisão do dono em 02/11/2026 (o plano tinha "cronograma estilo Gantt"
-- fora da v1). As quatro sub-abas do Planejamento (EAP, Longo, Médio e Curto prazo) leem
-- esta mesma tabela; as próximas etapas acrescentam colunas e tabelas por cima dela.
--
-- atividades: cada linha é uma atividade de UMA obra. pai_id monta a árvore; o código
-- (1, 1.2, 1.2.1) NÃO é guardado: sai da posição (pai + ordem) em src/lib/planejamento.js,
-- então nunca desencontra quando alguém muda a ordem.
-- Atividade não se apaga: se arquiva (a EAP esconde, o histórico fica).
--
-- ⚠️ PROVISÓRIO — provisorio-passo-10: a regra de acesso no fim deste arquivo abre a
-- tabela para quem não fez login, como os arquivos -02-, -05- e -06-. O passo 10 troca.

create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  pai_id uuid,
  ordem integer not null check (ordem >= 0),
  titulo text not null check (length(trim(titulo)) > 0),
  data_inicio date not null,
  data_fim date not null,
  arquivada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atividades_id_obra unique (id, obra_id),
  constraint atividades_fim_depois_do_inicio check (data_fim >= data_inicio),
  constraint atividades_nao_e_pai_de_si check (pai_id is distinct from id),
  -- A atividade-mãe é da mesma obra.
  foreign key (pai_id, obra_id) references public.atividades (id, obra_id)
);
create index atividades_obra_pai_idx on public.atividades (obra_id, pai_id, ordem);
create index atividades_pai_idx on public.atividades (pai_id, obra_id);

create trigger atividades_updated_at before update on public.atividades
  for each row execute function public.tocar_updated_at();

alter table public.atividades enable row level security;

create policy "dev_provisorio_aberto" on public.atividades for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.atividades to anon, authenticated, service_role;
