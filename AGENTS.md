# Nova Obra

Diário de obra (RDO) no celular para os dois engenheiros que tocam ~10 obras ao mesmo tempo.
React + Vite + Supabase + Vercel; única biblioteca de app: `@supabase/supabase-js`. **Exceção
autorizada pelo dono em 02/11/2026:** o SheetJS (`xlsx`), só para ler e gerar planilha do cronograma
(`src/lib/planilhaCronograma.js`) e, desde 02/11/2026 (o plano pede), para ler as planilhas de medição
(`src/lib/planilhaMedicao.js`, só valores, nunca macro), carregado sob demanda (`import('xlsx')`). Instalado do site oficial
(`cdn.sheetjs.com`, 0.20.3), nunca do npm: o `xlsx` do npm parou na 0.18.5, com falhas de segurança conhecidas.
Perfis: Engenheiro (`src/pages/AppEngenheiro.jsx`), Cliente (`src/pages/AppCliente.jsx`, v1.1),
Pendente (`src/pages/Pendente.jsx`). Decisões de produto: `PLANO-DO-PROJETO.md` e os dois PRDs.

## ESTE APP É MULTI-OBRA (regra que vale para todo módulo, agora e depois)

1. **Toda tabela de lançamento tem `obra_id` obrigatório** (`not null`, FK para `obras`), com
   índice começando por `obra_id`. Tabela nova de módulo novo entra também em
   `TABELAS_DA_OBRA` (`src/lib/dados.js`). Exceção consciente: `funcionarios` e `equipamentos`
   são cadastros que circulam entre obras — neles `obra_id` é a lotação atual e pode ser vazio;
   `materiais` é o catálogo, igual para todas as obras, e não tem `obra_id`. `membros` tem `obra_id`
   mas não entra em `TABELAS_DA_OBRA`: é a lista de acesso, que o admin vê de todas as obras.
2. **Todo módulo novo filtra por `obra_id`.** Quem filtra é a camada de dados: as funções de
   `src/lib/dados.js` pegam a obra atual por dentro (`obraAtual()`); **as telas nunca passam
   `obra_id`**. Função de lançamento que não usa `obraAtual()` é bug.
3. **Nenhuma tela mostra dado de duas obras juntas**, a não ser que a tela seja explicitamente
   um comparativo entre obras. Hoje existem dois: `src/screens/obras.jsx` (`listarResumoObras`)
   e `src/screens/efetivoGeral.jsx` (`listarQuadroEfetivo`). Cada um é uma consulta agregada,
   nunca um laço na tela chamando obra por obra.
   Exceção de regra de negócio: a trava "mesmo funcionário presente em duas obras no mesmo dia"
   e a lista "+ Trazer funcionário de outra obra" leem outras obras de propósito.
4. **O seletor de obra fica sempre visível** no topo da shell (`SeletorObra` em
   `src/components/index.jsx`). A obra escolhida vive em `src/lib/ObraContext.jsx` e fica
   guardada no aparelho (`localStorage`, chave `novaobra.obraId`).
5. **Trocar de obra remonta a tela inteira** (`key={obraId}` na shell). Qualquer estado guardado
   fora do React (`useRef`, variável de módulo, `localStorage`) precisa ter o `obra_id` na chave.
6. **RLS por obra desde a primeira migration.** `using (true)` em tabela de lançamento é uma obra
   (ou um cliente) lendo a outra. Desde 03/11/2026 (migration -18) as regras são as do quadro: quem não fez
   login não lê nada; conta pendente ou bloqueada não lê nada; o Engenheiro (admin_master) vê todas as obras;
   o Gerente só as liberadas em `membros`, sem Medições; o Cliente (v1.1) só vê as obras dele, nenhum
   lançamento ainda. As funções das regras moram no schema `privado` (`meu_perfil`, `sou_admin`,
   `sou_equipe`, `vejo_obra`, `pode_foto`). Tabela nova de lançamento ganha as quatro regras
   (ler, criar, editar, apagar) com `privado.vejo_obra(obra_id)` no mesmo lote. **Depois de qualquer mudança
   de RLS, grant ou gatilho de perfil, rode `supabase/testes/permissoes.sql`** (execute_sql): tem que dar
   "RESULTADO: N de N".
