# Plano do Projeto — Nova Obra

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 31/10/2026
> **Situação: plano revisado com o engenheiro em 31/10/2026 e pronto para construir a v1.0.** O que ainda está marcado `[CHUTE — CONFIRMAR]` é detalhe que não trava a construção: fica valendo o padrão escrito até alguém mudar.

## Em uma frase

Um sistema de **diário de obra no celular** que resolve **o RDO diário de 10 obras feito no caderno, com foto solta no WhatsApp** para **os dois engenheiros que tocam as 10 obras**, fazendo **eles lançarem efetivo, equipamentos, clima e frentes de serviço com foto em poucas telas, e verem tudo de todas as obras, inclusive o que está parado e há quantos dias**.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — RDO lento, no caderno, que ninguém relê
- **Como acontece hoje:** o diário de cada obra é escrito no caderno. Ninguém relê. Efetivo, equipamentos e clima não ficam consultáveis.
- **Frequência:** todo dia, em 10 obras.
- **Custo:** `[PENDENTE: quantos minutos por obra por dia vão no RDO hoje]`
- **Último caso:** `[PENDENTE: um caso em que faltou informação do diário]`

### Problema 2 — Não se sabe o que está parado, nem há quantos dias
- **Como acontece hoje:** as frentes de serviço (concretagem, reboco de fachada, revestimento cerâmico, hidrossanitário, impermeabilização, terceirizados) são acompanhadas de cabeça e por foto solta em cinco grupos de WhatsApp.
- **Frequência:** todo dia.
- **Custo:** `[PENDENTE]`
- **Último caso:** `[PENDENTE]`

### Problema 3 — Medição e materiais sempre desatualizados
- **Como acontece hoje:** planilha de medição com uma aba por empreiteiro, sempre desatualizada. Pedido de material não é conferido com a planilha de medição, e o que é comprado fora da planilha não vira aditivo. Estoque (cimento, argamassa, massa corrida, areia, brita) e equipamentos no conserto controlados de cabeça. Cronograma no MS Project só aberto quando o cliente pergunta.
- **Frequência:** toda medição / todo pedido.
- **Custo:** `[PENDENTE: quanto de aditivo já deixou de ser cobrado por falta de controle]`

## A solução

Um app no celular, separado por obra. Todo dia o engenheiro escolhe a obra e preenche, em sequência: (1) efetivo, equipamentos e clima; (2) as frentes de serviço do dia, com quem trabalhou em cada uma e uma foto; (3) o que foi executado na prancha do projeto (ex.: quais sapatas foram concretadas e em que dia; chega na v1.1). Os dois engenheiros veem todas as obras, o que está parado e há quantos dias. O cliente vê avanço e fotos, sem custo.

### Corte: v1 e v2 (confirmado pelo engenheiro em 31/10/2026)

A sua dor tem dois blocos de tamanho parecido. Fazer os dois de uma vez dá um sistema com uns 20 cadastros, que demora a ficar pronto e corre o risco de não ser usado por ninguém. A proposta é:

- **v1 — a rotina do dia (este plano):** lista de obras, RDO em 3 passos, frentes de serviço com foto e dias parados, prancha visual, equipamentos (onde está e quem está no conserto), cadastro de funcionários, acesso do cliente.
- **v2 — material:** pedidos de material conferidos com a planilha de medição, aditivos, estoque de cimento/argamassa/massa corrida/areia/brita. Detalhes em "Melhorias para a v2".
- **Mudança de 31/10/2026:** a **visualização das medições** (contrato e empreiteiro) saiu da v2 e entrou como fase v1.3. Ver "Medições" em Funcionalidades.
- **Mudança de 01/11/2026:** o **quadro de pedidos de material** foi antecipado da v2 e já existe como aba "Materiais" dentro da obra: cada pedido (lote) anda por Solicitar → Em cotação → Comprado / a caminho → No almoxarifado → Entregue na frente, com checklist de recebimento, atrasados e lead time. Continua na v2: conferir o pedido com a planilha de medição e a lista de aditivo.
- **Mudança de 01/11/2026 (2):** o **estoque** voltou, opcional, como sub-aba Estoque dentro de Materiais. Para não dobrar o lançamento: a entrada é automática quando o pedido chega no almoxarifado (com a quantidade que chegou de fato), a saída é automática quando ele é entregue na frente, e a baixa manual fica só para consumo parcial. Insumo com saldo no mínimo aparece como "Crítico".
- **Mudança de 02/11/2026:** o **Planejamento** (Last Planner) foi antecipado e entra como aba "Planejamento" dentro da obra, com quatro sub-abas que usam a mesma lista de atividades: EAP (árvore com código automático), Longo prazo (cronograma em barras simples, sem MS Project), Médio prazo (restrições das próximas semanas) e Curto prazo (kanban da semana e PPC). Construído uma sub-aba por vez, começando pela EAP. Isso substitui a linha "Cronograma estilo MS Project / Gantt" do que a v1 não faz: continua fora importar ou imitar o MS Project.

