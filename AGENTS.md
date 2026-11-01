# Nova Obra

Diário de obra (RDO) no celular para os dois engenheiros que tocam ~10 obras ao mesmo tempo.
React + Vite + Supabase + Vercel; única biblioteca de app: `@supabase/supabase-js`.
Perfis: Engenheiro (`src/pages/AppEngenheiro.jsx`), Cliente (`src/pages/AppCliente.jsx`, v1.1),
Pendente (`src/pages/Pendente.jsx`). Decisões de produto: `PLANO-DO-PROJETO.md` e os dois PRDs.

## ESTE APP É MULTI-OBRA (regra que vale para todo módulo, agora e depois)

1. **Toda tabela de lançamento tem `obra_id` obrigatório** (`not null`, FK para `obras`), com
   índice começando por `obra_id`. Tabela nova de módulo novo entra também em
   `TABELAS_DA_OBRA` (`src/lib/dados.js`). Exceção consciente: `funcionarios` e `equipamentos`
   são cadastros que circulam entre obras — neles `obra_id` é a lotação atual e pode ser vazio.
2. **Todo módulo novo filtra por `obra_id`.** Quem filtra é a camada de dados: as funções de
   `src/lib/dados.js` pegam a obra atual por dentro (`obraAtual()`); **as telas nunca passam
   `obra_id`**. Função de lançamento que não usa `obraAtual()` é bug.
3. **Nenhuma tela mostra dado de duas obras juntas**, a não ser que a tela seja explicitamente
   um comparativo entre obras. Hoje só existe um: `src/screens/obras.jsx`
   (`listarResumoObras`, uma consulta agregada — nunca um laço na tela chamando obra por obra).
   Exceção de regra de negócio: a trava "mesmo funcionário presente em duas obras no mesmo dia"
   e a lista "+ Trazer funcionário de outra obra" leem outras obras de propósito.
4. **O seletor de obra fica sempre visível** no topo da shell (`SeletorObra` em
   `src/components/index.jsx`). A obra escolhida vive em `src/lib/ObraContext.jsx` e fica
   guardada no aparelho (`localStorage`, chave `novaobra.obraId`).
5. **Trocar de obra remonta a tela inteira** (`key={obraId}` na shell). Qualquer estado guardado
   fora do React (`useRef`, variável de módulo, `localStorage`) precisa ter o `obra_id` na chave.
6. **RLS por obra desde a primeira migration.** `using (true)` em tabela de lançamento é uma obra
   (ou um cliente) lendo a outra. Engenheiro vê todas; Cliente só as obras dele em `membros`.
7. **Mock e seed sempre com DUAS obras diferentes** (`src/lib/mockData.js`): a UBS não tem
   equipamento de propósito. `tests/multiobra.mjs` confere que nada vaza de uma para a outra —
   módulo novo ganha a sua linha nesse teste.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura: cálculo, recorte, decisão, formatação. Sem React, sem
  banco, sem `window`. Roda no Node sem bundler (import com `.js` explícito). É a única camada
  com teste.
- **Não → `src/screens/*.jsx`.** Estado de interface, layout, o que se toca. A tela **pede a
  decisão à lib**; não decide.
- `src/lib/dados.js` — **única porta do banco.** Nenhuma tela chama o Supabase direto. Hoje roda
  em mock (`USAR_MOCK = true`); na Etapa 7 o miolo passa a chamar o Supabase e as telas não mudam.
- `src/lib/supabase.js` — a conexão.

Consequências práticas:

1. **`if` de negócio dentro de tela vai para `lib`**, mesmo com três linhas.
2. **Constante compartilhada tem um dono só.** Os vocabulários fechados (situações, etapas,
   motivos, clima) moram em `src/lib/listas.js` e são **idênticos** aos CHECK do banco, com
   acento e maiúscula. Mudou um, muda o outro no mesmo lote.
3. **Arquivo grande não é problema; arquivo confuso é.** Quebre quando o arquivo passar a ter
   dois motivos para mudar.
4. **Data de "hoje" é `hojeISO()` (`src/lib/datas.js`)**, nunca `toISOString()` — ela vira UTC e
   à noite pula para o dia seguinte.

## Régua de verificação

```bash
npm run check
```

Build + lint + testes. **Fecha em zero** — não há linha de base herdada aqui. Aviso novo é seu e
é de agora; conserte no mesmo lote. No Windows, se `npm` reclamar de `npm.ps1`, use `npm.cmd`.

Nada disso prova que a tela funciona. Verde com a tela em branco é rotina: abra a tela, e troque
de obra com ela aberta.

**Todo bug corrigido em `src/lib/` nasce com teste junto**, no mesmo lote.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, `src/lib/ObraContext.jsx`, políticas
RLS, migrations ou fluxo de dinheiro (medições, v1.3) → rodar a revisão de código (`/code-review`
no Claude Code, `/review` no Codex) antes de subir. É por caminho, não por julgamento: nesses
arquivos o erro não aparece na tela. Filtro de obra esquecido ou RLS frouxa vaza dado sem sintoma.

## Deploy

Ainda não ligado (Etapas 6 e 9). O padrão: a pessoa diz "sobe pro GitHub", o agente sobe com git
e a Vercel publica sozinha. A pessoa não digita comando.

## Armadilhas desta base

- **Tabela nova nasce fechada para o app.** Toda tabela precisa de `grant` escrito na migration,
  só para `authenticated` (e `service_role`). Erro "permission denied for table (42501)" é GRANT
  faltando, não RLS. Nunca `grant all`, nunca `to anon`.
- **As planilhas `.xlsx`/`.xlsm` da pasta não vão para o Git** (`.gitignore`): a de empreiteiro
  tem dados bancários. Use só para testar a importação (v1.3), nunca em demonstração.
- **O mock vive em memória:** recarregar a página volta aos dados de exemplo. Não é bug.

## Higiene de código (vale para toda mudança)

Cada função morta é uma mentira que o próximo leitor precisa desmascarar.

- **Ao remover um recurso, cace a cadeia inteira no mesmo lote:** a função em `lib/dados.js` → a
  exposição no contexto → os chamadores nas telas → a query. Função exposta que nenhuma tela chama
  é lixo.
- **Zero avisos novos de lint.** Aviso antigo que você encontrar, limpe se já estiver tocando no
  arquivo.
- **Código comentado não é backup, o git é.** Comentário explica *por quê*. Bloco comentado sem
  explicação, apague.
- **Antes de apagar, prove que está morto:** grep pelo símbolo no projeto inteiro, e verifique
  quem chama o *wrapper*, não só a função. Depois confira órfãos.
- **Estado que nunca muda ou nunca é lido é lixo** — `useState` sem setter, prop que ninguém
  consome, flag que ninguém liga.
- **Limpeza NUNCA toca no banco nem em arquivo de dado.** Tabela ou coluna órfã continua
  existindo até decisão de quem é dono. Na dúvida, pergunte.

## O que entra neste arquivo

Só o que o código não conta sozinho: armadilha, o porquê de uma decisão, convenção que difere do
padrão, proibição, comando não óbvio, o que a verificação exige. Árvore de pastas, dependências e
histórico ficam de fora.
