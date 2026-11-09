-- APAGAR OBRA (quadro: obra.apagar, só o Engenheiro e só obra sem nada lançado).
-- A trava continua sendo o banco: nenhuma tabela de lançamento apaga em cascata, então obra
-- com qualquer registro é recusada (erro 23503). A única exceção é a lista de acesso (membros):
-- quem estava liberado numa obra vazia não é "lançamento", e sem isto a obra nunca sairia.
alter table public.membros
  drop constraint membros_obra_id_fkey,
  add constraint membros_obra_id_fkey foreign key (obra_id) references public.obras (id) on delete cascade;