7. **Dados de exemplo e seed sempre com DUAS obras diferentes** (`tests/apoio/mockData.js`, só dos
   testes: o app não tem mais dado de mentira desde 03/11/2026): a UBS não tem
   equipamento de propósito. `tests/multiobra.mjs` confere que nada vaza de uma para a outra —
   módulo novo ganha a sua linha nesse teste.

## Painel de admin

Contas só mudam pela Edge Function `admin-usuarios` (`supabase/functions/admin-usuarios/`, verify_jwt ligado): ela
descobre quem chama pelo token e confere no banco se é admin ativo; a chave de serviço existe só lá. As travas
ficam em `regras.js`, o mesmo arquivo que `tests/adminUsuarios.mjs` e o banco em memória usam. Mudou uma função
ou `regras.js`: publique de novo pelo conector, com os dois arquivos. O gatilho de `profiles` recusa perfil e
situação vindos do navegador, mesmo do admin. A tela é `src/screens/painelAdmin.jsx`, aberta pelo ícone do topo.

## Segurança — não desfazer

Conferido na vistoria de 07/11/2026 (relatório local em `seguranca/`, fora do Git). Vale daqui para frente:

- **O cadastro público fica fechado de propósito.** Nunca religar (exceto o caso "banco recriado do zero" das
  Armadilhas) e nunca criar tela com `auth.signUp`. Conta nova nasce só pelo Painel de admin (`admin-usuarios`).
- **Papel nunca sai do cadastro nem do token.** Conta nova nasce sem papel e `pendente` (`privado.criar_perfil`); do
  `raw_user_meta_data` só se aproveita o nome. Nenhuma regra olha `user_metadata`.
- **Ninguém muda o próprio papel, situação ou e-mail pelo navegador**, nem o admin: o gatilho `privado.proteger_perfil`
  recusa. Papel e situação mudam só pela função `admin-usuarios`, que confere no banco se quem chama é admin ativo.
- **Pendente e bloqueado não leem nada** além da própria linha de `profiles`: toda regra passa por `privado.meu_perfil()`,
  que exige `status = 'ativo'`. Não troque essa função por uma que ignore a situação.
- **Nada de senha, chave secreta ou `service_role` em variável `VITE_`** nem no código: tudo que começa com `VITE_` vai
  para o site público. A chave de serviço mora só nos Secrets da função.
- **O bucket `fotos` continua privado**, e a foto sobe sempre redesenhada no aparelho (`encolherFoto`): isso tira o GPS.
- **Não tire o `EXECUTE` de `efetivo_do_dia`, `nomes_da_equipe` nem das funções de `privado`** por causa do aviso do
  advisor: as regras e as telas dependem delas, e elas conferem quem chama por dentro.

## Quem pode o quê

1. **O quadro manda nas permissões do app:** `docs/permissoes/QUEM-PODE-O-QUE.md` (decidido pelo Israel
   em 02/11/2026), com a cópia em dados `docs/permissoes/quadro.json` (chave `assunto.acao`, ex.:
   `diario.fechar`). Perfis: `admin_master` (na tela, "Engenheiro"), `gerente`, `cliente`; situações
   `pendente`, `ativo`, `bloqueado`. Onde o plano ou os PRDs discordarem, vale o quadro.
2. **Pedido com papéis ou permissões diferentes do quadro:** siga o quadro e avise o Israel da diferença
   **antes** de construir. Ele decide se o quadro muda.
3. **Mudar uma permissão é mudar junto**, no mesmo lote: o quadro, o JSON, o código
   (`src/lib/permissoes.js`, conferido contra o JSON por `tests/permissoes.mjs`; as telas perguntam `posso(acao)` em `dados.js`), a regra do banco (RLS) e o teste de permissões. E
   anotar a data, quem decidiu e o porquê na seção 8 do quadro.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura: cálculo, recorte, decisão, formatação. Sem React, sem
  banco, sem `window`. Roda no Node sem bundler (import com `.js` explícito). É a única camada
  com teste.
- **Não → `src/screens/*.jsx`.** Estado de interface, layout, o que se toca. A tela **pede a
  decisão à lib**; não decide.
