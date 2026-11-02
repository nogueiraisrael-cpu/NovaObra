-- Planejamento, etapa 4: o Curto prazo (Kanban da semana + PPC).
--
-- semana_atividades: como cada atividade ficou NUMA semana (a semana é a segunda-feira):
-- A fazer, Em andamento ou Concluído, e se foi marcada "Não realizada" com a causa raiz.
-- Sem linha = "A fazer". O PPC da semana sai daqui (src/lib/curtoPrazo.js); não é guardado.
-- progresso_antes: o avanço da atividade antes de ela ir para Concluído (que põe 100%),
-- para devolver se ela voltar de coluna.
--
-- subtarefas: o checklist dentro de cada atividade (não depende da semana).
--
-- Os textos dos CHECK são IDÊNTICOS a STATUS_SEMANA e CAUSAS_NAO_REALIZADO em src/lib/listas.js.
--
-- ⚠️ PROVISÓRIO — provisorio-passo-10: as regras de acesso no fim deste arquivo abrem as
-- tabelas para quem não fez login, como os arquivos -02-, -05-, -06-, -09- e -11-. O passo 10 troca.

create table public.semana_atividades (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  atividade_id uuid not null,
  semana date not null check (extract(isodow from semana) = 1),
  status text not null default 'A fazer' check (status in ('A fazer', 'Em andamento', 'Concluído')),
  nao_realizada boolean not null default false,
  causa text check (causa in ('Material', 'Mão de obra', 'Projeto', 'Clima', 'Equipamento', 'Serviço anterior', 'Restrição não resolvida', 'Outro')),
  progresso_antes smallint check (progresso_antes between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (atividade_id, obra_id) references public.atividades (id, obra_id),
  constraint semana_atividades_uma_por_semana unique (atividade_id, semana),
  constraint semana_atividades_nao_realizada_tem_causa check (nao_realizada = (causa is not null)),
  constraint semana_atividades_concluida_foi_realizada check (not (nao_realizada and status = 'Concluído'))
);
create index semana_atividades_obra_semana_idx on public.semana_atividades (obra_id, semana);
create index semana_atividades_atividade_idx on public.semana_atividades (atividade_id, obra_id);

create table public.subtarefas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  atividade_id uuid not null,
  titulo text not null check (length(trim(titulo)) > 0),
  ordem integer not null check (ordem >= 0),
  feita boolean not null default false,
  nao_realizada boolean not null default false,
  causa text check (causa in ('Material', 'Mão de obra', 'Projeto', 'Clima', 'Equipamento', 'Serviço anterior', 'Restrição não resolvida', 'Outro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (atividade_id, obra_id) references public.atividades (id, obra_id),
  constraint subtarefas_nao_realizada_tem_causa check (nao_realizada = (causa is not null)),
  constraint subtarefas_feita_foi_realizada check (not (nao_realizada and feita))
);
create index subtarefas_obra_atividade_idx on public.subtarefas (obra_id, atividade_id, ordem);
create index subtarefas_atividade_idx on public.subtarefas (atividade_id, obra_id);

create trigger semana_atividades_updated_at before update on public.semana_atividades
  for each row execute function public.tocar_updated_at();
create trigger subtarefas_updated_at before update on public.subtarefas
  for each row execute function public.tocar_updated_at();

alter table public.semana_atividades enable row level security;
alter table public.subtarefas enable row level security;

create policy "dev_provisorio_aberto" on public.semana_atividades for all to anon, authenticated using (true) with check (true);
create policy "dev_provisorio_aberto" on public.subtarefas for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.semana_atividades to anon, authenticated, service_role;
grant select, insert, update, delete on public.subtarefas to anon, authenticated, service_role;
