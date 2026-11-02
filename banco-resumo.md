# Banco do Nova Obra — resumo

A memória do banco para os próximos módulos e para o passo 10 (login). Linguagem simples.
Detalhe técnico de cada coluna: `PRD-BACKEND.md` e as migrations em `supabase/migrations/`.

- **Onde fica:** Supabase, projeto `nova-obra`, região São Paulo (`sa-east-1`), plano gratuito.
- **Como o app entra:** endereço e chave publicável no `.env.local` (não vai para o Git).
- **Atualizado em:** 01/11/2026 (módulo Diário de Obra, v1.0, e Materiais — quadro de pedidos).

## ⚠️ O que é provisório e o passo 10 precisa fechar

1. **O banco está aberto.** Hoje qualquer pessoa com a chave publicável lê e grava tudo, de todas as
   obras, sem login (arquivo `20261101-02-acesso-provisorio-dev.sql`). Decisão do dono: o app só
   roda no computador dele até lá. O passo 10 apaga essas regras e põe as de verdade: Engenheiro vê
   todas as obras; Cliente só as dele, pela tabela `membros`. **Atenção:** hoje as permissões de
   gravar (`grant ... to authenticated`) também moram só nesse arquivo provisório. O passo 10 precisa
   escrevê-las de novo numa migration própria (só `authenticated` e `service_role`), senão o app
   inteiro passa a receber "permission denied (42501)".
2. **Ainda não existem as tabelas `profiles` (quem é quem) e `membros` (qual cliente vê qual obra).**
   Chegam com o login. Até lá, as pessoas vêm dos dados de exemplo do app.
3. **"Quem abriu / fechou / mandou a foto"** (`criado_por`, `fechado_por`, `enviada_por`) guarda um
   código de pessoa que ainda não está ligado a ninguém no banco. No passo 10 vira ligação com
   `profiles`, e os códigos das pessoas de exemplo precisam ser trocados pelos do login real.
4. **Fotos** ficam dentro do próprio registro, encolhidas. O lugar certo é o Storage (arquivos);
   entra antes do uso real.

## As tabelas (12)

| Tabela | O que guarda | Uma linha é… |
|---|---|---|
| `obras` | Cada obra: nome, código curto (único), tipo, cidade, cliente, contrato, datas, situação | uma obra |
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

## As travas que o próprio banco garante

Mesmo que a tela erre, o banco recusa:

- **Lista fechada com o texto exato do app** (com acento e maiúscula): situação, clima, função, etapa,
  motivo de parada etc. Um valor diferente é recusado, nunca gravado pela metade.
- **Um diário por obra por dia.**
- **Trava de duas obras:** o mesmo funcionário só fica presente em uma obra por dia.
- **Nada pendurado na obra errada:** a linha de efetivo, de equipamento ou de frente tem que ser da
  mesma obra do diário dela; a foto tem que ser da mesma obra do diário e da frente.
- **Pedido coerente:** quantidade maior que zero; frente preenchida; de Comprado em diante exige fornecedor e
  previsão; do almoxarifado em diante exige o checklist respondido.
- **Toda linha de lançamento tem obra.** Funcionário e equipamento podem ficar sem obra.
- **Coerência:** frente parada exige motivo; frente concluída exige data; deslocado exige a obra de
  destino; terceirizado exige o empreiteiro; equipamento "na obra" exige a obra (e fora dela, não tem).

Testado em 01/11/2026, com 8 tentativas proibidas recusadas e nada sobrando no banco.

## Dados de exemplo (seed)

`supabase-seed.sql`, na raiz: os mesmos dados de `src/lib/mockData.js`, com as duas obras de exemplo
(Casa Alto da Serra 4 e UBS Nova Esperança, que não tem equipamento de propósito). As datas são
relativas ao dia em que roda; rodar de novo não duplica nada.

## Histórico das migrations

| Arquivo | O que fez |
|---|---|
| `20261101-01-diario-de-obra.sql` | Cria as 10 tabelas, as travas acima e liga a RLS em todas |
| `20261101-02-acesso-provisorio-dev.sql` | ⚠️ Abre tudo, provisório até o passo 10 |
| `20261101-03-indices-das-ligacoes.sql` | Índices para as buscas por diário (aviso de desempenho do Supabase) |
| `20261101-04-foto-na-frente-da-mesma-obra.sql` | A foto presa a uma frente tem que ser da mesma obra dessa frente (achado da revisão de código) |
| `20261101-05-materiais.sql` | Cria `materiais` e `pedidos_material` (antecipado da v2). ⚠️ Também abertas sem login, provisório até o passo 10 |
