-- Gestão à Vista: sapata por tipo (desenho aprovado pelo Israel em 19/11/2026:
-- docs/superpowers/specs/2026-11-19-gestao-a-vista-sapata-por-tipo-design.md).
--
-- plantas_visuais.tipos_de_peca: os tipos de sapata da planta ({ tipos: [...], kg_por_metro: {...} }): lista de
--   peças, medidas, linhas de aço e onde cada tipo foi aplicado. Fica na planta (a RLS dela já vale). Os números
--   continuam morando no quadro de peças (planta_quantitativos); o tipo só o preenche.
-- planta_etapas.calcular_como: como a etapa é calculada a partir das medidas do tipo. Vocabulário IDÊNTICO a
--   SERVICOS_CALCULO (src/lib/listas.js). Um serviço por obra: duas etapas da mesma obra não calculam o mesmo.

alter table public.plantas_visuais
  add column tipos_de_peca jsonb not null default '{"tipos": [], "kg_por_metro": {}}'::jsonb;

alter table public.planta_etapas
  add column calcular_como text check (calcular_como in ('Escavação', 'Lastro', 'Forma', 'Armação', 'Concreto'));

create unique index planta_etapas_um_servico on public.planta_etapas (obra_id, calcular_como) where calcular_como is not null;
