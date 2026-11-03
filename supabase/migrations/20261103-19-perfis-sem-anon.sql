-- Conferência da fase 5 (03/11/2026): profiles e membros (migration -14) receberam a liberação
-- padrão do Supabase para quem não fez login. As regras de linha já não deixavam passar nada
-- (todas são "to authenticated"), mas a liberação fica fechada também, como nas outras 20.
revoke all on public.profiles from anon;
revoke all on public.membros from anon;
