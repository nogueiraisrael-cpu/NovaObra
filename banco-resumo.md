# Banco do Nova Obra — resumo

A memória do banco para os próximos módulos e para o passo 10 (login). Linguagem simples.
Detalhe técnico de cada coluna: `PRD-BACKEND.md` e as migrations em `supabase/migrations/`.

- **Onde fica:** Supabase, projeto `nova-obra`, região São Paulo (`sa-east-1`), plano gratuito.
- **Como o app entra:** endereço e chave publicável no `.env.local` (não vai para o Git).
- **Atualizado em:** 02/11/2026 (módulo Diário de Obra, v1.0, Materiais — quadro de pedidos e estoque —, Planejamento e Medições, etapa 1).

## ⚠️ O que é provisório e o passo 10 precisa fechar

1. **O banco está aberto.** Hoje qualquer pessoa com a chave publicável lê e grava tudo, de todas as
   obras, sem login (arquivo `20261101-02-acesso-provisorio-dev.sql`). Decisão do dono: o app só
   roda no computador dele até lá. O passo 10 apaga essas regras e põe as de verdade: Engenheiro vê
   todas as obras; Cliente só as dele, pela tabela `membros`. **Atenção:** hoje as permissões de
   gravar (`grant ... to authenticated`) também moram só nesse arquivo provisório. O passo 10 precisa
   escrevê-las de novo numa migration própria (só `authenticated` e `service_role`), senão o app
   inteiro passa a receber "permission denied (42501)".
2. **`profiles` e `membros` já existem (migration -14, 03/11/2026)**, com as regras definitivas, mas o app
   ainda entra pelo login de mentira: as pessoas vêm dos dados de exemplo até a fase 2 do passo 10.
3. **"Quem criou" (`criado_por`) existe em toda tabela** e o banco preenche sozinho com quem está logado
   (sem login, fica vazio). A ligação com `profiles` é `not valid`: as linhas de exemplo antigas guardam os
   códigos do Eng. Israel e do Eng. Ricardo de mentira. **Quando os dois tiverem login, trocar esses códigos
   pelos reais** (em `criado_por`, `fechado_por`, `enviada_por` e `importada_por`) e validar as ligações.
4. **Medições (`medicoes`, `medicao_itens`) são só do Engenheiro.** Hoje estão abertas como o resto; a regra
   do passo 10 não pode deixar o Cliente ler nenhuma linha delas (é custo). O arquivo original da planilha ainda
   não é guardado (`caminho_planilha` vazio): entra com o Storage.
5. **Fotos estão no Storage desde 03/11/2026** (pasta privada `fotos`): a tabela guarda só o caminho. As 10
   fotos de exemplo antigas continuam dentro do registro (`data:`) e aparecem iguais.

## As tabelas (22)

Em **todas** as tabelas existem `criado_por` (quem criou, ligado a `profiles`) e `updated_at` (a última
alteração). O próprio banco preenche as duas (gatilho `privado.carimbar`): o app nunca grava essas colunas, e
ninguém troca o dono de um registro depois.

Nas quatro tabelas de Materiais (`materiais`, `pedidos_material`, `insumos`, `movimentos_estoque`) existe
`updated_at`: a hora da última alteração, que o próprio banco atualiza. O app nunca grava essa coluna.

