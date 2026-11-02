-- A foto presa a uma frente do dia agora precisa ser da MESMA obra dessa frente.
-- Antes a ligação conferia só o id da frente: uma foto da obra A podia apontar
-- para a frente da obra B. As outras filhas já conferiam (id, obra_id) juntos;
-- esta era a única que faltava (achado da revisão de código de 01/11/2026).
-- Foto sem frente (rdo_frente_id vazio) continua permitida: é a foto solta do dia.

alter table public.fotos drop constraint fotos_rdo_frente_id_fkey;
alter table public.fotos
  add constraint fotos_rdo_frente_obra_fkey
  foreign key (rdo_frente_id, obra_id) references public.rdo_frentes (id, obra_id) on delete cascade;

-- O índice acompanha a ligação nova (o Supabase avisa ligação sem índice).
drop index if exists public.fotos_rdo_frente_idx;
create index fotos_rdo_frente_obra_idx on public.fotos (rdo_frente_id, obra_id);
