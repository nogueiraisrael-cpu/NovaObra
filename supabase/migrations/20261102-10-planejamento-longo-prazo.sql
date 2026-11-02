-- Planejamento, etapa 2: o Longo prazo (cronograma em barras).
--
-- atividades.progresso: o avanço REAL de 0 a 100, lançado pelo engenheiro só nas atividades
-- sem subatividade. O de um grupo não é guardado: sai das filhas (src/lib/planejamento.js),
-- assim como o previsto, que sai das datas e do calendário.
--
-- obras.dias_trabalho e obras.feriados: o calendário da obra, para contar dias úteis.
-- 0 = domingo … 6 = sábado. Padrão: segunda a sexta, sem feriado.
-- As duas tabelas já têm RLS e grant (migrations -01, -02 e -09): nada muda no acesso.

alter table public.atividades
  add column progresso smallint not null default 0 check (progresso between 0 and 100);

alter table public.obras
  add column dias_trabalho smallint[] not null default '{1,2,3,4,5}'
    check (cardinality(dias_trabalho) > 0 and dias_trabalho <@ '{0,1,2,3,4,5,6}'::smallint[]),
  add column feriados date[] not null default '{}';
