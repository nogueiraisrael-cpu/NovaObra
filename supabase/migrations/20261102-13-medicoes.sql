-- Medições (v1.3), etapa 1: cada medição subida por planilha e as linhas de cada uma.
--
-- medicoes: uma linha por medição, do contrato (Boletim de Medição, aba BM) ou de um
-- empreiteiro (uma aba por medição). Os valores vêm da planilha; o app não recalcula.
-- O arquivo original ainda NÃO é guardado: arquivo_nome diz qual era, e caminho_planilha fica
-- vazio até o Storage entrar (aí "Baixar planilha original" passa a funcionar).
-- avisos: os avisos amarelos da conferência que o engenheiro aceitou ao importar.
--
-- medicao_itens: cada serviço lido da planilha. Saldo e % não são colunas: saem da conta
-- contratado − acumulado. Apagar a medição apaga as linhas dela (on delete cascade).
--
-- O texto do CHECK de tipo é IDÊNTICO a TIPOS_MEDICAO em src/lib/listas.js.
-- Quem vê: só o Engenheiro (o Cliente não vê custo). Entra nas regras do passo 10.
--
-- ⚠️ PROVISÓRIO — provisorio-passo-10: as regras de acesso no fim deste arquivo abrem as
-- tabelas para quem não fez login, como os arquivos -02-, -05-, -06-, -09-, -11- e -12-. O passo 10 troca.

create table public.medicoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  tipo text not null check (tipo in ('Contrato', 'Empreiteiro')),
  empreiteiro text,
  numero integer not null check (numero > 0),
  periodo_inicio date,
  periodo_fim date,
  data_medicao date not null,
  arquivo_nome text not null check (length(trim(arquivo_nome)) > 0),
  caminho_planilha text,
  aba_origem text not null,
  valor_periodo numeric(14,2) not null,
  desconto numeric(14,2),
  valor_a_pagar numeric(14,2),
  observacao text,
  avisos jsonb not null default '[]'::jsonb,
  importada_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medicoes_empreiteiro_conforme_tipo check (
    (tipo = 'Contrato' and empreiteiro is null)
    or (tipo = 'Empreiteiro' and length(trim(coalesce(empreiteiro, ''))) > 0)
  ),
  constraint medicoes_periodo_em_ordem check (periodo_inicio is null or periodo_fim is null or periodo_fim >= periodo_inicio),
  constraint medicoes_um_numero unique nulls not distinct (obra_id, tipo, empreiteiro, numero),
  constraint medicoes_id_obra unique (id, obra_id)
);

create table public.medicao_itens (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  medicao_id uuid not null,
  linha_planilha integer not null check (linha_planilha > 0),
  item text not null,
  etapa_codigo text,
  etapa_nome text,
  subetapa_codigo text,
  subetapa_nome text,
  descricao text not null,
  unidade text not null default '',
  preco_unitario numeric(14,4) not null,
  qtd_prevista numeric(14,4) not null,
  qtd_contratada numeric(14,4) not null,
  qtd_periodo numeric(14,4) not null,
  qtd_acumulada numeric(14,4) not null,
  valor_previsto numeric(14,2) not null,
  valor_contratado numeric(14,2) not null,
  valor_periodo numeric(14,2) not null,
  valor_acumulado numeric(14,2) not null,
  created_at timestamptz not null default now(),
  foreign key (medicao_id, obra_id) references public.medicoes (id, obra_id) on delete cascade
);
create index medicao_itens_obra_medicao_idx on public.medicao_itens (obra_id, medicao_id);
create index medicao_itens_medicao_idx on public.medicao_itens (medicao_id, obra_id);
create index medicao_itens_obra_item_idx on public.medicao_itens (obra_id, item);

create trigger medicoes_updated_at before update on public.medicoes
  for each row execute function public.tocar_updated_at();

alter table public.medicoes enable row level security;
alter table public.medicao_itens enable row level security;

create policy "dev_provisorio_aberto" on public.medicoes for all to anon, authenticated using (true) with check (true);
create policy "dev_provisorio_aberto" on public.medicao_itens for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.medicoes to anon, authenticated, service_role;
grant select, insert, update, delete on public.medicao_itens to anon, authenticated, service_role;
