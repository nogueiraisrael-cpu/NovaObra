# Gestão à Vista: sapata por tipo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar tipos de sapata por planta (lista de peças, medidas, aço), calcular concreto, lastro, forma, escavação e armação por peça, conferir com a prancha e gravar no quadro de peças; e um campo "Peça" com avanço automático ao marcar.

**Architecture:** Regras puras num arquivo novo `src/lib/sapataTipo.js` (testado no Node). Os tipos ficam num jsonb da planta (`plantas_visuais.tipos_de_peca`); cada etapa ganha `calcular_como`. Aplicar um tipo grava as mesmas células de `planta_quantitativos` por `salvarQuantitativos` (que já existe). Telas: painel de tipos dentro do 📋 Quantitativo, select em ⚙ Etapas e o campo Peça na barra do editor.

**Tech Stack:** React + Vite + Supabase; testes `node tests/run.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-19-gestao-a-vista-sapata-por-tipo-design.md`

## Global Constraints

- Tudo do `AGENTS.md` (multi-obra, `dados.js` única porta do banco, regra pura em `src/lib` com teste, vocabulário em `listas.js` idêntico ao CHECK, migration versionada aplicada pelo MCP, retrato do esquema regenerado).
- Migration: `supabase/migrations/20261119-31-gestao-a-vista-tipos-de-peca.sql`.
- Serviços (vocabulário fechado, `SERVICOS_CALCULO` em `listas.js` = CHECK de `planta_etapas.calcular_como`): `Escavação`, `Lastro`, `Forma`, `Armação`, `Concreto`. Unidades: Escavação, Lastro e Concreto em `m³`; Forma em `m²`; Armação em `kg` (convertida para `t` ÷ 1000 se a etapa for em t). Outra unidade: não grava, avisa.
- Um `calcular_como` por obra (índice único parcial `(obra_id, calcular_como) where calcular_como is not null`).
- Peso por metro padrão NBR 7480 (kg/m): 5.0 → 0,154 · 6.3 → 0,245 · 8.0 → 0,395 · 10.0 → 0,617 · 12.5 → 0,963 · 16.0 → 1,578 · 20.0 → 2,466 · 25.0 → 3,853 · 32.0 → 6,313; editável por planta.
- Permissão: `pranchas.editar` (Engenheiro e Gerente), nada novo no quadro.
- Exemplos de teste fictícios; as pranchas reais do Israel não entram no Git.

## Review Focus

1. **Lista de peças escrita de jeitos diferentes** ("S1=S2", "S1, S2", "S1 a S5", espaços, "(X11)") — lê todas, e avisa quando a contagem não bate com o "(Xn)".
2. **A mesma peça em dois tipos** — recusado com frase dizendo a peça e os dois tipos.
3. **Reaplicar um tipo depois de corrigir medida ou tirar uma peça** — células recalculadas; a peça que saiu perde as células daquele tipo; a conferência conta as que tinham valor digitado à mão.
4. **Medidas impossíveis** (zero, negativo, H menor que o rodapé, topo maior que a base) — recusadas com frase antes de calcular.
5. **Etapa ligada com unidade diferente do serviço** — aviso na conferência e o serviço não é gravado (exceto kg → t).

---

### Task 1: Regras puras da sapata por tipo

**Files:**
- Create: `src/lib/sapataTipo.js`, `tests/sapataTipo.mjs`
- Modify: `src/lib/listas.js` (`SERVICOS_CALCULO`, `UNIDADE_DO_SERVICO`)

