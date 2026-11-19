# Gestão à Vista: sapata por tipo (o "B")

Data: 19/11/2026 · Decidido com: Israel Nogueira · Caminho escolhido: **1 — sapata por tipo, com cálculo**.
Continua `2026-11-19-gestao-a-vista-quantitativo-design.md` (o quadro de peças, já no ar).

## Por quê

O B era ler o quadro de sapatas do texto do PDF para preencher o quadro de peças. As pranchas reais do Israel
(Cadeia Pública de Nísia Floresta, projetista Flávio, REV 01) mostraram que isso não funciona: **os nomes das peças,
as cotas e as tabelas estão desenhados em traços** (texto "explodido" no CAD); só os títulos são texto. Em
compensação, o projeto vem **organizado por tipo**: "S1=S2=S3=S4=S5=S9=S12=S19=S20=S21=S22 (X11)", com um detalhe de
medidas por tipo e uma tabela de aço por tipo, e a prancha traz o total ("VOLUME DE CONCRETO DAS SAPATAS=16,9m3").

Objetivo do Israel (o mesmo do quantitativo): comparar o executado com a medição do contrato. O tipo poupa digitação
(3 tipos por prancha em vez de 22 linhas) e calcula do mesmo jeito para todas as peças.

Achado que afeta o que já está no ar: como "S7" desenhado não é texto, ao pintar uma sapata o app não sabe o nome
dela, e peça sem nome não soma no quadro.

## Objetivos

1. **Tipos de peça por planta.** O engenheiro cadastra cada tipo uma vez: a lista das peças (colada como está na
   prancha, "S1=S2=…=S22"), as medidas do detalhe e as linhas da tabela de aço. O app cria as peças no quadro e
   calcula as quantidades de cada etapa.
2. **Conferência com a prancha:** soma por tipo e total da planta ao lado de números que o engenheiro copia da
   prancha (volume de concreto, peso total de aço), para ele ver se bate antes de gravar.
3. **Campo "Peça" ao marcar**, com avanço automático: escolhe "S7", toca na sapata, o campo passa para a próxima da
   lista. Serve a qualquer planta sem nome em texto.

## Fora do escopo

- Ler as cotas automaticamente (inteligência artificial ou OCR): descartado nesta etapa.
- Cintas, vigas, muros e outras peças lineares: só **sapatas isoladas tronco-piramidais (ou retas)** agora.
- Preço em reais.

## Anti-objetivos

- Número calculado que o engenheiro não viu antes de gravar: o cálculo sempre passa por uma tela de conferência.
- Apagar valor que o engenheiro digitou à mão no quadro sem ele saber: aplicar um tipo avisa quantas células já
  preenchidas serão trocadas.

## As contas (decididas com o Israel)

Medidas do tipo, em metros: base **A × B**, altura do rodapé **h0**, altura total **H**, topo do tronco **a × b**
(padrão: pilar + 5 cm de cada lado; o engenheiro corrige), espessura do lastro **e** (padrão 0,05), **folga** lateral
da cava e **profundidade** da cava.

- **Concreto (m³)** = A·B·h0 + (h1/3)·(A·B + a·b + √(A·B·a·b)), com h1 = H − h0 (tronco de pirâmide). Se H = h0, é
  sapata reta (só o primeiro termo).
- **Lastro / concreto magro (m³)** = A·B·e.
- **Forma (m²)** = 2·(A + B)·h0 (só o rodapé; o tronco inclinado não leva forma).
- **Escavação (m³)** = (A + 2·folga)·(B + 2·folga)·profundidade (resposta do Israel: "base com folga × profundidade").
- **Armação (kg por peça)** = Σ (comprimento total da linha em m × peso por metro da bitola) ÷ número de peças do
  tipo. O peso por metro de cada bitola começa pela tabela da NBR 7480 (10 mm = 0,617 kg/m) e **é editável por
  planta**: nas pranchas do Israel o projetista usa 0,63 kg/m para 10 mm (547 m → 345 kg).

Conferido à mão no tipo "S1=…=S22" da prancha 26 (A = B = 1,00; h0 = 0,15; H = 0,50; pilar 24 × 40 → topo
0,34 × 0,50): concreto ≈ 0,335 m³ por sapata; aço da prancha inteira 547 m × 0,63 = 345 kg.

## Ligação com as etapas da obra

