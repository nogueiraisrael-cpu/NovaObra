-- O saldo de um insumo nunca fica negativo, nem com duas pessoas mexendo ao mesmo tempo.
-- O app confere antes de gravar, mas entre a conferência e a gravação outro aparelho pode
-- dar baixa no mesmo insumo (achado da revisão de código de 02/11/2026).
--
-- Depois de cada entrada, saída ou remoção, o banco soma as movimentações do insumo e
-- recusa a gravação se der menos que zero. A trava por insumo (pg_advisory_xact_lock) faz
-- duas gravações no mesmo insumo esperarem uma pela outra, para a soma ver as duas.
-- A mensagem "saldo_negativo" vira frase para a tela em src/lib/dados.js (traduzirErro).

create function public.estoque_nao_negativo() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_insumo uuid := coalesce(new.insumo_id, old.insumo_id);
  v_saldo numeric;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_insumo::text, 0));
  select coalesce(sum(case tipo when 'Entrada' then quantidade else -quantidade end), 0)
    into v_saldo
    from public.movimentos_estoque
    where insumo_id = v_insumo;
  if v_saldo < 0 then
    raise exception 'saldo_negativo' using hint = 'O estoque deste insumo ficaria negativo.';
  end if;
  return null;
end
$$;

create trigger movimentos_estoque_nao_negativo
  after insert or update or delete on public.movimentos_estoque
  for each row execute function public.estoque_nao_negativo();
