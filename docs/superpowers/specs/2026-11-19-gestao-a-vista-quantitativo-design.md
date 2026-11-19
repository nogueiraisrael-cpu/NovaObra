# Gestão à Vista: quantitativo da planta e andamento contra a medição

Data: 19/11/2026 · Decidido com: Israel Nogueira · Caminho escolhido: **A** agora, **B** depois.

## Por quê

O Israel quer comparar o que foi executado (pintado na planta) com a medição do contrato, para saber o
andamento de cada serviço: quanto já foi executado, quanto ainda falta medir (saldo a medir) e quanto por cento do
serviço está pronto. Hoje a planta só conta peças; m³ e m² só aparecem se alguém digita a quantidade em cada
marcação, e o app não sabe o tamanho de cada peça.

## Objetivos

1. **Quadro de peças (quantitativo) por planta.** Para cada peça da planta e cada etapa medida, quanto ela vale
   (ex.: S3 · Escavado 0,72 m³ · Forma 2,88 m² · Concretado 0,58 m³). É preenchido e conferido pelo engenheiro.
2. **A pintura soma sozinha.** A marcação de uma peça numa etapa medida vale o número do quadro, sem digitar.
3. **Quadro de resumo no editor**, para a planta aberta: por etapa, peças feitas de total, quantidade feita de
   prevista, %, e o que entrou hoje.
4. **Andamento da obra contra a medição** (só Engenheiro): por item do contrato ligado a uma etapa, contratado,
   executado (todas as plantas da obra), medido acumulado, saldo a medir e % executado.

## Fora do escopo (agora)

- **B, leitura automática** do quadro de sapatas do PDF para preencher o quantitativo. Vem depois, com pranchas
  reais para testar; o desenho de A tem que deixar o lugar pronto (o quadro é o mesmo, só muda quem preenche).
- Inteligência artificial lendo a prancha (C), descartada por custo e por mandar o desenho do cliente para fora.
- Calcular quantidade a partir de medidas (A × B × H): cada projetista calcula escavação e forma de um jeito.
  O engenheiro digita a quantidade já calculada.
- Comparar com medições de empreiteiro: só as do **contrato**.
- Valor em reais: a comparação é de quantidade. (O preço está na medição; não entra aqui.)

## Anti-objetivos

- O número não pode inventar precisão: peça sem valor no quadro aparece como "sem quantitativo", nunca como zero
  silencioso, e o % mostra quantas peças ficaram fora da conta.
- O Gerente não pode passar a ver dado de medição (o quadro de permissões diz que medição é só do Engenheiro).
- Mudar o quadro não pode apagar nem reescrever o histórico das marcações.

## Restrições do projeto

Valem todas as regras do `AGENTS.md`: multi-obra (tabela nova com `obra_id`, RLS por obra com as quatro regras,
`grant` só para `authenticated`, `revoke` de `anon`, entra em `TABELAS_DA_OBRA`, linha em `tests/multiobra.mjs`),
regra pura em `src/lib` com teste, `dados.js` como única porta do banco, carimbo `criado_por` + `updated_at`,
migration versionada aplicada pelo MCP, retrato do esquema regenerado, testes do banco (permissões, intruso,
estranho, gravações) com as tabelas novas.

## Abordagens consideradas

- **A) Quadro de peças conferido pelo engenheiro (escolhida agora).** O app lista as peças achadas pelos nomes do
  PDF; o engenheiro digita a quantidade de cada peça em cada etapa, com "aplicar nas iguais". Funciona com qualquer
  PDF e com imagem. Custo: digitação uma vez por planta.
- **B) A + leitura do quadro de sapatas do texto do PDF (depois).** Pré-preenche o quadro para o engenheiro só
  conferir. Falha em PDF escaneado ou tabela fora do padrão (volta para A).
- **C) IA lendo a prancha (descartada).** Mais automática, mas custo por planta, desenho do cliente sai do app, e
  ainda exige conferência.

## Como funciona (decidido)

### O quadro de peças

- Uma linha por **peça** (o nome, ex.: "S3"). As peças oferecidas são os nomes que parecem peça
  (`PADRAO_PECA`) na camada de texto do PDF, sem repetir, em ordem natural (S2 antes de S10), mais os nomes já
  usados em marcações da planta. O engenheiro pode acrescentar peça à mão (planta em imagem não tem texto) e tirar
  uma da lista.
- Uma coluna por **etapa medida** da obra (unidade diferente de `un`, ativas). Cada célula é a quantidade daquela
  peça naquela etapa, na unidade da etapa. Célula vazia = sem quantitativo.
- **Aplicar nas iguais:** escolher várias peças e gravar os mesmos números em todas de uma vez.
- Quem edita: quem pode `pranchas.editar` (Engenheiro e Gerente). Quem vê: quem vê a planta.
- O quadro é **por planta** (a mesma S1 em plantas diferentes são peças diferentes).

### Cada peça tem nome próprio (resposta do Israel, 19/11/2026)

Na prancha, cada sapata tem o seu nome (S1, S2… S20), um nome por peça, e o tamanho de cada uma pode ser
diferente. Portanto: uma linha do quadro = uma peça física; o total de peças de uma etapa = peças com valor nessa
etapa; o previsto = soma das peças.

