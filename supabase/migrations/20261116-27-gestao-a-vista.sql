-- Gestão à Vista (a aba "Pranchas" do quadro, renomeada em 16/11/2026): a planta da obra com o
-- avanço pintado por cima.
--
-- plantas_visuais: a planta (uma por pavimento, normalmente). A imagem mora no Storage, pasta
--   privada "fotos", em <obra_id>/plantas/<id>.png|.jpg; aqui fica só o CAMINHO (o endereço para
--   mostrar é assinado na leitura e nunca se grava). largura/altura são os pixels da imagem: toda
--   marcação é guardada nesse sistema, nunca em pixels de tela. textos = a camada de texto do PDF
--   ([{s,x,y}] em pixels da imagem), que sugere o nome da peça ao marcar.
-- planta_etapas: as etapas da obra (Escavado, Forma...), iguais para todas as plantas dela.
-- planta_marcacoes: cada desenho, como VETOR (pontos em JSON), nunca queimado na imagem.
--   `etapa` é TEXTO, não chave estrangeira: apagar a etapa da configuração não some com as
--   marcações antigas. Avançar de etapa não muda a linha: nasce outra com `substitui` apontando
--   a anterior (é o histórico da peça). Lote/nota (caminhão de concreto) são atributos, não etapa.
--   `data` vem sempre do app (hojeISO): o banco está em UTC e à noite já seria amanhã.
--
-- Os vocabulários (tipo, unidade, espessura) são IDÊNTICOS aos de src/lib/listas.js.
--
-- Quem pode (quadro, "Gestão à Vista"): ler, criar e editar, a equipe nas obras que vê; apagar
-- marcação ("pintar e desfazer") e etapa, a equipe; apagar planta, só o Engenheiro, e leva as
-- marcações junto (decisão do Israel em 16/11/2026, igual à medição). O Cliente ainda não lê
-- nenhum lançamento (v1.1).

create table public.plantas_visuais (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  nome text not null check (length(trim(nome)) > 0),
  pavimento text,
  caminho_imagem text not null check (length(caminho_imagem) > 0),
  largura integer not null check (largura > 0 and largura <= 8000),
  altura integer not null check (altura > 0 and altura <= 8000),
  textos jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint plantas_visuais_id_obra unique (id, obra_id)
);
create index plantas_visuais_obra_idx on public.plantas_visuais (obra_id, created_at);

create table public.planta_etapas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  nome text not null check (length(trim(nome)) > 0),
  cor text not null check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem integer not null default 0,
  ativa boolean not null default true,
  meta numeric check (meta is null or meta > 0),
  unidade text not null default 'un' check (unidade in ('un', 'm²', 'm', 'm³', 'kg', 't')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint planta_etapas_um_nome unique (obra_id, nome)
);
create index planta_etapas_obra_idx on public.planta_etapas (obra_id, ordem);

create table public.planta_marcacoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  planta_id uuid not null,
  etapa text not null check (length(trim(etapa)) > 0),
  cor text not null check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  tipo text not null check (tipo in ('pincel', 'ret', 'seta')),
  pontos jsonb not null,
  data date not null,
  rotulo text,
  quantidade numeric check (quantidade is null or quantidade >= 0),
  rotacao numeric not null default 0,
  espessura numeric not null default 1 check (espessura in (0.5, 1, 2)),
  lote text,
  nota text,
  lote_cor text check (lote_cor is null or lote_cor ~ '^#[0-9A-Fa-f]{6}$'),
  substitui uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint planta_marcacoes_id_planta unique (id, planta_id),
  -- A marcação é da mesma obra da planta, e apagar a planta leva as marcações.
  foreign key (planta_id, obra_id) references public.plantas_visuais (id, obra_id) on delete cascade,
  -- `substitui` aponta uma marcação da MESMA planta. Apagar a anterior não apaga a nova (só solta).
  foreign key (substitui, planta_id) references public.planta_marcacoes (id, planta_id) on delete set null (substitui),
  constraint planta_marcacoes_nao_se_substitui check (substitui is null or substitui <> id)
);
create index planta_marcacoes_obra_planta_idx on public.planta_marcacoes (obra_id, planta_id);
create index planta_marcacoes_obra_data_idx on public.planta_marcacoes (obra_id, data);
create index planta_marcacoes_planta_obra_idx on public.planta_marcacoes (planta_id, obra_id);
create index planta_marcacoes_substitui_idx on public.planta_marcacoes (substitui, planta_id);