- `src/lib/dados.js` — **única porta do banco**, e o único arquivo que chama `supabase.from(...)`
  (o `check-schema` reprova outro). As regras falam com o banco por cinco verbos (ler, inserir,
  atualizar, apagar, e `existe` para "tem pelo menos um?"); quem atende é o Supabase, sempre. Nos testes, um banco em memória
  (`tests/apoio/bancoMemoria.js`) entra no lugar por `_usarBancoDeTeste`; nada em `src/` importa
  dado de exemplo. O login é o Supabase Auth desde 03/11/2026 (regras puras em `src/lib/login.js`);
  no banco dos testes, as pessoas vêm dos dados de exemplo e qualquer senha serve. O agente nunca cria conta nem digita senha:
  quem testa login é o Israel.
- `src/lib/supabase.js` — a conexão. URL e chave publicável (`sb_publishable_...`) no `.env.local`,
  que não vai para o Git. Nunca a chave secreta nem a `service_role` no app.
- `banco-resumo.md` — o que cada tabela guarda, em linguagem simples. Atualize junto com a migration.

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

Dentro dos testes rodam também:
- `tests/check-schema.mjs` — roda toda a camada de dados no banco em memória e confere cada coluna
  usada (filtro, leitura, gravação) contra `tests/_schema-snapshot.json`, o retrato do banco real.
  **Depois de QUALQUER migration, regenere o retrato** (consulta em `information_schema.columns`):
  retrato velho passa verde mentindo.
- `tests/check-grants.mjs` — lê `supabase/migrations/` e reprova tabela sem RLS, sem `grant ... to
  authenticated`, com `grant all` ou aberta para `anon` sem marca.
- `supabase/testes/permissoes.sql` — não roda no `npm run check` (precisa do banco): o agente roda pelo
  `execute_sql`. Cada perfil tenta ler e gravar no que é seu e no do vizinho, e tudo se desfaz no fim.
- **Auditoria "teste do estranho"** (`seguranca-relatorio.md`): `node teste-do-estranho.mjs` (sem login, só a chave
  publicável) e `supabase/testes/intruso.sql` (execute_sql; Pendente, Bloqueado, Cliente e Gerente). Têm que dar 100% 🔒
  (✅ só onde o quadro deixa). **Tabela nova entra na lista dos dois e a auditoria roda de novo.**
- `supabase/testes/gravacoes.sql` — idem: o que cada tela grava, como Engenheiro e como Gerente (acento, número,
  repetido, histórico). Rode depois de mudar tabela, CHECK ou trava.

Nada disso prova que a tela funciona. Verde com a tela em branco é rotina: abra a tela, e troque
de obra com ela aberta.

**Todo bug corrigido em `src/lib/` nasce com teste junto**, no mesmo lote.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, `src/lib/ObraContext.jsx`, políticas
RLS, migrations ou fluxo de dinheiro (medições, v1.3) → rodar a revisão de código (`/code-review`
no Claude Code, `/review` no Codex) antes de subir. É por caminho, não por julgamento: nesses
arquivos o erro não aparece na tela. Filtro de obra esquecido ou RLS frouxa vaza dado sem sintoma.

## Deploy

