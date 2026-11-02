-- Planejamento, etapa 3: o Médio prazo (lookahead) — as restrições das atividades.
--
-- restricoes: cada impedimento que precisa sair do caminho antes de a atividade poder
-- começar ("porcelanato não chegou", "projeto da cozinha não aprovado"). Fica na coluna
-- da semana do prazo; mover de semana é mudar o prazo. Os textos do CHECK de tipo são
-- IDÊNTICOS a TIPOS_RESTRICAO em src/lib/listas.js.
--
-- ⚠️ PROVISÓRIO — provisorio-passo-10: a regra de acesso no fim deste arquivo abre a
-- tabela para quem não fez login, como os arquivos -02-, -05-, -06- e -09-. O passo 10 troca.

create table public.restricoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  atividade_id uuid not null,
  descricao text not null check (length(trim(descricao)) > 0),
  tipo text not null
    check (tipo in ('Material', 'Mão de obra', 'Método', 'Equipamento', 'Projeto', 'Segurança', 'Logística')),
  prazo date not null,
  responsavel text not null check (length(trim(responsavel)) > 0),
  resolvida boolean not null default false,
  resolvida_em date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A atividade é da mesma obra.
  foreign key (atividade_id, obra_id) references public.atividades (id, obra_id),
  constraint restricoes_resolvida_tem_data check (resolvida = (resolvida_em is not null))
);
create index restricoes_obra_prazo_idx on public.restricoes (obra_id, prazo);
create index restricoes_atividade_idx on public.restricoes (atividade_id, obra_id);

create trigger restricoes_updated_at before update on public.restricoes
  for each row execute function public.tocar_updated_at();

alter table public.restricoes enable row level security;

create policy "dev_provisorio_aberto" on public.restricoes for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.restricoes to anon, authenticated, service_role;