-- ── Regras ───────────────────────────────────────────────────────────────────────────────────
alter table public.plantas_visuais enable row level security;
alter table public.planta_etapas enable row level security;
alter table public.planta_marcacoes enable row level security;

grant select, insert, update, delete on public.plantas_visuais to authenticated, service_role;
grant select, insert, update, delete on public.planta_etapas to authenticated, service_role;
grant select, insert, update, delete on public.planta_marcacoes to authenticated, service_role;

do $$
declare t text;
begin
  foreach t in array array['plantas_visuais', 'planta_etapas', 'planta_marcacoes'] loop
    execute format($p$create policy "equipe_le" on public.%I for select to authenticated
      using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))$p$, t);
    -- Quem cria é quem está logado: ninguém grava marcação no nome de outro.
    execute format($p$create policy "equipe_cria" on public.%I for insert to authenticated
      with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id) and created_by = (select auth.uid()))$p$, t);
    execute format($p$create policy "equipe_edita" on public.%I for update to authenticated
      using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))
      with check ((select privado.sou_equipe()) and privado.vejo_obra(obra_id))$p$, t);
  end loop;
end
$$;

create policy "admin_apaga" on public.plantas_visuais for delete to authenticated
  using ((select privado.sou_admin()));
create policy "equipe_apaga" on public.planta_etapas for delete to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));
create policy "equipe_apaga" on public.planta_marcacoes for delete to authenticated
  using ((select privado.sou_equipe()) and privado.vejo_obra(obra_id));

-- Ninguém troca o autor nem a obra/planta de uma linha depois de criada.
create function privado.planta_nao_muda_dono() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by or new.obra_id is distinct from old.obra_id then
    raise exception 'Não se muda o autor nem a obra de um registro da Gestão à Vista.' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke execute on function privado.planta_nao_muda_dono() from public, anon;

create trigger plantas_visuais_dono before update on public.plantas_visuais
  for each row execute function privado.planta_nao_muda_dono();
create trigger planta_etapas_dono before update on public.planta_etapas
  for each row execute function privado.planta_nao_muda_dono();
create trigger planta_marcacoes_dono before update on public.planta_marcacoes
  for each row execute function privado.planta_nao_muda_dono();

-- ── Storage: a planta entra na pasta "fotos", em <obra_id>/plantas/ ───────────────────────────
-- A planta NÃO passa pelo encolhimento das fotos (1200 px vira borrão): sobe com até 4000 px no
-- maior lado, em PNG (vinda de PDF, linhas nítidas) ou JPEG (vinda de foto/imagem). Por isso a
-- pasta passa a aceitar PNG e arquivos de até 10 MB. As fotos do diário continuam saindo do
-- aparelho encolhidas (encolherFoto), então não mudam de tamanho.
update storage.buckets
   set file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png']
 where id = 'fotos';

create or replace function privado.pode_foto(nome text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  partes text[] := string_to_array(nome, '/');
  perfil text := privado.meu_perfil();
  uuid_re constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
begin
  if perfil is null or perfil not in ('admin_master', 'gerente') then return false; end if;
  if coalesce(array_length(partes, 1), 0) <> 3 or partes[1] !~ ('^' || uuid_re || '$') then
    return false;
  end if;
  -- Só a planta pode ser PNG; as fotos continuam sendo <uuid>.jpg.
  if partes[2] = 'plantas' then
    if partes[3] !~ ('^' || uuid_re || '\.(jpg|png)$') then return false; end if;
  elsif partes[3] !~ ('^' || uuid_re || '\.jpg$') then
    return false;
  end if;
  if not privado.vejo_obra(partes[1]::uuid) then return false; end if;
  if partes[2] in ('diario', 'plantas') then return true; end if;
  if partes[2] = 'nota-fiscal' then return perfil = 'admin_master'; end if;
  return false;
end
$$;

-- Apagar o arquivo da planta é só do Engenheiro, como apagar a planta (as fotos não mudam).
drop policy "fotos_apagar" on storage.objects;
create policy "fotos_apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and privado.pode_foto(name)
         and (split_part(name, '/', 2) <> 'plantas' or (select privado.sou_admin())));