**Interfaces — Produces (em `sapataTipo.js`):**
- `PESO_ACO_NBR: {[bitola: string]: number}` (valores das Global Constraints; chave como texto "10", "12.5").
- `lerListaDePecas(texto) -> { pecas: string[], declarado: number|null, aviso: string|null }` — aceita separadores `=`, `,`, `;`, quebra de linha e espaço; "S1 a S5" (mesmo prefixo) vira S1..S5; "(X11)" ou "(11X)" vira `declarado`; sem repetir; `aviso` = `"A prancha diz 11 peças e a lista tem 10."` quando não bate.
- `validarTipo(tipo, outrosTipos) -> string|null` — frases: `"Dê um nome ao tipo."`, `"A lista de peças está vazia."`, `"A peça S3 já está no tipo Tipo 1."`, `"Preencha as medidas maiores que zero."`, `"A altura total não pode ser menor que o rodapé."`, `"O topo do tronco não pode ser maior que a base."`.
- `contasDaSapata(m) -> { concreto, lastro, forma, escavacao }` com `m = {A, B, h0, H, a, b, e, folga, prof}` em metros, fórmulas do spec, arredondado a 4 casas.
- `acoPorPeca(linhas, nPecas, kgPorMetro) -> number` — `linhas = [{bitola, comprimento_cm}]`, `kgPorMetro` = `{...PESO_ACO_NBR, ...doUsuario}`; bitola sem peso → lança erro com frase `"Sem peso por metro para a bitola 9."`.
- `servicosDoTipo(tipo, kgPorMetro) -> {Escavação, Lastro, Forma, Armação, Concreto}` (valor por peça).
- `celulasDosTipos({ tipos, etapas, quadro, kgPorMetro }) -> { linhas, avisos, trocadas, digitadas }` — `linhas` no formato de `salvarQuantitativos` (`{rotulo, etapa, quantidade|null}`); para cada tipo e peça, cada serviço vai para a etapa com aquele `calcular_como`; unidade diferente → aviso `"Forma: a etapa X está em m³, o serviço é em m²."` e não grava; kg → t divide por 1000; peças que estavam em `tipo.aplicadas` e saíram da lista ganham `quantidade: null` nas etapas ligadas; `trocadas` = células cujo valor muda; `digitadas` = trocadas cujo valor atual não é o que o tipo calculou na última aplicação (`tipo.ultimo` guardado).
- `proximaPeca(pecas, marcadasNaEtapa, atual) -> string|null` — a próxima depois de `atual` em ordem de obra que não está em `marcadasNaEtapa`; volta ao começo; null se todas marcadas.

- [ ] **Step 1: Escrever `tests/sapataTipo.mjs` (falhando)**, estilo `conferir(...)`:
  - `lerListaDePecas('S1=S2=S3=S4=S5=S9=S12=S19=S20=S21=S22 (X11)')` → 11 peças, `declarado` 11, `aviso` null; `'S1 a S5'` → `['S1','S2','S3','S4','S5']`; `'S6, S7; S8\nS9'` → 4; `'S1=S2 (X3)'` → aviso `'A prancha diz 3 peças e a lista tem 2.'`.
  - `contasDaSapata({A:1,B:1,h0:0.15,H:0.5,a:0.34,b:0.5,e:0.05,folga:0.3,prof:1.2})` → `{ concreto: 0.3346, lastro: 0.05, forma: 0.6, escavacao: 3.072 }`; sapata reta `{A:0.8,B:0.8,h0:0.4,H:0.4,...}` → concreto 0.256.
  - `acoPorPeca([{bitola:'10',comprimento_cm:10989},{bitola:'10',comprimento_cm:10593}], 11, {...PESO_ACO_NBR, '10': 0.63})` → 12.3606; com NBR puro → 12.1055.
  - `validarTipo` com peça repetida em outro tipo, H < h0, a > A, medida zero → as frases acima.
  - `celulasDosTipos` com duas etapas ligadas (Concreto m³, Armação t) e uma Forma em m³ → linhas de concreto e armação (÷1000), aviso da forma; reaplicar com S3 tirada → `{rotulo:'S3', etapa, quantidade:null}`; quadro com valor digitado diferente do `ultimo` → `digitadas: 1`.
  - `proximaPeca(['S1','S2','S3','S10'], new Set(['S2']), 'S1')` → `'S3'`; todas marcadas → null.
- [ ] **Step 2: Rodar `node tests/sapataTipo.mjs`** — Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implementar `src/lib/sapataTipo.js` e as constantes em `listas.js`.**
- [ ] **Step 4: Rodar `node tests/sapataTipo.mjs`** — Expected: tudo passa.
- [ ] **Step 5: Commit** `Gestão à Vista: regras da sapata por tipo`.

### Task 2: Banco

**Files:** `supabase/migrations/20261119-31-gestao-a-vista-tipos-de-peca.sql`, `tests/_schema-snapshot.json`, `tests/apoio/mockData.js`, `tests/apoio/bancoMemoria.js` (`UNICOS.planta_etapas` ganha `planta_etapas_um_servico`), `supabase/testes/gravacoes.sql`, `banco-resumo.md`