Cada etapa medida ganha **"Calcular como"**: Escavação · Lastro · Forma · Armação · Concreto · (nenhum). Ao aplicar
um tipo, cada serviço calculado vai para a etapa que tem aquele "calcular como" (na Cadeia: ESCAVAÇÃO → Escavação,
MAGRO → Lastro, FORMA SAPATA → Forma, ARMAÇÃO SAPATA → Armação, CONCRETAGEM SAPATA → Concreto). Etapa sem
"calcular como" não é tocada. Serviço sem etapa ligada aparece na conferência como "sem etapa" e não grava.

## Como fica na tela

- No 📋 Quantitativo, um botão **Tipos de peça** abre a lista de tipos da planta e **+ Tipo**.
- Formulário do tipo: nome ("Tipo 1"), **Peças** (campo de texto: aceita "S1=S2=S3", "S1, S2, S3", "S1 a S5";
  mostra quantas leu e, se o texto tiver "(X11)", avisa se não bate), as medidas, e as linhas de aço (bitola +
  comprimento total em cm, como na tabela da prancha).
- **Conferência** antes de gravar: por tipo, o valor por peça e o total de cada serviço; no fim, o total da planta e
  dois campos opcionais "volume de concreto da prancha" e "peso de aço da prancha" com a diferença em %.
- **Aplicar** grava no quadro de peças (as mesmas células de hoje). Peça que estiver em dois tipos é recusada.
- Na barra de marcar: campo **Peça** (lista das peças do quadro, em ordem de obra, ou digitada). Ao gravar uma
  marcação, o campo passa para a próxima peça da lista que ainda não tem marcação nesta etapa. Com o campo vazio,
  vale o nome que vier do PDF (como hoje).

## Modelo de dados

- `plantas_visuais.tipos_de_peca jsonb` (padrão `{"tipos": [], "kg_por_metro": {}}`): os tipos e os pesos por metro
  editados. Fica na planta porque é dela; a RLS da planta já vale.
- `planta_etapas.calcular_como text` com CHECK nos cinco valores (vocabulário em `src/lib/listas.js`).
- O quadro de peças (`planta_quantitativos`) continua sendo onde os números moram; o tipo só o preenche.

## Respostas à revisão do desenho (19/11/2026)

- **Linha de aço = o total do grupo inteiro**, como na tabela da prancha 26: no tipo "S1=…=S22 (X11)", a posição 1
  tem QUANT 99 (9 barras × 11 sapatas) e COMPRIMENTO TOTAL 10.989 cm (99 × 111). A prancha tem uma tabela só, mas
  dividida em blocos por tipo: o engenheiro copia as linhas do bloco do tipo. Por isso a armação por peça divide
  pelo número de peças do tipo. (Já resolvido pelo que está na prancha.)
- **O tipo fica guardado e pode ser reaplicado** (decisão do agente): cada tipo guarda a lista de peças em que foi
  aplicado da última vez. Reaplicar recalcula as células dessas peças; peça que saiu da lista do tipo tem as células
  daquele tipo apagadas; a conferência mostra, antes de gravar, quantas células vão mudar e quantas tinham sido
  digitadas à mão (valor diferente do que o tipo calcularia).
- **Unidade diferente não converte** (decisão do agente): cada serviço tem a sua unidade (escavação, lastro e
  concreto em m³; forma em m²; armação em kg). Se a etapa ligada usa outra unidade, a conferência mostra "unidade da
  etapa diferente" e aquele serviço não é gravado. A única conversão é kg → t (÷ 1000), porque é exata.
- **Um "calcular como" por obra** (decisão do agente): duas etapas da mesma obra não podem ter o mesmo serviço; o
  banco recusa (índice único por obra) e a tela diz qual etapa já usa.
- **Quem pode:** tipos de peça e "calcular como" são preenchimento do quadro e configuração de etapa, as mesmas
  ações de hoje (`pranchas.editar`: Engenheiro e Gerente). Nada muda no quadro de permissões.
- **Revisão da prancha:** os tipos são da planta. Copiar os tipos de uma planta para a revisão nova fica para
  depois (fora do escopo).

## Deixado ao construtor

- Layout do formulário e da conferência; reaproveitar o estilo da conferência de medição.
- Como guardar a lista de peças do tipo dentro do jsonb (texto original e lista lida).
- Se o campo "Peça" pula peças já marcadas ou só avança em ordem (preferência: pular as já marcadas nesta etapa).