**O que ele NÃO faz (v1):**
- Orçamento e composição de preço (você já resolve isso; fica fora para sempre).
- Pedidos, aditivo e estoque (vão para a v2, ver acima).
- Fazer a medição dentro do app: a medição continua sendo feita na sua planilha. O app só **lê** a planilha pronta e mostra o painel (v1.3).
- Cronograma estilo MS Project / Gantt (importar ou imitar o MS Project). O planejamento simples entrou em 02/11/2026, ver acima.
- App de loja (Play Store / App Store): é um site que abre no celular e pode ser fixado na tela inicial.
- Funcionar sem internet: o app precisa de sinal para salvar. `[DESCOBRIR NO USO]`

## Funcionalidades

### Obras (a tela de abertura)
- **Abre em:** lista de cartões.
- **Mostra:** nome da obra, tipo (Licitação / Alto padrão), cidade, situação do RDO de hoje (Não iniciado / Em andamento / Fechado), nº de frentes paradas, equipamentos no conserto.
- **Ordem e filtro:** primeiro as obras sem RDO de hoje; depois por nome. Filtro: Ativas / Concluídas.
- **Ações:** engenheiro cria, edita e encerra obra.
- **Ao clicar num item:** abre o RDO de hoje dessa obra, no passo 1.
- **Vazio:** "Nenhuma obra cadastrada. Toque em + Nova obra para começar."
- **Nasce e morre:** o engenheiro cria; ao terminar, marca "Concluída" (some da lista padrão, nada é apagado).

### RDO — Passo 1: Efetivo, equipamentos e clima
- **Abre em:** formulário de uma tela, com a data de hoje.
- **Mostra:** clima manhã e tarde (Bom / Nublado / Chuva leve / Chuva forte) e se foi praticável; lista dos funcionários lotados na obra, cada um com um toque para marcar Presente / Falta / Atestado / Deslocado; lista dos equipamentos que estão na obra, cada um com Operando / Parado / Quebrado.
- **Deslocado:** ao marcar, escolhe para qual obra foi. Ele aparece na lista daquela obra no mesmo dia, como "Veio de outra obra". O deslocamento vale **só para aquele dia**: no dia seguinte ele volta para a lista da obra em que está lotado (confirmado).
- **Regra que não se quebra:** o mesmo funcionário nunca fica presente em duas obras no mesmo dia. Se tentar marcá-lo, o app avisa "João já está presente hoje na obra Casa Lagoa 12" e não deixa (confirmado).
- **Ações:** "+ Trazer funcionário de outra obra", "+ Equipamento chegou na obra", Avançar.
- **Vazio:** "Nenhum funcionário lotado nesta obra. Cadastre em Pessoas."

### RDO — Passo 2: Frentes de serviço
- **Abre em:** lista das frentes da obra.
- **Mostra em cada frente:** nome (ex.: "Reboco fachada norte"), etapa, se é equipe própria ou terceirizado (e qual empreiteiro), situação, **"Parada há N dias"** em vermelho quando parada.
- **Ordem:** paradas primeiro, da mais antiga para a mais nova; depois as em execução.
- **Ao tocar numa frente:** abre o preenchimento do dia: situação (Em execução / Parada), motivo se parada, o que foi feito hoje (texto curto), quem trabalhou nela (só aparecem os presentes do passo 1; um mesmo funcionário pode estar em várias frentes), fotos (tirar ou anexar, até 5).
- **Ações:** "+ Nova frente", Avançar.
- **Vazio:** "Nenhuma frente de serviço. Crie a primeira, ex.: Fundação — sapatas."

### RDO — Passo 3: Controle visual na prancha
- **Abre em:** a prancha do projeto (vinda do PDF) de uma frente de serviço da obra, ex.: "Fundação — sapatas → Planta de locação" ou "Tubulação água fria → Planta hidráulica térreo". Seletor no topo: frente e, se houver mais de uma, a prancha.
- **Mostra:** os elementos desenhados por cima do projeto, de dois tipos (pedido em 31/10/2026):
  - **Área** — sapata, bloco, pilar, trecho de laje, pano de fachada, ambiente de cerâmica, área de impermeabilização. Pendente = só o contorno cinza; executado = **pintado por dentro**.
  - **Linha** — trecho de tubo de água, esgoto, gás ou eletroduto. Pendente = linha fina cinza; executado = **linha grossa colorida** por cima do tubo.
  - Cor do executado: verde; o que foi executado hoje fica verde com borda destacada. Embaixo: "18 de 32 sapatas executadas" ou "14 de 22 trechos executados".
- **Ações:** tocar num elemento pendente pinta como executado hoje. Tocar num pintado mostra o código e a data, e permite desfazer. Tubo executado pela metade: o engenheiro divide o tubo em trechos ao desenhar, e cada trecho é pintado separado.
- **Fechar RDO:** botão no fim. Fechar marca o dia como lançado; os engenheiros ainda podem corrigir depois.
- **Vazio:** "Esta frente ainda não tem prancha. Anexe o PDF do projeto em Pranchas."

