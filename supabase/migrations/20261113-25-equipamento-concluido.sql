-- Equipamento que terminou o serviço na obra: o diário do dia guarda "Concluído" com a observação
-- (o que foi feito, quando acabou) e o equipamento volta para o depósito. Pedido do Israel em 13/11/2026.
-- Só o vocabulário muda; as regras de acesso (RLS) e os grants continuam os mesmos.
alter table public.rdo_equipamentos drop constraint rdo_equipamentos_situacao_check;
alter table public.rdo_equipamentos add constraint rdo_equipamentos_situacao_check
  check (situacao in ('Operando', 'Parado', 'Quebrado', 'Concluído'));
