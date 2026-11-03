-- Achado da revisão de código (03/11/2026): privado.pode_foto conferia obra e módulo, mas
-- aceitava qualquer coisa no nome do arquivo (vazio, "..", ".png"). Agora o nome precisa ser
-- exatamente o que o app gera: <uuid>.jpg.

create or replace function privado.pode_foto(nome text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  partes text[] := string_to_array(nome, '/');
  perfil text := privado.meu_perfil();
begin
  if perfil is null or perfil not in ('admin_master', 'gerente') then return false; end if;
  if coalesce(array_length(partes, 1), 0) <> 3
     or partes[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or partes[3] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$' then
    return false;
  end if;
  if not privado.vejo_obra(partes[1]::uuid) then return false; end if;
  if partes[2] = 'diario' then return true; end if;
  if partes[2] = 'nota-fiscal' then return perfil = 'admin_master'; end if;
  return false;
end
$$;