### Pranchas (cadastro, só engenheiro)
- **Anexar o PDF** do projeto direto (pedido em 31/10/2026). Se o PDF tiver várias folhas, escolhe qual folha vira prancha; dá um nome; liga a uma frente de serviço. O app guarda o PDF original e gera uma imagem nítida da folha para desenhar por cima.
- **Desenhar os elementos uma única vez:** por cima da folha, o engenheiro traça cada sapata (tocando nos cantos, ou arrastando um retângulo) e cada trecho de tubo (tocando nos pontos ao longo do tubo), e dá o código (S1, S2… / AF-01, ES-03…). Com zoom de pinça para acertar.
- **Copiar:** uma sapata desenhada pode ser copiada e colada nas outras de mesmo tamanho, para não traçar 32 vezes.
- **Honestidade:** o app **não reconhece sozinho** as sapatas e os tubos dentro do PDF. Um PDF de projeto é um desenho, sem a informação "isto é uma sapata". O traçado é feito por você, uma vez por prancha. Depois disso, o dia a dia é só tocar para pintar.

### Equipamentos
- **Abre em:** lista.
- **Mostra:** nome, código/patrimônio, onde está (obra X / No conserto / No depósito), desde quando. Os do conserto mostram oficina e previsão de retorno, e "há N dias no conserto".
- **Ordem e filtro:** filtro por situação; no conserto há mais tempo primeiro.
- **Ações:** cadastrar, mandar para obra, mandar para conserto, voltou do conserto.
- **Vazio:** "Nenhum equipamento cadastrado."

### Pessoas (funcionários da obra)
- Cadastro do efetivo: nome, função (Pedreiro, Servente, Carpinteiro, Armador, Eletricista, Encanador, Pintor, Mestre, Outro), obra em que está lotado, ativo/inativo. Funcionário **não** precisa ter login.

### Presença do mês (relatório, só engenheiro)
- **Abre em:** tabela do mês escolhido (padrão: mês atual; no começo do mês, o anterior).
- **Mostra por funcionário:** dias presente, faltas, atestados, e em quais obras trabalhou (ex.: "Casa Alto da Serra 4: 18 dias · Casa Lagoa 12: 3 dias").
- **Ao tocar no funcionário:** calendário do mês, dia a dia, com a obra e a situação de cada dia. Dia sem diário lançado aparece como "Sem diário".
- **Ações:** trocar o mês, imprimir.
- **De onde vem:** do próprio lançamento de efetivo do RDO. Nada é digitado de novo (confirmado).
- **Vazio:** "Nenhum diário lançado neste mês."

### Diários e fotos (consulta)
- Histórico dos RDOs da obra por data e galeria de fotos por frente e por data. É o que substitui o caderno e os grupos de WhatsApp.

### Ocorrências (pedido em 31/10/2026) `[CHUTE — CONFIRMAR o desenho]`
- **O que é:** um fato do dia que precisa de registro e, às vezes, de providência. Ex.: acidente, visita da fiscalização, material entregue errado, erro de projeto, equipamento quebrado, chuva que derrubou escoramento.
- **Abre em:** lista de ocorrências de **todas as obras**, com filtro por obra, tipo e situação.
- **Mostra:** data, obra, tipo, gravidade, título, frente ligada (se houver), situação, **"aberta há N dias"**.
- **Tipos:** Acidente de trabalho, Visita da fiscalização, Visita do cliente, Problema com material, Problema de projeto, Dano ou quebra, Clima, Terceirizado, Outro.
- **Gravidade:** Baixa, Média, Alta. **Situação:** Aberta, Resolvida.
- **Ordem:** abertas primeiro, as de gravidade Alta no topo, depois as mais antigas.
- **Ações:** registrar (pela tela de Ocorrências, ou pelo botão "+ Ocorrência" dentro do RDO do dia), anexar fotos, marcar como Resolvida escrevendo o que foi feito.
- **Ao tocar:** abre o detalhe com as fotos, a descrição e a resolução.
- **Vazio:** "Nenhuma ocorrência aberta. Bom sinal."
- **Quem vê:** só os engenheiros. O cliente não vê.

### Comentários (pedido em 31/10/2026) `[CHUTE — CONFIRMAR o desenho]`
- **O que é:** um mural de conversa **por obra**, que substitui a troca de mensagens solta no WhatsApp sobre aquela obra.
- **Duas abas em cada obra:**
  - **Interno:** só os dois engenheiros escrevem e leem. Ex.: "Amanhã chega a armação das sapatas S20 a S32."
  - **Com o cliente** (a partir da v1.1, quando o cliente entra): só os engenheiros escrevem; o cliente daquela obra **só lê** (confirmado em 31/10/2026). Funciona como um quadro de recados para o cliente. Ex.: "Revestimento dos banheiros começa segunda; porcelanato aprovado chegou hoje."
