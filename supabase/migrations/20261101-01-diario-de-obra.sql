-- Diário de Obra (v1.0): as obras, os cadastros que o RDO usa e o RDO do dia.
-- Fonte: PRD-BACKEND.md. Os textos dos CHECK são IDÊNTICOS aos de src/lib/listas.js
-- (acento e maiúscula inclusos): mudou lá, muda aqui no mesmo lote.
--
-- Multi-obra: toda tabela de lançamento tem obra_id obrigatório. As tabelas filhas
-- do RDO apontam para (rdo_id, obra_id) juntos, então o banco recusa uma linha
-- pendurada no RDO de uma obra dizendo ser de outra.
--
-- Fica para o passo 10 (login): a tabela profiles, a ligação de criado_por /
-- fechado_por / enviada_por com ela, e as regras de acesso de verdade.
-- Datas do dia (date) sempre vêm do app (hojeISO): nada de current_date aqui,
-- porque o banco está em UTC e à noite já seria amanhã.

-- ---------------------------------------------------------------- obras
create table public.obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text not null unique,
  tipo text not null check (tipo in ('Licitação', 'Alto padrão')),
  endereco text,
  cidade text not null,
  cliente text,
  numero_contrato text,
  data_inicio date not null,
  data_meta_entrega date,
  situacao text not null default 'Em andamento' check (situacao in ('Em andamento', 'Parada', 'Concluída')),
  created_at timestamptz not null default now(),
  constraint obras_meta_depois_do_inicio check (data_meta_entrega is null or data_meta_entrega >= data_inicio)
);
create index obras_situacao_idx on public.obras (situacao);

-- ---------------------------------------------------------------- cadastros que circulam entre obras
-- obra_id aqui é a lotação atual e pode ser vazio (exceção consciente do AGENTS.md).
create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  funcao text not null check (funcao in ('Pedreiro', 'Servente', 'Carpinteiro', 'Armador', 'Eletricista', 'Encanador', 'Pintor', 'Mestre', 'Outro')),
  obra_id uuid references public.obras (id),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index funcionarios_obra_idx on public.funcionarios (obra_id);

create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text,
  situacao text not null check (situacao in ('Na obra', 'No conserto', 'No depósito')),
  obra_id uuid references public.obras (id),
  situacao_desde date not null,
  oficina text,
  previsao_retorno date,
  defeito text,
  created_at timestamptz not null default now(),
  -- "Na obra" exige a obra; fora dela, obra_id fica vazio.
  constraint equipamentos_obra_so_quando_na_obra check ((situacao = 'Na obra') = (obra_id is not null)),
  constraint equipamentos_conserto_tem_oficina check (situacao <> 'No conserto' or oficina is not null)
);
create index equipamentos_obra_idx on public.equipamentos (obra_id);
create index equipamentos_situacao_idx on public.equipamentos (situacao);

-- ---------------------------------------------------------------- frentes de serviço
create table public.frentes_servico (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  nome text not null,
  etapa text not null check (etapa in ('Fundação', 'Estrutura / Concretagem', 'Alvenaria', 'Reboco de fachada', 'Reboco interno',
    'Revestimento cerâmico', 'Instalações hidrossanitárias', 'Instalações elétricas', 'Impermeabilização', 'Cobertura', 'Pintura', 'Outro')),
  executor text not null check (executor in ('Equipe própria', 'Terceirizado')),
  empreiteiro text,
  situacao text not null default 'Não iniciada' check (situacao in ('Não iniciada', 'Em execução', 'Parada', 'Concluída')),
  parada_desde date,
  motivo_parada text check (motivo_parada in ('Falta de material', 'Falta de mão de obra', 'Chuva', 'Aguardando projeto',
    'Aguardando cliente', 'Aguardando terceirizado', 'Outro')),
  data_inicio date,
  data_conclusao date,
  created_at timestamptz not null default now(),
  constraint frentes_terceirizado_tem_empreiteiro check (executor <> 'Terceirizado' or nullif(trim(empreiteiro), '') is not null),
  constraint frentes_concluida_tem_data check (situacao <> 'Concluída' or data_conclusao is not null),
  unique (id, obra_id)
);
create index frentes_servico_obra_situacao_idx on public.frentes_servico (obra_id, situacao);

-- ---------------------------------------------------------------- o RDO do dia
create table public.rdos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  data date not null,
  clima_manha text not null default 'Bom' check (clima_manha in ('Bom', 'Nublado', 'Chuva leve', 'Chuva forte')),
  clima_tarde text not null default 'Bom' check (clima_tarde in ('Bom', 'Nublado', 'Chuva leve', 'Chuva forte')),
  praticavel_manha boolean not null default true,
  praticavel_tarde boolean not null default true,
  observacoes text,
  status text not null default 'Em andamento' check (status in ('Em andamento', 'Fechado')),
  criado_por uuid,
  fechado_por uuid,
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  -- Um RDO por obra por dia; o índice desta regra também serve à busca (obra_id, data).
  constraint rdos_um_por_obra_por_dia unique (obra_id, data),
  unique (id, obra_id),
  unique (id, obra_id, data)
);

