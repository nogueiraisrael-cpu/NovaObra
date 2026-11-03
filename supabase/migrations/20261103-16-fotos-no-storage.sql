-- Passo 10, fase 4b (03/11/2026): as fotos saem de dentro das tabelas e vão para o Storage.
--
-- Pasta (bucket) "fotos", PRIVADA: nenhum arquivo tem endereço público. O app pede um endereço
-- assinado, que vale 1 hora, a cada vez que mostra a foto. Na tabela fica só o caminho:
--   <obra_id>/diario/<id>.jpg        fotos das frentes do diário (tabela fotos, coluna caminho)
--   <obra_id>/nota-fiscal/<id>.jpg   foto da nota fiscal do pedido (pedidos_material.foto_nf)
--
-- Quem pode (docs/permissoes/QUEM-PODE-O-QUE.md): só conta ATIVA, só nas obras que ela vê.
-- Fotos do diário: Engenheiro e Gerente (fotos.ver/criar/apagar). Nota fiscal: só o Engenheiro
-- (pedidos.ver_nota_fiscal: mostra preço). O Cliente (v1.1) ainda não lê nada daqui.
-- As fotos de exemplo antigas continuam dentro da tabela (endereço data:) e aparecem iguais.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2097152, array['image/jpeg']);

-- O caminho decide: obra (que a pessoa precisa ver) e módulo (que decide o perfil).
-- Caminho fora do formato é recusado, nunca convertido pela metade.
create function privado.pode_foto(nome text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  partes text[] := string_to_array(nome, '/');
  perfil text := privado.meu_perfil();
begin
  if perfil is null or perfil not in ('admin_master', 'gerente') then return false; end if;
  if coalesce(array_length(partes, 1), 0) <> 3
     or partes[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  if not privado.vejo_obra(partes[1]::uuid) then return false; end if;
  if partes[2] = 'diario' then return true; end if;
  if partes[2] = 'nota-fiscal' then return perfil = 'admin_master'; end if;
  return false;
end
$$;
revoke execute on function privado.pode_foto(text) from public, anon;
grant execute on function privado.pode_foto(text) to authenticated, service_role;

-- Ler, mandar e apagar. Não há "trocar" (upsert): foto nova é arquivo novo.
create policy "fotos_ler" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and privado.pode_foto(name));
create policy "fotos_mandar" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and privado.pode_foto(name));
create policy "fotos_apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and privado.pode_foto(name));