- [ ] **Step 1:** Migration: `alter table plantas_visuais add column tipos_de_peca jsonb not null default '{"tipos": [], "kg_por_metro": {}}'`; `alter table planta_etapas add column calcular_como text check (calcular_como in ('Escavação','Lastro','Forma','Armação','Concreto'))`; `create unique index planta_etapas_um_servico on planta_etapas (obra_id, calcular_como) where calcular_como is not null`.
- [ ] **Step 2:** Aplicar pelo MCP; regenerar o retrato das duas tabelas.
- [ ] **Step 3:** Mock: Serra com `calcular_como: 'Concreto'` no Concretado e `tipos_de_peca` vazio nas plantas.
- [ ] **Step 4:** `gravacoes.sql` (parte nova, rodada pelo `execute_sql`): serviço fora da lista recusado; dois "Concreto" na mesma obra recusados; o jsonb volta igual. Expected: N de N.
- [ ] **Step 5:** `banco-resumo.md`; `npm run check` verde; commit `Gestão à Vista: tipos de peça e "calcular como" (migration -31)`.

### Task 3: Camada de dados

**Files:** `src/lib/dados.js`, `tests/plantas.mjs`, `tests/check-schema.mjs`

**Interfaces — Produces:**
- `salvarEtapa(dados)` aceita `calcular_como` (null limpa); repetido na obra vira `"Já existe uma etapa calculada como Concreto nesta obra."` (traduzir `planta_etapas_um_servico` em `traduzirErro`).
- `aplicarTiposDePeca(plantaId, { tipos, kg_por_metro }, linhas) -> { data: true }` — `pranchas.editar`; valida cada tipo com `validarTipo`; grava o jsonb na planta (com `aplicadas` e `ultimo` de cada tipo vindos da tela) e depois as `linhas` por `salvarQuantitativos`; não atômico (repetir completa).

- [ ] **Step 1: Testes (falhando)** em `tests/plantas.mjs`: na Serra, aplicar um tipo de 2 peças (S30, S31) ligado ao Concretado grava 2 células e o jsonb; tipo com peça repetida é recusado com a frase; segundo "Concreto" na obra é recusado com a frase; da UBS não aplica na planta da Serra; check-schema percorre `aplicarTiposDePeca` e `salvarEtapa` com `calcular_como`.
- [ ] **Step 2:** Rodar — FAIL. **Step 3:** Implementar. **Step 4:** `npm run check` — verde. **Step 5:** Commit `Gestão à Vista: camada de dados dos tipos de peça`.

### Task 4: Telas

**Files:** Create `src/screens/plantaTipos.jsx`; Modify `src/screens/plantaQuantitativo.jsx` (botão **Tipos de peça**), `src/screens/plantaPaineis.jsx` (select **Calcular como** em FormEtapa), `src/screens/plantaEditor.jsx` (campo **Peça**), `src/index.css`

- [ ] **Step 1:** `plantaTipos.jsx`: lista de tipos (nome, nº de peças, concreto por peça); **+ Tipo** e **Editar** abrem o formulário (nome; **Peças** com a contagem lida e o aviso; medidas A, B, h0, H, a, b, e, folga, profundidade com padrões e = 0,05; linhas de aço bitola + comprimento total cm com **+ Linha**); **Peso por metro** editável por bitola usada; **Conferência**: por tipo, valor por peça e total por serviço; total da planta; campos "volume de concreto da prancha" e "peso de aço da prancha" com diferença em %; avisos de `celulasDosTipos`; "N células vão mudar, M tinham valor digitado à mão"; **Aplicar** chama `aplicarTiposDePeca`.
- [ ] **Step 2:** ⚙ Etapas: select **Calcular como** (vazio + os 5) em etapa medida, com a unidade esperada ao lado.
- [ ] **Step 3:** Editor: campo **Peça** (datalist das peças do quadro) na barra de marcar; marcação nova usa esse nome (senão o do PDF); depois de gravar, `proximaPeca(...)` preenche o próximo.
- [ ] **Step 4:** Olhar a tela na **Obra de Teste** (confirmar TESTE1 no seletor antes de gravar), com a versão montada (`nova-obra-build`): cadastrar um tipo fictício, conferir os números do Step 1 da Task 1, aplicar, marcar em sequência com o campo Peça, apagar tudo no fim. `npm run check` verde.
- [ ] **Step 5:** Commit `Gestão à Vista: tipos de peça e campo Peça na tela`.

### Task 5: Fechamento

- [ ] `AGENTS.md` (tipos de peça e a gravação em duas etapas de `aplicarTiposDePeca`); revisão final independente do branch; corrigir Critical/Important com teste; itens na página de testes; merge no `main`, envio e conferência da Vercel.