create table public.rdo_efetivo (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null,
  obra_id uuid not null references public.obras (id),
  data date not null,
  funcionario_id uuid not null references public.funcionarios (id),
  situacao text not null check (situacao in ('Presente', 'Falta', 'Atestado', 'Deslocado', 'Veio de outra obra')),
  obra_destino_id uuid references public.obras (id),
  created_at timestamptz not null default now(),
  foreign key (rdo_id, obra_id, data) references public.rdos (id, obra_id, data) on delete cascade,
  constraint rdo_efetivo_um_por_funcionario unique (rdo_id, funcionario_id),
  constraint rdo_efetivo_deslocado_tem_destino check (situacao <> 'Deslocado' or obra_destino_id is not null)
);
-- A TRAVA DE DUAS OBRAS mora aqui: o mesmo funcionário presente uma vez só por dia, somando todas as obras.
create unique index rdo_efetivo_uma_presenca_por_dia on public.rdo_efetivo (funcionario_id, data)
  where situacao in ('Presente', 'Veio de outra obra');
create index rdo_efetivo_obra_data_idx on public.rdo_efetivo (obra_id, data);
create index rdo_efetivo_data_idx on public.rdo_efetivo (data);

create table public.rdo_equipamentos (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null,
  obra_id uuid not null references public.obras (id),
  equipamento_id uuid not null references public.equipamentos (id),
  situacao text not null check (situacao in ('Operando', 'Parado', 'Quebrado')),
  observacao text,
  created_at timestamptz not null default now(),
  foreign key (rdo_id, obra_id) references public.rdos (id, obra_id) on delete cascade,
  constraint rdo_equipamentos_um_por_equipamento unique (rdo_id, equipamento_id)
);
create index rdo_equipamentos_obra_idx on public.rdo_equipamentos (obra_id);

create table public.rdo_frentes (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid not null,
  obra_id uuid not null references public.obras (id),
  frente_id uuid not null,
  situacao text not null check (situacao in ('Em execução', 'Parada', 'Concluída')),
  motivo_parada text check (motivo_parada in ('Falta de material', 'Falta de mão de obra', 'Chuva', 'Aguardando projeto',
    'Aguardando cliente', 'Aguardando terceirizado', 'Outro')),
  descricao text,
  created_at timestamptz not null default now(),
  foreign key (rdo_id, obra_id) references public.rdos (id, obra_id) on delete cascade,
  foreign key (frente_id, obra_id) references public.frentes_servico (id, obra_id),
  constraint rdo_frentes_uma_por_frente unique (rdo_id, frente_id),
  constraint rdo_frentes_parada_tem_motivo check (situacao <> 'Parada' or motivo_parada is not null),
  unique (id, obra_id)
);
create index rdo_frentes_obra_idx on public.rdo_frentes (obra_id);

create table public.rdo_frente_equipe (
  id uuid primary key default gen_random_uuid(),
  rdo_frente_id uuid not null,
  obra_id uuid not null references public.obras (id),
  funcionario_id uuid not null references public.funcionarios (id),
  created_at timestamptz not null default now(),
  foreign key (rdo_frente_id, obra_id) references public.rdo_frentes (id, obra_id) on delete cascade,
  constraint rdo_frente_equipe_uma_vez unique (rdo_frente_id, funcionario_id)
);
create index rdo_frente_equipe_obra_idx on public.rdo_frente_equipe (obra_id);

-- Fotos: por enquanto o banco guarda só o endereço (caminho). O Storage entra depois.
create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  rdo_id uuid,
  rdo_frente_id uuid references public.rdo_frentes (id) on delete cascade,
  caminho text not null,
  legenda text,
  visivel_cliente boolean not null default true,
  enviada_por uuid,
  created_at timestamptz not null default now(),
  foreign key (rdo_id, obra_id) references public.rdos (id, obra_id) on delete cascade
);
create index fotos_obra_idx on public.fotos (obra_id);
create index fotos_rdo_idx on public.fotos (rdo_id);
create index fotos_rdo_frente_idx on public.fotos (rdo_frente_id);

-- RLS ligada em todas, desde já. Sem nenhuma regra, ninguém lê nem grava:
-- as regras provisórias de desenvolvimento estão no arquivo seguinte (-02-).
alter table public.obras enable row level security;
alter table public.funcionarios enable row level security;
alter table public.equipamentos enable row level security;
alter table public.frentes_servico enable row level security;
alter table public.rdos enable row level security;
alter table public.rdo_efetivo enable row level security;
alter table public.rdo_equipamentos enable row level security;
alter table public.rdo_frentes enable row level security;
alter table public.rdo_frente_equipe enable row level security;
alter table public.fotos enable row level security;
