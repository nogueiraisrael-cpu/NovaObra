-- Índices para as ligações entre tabelas (aviso "unindexed foreign keys" do Supabase).
-- O app busca as linhas de cada RDO por rdo_id; sem estes índices o banco varre a tabela.
create index rdo_efetivo_rdo_idx on public.rdo_efetivo (rdo_id, obra_id, data);
create index rdo_efetivo_destino_idx on public.rdo_efetivo (obra_destino_id);
create index rdo_equipamentos_rdo_idx on public.rdo_equipamentos (rdo_id, obra_id);
create index rdo_equipamentos_equipamento_idx on public.rdo_equipamentos (equipamento_id);
create index rdo_frentes_rdo_idx on public.rdo_frentes (rdo_id, obra_id);
create index rdo_frentes_frente_idx on public.rdo_frentes (frente_id, obra_id);
create index rdo_frente_equipe_frente_idx on public.rdo_frente_equipe (rdo_frente_id, obra_id);
create index rdo_frente_equipe_funcionario_idx on public.rdo_frente_equipe (funcionario_id);
-- fotos_rdo_idx (só rdo_id) fica coberto pelo índice de duas colunas.
drop index public.fotos_rdo_idx;
create index fotos_rdo_obra_idx on public.fotos (rdo_id, obra_id);
