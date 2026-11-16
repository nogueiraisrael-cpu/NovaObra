-- Achado do teste do estranho (16/11/2026): as três tabelas da Gestão à Vista (migration -27)
-- nasceram com liberação para quem não fez login (anon), herdada da regra padrão do schema
-- public neste projeto. A RLS já não deixava ver nada (respondia "0 registros"), mas a porta
-- tem que ser recusada, como nas outras tabelas (migration -18 faz o mesmo revoke).
revoke all on public.plantas_visuais from anon;
revoke all on public.planta_etapas from anon;
revoke all on public.planta_marcacoes from anon;
