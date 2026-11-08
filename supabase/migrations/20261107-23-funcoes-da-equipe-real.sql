-- Funções que a equipe real da HB tem (planilha de funcionários, 07/11/2026) e a lista antiga não tinha.
-- Idêntica a FUNCOES em src/lib/listas.js: mudou uma, muda a outra.
alter table public.funcionarios drop constraint funcionarios_funcao_check;
alter table public.funcionarios add constraint funcionarios_funcao_check check (funcao in (
  'Pedreiro', 'Servente', 'Carpinteiro', 'Armador', 'Eletricista', 'Encanador', 'Pintor', 'Mestre',
  'Contramestre', 'Encarregado', 'Betoneiro', 'Auxiliar de pedreiro', 'Auxiliar de serviços gerais',
  'Almoxarife', 'Motorista', 'Operador de máquina', 'Outro'
));