- **Mostra:** mensagens da mais antiga para a mais nova, como numa conversa, com nome, data e hora. Pode anexar uma foto.
- **Ações:** escrever, anexar foto, apagar a própria mensagem.
- **Aviso:** a lista de obras mostra "2 comentários novos" quando há mensagem que você ainda não leu.
- **Vazio:** "Nenhum comentário nesta obra ainda."

### Medições — contrato (pedido em 31/10/2026; ajustado à planilha real)
- **O que é:** depois de cada medição, você sobe a **planilha de medição** (o Boletim de Medição, .xlsx ou .xlsm) e o app monta sozinho um **painel só para ver**. Nada é digitado no app, e a planilha continua sendo a fonte.
- **Como é a sua planilha** (lida em 31/10/2026, `medição real do contrato.xlsm`): um arquivo por medição, com a aba **BM**. Títulos nas linhas 10 e 11. Colunas: Item · Descrição · Unid. · Quantidade (Previsto · Adequado · No período · Faturado · Acumulado · Saldo) · Percentual (No período · Acumulado) · Valores (Unit. · Previsto · Adequado · No período · Acumulado · Faturado · Saldo). Termina na linha "TOTAL GERAL DA MEDIÇÃO". O cabeçalho traz contrato, ordem de serviço, nº da medição, data e período.
- **Subir a planilha:** dentro da obra, aba Medições → "+ Subir medição" → escolher o arquivo. O app **lê sozinho** o nº, a data e o período do cabeçalho e preenche; você confere e corrige. Como as suas planilhas seguem esse modelo, as colunas já vêm reconhecidas. Se uma obra vier com outro modelo, o app pede para você apontar as colunas uma vez e guarda essa escolha.
- **Três níveis, como na planilha:** **etapa** ("2.0 REDE COLETORA") → **subetapa** ("2.2 TRABALHOS EM TERRA") → **serviço** ("2.2.6 Reaterro manual de valas…"). Linha com unidade é serviço; linha sem unidade é título. Algumas etapas vão direto ao serviço (ex.: "12.1").
- **Contratado = Adequado.** O saldo é calculado sobre a quantidade e o valor **adequados** (readequados), como na sua planilha. O **Previsto original** também aparece, e a diferença entre os dois mostra quanto o contrato cresceu (ou diminuiu) com as adequações. Na sua planilha: previsto R$ 1.790.178,34 → readequado R$ 2.664.011,25.
- **O painel mostra:**
  - **Escolha das medições:** botões "1ª · 2ª · 3ª · … · Todas". Uma só (o que foi medido naquele período) ou todas juntas (o acumulado).
  - **No topo:** valor previsto original · valor adequado · valor medido (na escolha) · saldo em R$ · % medido.
  - **Um gráfico de barras por etapa:** medido × saldo, em R$.
  - **Tabela etapa → subetapa → serviço:** quantidade prevista, adequada, medida, saldo e %; valor adequado, medido, saldo e %.
  - Destaque em vermelho para serviço medido **acima** do adequado (saldo negativo), e em amarelo para serviço cujo adequado é maior que o previsto (cresceu por adequação).
- **Ações:** subir medição, trocar a planilha de uma medição (se veio errada), baixar a planilha original, excluir medição.
- **O app nunca roda as macros** da planilha .xlsm: só lê os valores.
- **Vazio:** "Nenhuma medição ainda. Suba o boletim da 1ª medição."

### Medições — empreiteiro (pedido em 31/10/2026; ajustado à planilha real)
- **Como é a sua planilha** (lida em 31/10/2026, `medição empreiteiro.xlsx`): **um arquivo por empreiteiro, com uma aba por medição** (este tem 33 abas, a mais nova primeiro). Em cada aba: nº da medição e data no topo; títulos nas linhas 10 e 11; colunas Item · Discriminação · Unid. · Valor unitário · Físico (Previsto · Executado no período · Executado acumulado · %) · Financeiro (Previsto · Executado no período · Executado acumulado · %); depois Total no período, Desconto, Valor da medição e Valor a pagar. Não tem etapas: é uma lista simples de itens (1, 2, 3…), e os itens mudam de uma medição para a outra.
- **Subir a planilha:** aba Medições → Empreiteiros → escolher o empreiteiro → "+ Subir planilha" → escolher o arquivo **inteiro**. O app lista as abas, mostra o nº e a data de cada uma, marca as que ainda não estão no app e importa as marcadas. Na próxima medição, você sobe o mesmo arquivo atualizado e só a aba nova é importada.
- **Ignorado na leitura:** linhas de item sem descrição (os itens vazios do modelo) e o bloco "Dados para pagamento". O app não guarda dados bancários em tabela. O arquivo original fica guardado, só para os engenheiros.
- **O painel de empreiteiro:**
  - Seletores: **empreiteiro** (um, ou todos da obra somados) e **medições** (uma, várias ou todas).
  - **No topo:** valor previsto · valor executado (na escolha) · descontos · valor pago (valor da medição) · % executado.
  - **Gráfico de barras por medição** (1ª, 2ª, 3ª…): valor de cada medição ao longo do tempo. Como não há etapas, a barra mostra quanto foi pago em cada medição.
  - **Tabela:** cada linha mostra a medição, o item, a discriminação, a unidade, a quantidade prevista, executada e o saldo, o valor previsto, executado e o saldo, e o %.
  - Como os itens mudam a cada medição, o saldo é calculado **linha por linha, dentro de cada medição**. O app não tenta casar o "item 1" de uma medição com o "item 1" de outra.
