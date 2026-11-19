# Gestão à Vista: quantitativo e andamento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quadro de peças por planta (quantidade de cada peça em cada etapa medida), soma automática na pintura, quadro de resumo no editor e andamento da obra contra a medição do contrato.

**Architecture:** Regras puras num arquivo novo `src/lib/quantitativo.js` (testado no Node). Uma tabela nova `planta_quantitativos` e duas colunas (`planta_etapas.item_medicao`, `plantas_visuais.conta_no_andamento`) por uma migration. `dados.js` ganha as funções de ler/gravar o quadro e montar o andamento; as telas só pedem e mostram. O valor de cada marcação é calculado na leitura, nunca gravado.

**Tech Stack:** React + Vite + Supabase (Postgres, RLS) + Node test runner caseiro (`tests/run.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-19-gestao-a-vista-quantitativo-design.md`

## Global Constraints

- Tudo do `AGENTS.md` vale: tabela nova com `obra_id not null`, índice começando por `obra_id`, quatro regras RLS com `privado.vejo_obra(obra_id)`, `grant select, insert, update, delete ... to authenticated, service_role`, `revoke all ... from anon`, entra em `TABELAS_DA_OBRA`, linha em `tests/multiobra.mjs`, carimbo `privado.carimbar()` (`criado_por` + `updated_at`).
- Migration em `supabase/migrations/20261119-30-gestao-a-vista-quantitativo.sql`, aplicada pelo MCP com o mesmo texto; depois regenerar `tests/_schema-snapshot.json` a partir de `information_schema.columns`.
- Quem edita o quadro de peças: `pranchas.editar`. Andamento e ligação etapa ↔ item: só quem `medicoes.ver` (Engenheiro). Nenhuma regra nova no quadro de permissões.
- Medição de referência: a de **maior `numero`** entre `medicoes` com `tipo = 'Contrato'` da obra; contratado = `qtd_contratada`, medido = `qtd_acumulada` do item.
- Peça = rótulo; cada peça tem nome próprio (resposta do Israel, 19/11/2026).
- Sem dado a migrar: as tabelas da Gestão à Vista não têm marcação de verdade.
- `npm run check` fecha em zero; todo bug em `src/lib` nasce com teste.

## Review Focus

1. **A mesma peça marcada duas vezes na mesma etapa** (sem quantidade digitada) — o valor do quadro entra uma vez só, não duas.
2. **Peça sem valor no quadro numa etapa medida** — aparece como "N peças sem quantitativo", nunca soma zero calado nem passa de 100%.
3. **Duas etapas ligadas ao mesmo item do contrato** — uma linha só no andamento, executado somado, contratado uma vez.
4. **Planta com "conta no andamento" desligada** — fica fora do executado da obra, mas continua com o seu resumo próprio.
5. **Obra sem medição do contrato, ou item ligado que sumiu da última medição** — o bloco diz isso em frase, sem quebrar.

---

### Task 1: Regras puras do quantitativo

**Files:**
- Create: `src/lib/quantitativo.js`
- Modify: `src/lib/plantas.js` (`validarMarcacao`, `resumoDoPeriodo`)
- Test: `tests/quantitativo.mjs` (novo), `tests/plantas.mjs`

**Interfaces:**
- Produces (em `quantitativo.js`):
  - `quadroDe(quantitativos: {rotulo, etapa, quantidade}[]) -> Map<string, number>` — chave `` `${rotulo}|${etapa}` ``.
  - `pecasDaPlanta({ textos, marcacoes, quantitativos }) -> string[]` — rótulos de `textos` que casam com `PADRAO_PECA` (de `plantaGeometria.js`), de `marcacoes[].rotulo` e de `quantitativos[].rotulo`, sem repetir, em `ordemNatural`.
  - `valorDaMarcacao(m, etapa, quadro) -> number | null` — `m.quantidade` digitada se não nula; senão etapa `un` (ou sem unidade) vale 1; senão `quadro.get(rotulo|etapa)`; senão `null` (sem quantitativo).
  - `somaDaEtapa(marcacoes, etapa, quadro, hoje) -> { pecas, feito, semQuantitativo, hojePecas, hojeFeito }` — só marcações daquela etapa; marcação com quantidade digitada soma sempre; sem digitada, o valor do quadro entra **uma vez por rótulo** (a mais antiga conta, as outras daquele rótulo são ignoradas); `pecas` = rótulos distintos (+ marcações sem rótulo); `semQuantitativo` = marcações cujo valor é `null`.
  - `previstoDaEtapa(etapa, quadro, pecas) -> { pecas: number, previsto: number }` — peças da lista com valor no quadro naquela etapa, e a soma.
  - `resumoDaPlanta(etapas, marcacoes, quantitativos, pecas, hoje) -> [{ nome, cor, unidade, legado, feitas, totalPecas, feito, previsto, pct, hojePecas, hojeFeito, semQuantitativo }]` — `pct = previsto ? round(feito/previsto*100) : null`; etapa `un`: `previsto`/`pct` vêm da meta, como a legenda de hoje.
  - `linhasParaAplicar(rotulos: string[], valores: {[etapa]: number|null}) -> {rotulo, etapa, quantidade}[]` — "aplicar nas iguais".
  - `ultimaMedicaoDoContrato(medicoes) -> medicao | null`.
  - `andamentoDaObra({ etapas, plantas, marcacoes, quantitativos, itens }) -> [{ item, descricao, unidade, etapas: string[], contratado, medido, executado, saldo, pct, avisoUnidade, semItem }]` — uma linha por `item_medicao` distinto das etapas; executado = soma de `somaDaEtapa(...).feito` por planta com `conta_no_andamento !== false`, das etapas ligadas; `saldo = executado − medido`; `pct = contratado ? round(executado/contratado*100) : null`; `avisoUnidade` quando a unidade da etapa ≠ unidade do item (comparar sem caixa e com `M3` ≡ `m³`, `M2` ≡ `m²`); `semItem: true` quando o código não está em `itens`.
- Changes em `plantas.js`:
  - `validarMarcacao(campos, etapa, temNoQuadro = false)` — não pede quantidade se `temNoQuadro`.
  - `resumoDoPeriodo(etapas, marcacoes, intervalo, quadro = new Map())` — usa `valorDaMarcacao` e a regra "uma vez por rótulo" no lugar de `qtdDe`.

- [ ] **Step 1: Escrever `tests/quantitativo.mjs` (falhando)**, no estilo de `tests/plantas.mjs` (`conferir(descricao, real, esperado)`), com:
  - peças: textos `[{s:'S10'},{s:'S2'},{s:'Cota 1,20'},{s:'S2'}]` + marcação `rotulo:'S7'` + quantitativo `rotulo:'S1'` → `['S1','S2','S7','S10']`;
  - valor: digitada 2 → 2; etapa `un` → 1; quadro S3|Escavado = 0,72 → 0.72; sem quadro → null;
  - soma: S3 marcada duas vezes em Escavado (quadro 0,72) → `feito` 0.72, `pecas` 1; S4 com digitada 0,5 duas vezes → soma 1.0; S9 sem quadro → `semQuantitativo` 1;
  - resumo: quadro S1..S4 Escavado 0,72 cada; marcadas S1 e S2 (S2 hoje) → `feitas 2, totalPecas 4, feito 1.44, previsto 2.88, pct 50, hojePecas 1, hojeFeito 0.72`;
  - aplicar: `linhasParaAplicar(['S1','S2'], {Escavado: 0.72, Forma: null})` → 4 linhas com `quantidade` 0.72/null;
  - última medição: números 1, 3, 2 do contrato e 5 de empreiteiro → a de número 3;
  - andamento: etapas Escavado e Reaterro ligadas a `2.1` (m³), Concretado a `2.4`; item 2.1 contratado 60, acumulado 15; executado de duas plantas (uma com `conta_no_andamento: false`) → só a ligada soma; Escavado+Reaterro numa linha; `saldo`, `pct`; etapa ligada a `9.9` inexistente → `semItem: true`; unidade `M3` vs `m³` → sem aviso; `m²` vs `M3` → `avisoUnidade: true`.
  - Em `tests/plantas.mjs`: `validarMarcacao({data, quantidade:null}, etapaM3, true)` → `null`; `resumoDoPeriodo` com quadro e S3 marcada duas vezes → feito 0.72.
- [ ] **Step 2: Rodar `node tests/quantitativo.mjs`** — Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implementar `src/lib/quantitativo.js`** com as assinaturas acima e ajustar `plantas.js`. `legendaDasEtapas` continua existindo até a Task 4 trocar a tela; depois disso, apagar se ninguém chamar.
- [ ] **Step 4: Rodar `node tests/quantitativo.mjs && node tests/plantas.mjs`** — Expected: todos passam.
- [ ] **Step 5: Commit** `Gestão à Vista: regras do quantitativo e do andamento`.

### Task 2: Banco — tabela do quadro e as duas colunas

**Files:**
- Create: `supabase/migrations/20261119-30-gestao-a-vista-quantitativo.sql`
- Modify: `tests/_schema-snapshot.json`, `tests/apoio/mockData.js`, `tests/apoio/bancoMemoria.js` (`UNICOS`), `src/lib/dados.js` (`TABELAS_DA_OBRA`), `src/lib/obras.js` (`O_QUE_PRENDE`), `supabase/testes/permissoes.sql`, `supabase/testes/intruso.sql`, `supabase/testes/gravacoes.sql`, `teste-do-estranho.mjs`, `banco-resumo.md`

**Interfaces:**
- Produces: tabela `planta_quantitativos(id, obra_id, planta_id, rotulo text not null, etapa text not null, quantidade numeric not null check (quantidade >= 0), criado_por, created_at, updated_at)`, `unique (planta_id, rotulo, etapa)` com nome `planta_quantitativos_um_valor`, FK `(planta_id, obra_id) → plantas_visuais(id, obra_id) on delete cascade`, índice `(obra_id, planta_id)`; `planta_etapas.item_medicao text`; `plantas_visuais.conta_no_andamento boolean not null default true`.

- [ ] **Step 1: Escrever a migration** com: a tabela, RLS ligada, `grant ... to authenticated, service_role`, `revoke all ... from anon`, as quatro regras (`equipe_le/cria/edita/apaga`, igual a `planta_marcacoes` na migration -29), gatilho `planta_quantitativos_carimbo` com `privado.carimbar()`, e os dois `alter table add column`.
- [ ] **Step 2: Aplicar pelo MCP** (`apply_migration`, nome `20261119_30_gestao_a_vista_quantitativo`, mesmo texto).
- [ ] **Step 3: Regenerar o retrato** das três tabelas tocadas a partir de `information_schema.columns` e atualizar a linha `_tirado_em`.
- [ ] **Step 4: Dados de exemplo** — em `mockData.js`, `planta_quantitativos` com S1 e S2 da Serra em Escavado (0,72 / 0,90) e Concretado (0,58 / 0,64); nenhum na UBS; `item_medicao: '2.1'` na etapa Escavado da Serra; `conta_no_andamento: true` nas plantas. `UNICOS.planta_quantitativos = [{ nome: 'planta_quantitativos_um_valor', colunas: ['planta_id','rotulo','etapa'] }]`. `TABELAS_DA_OBRA` e `O_QUE_PRENDE` ganham a tabela.
- [ ] **Step 5: Testes do banco** — `permissoes.sql`: Gerente cria/edita/apaga quantitativo na UBS, não lê nem grava o da Serra, quantitativo da UBS não aponta planta da Serra (FK), apagar planta leva o quadro; `intruso.sql` e `teste-do-estranho.mjs`: tabela na lista e `planta_quantitativos` em `gerente_apaga`; `gravacoes.sql`: valor decimal volta igual, repetido (planta, rótulo, etapa) é recusado, quantidade negativa é recusada. Rodar os três SQL pelo `execute_sql` e o estranho no Node. Expected: permissões N de N; intruso 0 abertas; estranho 100% fechadas; gravações N de N.
- [ ] **Step 6: `banco-resumo.md`** (tabela, colunas novas, histórico da migration) e `npm run check`. Expected: verde.
- [ ] **Step 7: Commit** `Gestão à Vista: tabela do quadro de peças (migration -30)`.

### Task 3: Camada de dados

**Files:**
- Modify: `src/lib/dados.js` (seção Gestão à Vista)
- Test: `tests/plantas.mjs`, `tests/multiobra.mjs`, `tests/check-schema.mjs`

**Interfaces:**
- Consumes: Task 1 (`quadroDe`, `valorDaMarcacao`, `ultimaMedicaoDoContrato`, `andamentoDaObra`, `validarMarcacao` com `temNoQuadro`), Task 2 (tabelas e colunas).
- Produces:
  - `abrirPlanta(id)` passa a devolver também `quantitativos` (desta planta).
  - `salvarQuantitativos(plantaId, linhas: {rotulo, etapa, quantidade|null}[]) -> { data: true }` — `pranchas.editar`; `quantidade` null apaga a célula, existente atualiza (`gravar`), nova insere; confere que a planta é da obra; quantidade negativa ou não numérica é recusada com frase. Não atômico: repetir completa (anotar em `AGENTS.md`).
  - `tirarPecaDoQuadro(plantaId, rotulo)` — apaga as células da peça.
  - `editarPlanta(id, { nome, pavimento, conta_no_andamento })` aceita a flag.
  - `salvarEtapa(dados)` aceita `item_medicao` (só com `posso('medicoes.ver')`; senão ignora o campo) e, ao renomear, renomeia também `planta_quantitativos.etapa`.
  - `listarItensDoContrato() -> [{ item, descricao, unidade }]` — `medicoes.ver`; itens da última medição do contrato; `[]` se não houver.
  - `obterAndamentoDaObra() -> { medicao: {numero, data_medicao} | null, linhas }` — `medicoes.ver`; lê etapas, plantas, marcações e quantitativos da obra e os itens da última medição do contrato; devolve `andamentoDaObra(...)`.
  - `criarMarcacao` / `avancarMarcacao` passam `temNoQuadro` à validação (lendo o quadro da planta).

- [ ] **Step 1: Testes (falhando)** em `tests/plantas.mjs`: salvar S1 Escavado 0,72 e regravar 0,80 (uma linha só, valor novo); null apaga; quantidade "-1" recusada; da UBS não grava no quadro da Serra; marcar S1 em Escavado (m³) sem quantidade passa porque o quadro tem valor, e S9 sem valor é recusada; renomear Escavado leva o quadro junto; `obterAndamentoDaObra` como Engenheiro devolve a linha `2.1`; como Gerente devolve frase de permissão; `listarItensDoContrato` na Serra (sem contrato) devolve `[]`. Em `multiobra.mjs`: quadro da UBS vazio, da Serra só da Serra. Em `check-schema.mjs`: percorrer todas as funções novas.
- [ ] **Step 2: Rodar** `node tests/plantas.mjs` — Expected: FAIL.
- [ ] **Step 3: Implementar** as funções acima.
- [ ] **Step 4: `npm run check`** — Expected: verde (check-schema sem coluna faltando).
- [ ] **Step 5: Commit** `Gestão à Vista: camada de dados do quadro de peças e do andamento`.

### Task 4: Telas

**Files:**
- Create: `src/screens/plantaQuantitativo.jsx` (o painel 📋 Quantitativo)
- Modify: `src/screens/plantaEditor.jsx`, `src/screens/plantaPaineis.jsx` (Etapas: item do contrato), `src/screens/gestaoVista.jsx` (Andamento da obra; "Conta no andamento" no Editar planta), `src/index.css`

**Interfaces:**
- Consumes: Task 1 (`pecasDaPlanta`, `resumoDaPlanta`, `linhasParaAplicar`, `quadroDe`, `valorDaMarcacao`), Task 3 (todas as funções de dados).

- [ ] **Step 1: Painel 📋 Quantitativo** (botão na barra de visão do editor; só edita com `posso('pranchas.editar')`): tabela peças × etapas medidas ativas, rolável no celular; caixa de seleção por linha + **Aplicar nas marcadas**; **+ Peça** (nome livre, `limparRotulo`); **Tirar** da lista; **Salvar** chama `salvarQuantitativos` só com as células que mudaram; linha de rodapé com o total previsto por etapa; obra sem etapa medida mostra frase mandando criar em ⚙ Etapas com unidade.
- [ ] **Step 2: Quadro de resumo** no lugar dos números da legenda: por etapa `feitas de total`, `feito de previsto unidade`, `%` com barrinha, `hoje: N peças · X`, e "N peças sem quantitativo" em amarelo quando houver. Usa `resumoDaPlanta`. O 👁 continua. A impressão leva o mesmo texto na legenda.
- [ ] **Step 3: Marcar sem digitar** — o campo Quantidade continua, com a dica "vazio = usa o quadro de peças"; a gravação passa `temNoQuadro` conforme a peça sugerida.
- [ ] **Step 4: ⚙ Etapas** — para o Engenheiro, select **Item do contrato** em cada etapa medida (`listarItensDoContrato`, "código · descrição (unidade)"), com aviso amarelo se a unidade não bate; sem medição: frase "Suba a medição do contrato em Medições para ligar".
- [ ] **Step 5: Lista de plantas** — bloco **Andamento da obra** (só Engenheiro) com uma linha por item: contratado · executado · medido · saldo a medir (vermelho se negativo) · % executado, e o rodapé "Medição nº N de dd/mm"; vazio/sem medição em frase. **Editar planta** ganha o interruptor **Conta no andamento**.
- [ ] **Step 6: Olhar a tela** na Obra de Teste (subir PDF fictício, preencher quadro, pintar, conferir resumo; trocar de obra com o painel aberto; celular 375 px). `npm run check` verde.
- [ ] **Step 7: Commit** `Gestão à Vista: quadro de peças, resumo e andamento na tela`.

### Task 5: Fechamento

**Files:** `AGENTS.md`, página de testes (Artifact "Testes do Nova Obra"), `docs/superpowers/specs/...` (marcar como feito)

- [ ] **Step 1:** `AGENTS.md`: gravação em etapas de `salvarQuantitativos` e do renomear etapa (agora três tabelas); o valor da marcação é calculado (nunca gravado) a partir do quadro.
- [ ] **Step 2:** Revisão de código (`/code-review`) do diff inteiro; corrigir o que for bug.
- [ ] **Step 3:** Itens na página de testes (quadro de peças, aplicar nas iguais, soma automática, peça repetida conta uma vez, sem quantitativo, ligação com item, andamento, planta fora do andamento, Gerente não vê andamento).
- [ ] **Step 4:** Commit, envio ao GitHub (`main`) e conferência da publicação na Vercel.