Ligado desde 07/11/2026. A pessoa diz "sobe pro GitHub", o agente roda `npm run check`, sobe com git
(`main` de `nogueiraisrael-cpu/NovaObra`) e a Vercel (projeto `nova-obra`, conta `israel-7f2d`) publica
sozinha em **https://nova-obra-weld.vercel.app**. A pessoa não digita comando. O link comprido de cada
publicação pede login da Vercel; para a equipe, só o curto. As chaves da Vercel (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`) são cópias das do `.env.local`: trocou uma, troca a outra e publica de novo.
O projeto `minhaobra` da mesma conta é de outro repositório (versão anterior do curso): não é este app.

## Armadilhas desta base

- **A regra do banco recusa alteração sem dar erro:** muda 0 linhas e a tela diria "salvo". Em `dados.js`, use
  `gravar` e `apagarDeVerdade`, que transformam isso em frase; `atualizar` e `apagar` soltos só quando o "não achei"
  é esperado ou tem frase própria (teste: `tests/recusaCalada.mjs`).
- **O cadastro público está fechado** (painel do Supabase, Authentication: "Allow new users to sign up" desligado;
  não é migration). Contas nascem pela função `admin-usuarios`. Se o banco for recriado do zero, não há admin:
  religue o cadastro, o Israel se cadastra primeiro (o gatilho da migration -14 faz do primeiro o admin_master), e
  desligue de novo. O banco recusa tirar o último admin ativo (migration -22).

- **Tabela nova nasce fechada para o app.** Toda tabela precisa de `grant` escrito na migration,
  só para `authenticated` (e `service_role`). Erro "permission denied for table (42501)" é GRANT
  faltando, não RLS. Nunca `grant all`, nunca `to anon`.
- **As planilhas `.xlsx`/`.xlsm` da pasta não vão para o Git** (`.gitignore`): a de empreiteiro
  tem dados bancários. Use só para testar a importação (v1.3), nunca em demonstração.
- **Desde 01/11/2026 o app grava no banco de verdade** (projeto Supabase `nova-obra`, São Paulo).
  F5 **não** desfaz mais nada. Dado de teste se desfaz pela própria tela, ou com o ok do dono.
  `supabase-seed.sql` replanta os exemplos (não duplica: ids fixos, `on conflict do nothing`).
- **Toda mudança de banco é migration** em `supabase/migrations/AAAAMMDD-NN-descricao.sql`, aplicada
  pelo agente com a mesma letra do arquivo. Nunca clique no painel.
- **Datas do dia vêm do app** (`hojeISO()`), nunca de `current_date` no banco: o banco está em UTC
  e à noite já seria amanhã. O seed usa o fuso de Natal (`America/Fortaleza`).
- **O Supabase devolve no máximo 1.000 linhas por pedido**, sem avisar. O `ler` do `dados.js` já
  pede em páginas; não troque por um `select` solto.
- **Fotos moram no Storage** (pasta privada `fotos`, migration -16) desde 03/11/2026: a tela entrega o arquivo
  e `uploadFoto` encolhe (`src/lib/imagem.js`, 1200 px, JPEG 0,8) e manda; a tabela guarda só o caminho
  `<obra_id>/<modulo>/<id>.jpg`. O endereço para mostrar é assinado na leitura (1 hora) e **nunca se grava**.
  Quem pode abrir é o próprio caminho que diz (`privado.pode_foto`): nota fiscal só o admin. O app só apaga
  arquivo da mesma obra e módulo do registro (`caminhoEhDe`). As fotos de exemplo
  antigas continuam dentro da tabela (`data:`) e aparecem iguais. Foto tirada e descartada antes de salvar
  fica solta no Storage (não aparece, só ocupa espaço).
- **Gravações de várias etapas não são atômicas** (preencher frente, fechar RDO, mover pedido; no Planejamento:
  concluir no Kanban, lançar avanço no Longo prazo, subir/descer na EAP e importar planilha no modo "substituir"; nas Medições: "Trocar planilha"): se a internet cair
  no meio, parte fica gravada. Fechar o RDO marca "Fechado" por último, então repetir completa. Mover pedido grava
  a coluna e depois a movimentação de estoque: voltar a coluna e avançar de novo completa. Pedido com material escrito
  à mão grava o material na lista e depois o pedido: se cair no meio, o material fica na lista e repetir reaproveita. No Planejamento,
  repetir o mesmo toque completa (mover para a mesma coluna, lançar o mesmo avanço); na importação
  "substituir", as novas entram antes de as antigas serem arquivadas: se cair no meio, arquive as antigas na EAP. "Trocar planilha" apaga as linhas da medição e grava as novas: se cair
  no meio, a medição fica sem linhas, e trocar de novo completa. Importar medição grava o cabeçalho e as linhas; se as
  linhas falharem, o próprio `dados.js` desfaz o cabeçalho. No Painel de admin, criar grava o login, depois o perfil e as
  obras (se falhar no meio, a função apaga o login); virar Engenheiro grava o perfil e depois apaga a lista de
  obras, e bloquear grava a situação e depois trava o login: se cair no meio, repetir completa. Foto: sobe o arquivo e só depois grava o registro (caiu no
  meio, sobra um arquivo solto, sem estrago); ao tirar uma foto da frente, apagar o pedido ou receber de novo,
  grava a tabela e depois apaga o arquivo (caiu no meio, idem). No RDO, "Tirar da obra" (equipamento lançado por
  engano) apaga a linha do dia e depois manda para o depósito: se cair no meio, ele continua na obra e repetir completa.
  Em Diários, "Corrigir este dia" grava o dia, depois o efetivo, depois as frentes: se cair no meio, salvar de novo completa.
  No passo 2, tirar ou incluir alguém pelo cartão de uma frente ainda não lançada hoje grava o lançamento e depois a
  equipe: se a equipe falhar, o `dados.js` desfaz o lançamento (`lancarFrente`), e repetir o toque completa. Fechar o
  RDO faz o mesmo para cada frente com equipe herdada (ver abaixo), antes de marcar "Fechado": repetir completa as que faltaram.
  "Fechar este dia" (dia anterior "Não fechado") grava as frentes e marca "Fechado" por último: repetir completa. Ele não
  muda a situação de frente que um diário fechado mais novo já decidiu (`aplicarFechamentoAtrasado`).
- **A equipe da frente continua de um dia para o outro e "vale sozinha"** (decisão do Israel, 10/11/2026): frente em
  execução sem lançamento hoje mostra a equipe do último lançamento dela (`lancamentosHerdados`, nos 7 diários mais
  novos), só com quem está presente hoje. Essa equipe **não está gravada** até alguém mexer na frente ou fechar o RDO
  (`equipesDeHoje` em `dados.js`): quem lê `rdo_frente_equipe` direto num diário de hoje ainda aberto não a enxerga, e
  dia que fica "Não fechado" não a guarda.
- **Saldo de estoque não é coluna:** é a soma de `movimentos_estoque`. O banco recusa (trigger, migration -07)
  qualquer gravação que deixe um insumo negativo; o app confere antes só para dar a frase certa.

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

## Checklist de testes vivo

Vale em toda conversa, daqui pra frente. O Israel (engenheiro, dono do produto) não programa:
decide o produto e testa na tela. O agente constrói. Para ele saber **o que testar** e o agente
saber **o que deu errado**, existe uma página de testes viva, que o agente mantém e ele marca.

### 1. A página

Na primeira melhoria que precisar de teste, crie uma página publicada (Artifact) chamada
**"Testes do Nova Obra"**, com banco de dados próprio (as marcas ficam no servidor, não no
navegador). Se a conversa não tiver ferramenta de página publicada, crie `testes.html` na pasta do
projeto guardando as marcas no próprio navegador, e avise que nesse caso ele precisa colar o
resultado de volta no chat. Depois de criada, **reuse sempre a mesma página** (mesmo link).

A página tem:

- **No topo, a rodada:** nome ("Rodada 2 · Cadastros no banco · 21/10"), nota curta do que mudou
  e o que fazer antes de começar (ex.: "aperte Ctrl+F5").
- **Um cartão por item**, agrupado por módulo, com:
  - **título**: o que se testa, em uma linha;
  - **passos** numerados, uma ação por passo, com os nomes exatos da tela ("Clique em
    **+ Empresa**", não "crie uma empresa");
  - **esperado**: o que ele deve ver se deu certo, de forma que dê para dizer sim ou não sem
    interpretar;
  - **três botões**: `A testar` · `Funcionou` · `Problema`;
  - **campo de observação** para escrever o que viu.
- Sem enfeite: é ferramenta. Funciona no celular.

### 2. O ciclo

1. O agente constrói a melhoria.
2. **Antes de passar**, confere o que dá sozinho: `npm run check`, a tela aberta no navegador
   (trocando de obra com ela aberta), e, quando mexer no banco, o teste de permissões. **Só passa
   o que passou.** O que não conseguiu conferir (ex.: exige a senha dele), diz qual.
3. Escreve os itens na página e manda o link com um resumo de uma linha por item.
4. Ele testa e marca cada item, escrevendo o que viu nos que deram problema.
5. Ele avisa ("atualizei os testes"). O agente lê as marcas direto da página; ele não copia nada
   para o chat.
6. **Para cada problema, a causa vem antes do conserto:** ler o código, os registros do servidor
   e o banco. Explicar em uma linha o que estava acontecendo e o que mudou.
7. **Limpar a página:** o que passou **sai**; o que deu problema volta como `A testar`, com os
   passos ajustados; o que é novo entra. Atualizar a nota da rodada.
8. Repetir até não sobrar nada. Aí a rodada fecha e a página diz "nada a testar agora".

**Nada morto fica guardado.** A página mostra só o que falta testar. Histórico, se houver, é uma
linha por item aprovado em `docs/DIARIO.md` (data, o que mudou, o que passou), nunca na página.

### 3. Como escrever um bom item

- **Um comportamento por item.** "Cadastrar e editar empresa" são dois, se podem falhar separados.
- **Passos que qualquer pessoa repete** sem saber programar, na ordem da tela.
- **Esperado observável:** "a empresa aparece na lista com o telefone novo", não "salva
  corretamente".
- **Teste o caminho errado também:** campo vazio, e-mail inválido, botão clicado duas vezes, o que
  não deveria ser permitido.
- **Diga qual conta usar** quando importar (Engenheiro, Cliente, Pendente).
- **Diga se o teste grava dado de verdade**, e como desfazer depois. Desde 01/11/2026 o app grava
  sempre no banco: F5 não desfaz nada.

### 4. Quando o banco entra (Etapa 7): itens que nunca faltam

Para cada tela que passa a gravar, inclua itens que provem:

| Prova | O item pergunta | Por que |
|---|---|---|
| **Ficou gravado** | Depois de salvar, **aperte F5**: continua lá? | O mock guardava na memória; o banco pode não ter gravado e a tela fingir que sim |
| **Gravou certo** | O que voltou do F5 é exatamente o digitado (acento, data, número, ordem)? | Tradução entre tela e banco perde campo sem avisar |
| **Cada um vê o seu** | Com outro perfil, e com outra obra, vejo só o que devo? | RLS é a única tranca de verdade; esconder botão não protege nada |
| **Quem não pode, não consegue, e é avisado** | O perfil sem permissão tenta gravar: o banco recusa **e a tela diz por quê**? | Recusa calada parece bug; aviso claro é produto |
| **Nada duplica** | Salvar duas vezes, importar de novo, tirar e pôr de volta: aparece repetido? | Clique duplo e reimportação são as duplicatas mais comuns |
| **Apagar não some com histórico** | Desativar algo que outra tela usa: a outra continua funcionando? | Registro que outro lugar lê se desativa, não se apaga |
| **Lista vazia e lista grande** | Sem dado, a tela diz o que fazer? Com muitos, aparece tudo? | O Supabase corta listas em 1.000 linhas sem avisar |
| **Erro de rede** | Se a internet cair no meio, a tela diz que não salvou? | Gravação perdida sem aviso é o pior defeito possível |

E do lado do agente, antes de passar qualquer item de banco:

- **Toda mudança no banco é migration versionada** no projeto, nunca clique no painel.
- **Teste de permissões automático:** cada perfil tenta ler e gravar no que é seu e no do vizinho
  (outra obra, outro cliente), dentro de transação desfeita no fim. Roda após qualquer mudança de
  RLS ou grant.
- **Revisão de código** (ver "Antes de subir pro GitHub") em toda mudança na camada de dados, RLS
  ou login, antes de subir.
- **Avisos de segurança do painel do Supabase** (advisors) conferidos após cada mudança, cada um
  explicado: intencional ou a corrigir.

### 5. O que o agente nunca faz

- Digitar senha, chave ou token, nem criar conta em nome dele. Se o teste precisa, o passo diz
  "entre com a sua conta" e ele faz.
- Pôr segredo (chave, senha, `.env`) no código, no Git ou na página de testes.
- Usar dado real de cliente como exemplo. Exemplo é sempre fictício (nunca as planilhas da pasta).
- Dizer que algo está pronto sem ter rodado o portão e olhado a tela; se não conseguiu olhar,
  dizer isso.
- Apagar dado de verdade para "limpar o teste". Desativar, sim; apagar, só com o ok dele.

### 6. Como responder depois de cada rodada

Curto, em português simples, sem jargão:

- o que passou e saiu da página;
- tabela com cada problema: **o que estava acontecendo** · **o que mudou**;
- o que voltou para teste e o que é novo;
- o que não deu para conferir e por quê;
- o que espera decisão dele — uma pergunta de cada vez, com a recomendação do agente.

## O que entra neste arquivo

Só o que o código não conta sozinho: armadilha, o porquê de uma decisão, convenção que difere do
padrão, proibição, comando não óbvio, o que a verificação exige. Árvore de pastas, dependências e
histórico ficam de fora.