- **Substitui:** a planilha com uma aba por empreiteiro que vive desatualizada. Você continua medindo na planilha, mas o retrato fica no app.

### O que a leitura das suas planilhas já encontrou
O passo de conferência do app vai avisar coisas assim antes de gravar. Achei estas nas planilhas que você colocou:
- **Contrato:** o nº da medição está "XXX/2026"; a data (14/06/2026) é anterior ao período (01/09 a 14/10/2026); o valor por extenso ("cento e cinquenta e um mil…") não bate com o valor da medição (R$ 138.346,23); algumas células de apoio abaixo do total estão com erro de fórmula (#REF!).
- **Empreiteiro:** a aba "21.10.2025" diz "Medição Nº 30", o mesmo número da aba "30ª med 05.07.25"; as abas da 25ª e da 26ª têm a mesma data (24.04.25); existe uma aba "02ª med" repetida, sem data.

### Quem vê as medições
- **Só os dois engenheiros.** O cliente não vê nada de medição, nem a aba (confirmado desde o início: cliente não vê custo).

## Unidade principal

**Multi-obra (decidido em 31/10/2026):** a obra tem nome, código/apelido, endereço, cliente, data de início, data-meta de entrega e situação (Em andamento / Parada / Concluída). Toda tabela de lançamento leva `obra_id` obrigatório; um seletor de obra fica sempre visível no topo e lembra a última obra; nenhuma tela mistura obras, a não ser o comparativo da tela Obras. Regra registrada em `AGENTS.md`.

**Obra** — vai existir mais de uma? **Sim** (10 ao mesmo tempo). Alguém trabalha em mais de uma ao mesmo tempo? **Sim**: os dois engenheiros veem e lançam em todas; funcionários podem ser deslocados por um dia para outra obra, mas nunca ficam em duas obras no mesmo dia.

## Perfis de usuário

- **Engenheiro (admin):** você e o outro engenheiro, com os mesmos direitos (confirmado). Os dois lançam o RDO de qualquer obra e veem tudo. Primeira tela: Obras.
- ~~Mestre~~: **saiu do plano** (confirmado em 31/10/2026). Quem lança o diário são os engenheiros.
- **Cliente:** o dono da casa de alto padrão. Vê avanço e fotos da obra dele. Não vê custo. Primeira tela: Avanço da obra. **O fiscal das licitações não usa o app** (confirmado): nas obras de licitação não existe cliente com acesso.

O app é só para a sua gestão: não será vendido nem distribuído, e o RDO não precisa seguir modelo de fiscalização (confirmado).

### Matriz de permissões

| Ação | Engenheiro (os dois) | Cliente (v1.1) |
|---|---|---|
| Ver obras | todas | só a dele |
| Criar / editar obra | sim | não |
| Lançar e editar RDO (inclusive fechado) | sim | não |
| Ver nomes do efetivo e faltas | sim | **não** |
| Ver frentes e situação (em execução / concluída) | sim | sim |
| Ver frente **parada e o motivo** | sim | **não** `[CHUTE — CONFIRMAR quando o cliente entrar, na v1.1]` |
| Ver fotos | todas | **só as marcadas "visível ao cliente"** |
| Ver e registrar ocorrências | sim | **não** |
| Comentários — aba Interno | lê e escreve | **não vê** |
| Comentários — aba Com o cliente | lê e escreve | **só lê**, só na obra dele (confirmado) |
| Medições (contrato e empreiteiro): subir planilha e ver painel | sim | **não vê nada** |
| Ver prancha com o que foi executado | sim | sim |
| Cadastrar funcionários e equipamentos | sim | não |
| Apagar qualquer coisa | sim | não |
| Gerenciar usuários | sim | não |
| **Quem não fez login** | **não vê nada** | |

## Fluxo de cadastro

1. A pessoa se cadastra sozinha com email e senha.
2. Entra sem perfil e não vê dado nenhum.
3. Vê o aviso "Conta aguardando liberação do engenheiro".
4. Um engenheiro libera e escolhe o perfil: Engenheiro (vê tudo) ou Cliente (escolhe a obra dele; só a partir da v1.1).

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | a assinatura que você já tem |
| React + Vite | a interface | grátis |
| Supabase | banco, login e fotos | grátis até 1 GB de fotos; depois US$ 25/mês |
| Vercel | colocar no ar | grátis |
| GitHub | guardar o código | grátis |

**Conta das fotos (estimativa):** 10 obras × 10 fotos/dia × 200 KB (foto já encolhida) ≈ 20 MB/dia ≈ 500 MB/mês. O plano grátis enche no 2º ou 3º mês.
**Total por mês:** R$ 0 no começo; cerca de **US$ 25/mês** a partir do 2º–3º mês.
**O que custaria a alternativa pronta:** `[PENDENTE: quanto você pagaria por mês por um sistema pronto para isso]`

## Prazo

- **Quer usar de verdade em:** 15/11/2026 (respondido em 31/10/2026: faltam 2 semanas)
- **Horas por semana disponíveis:** 4 (≈ 8 horas até o prazo)
- **Quem preenche o RDO no dia a dia:** você e outro engenheiro, os dois vendo todas as obras. O perfil Mestre saiu.

**Aviso do tamanho:** a v1 inteira (14 tabelas, 14 telas) leva de 25 a 35 horas e não cabe em 8. **Decisão (31/10/2026): cortar o que entra até 15/11.**

## Fases de entrega

### v1.0 — até 15/11/2026 (≈ 8 horas)
- Login e liberação de usuários.
- Obras (lista e cadastro).
- RDO passo 1: efetivo (com a trava de duas obras e o deslocado do dia), equipamentos e clima.
- RDO passo 2: frentes de serviço com "parada há N dias", equipe da frente e fotos. O botão **Fechar RDO** fica no fim do passo 2 (o passo 3 só chega na v1.1).
- Processo 1: ao fechar o RDO, atualizar as frentes.
- Pessoas (cadastro de funcionários).
- Equipamentos **simples**: nome, código e em qual obra está.
- Tabelas: todas, menos `pranchas` e `elementos_prancha` (12 de 14).

### v1.1 — até o fim de dezembro/2026 (mais ≈ 20 a 24 horas, com Ocorrências e Comentários)
- Presença do mês. Os dados vêm do efetivo lançado desde 15/11, então o relatório de novembro sai completo.
- **Ocorrências** (tela própria + botão "+ Ocorrência" no RDO). Até lá, a v1.0 guarda as ocorrências no campo de texto "Ocorrências do dia" do RDO.
- **Comentários** por obra (Interno e Com o cliente).
- Diários (histórico) e galeria de Fotos.
- Equipamentos completos: conserto, oficina, previsão de retorno, aviso de quebrado.
- Processo 2: aviso de RDO não lançado.
- Acesso do cliente (Avanço da obra, ainda sem prancha).

### v1.2 — até meados de janeiro/2027 (mais ≈ 14 a 18 horas) — separação confirmada em 31/10/2026
- Passo 3: controle visual na prancha, com PDF anexado e áreas/linhas pintadas.
- Tela Pranchas: anexar PDF, escolher a folha, desenhar sapatas e trechos de tubo, copiar e colar.
- A prancha passa a aparecer também para o cliente.
- Motivo da separação: com PDF e desenho de áreas e linhas, a prancha virou a parte mais trabalhosa do sistema (cerca de metade das horas da antiga v1.1). Separada, ela não atrasa a presença do mês e o histórico.

### v1.3 — até meados de fevereiro/2027 (mais ≈ 16 a 22 horas) — ordem confirmada em 31/10/2026: prancha (v1.2) antes, medição (v1.3) depois
- Aba Medições dentro da obra: subir a planilha da medição do contrato e da medição de empreiteiro.
- Leitura já preparada para os dois modelos reais (Boletim de Medição "BM" e planilha de empreiteiro com uma aba por medição). Para outro modelo, você aponta as colunas uma vez.
- Painel de cada uma: medições separadas ou todas juntas; contrato por etapa → subetapa → serviço; empreiteiro por medição e linha; quantidade e valor, medido, saldo e %.
- Conferência antes de gravar, com avisos de número repetido, data fora do período e total que não bate.

Nada da v1.0 é refeito nas fases seguintes: só se acrescenta tela.

---

# 2. Insights do Mercado

## Já tentou algum programa?

`[PENDENTE: já usou algum app de RDO? Qual, e por que largou: caro, engessado, ninguém adotou ou travava sem sinal?]`

## Benchmark

Pesquisado na web em 31/10/2026. Nenhum deles publica preço; todos pedem contato ou demonstração.

### Prevision (Sienge)
- Site: sienge.com.br/prevision-obras · Preço: não publicado; a tabela depende de quantas obras em paralelo e da área média.
- Faz bem: cronograma (Gantt), app no celular, integração com WhatsApp, linha de gestão de custos.
- Falta: a própria empresa diz que não é tão aderente a reformas; a gestão de custos pede ERP já implantado.
- Vale copiar: avanço visual do planejamento.

### Orçafascio — Diário de Obras
- Site: orcafascio.com/diario-de-obras · Preço: `[PENDENTE: não encontrado]`
- Faz bem: diário de obra ligado ao orçamento.
- Falta: `[PENDENTE: não verificado]`
- Vale copiar: `[PENDENTE]`

### Brickup RDO / Diário de Obra Online
- Brickup: RDO com relatório em PDF e gestão financeira. Diário de Obra Online: app de RDO que funciona com e sem internet. Preço: não publicado nas lojas.
- Falta: nenhum dos dois mostra controle visual na prancha.
- Vale copiar: funcionar sem sinal e gerar o RDO para impressão.

## Por que ainda vale construir o meu `[CHUTE — CONFIRMAR]`

Nenhum dos que apareceram tem, junto e simples: frente de serviço com "parada há N dias", efetivo dividido por frente, e a marcação de sapatas executadas direto na prancha. E os completos cobram por obra, o que pesa com 10 obras abertas.

## Referências de interface

- **Gosta de:** `[PENDENTE]`
- **Odeia:** `[PENDENTE]`
- **Usa mais em:** celular, no canteiro (os engenheiros lançando o RDO na visita); computador para consulta `[CHUTE — CONFIRMAR]`
- **Personalidade visual:** **Noturno** (escolhida em 31/10/2026, entre Prancheta, Canteiro, Painel, Noturno e Caderno): fundo escuro com um só tom vivo.
- **Paleta:** Concreto — `#4A5A63` `#26333A` `#F2F4F5` `#00A3B4` `#E2574C`. Cor principal: turquesa `#00A3B4`.
- **Referência visual aprovada:** `preview.html` nesta pasta (31/10/2026).
- **Tema:** escuro. Atenção: no sol forte a tela escura reflete mais; compensar com texto bem claro e botões grandes.
- **Logo:** sem logo `[CHUTE — se tiver, coloque o arquivo nesta pasta]`

---

# 3. Arquitetura

## Mapa de telas

```
Login
└── Engenheiro
    ├── Obras (início)
    │   └── Obra
    │       ├── Hoje: RDO passo 1 → passo 2 (frentes → preencher frente) → passo 3 (prancha) → Fechar
    │       ├── Diários (histórico) → RDO de um dia
    │       ├── Fotos
    │       ├── Comentários (Interno · Com o cliente)
    │       ├── Medições (Contrato · Empreiteiros) → Subir planilha → Painel
    │       └── Pranchas → Anexar PDF → Desenhar elementos (áreas e linhas)
    ├── Ocorrências (todas as obras) → Detalhe da ocorrência
    ├── Equipamentos
    ├── Pessoas (funcionários) → Presença do mês → Calendário do funcionário
    └── Usuários e Meu perfil
└── Cliente (v1.1)
    ├── Avanço da obra (frentes + pranchas)
    ├── Fotos
    ├── Comentários (só a aba Com o cliente)
    └── Meu perfil
```

**Navegação:** celular com barra inferior de 5 itens (Engenheiro: Obras · Ocorrências · Equipamentos · Pessoas · Perfil), que é o máximo; dentro da obra, abas no topo, que deslizam para o lado no celular (Hoje · Diários · Fotos · Comentários · Pranchas · Medições). Cliente: Avanço · Fotos · Comentários · Perfil. Computador com menu lateral.

## Processos automáticos

### 1. Ao fechar o RDO, atualizar as frentes
- **Gatilho:** um engenheiro toca em "Fechar RDO".
- **Passos:** 1. Para cada frente marcada "Parada" que estava "Em execução", grava a data de hoje como "parada desde". 2. Para cada frente que voltou a "Em execução", limpa o "parada desde". 3. Equipamento marcado "Quebrado" aparece para o engenheiro com o aviso "Mandar para conserto?".
- **Resultado:** a lista de frentes de todas as obras mostra "Parada há N dias" sem ninguém calcular.
- **Se der errado:** o RDO não fecha e aparece "Não foi possível fechar o diário. Verifique a internet e tente de novo." Nada fica pela metade.

### 2. Aviso de RDO não lançado
- **Gatilho:** abrir a lista de obras.
- **Passos:** confere se existe RDO fechado de ontem para cada obra ativa.
- **Resultado:** a obra aparece com a etiqueta "RDO de ontem não fechado".
- **Se der errado:** a etiqueta não aparece; nenhum dado se perde.

## Modelagem de dados

14 tabelas (o detalhe está no `PRD-BACKEND.md`):

| Tabela | Para que serve |
|---|---|
| `profiles` | quem entra no sistema e com qual perfil |
| `obras` | as 10 obras |
| `membros` | qual cliente tem acesso a qual obra (v1.1; engenheiros veem todas sem precisar estar aqui) |
| `funcionarios` | o efetivo (sem login), com a obra em que está lotado |
| `equipamentos` | cada equipamento, onde está, se está no conserto |
| `rdos` | um diário por obra por dia, com clima |
| `rdo_efetivo` | presença de cada funcionário no dia |
| `rdo_equipamentos` | situação de cada equipamento no dia |
| `frentes_servico` | as frentes de cada obra, com situação e "parada desde" |
| `rdo_frentes` | o que aconteceu em cada frente no dia |
| `rdo_frente_equipe` | quem trabalhou em qual frente no dia |
| `fotos` | as fotos, ligadas a obra, dia e frente |
| `pranchas` | a folha do PDF do projeto, ligada a uma frente de serviço |
| `elementos_prancha` | cada sapata (área) ou trecho de tubo (linha) desenhado na prancha, com data de execução |
| `ocorrencias` | os fatos do dia que precisam de registro ou providência (v1.1) |
| `comentarios` | as mensagens do mural de cada obra, interno ou com o cliente (v1.1) |
| `comentarios_lidos` | até onde cada pessoa já leu, para o aviso de "comentários novos" (v1.1) |
| `medicoes` | cada medição subida: obra, contrato ou empreiteiro, número, período, planilha (v1.3) |
| `medicao_itens` | cada linha da planilha: etapa, serviço, unidade, quantidade contratada, preço, quantidade medida (v1.3) |
| `modelos_planilha` | a escolha de colunas guardada por obra e por empreiteiro (v1.3) |

**Aviso honesto:** o roteiro recomenda até 7 tabelas na v1. Agora são 20 (14 + 3 de Ocorrências e Comentários + 3 de Medições), divididas em quatro fases. Pedidos, aditivo e estoque continuam fora (somariam mais umas 4). Se precisar enxugar mais, o próximo candidato é o passo 3 (prancha).

## A pergunta de um ano

**Já respondida em parte:** "quantos dias cada funcionário trabalhou, faltou e teve atestado no mês, e em qual obra". O dado vem do `rdo_efetivo`, guardado com a data desde o primeiro diário.

`[CHUTE]` Outras propostas: "quantos dias cada frente ficou parada, e por quê, por obra e por empreiteiro" e "quantos homens-dia foram em cada frente". Os dados para isso já estão guardados (motivo de parada por dia em `rdo_frentes`; equipe por frente por dia em `rdo_frente_equipe`).

## Melhorias para a v2

- ~~Medição por empreiteiro~~ — entrou na v1.3 como painel lido da planilha (31/10/2026).
- **Pedidos de material x planilha de medição, e aditivo** — continua na v2. Fica mais fácil depois da v1.3, porque os itens da planilha já estarão no app: cada pedido é comparado com eles, e o que não existir na planilha ou passar da quantidade entra numa lista de aditivo.
- ~~Estoque por obra~~ — voltou em 01/11/2026 como parte de Materiais, com entrada e saída automáticas pelos pedidos (ver "Corte: v1 e v2").
- **Valores (preço, medição em R$)** — entram na v1.3, pela planilha de medição, e ficam escondidos do cliente.
- **Cronograma** — cortado: a prancha visual e as frentes já mostram avanço para o cliente.
- **RDO em PDF assinado** — não é necessário: o app é só para controle interno. A v1 tem só a versão para imprimir pelo navegador.
- **Funcionar sem internet** — cortado: é a parte mais difícil de fazer bem.

---

# A conta que vai chegar depois

- `[PENDENTE: minutos por obra por dia no RDO hoje]` — custo: sem isso não dá para medir se o app economizou tempo.
- `[PENDENTE: quanto pagaria por um sistema pronto]` — custo: falta a régua do retorno.
- `[PENDENTE: já usou algum app de RDO e por que largou]` — custo: corre o risco de repetir o motivo do abandono.
- ~~Os mestres já viram essa ideia?~~ Resolvido: quem preenche é você e outro engenheiro. O risco de adoção cai muito. `[PENDENTE: o outro engenheiro já viu a ideia?]` — custo: ele é metade de quem preenche.
- ~~Planilha de medição real~~ — recebida e lida em 31/10/2026 (contrato .xlsm com aba BM; empreiteiro .xlsx com uma aba por medição). As duas trazem quantidade do período **e** acumulada.
- ~~Todos os empreiteiros usam o mesmo modelo?~~ Sim (confirmado em 31/10/2026): todos usam o modelo de uma aba por medição, com lista simples. O painel de empreiteiro calcula o saldo linha a linha.
- `[PENDENTE: benchmark sem preço]` — custo: nenhum concorrente publica preço; para comparar, é preciso pedir proposta.

# Decidir depois de usar

- `[DESCOBRIR NO USO: sinal de internet nos canteiros]` — por enquanto: precisa de sinal para salvar; foto é encolhida antes de subir para gastar pouco dado.
- `[DESCOBRIR NO USO: quantas fotos por frente por dia]` — por enquanto: até 5.
- `[DESCOBRIR NO USO: toda foto vai direto para o cliente?]` — por enquanto: toda foto nasce "visível ao cliente" e o engenheiro pode esconder.
- `[DESCOBRIR NO USO: lista de motivos de parada]` — por enquanto: Falta de material, Falta de mão de obra, Chuva, Aguardando projeto, Aguardando cliente, Aguardando terceirizado, Outro.