| Tabela | O que guarda | Uma linha é… |
|---|---|---|
| `profiles` | Cada login: nome, e-mail, perfil (`admin_master`, `gerente`, `cliente`; vazio enquanto pendente) e situação (`pendente`, `ativo`, `bloqueado`). Nasce sozinha no cadastro: **o primeiro cadastro vira admin_master ativo**; os outros, pendentes. Ninguém muda o próprio perfil ou situação, e só o admin ativo muda os dos outros (gatilho no banco) | uma pessoa com login |
| `membros` | Quais obras o gerente e o cliente veem (o admin vê todas). Só o admin mexe | uma pessoa liberada numa obra |
| `obras` | Cada obra: nome, código curto (único), tipo, cidade, cliente, contrato, datas, situação, e o calendário do Planejamento (`dias_trabalho`: 0 = domingo … 6 = sábado; `feriados`) | uma obra |
| `funcionarios` | O efetivo. Nome, função e a obra onde está lotado (pode ficar sem obra) | uma pessoa da equipe (não tem login) |
| `equipamentos` | Betoneira, andaime etc.: onde está (na obra, no conserto, no depósito) e desde quando | um equipamento |
| `frentes_servico` | Cada frente de serviço de uma obra e a situação dela (parada desde quando, por quê) | uma frente |
| `rdos` | O diário de uma obra em um dia: clima, se deu para trabalhar, ocorrências, aberto/fechado | uma obra num dia |
| `rdo_efetivo` | Quem estava no dia: presente, falta, atestado, deslocado ou veio de outra obra | uma pessoa num diário |
| `rdo_equipamentos` | Como cada equipamento passou o dia: operando, parado, quebrado | um equipamento num diário |
| `rdo_frentes` | O que aconteceu em cada frente no dia (e o motivo, se parou) | uma frente num diário |
| `rdo_frente_equipe` | Quem trabalhou em qual frente naquele dia | uma pessoa numa frente num dia |
| `fotos` | As fotos do dia, ligadas à obra, ao diário e à frente | uma foto |
| `materiais` | O catálogo de materiais (nome, unidade, categoria), igual para todas as obras | um material |
| `pedidos_material` | Cada pedido de material de uma obra: quantidade, frente, prioridade, em que coluna está (Solicitar → Entregue), fornecedor, previsão, checklist de recebimento, foto da NF e o histórico de colunas com data | um lote pedido |
| `insumos` | Cada material que a obra controla no estoque, com o saldo mínimo (0 = sem mínimo) | um material numa obra |
| `movimentos_estoque` | Cada entrada ou saída do estoque: do pedido recebido/entregue ou da baixa manual. **O saldo não é guardado: é a soma destas linhas** | uma entrada ou saída |
| `atividades` | O Planejamento: cada atividade da EAP de uma obra, com a atividade-mãe (`pai_id`), a posição entre as irmãs (`ordem`), início, fim, avanço real (`progresso`, 0 a 100, só nas atividades sem subatividade) e se está arquivada. **O código (1, 1.2, 1.2.1), o avanço dos grupos e o previsto não são guardados: saem da posição, das filhas e das datas.** Não se apaga, se arquiva. Tem `updated_at` automático | uma atividade |
| `restricoes` | O Médio prazo: cada restrição (impedimento) de uma atividade: descrição, tipo (Material, Mão de obra, Método, Equipamento, Projeto, Segurança, Logística), prazo para resolver, responsável e se já foi resolvida (e quando). **A coluna da semana no quadro é a do prazo**: mover de semana é mudar o prazo. Tem `updated_at` automático | uma restrição |
| `semana_atividades` | O Curto prazo: como cada atividade ficou numa semana (a semana é a segunda-feira): A fazer, Em andamento ou Concluído, e se foi "não realizada" com a causa raiz. Sem linha = A fazer. **O PPC não é guardado: sai destas linhas.** Concluir põe o avanço da atividade em 100% e guarda o de antes (`progresso_antes`) para devolver se voltar | uma atividade numa semana |
| `subtarefas` | O checklist dentro de cada atividade: feita, ou não realizada com a causa raiz | uma subtarefa |
| `medicoes` | Cada medição subida por planilha, do contrato (Boletim de Medição, aba BM) ou de um empreiteiro (uma aba por medição): nº, data, período, valor no período, desconto e valor a pagar (empreiteiro), nome do arquivo e da aba, e os avisos aceitos na conferência. **Os valores são os da planilha: o app não recalcula** | uma medição |
| `medicao_itens` | Cada serviço lido da planilha de uma medição: item, etapa e subetapa (contrato), descrição, unidade, preço, quantidade prevista, contratada (= adequada), no período e acumulada, e os valores. **Saldo e % não são guardados: contratado − acumulado.** Excluir a medição apaga as linhas dela | um serviço numa medição |

## As travas que o próprio banco garante

Mesmo que a tela erre, o banco recusa:

- **Lista fechada com o texto exato do app** (com acento e maiúscula): situação, clima, função, etapa,
  motivo de parada etc. Um valor diferente é recusado, nunca gravado pela metade.
- **Um diário por obra por dia.**
- **Trava de duas obras:** o mesmo funcionário só fica presente em uma obra por dia.
- **Nada pendurado na obra errada:** a linha de efetivo, de equipamento ou de frente tem que ser da
  mesma obra do diário dela; a foto tem que ser da mesma obra do diário e da frente.
- **Pedido coerente:** quantidade maior que zero; frente preenchida; de Comprado em diante exige fornecedor e
  previsão; do almoxarifado em diante exige o checklist respondido e a quantidade que chegou.
- **Estoque coerente:** cada obra tem um insumo por material; a movimentação é da mesma obra do insumo;
  um pedido gera no máximo uma entrada e uma saída. **O saldo nunca fica negativo:** o banco soma as
  movimentações a cada gravação e recusa a que deixaria o insumo abaixo de zero, mesmo com dois aparelhos.
- **Toda linha de lançamento tem obra.** Funcionário e equipamento podem ficar sem obra.
- **Coerência:** frente parada exige motivo; frente concluída exige data; deslocado exige a obra de
  destino; terceirizado exige o empreiteiro; equipamento "na obra" exige a obra (e fora dela, não tem).

