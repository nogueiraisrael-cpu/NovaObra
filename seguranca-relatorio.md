# Relatório de segurança — "O teste do estranho"

**Data do teste:** 07/11/2026 · **Banco:** projeto Supabase `nova-obra` (São Paulo) · **Feito por:** agente, pelo conector do Supabase

## Resultado em uma linha

Ninguém de fora entra, e ninguém de dentro passa do que o quadro de permissões deixa.
**Nenhuma porta aberta. Nada precisou ser corrigido.**

## Tabelas auditadas (22)

atividades · equipamentos · fotos · frentes_servico · funcionarios · insumos · materiais · medicao_itens ·
medicoes · membros · movimentos_estoque · obras · pedidos_material · profiles · rdo_efetivo ·
rdo_equipamentos · rdo_frente_equipe · rdo_frentes · rdos · restricoes · semana_atividades · subtarefas

Além delas: a pasta de fotos (Storage `fotos`, privada), as duas funções do banco que o app chama
(`efetivo_do_dia`, `nomes_da_equipe`), a função de contas (`admin-usuarios`) e o cadastro público.

## 1. Raio-x das trancas

| O que se conferiu | Resultado |
|---|---|
| RLS ligada | 22 de 22 tabelas |
| Permissão para quem não fez login (`anon`) | nenhuma, em nenhuma tabela |
| Regra provisória "liberada" (`using (true)`) | nenhuma. As da fase de construção (migration `20261101-02-acesso-provisorio-dev`) já tinham sido tiradas pela `-18` |
| Regras por tabela | quatro tipos. (1) **Lançamento da obra** (diário, frentes, planejamento, estoque, pedidos, fotos): ler, criar e editar só a equipe ativa liberada na obra; apagar só o Engenheiro, menos o que o quadro dá ao Gerente. (2) **Cadastros** (funcionários, equipamentos, catálogo): a equipe lê todos e edita os da obra dela. (3) **Dinheiro** (medições e linhas): só o Engenheiro, em tudo. (4) **Contas** (perfis, obras liberadas): cada um lê o seu, só o Engenheiro mexe, e papel e situação só mudam pela função `admin-usuarios` |
| Pasta de fotos | privada; ler, mandar e apagar só com `privado.pode_foto` (a obra do caminho; nota fiscal só o Engenheiro) |

## 2. Teste do estranho (sem login) — `node teste-do-estranho.mjs`

Só com a URL e a chave publicável do `.env.local`, as mesmas que qualquer visitante do site tem.
Cada tabela: ler, inserir, alterar, apagar. Mais: mandar foto, as duas funções, a função de contas e o
cadastro público. Só conta como fechada a resposta "sem permissão": "0 registros" não prova nada.

**Resultado: 93 de 93 portas fechadas.** Todas as recusas são "sem permissão" (42501). Os outros
resultados: a função de contas respondeu 401 (não autorizado) e o cadastro público está desligado.

## 3. Teste do intruso logado — `supabase/testes/intruso.sql`

Nenhuma conta de verdade foi criada: o teste cria quatro pessoas de mentira **dentro do banco**,
entra como cada uma e desfaz tudo no fim (AGENTS.md: o agente não cria conta nem digita senha).

| Quem | O que tentou | Resultado |
|---|---|---|
| **Pendente** | ler, inserir, alterar e apagar em todas as tabelas; se aprovar; virar Engenheiro | tudo 🔒 (não vê nenhum registro) |
| **Bloqueado** | o mesmo | tudo 🔒 |
| **Cliente** (liberado na Serra) | o mesmo, mais ver a outra obra | tudo 🔒 (vê só a obra dele; nenhum lançamento, como manda a v1.1) |
| **Gerente** (liberado na UBS) | tudo na obra vizinha; medições até na obra dele; perfil dos outros; o próprio papel e a situação; foto da vizinha e nota fiscal | tudo 🔒 |

**Total: 381 🔒 · 0 🚨 · 13 ✅ permitidas pelo quadro · 0 inconclusivas.**
Inclui, para o Gerente na obra dele: apagar pedido fora de "Solicitar" e baixa manual de estoque (🔒).
E, para os quatro: mandar foto para a pasta da obra vizinha pelo depósito de verdade (🔒).

As 13 permitidas são o que o quadro (`docs/permissoes/QUEM-PODE-O-QUE.md`) deixa o Gerente fazer:
- ver funcionários, equipamentos e o catálogo de materiais de todas as obras (cadastros que circulam);
- criar material no catálogo;
- apagar **na obra dele**: foto, pedido em "Solicitar", e as partes que se tiram ao editar
  (pessoa ou equipamento do efetivo do dia, equipe da frente, restrição, atividade da semana,
  subtarefa, movimento de estoque gerado por pedido).

Diferença com o pedido da auditoria: o pedido dizia "usuário comum não exclui registros". Pelo quadro
(decisão de 02/11/2026), o Gerente pode apagar o que está na lista acima. **Decisão do Israel em
07/11/2026: manter o quadro** (sem isso o Gerente não corrige foto errada nem desiste de um pedido).

Não existe no app: papel `usuario`, tabela `user_profiles`, "módulos" no perfil, contratos ou
aprovação de medição. Os equivalentes testados: Gerente, `profiles` (papel e situação), `membros`
(obras liberadas) e `medicoes`/`medicao_itens` (só o Engenheiro, em tudo).

## 4. Correções

- **No banco:** nenhuma. Não apareceu 🚨.
- **No app:** o botão **Excluir** do pedido aparecia em qualquer coluna (o banco recusava depois). Agora só
  aparece em "Solicitar", e a camada de dados recusa com frase. Achado na conferência do passo 10.
- **Nos próprios testes** (achado na revisão de código): o teste do estranho contava "0 registros" como
  porta fechada, e o do intruso dava ✅ a qualquer exclusão de pedido do Gerente. Os dois foram corrigidos
  antes dos números acima.

## 5. Avisos de segurança do Supabase (advisors)

| Aviso | O que quer dizer | Decisão |
|---|---|---|
| `efetivo_do_dia` roda com poder de dono | a função lê o efetivo de todas as obras para a trava "mesmo funcionário em duas obras no mesmo dia" | **intencional**: ela mesma só responde para Engenheiro e Gerente ativos (`privado.sou_equipe()`); Cliente, Pendente e estranho recebem nada ou "sem permissão" |
| `nomes_da_equipe` roda com poder de dono | devolve só nome de quem lançou, para a tela mostrar "lançado por" | **intencional**: só responde para Engenheiro e Gerente |
| Proteção contra senha vazada desligada | o Supabase pode recusar senha que já apareceu em vazamento na internet (lista HaveIBeenPwned) | **a ligar pelo Israel**, no painel: Authentication → Sign In / Providers → Email → "Prevent use of leaked passwords". É chave do painel (não é migration) e pode exigir o plano pago |

## Usuário de teste

Nenhum criado (as pessoas do teste do intruso somem junto com o resto, no fim). Nada a apagar.

## Lembrete

**Tabela nova no futuro = rodar esta auditoria de novo:** acrescentar a tabela na lista `TABELAS` do
`teste-do-estranho.mjs` e em `tabs` do `supabase/testes/intruso.sql`, rodar os dois e conferir 100% 🔒.
