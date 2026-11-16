-- Calceteiro: função da equipe real da HB (planilha de funcionários, 16/11/2026) que a lista não tinha.
-- Idêntica a FUNCOES em src/lib/listas.js: mudou uma, muda a outra.
alter table public.funcionarios drop constraint funcionarios_funcao_check;
alter table public.funcionarios add constraint funcionarios_funcao_check check (funcao in (
  'Pedreiro', 'Servente', 'Carpinteiro', 'Armador', 'Eletricista', 'Encanador', 'Pintor', 'Mestre',
  'Contramestre', 'Encarregado', 'Betoneiro', 'Auxiliar de pedreiro', 'Auxiliar de serviços gerais',
  'Almoxarife', 'Motorista', 'Operador de máquina', 'Calceteiro', 'Outro'
));