- **Medição coerente:** tipo só `Contrato` ou `Empreiteiro`; empreiteiro obrigatório só no tipo Empreiteiro (e
  vazio no Contrato); um nº por contrato (ou por empreiteiro) em cada obra; a linha é da mesma obra da medição.

Testado em 01/11/2026, com 8 tentativas proibidas recusadas e nada sobrando no banco. Medições: testado em
02/11/2026 (tipo inválido, empreiteiro vazio e nº repetido recusados; nada ficou gravado).

## Dados de exemplo (seed)

`supabase-seed.sql`, na raiz: os mesmos dados de `tests/apoio/mockData.js` (os exemplos dos testes), com as duas obras de exemplo
(Casa Alto da Serra 4 e UBS Nova Esperança, que não tem equipamento de propósito). As datas são
relativas ao dia em que roda; rodar de novo não duplica nada. Medições: a UBS tem 3 do contrato
(R$ 2.418.300,00 adequado, com um serviço medido acima do adequado) e 1 da Hidro Natal; a Serra não tem
nenhuma do contrato (lista vazia de propósito) e tem 3 de empreiteiro.

## Histórico das migrations

| Arquivo | O que fez |
|---|---|
| `20261101-01-diario-de-obra.sql` | Cria as 10 tabelas, as travas acima e liga a RLS em todas |
| `20261101-02-acesso-provisorio-dev.sql` | ⚠️ Abre tudo, provisório até o passo 10 |
| `20261101-03-indices-das-ligacoes.sql` | Índices para as buscas por diário (aviso de desempenho do Supabase) |
| `20261101-04-foto-na-frente-da-mesma-obra.sql` | A foto presa a uma frente tem que ser da mesma obra dessa frente (achado da revisão de código) |
| `20261101-05-materiais.sql` | Cria `materiais` e `pedidos_material` (antecipado da v2). ⚠️ Também abertas sem login, provisório até o passo 10 |
| `20261101-06-estoque.sql` | Cria `insumos` e `movimentos_estoque` e a quantidade recebida no pedido. ⚠️ Também abertas sem login, provisório até o passo 10 |
| `20261102-07-estoque-nunca-negativo.sql` | Trava no banco: nenhuma gravação deixa um insumo com saldo negativo (achado da revisão de código) |
| `20261102-08-materiais-updated-at.sql` | `updated_at` automático nas quatro tabelas de Materiais |
| `20261102-09-planejamento-eap.sql` | Cria `atividades` (Planejamento, antecipado em 02/11/2026). A mãe é sempre da mesma obra; o fim nunca antes do início. ⚠️ Também aberta sem login, provisório até o passo 10 |
| `20261102-10-planejamento-longo-prazo.sql` | Avanço real (`progresso`) nas atividades e o calendário da obra (`dias_trabalho`, `feriados`) em `obras` |
| `20261102-11-planejamento-restricoes.sql` | Cria `restricoes` (Médio prazo). A atividade é sempre da mesma obra; resolvida sempre tem data. ⚠️ Também aberta sem login, provisório até o passo 10 |
| `20261102-12-planejamento-curto-prazo.sql` | Cria `semana_atividades` e `subtarefas` (Curto prazo). Semana sempre é segunda-feira; uma linha por atividade por semana; não realizada sempre tem causa. ⚠️ Também abertas sem login, provisório até o passo 10 |
| `20261102-13-medicoes.sql` | Cria `medicoes` e `medicao_itens` (v1.3, etapa 1). Um nº por contrato/empreiteiro por obra; a linha é da mesma obra da medição. ⚠️ Também abertas sem login, provisório até o passo 10 (e lá, só Engenheiro) |
| `20261102-14-login-perfis-e-carimbos.sql` | Cria `profiles` e `membros` com as regras definitivas, o gatilho do cadastro (primeiro = admin), a trava de perfil, as funções das regras (schema `privado`) e o carimbo `criado_por`/`updated_at` em toda tabela (substitui `tocar_updated_at`). Testado em 03/11/2026: 14 provas, nada sobrou |
| `20261103-15-gerente-so-le-nomes.sql` | Achado da revisão: o gerente lia e-mail, perfil e situação de todos. Agora cada um lê o próprio perfil, só o admin lê os outros, e os nomes da equipe saem pela função `nomes_da_equipe()` (só id e nome, para admin e gerente ativos) |
| `20261103-16-fotos-no-storage.sql` | Cria a pasta privada `fotos` no Storage (só JPEG, até 2 MB) e as regras de ler, mandar e apagar: conta ativa, nas obras que vê; o diário para Engenheiro e Gerente, a nota fiscal só para o Engenheiro. Testado em 03/11/2026 |