### A pintura soma sozinha

- Valor de uma marcação numa etapa medida: a quantidade digitada nela, se houver; senão, o valor do quadro para
  (planta, rótulo da peça, etapa); senão, "sem quantitativo" (não soma, e conta como peça fora da conta).
- **A mesma peça conta uma vez por etapa** (decisão do agente): se a S3 tem duas marcações em Escavado na mesma
  planta, o valor do quadro entra uma vez só, para não somar em dobro por engano. Marcação com quantidade digitada
  soma o que foi digitado (é assim que se registra serviço feito pela metade: metade hoje, metade amanhã, cada uma
  com a sua quantidade).
- **Quantidade digitada vira opcional** (decisão do agente): numa etapa medida, a marcação de uma peça que tem
  valor no quadro grava sem quantidade; quando o quadro não tem o valor da peça, continua pedindo a quantidade, como
  hoje, para não nascer número faltando. A quantidade digitada, quando existe, continua valendo sobre o quadro. Não há dado a migrar: as tabelas da
  Gestão à Vista ainda não têm marcação de verdade.
- É **calculado na leitura**, não gravado na marcação: corrigir o quadro corrige todos os números, sem mexer no
  histórico. Etapa `un` continua valendo 1 por marcação.
- Marcação sem nome de peça numa etapa medida, sem quantidade digitada, também é "sem quantitativo"; a gaveta da
  peça já permite dar nome.

### Quadro de resumo no editor (esta planta)

Por etapa: `feitas de total` peças (total = peças do quadro com valor nessa etapa), `quantidade feita de prevista`
(prevista = soma do quadro), `%` (feita ÷ prevista) e a linha `hoje: N peças · X`. Se houver marcações sem
quantitativo, uma linha "N peças sem quantitativo". O "feito" segue a regra que já existe: toda marcação da etapa
conta, inclusive a que já avançou (a sapata concretada também foi escavada). Etapa `un` mostra só peças.

### Ligação etapa ↔ item da medição

- Em ⚙ Etapas, o Engenheiro escolhe para cada etapa medida um **item do contrato** (código do item, ex.: "2.1"),
  da lista de itens da última medição do contrato da obra (código · descrição · unidade). Fica gravado na etapa
  como texto (o código), porque as medições são reimportadas e os ids mudam.
- Unidade diferente entre etapa e item: aviso na tela (não bloqueia).
- Só aparece para quem pode `medicoes.ver` (Engenheiro).

### Andamento da obra (só Engenheiro)

Na lista de plantas da Gestão à Vista, um bloco **Andamento da obra** com uma linha **por item do contrato** que
tenha pelo menos uma etapa ligada (decisão do agente: se duas etapas apontam o mesmo item, o executado delas se
soma numa linha só e o contratado aparece uma vez):
`item · descrição · contratado · executado · medido · saldo a medir · % executado`, onde:

- **contratado** = `qtd_contratada` do item na última medição do contrato;
- **medido** = `qtd_acumulada` do item na última medição do contrato;
- **executado** = soma, nas plantas da obra que **contam no andamento**, do valor das marcações das etapas ligadas
  ao item. Cada planta ganha a opção "Conta no andamento" (ligada ao subir; decisão do agente): ao subir uma revisão
  da prancha, desliga-se a antiga para não somar em dobro, sem apagar o histórico dela;
- **saldo a medir** = executado − medido (negativo aparece em vermelho: mediu-se mais do que se pintou);
- **% executado** = executado ÷ contratado.

"Última medição do contrato" = a de maior número entre as medições `tipo = 'Contrato'` da obra. Obra sem medição
do contrato: o bloco diz que não há medição para comparar.

## Modelo de dados (decidido)

- Tabela nova **`planta_quantitativos`**: `obra_id`, `planta_id` (mesma obra da planta, apaga junto com a planta),
  `rotulo` (texto), `etapa` (texto, como nas marcações), `quantidade` (numeric ≥ 0), carimbo; um valor por
  (planta, rótulo, etapa). Renomear etapa renomeia aqui também (como já faz nas marcações).
- **`planta_etapas.item_medicao`** (texto, opcional): código do item do contrato.
- **`plantas_visuais.conta_no_andamento`** (boolean, padrão verdadeiro).
- Peça "acrescentada à mão" sem nenhum valor: guardada como linha de quantitativo? **Deixado ao construtor** (pode
  ser uma linha por etapa só quando há valor, e a lista de peças vir de textos + marcações + quantitativos).

## Deixado ao construtor

- Layout exato do quadro de peças (tabela rolável no celular), do quadro de resumo e do bloco de andamento.
- Como ler a medição para o andamento sem trazer todos os itens de todas as medições (só os da última).
- Nome das funções e divisão entre `plantas.js` e um arquivo novo de lib, se ficar grande.
- Itens novos na página de testes.

## Depois (B)

O mesmo quadro de peças, pré-preenchido pela leitura do quadro de sapatas do PDF, numa tela de conferência antes de
gravar (como a importação de medição). Precisa de pranchas reais do Israel para testar.
