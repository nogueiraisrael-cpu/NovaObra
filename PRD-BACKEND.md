# PRD Backend — Nova Obra

> Especificação dos dados e das permissões. Lido na etapa de criar o banco no Supabase.
> O SQL não está aqui: ele é escrito na hora de construir, a partir desta descrição.
> Fonte das decisões: `PLANO-DO-PROJETO.md`. **Revisado em 31/10/2026. Construir primeiro a v1.0 (ver "Fases de entrega").**

## Convenções

- Tabelas no plural, em minúsculo, sem acento, com underline: `rdo_frentes`.
- Colunas em minúsculo com underline: `data_inicio`, `funcionario_id`.
- Toda tabela tem `id` (uuid gerado pelo banco) e `created_at` (timestamptz automático).
- Chave estrangeira termina em `_id`.
- Campo de lista fechada vira CHECK, e o texto tem que ser **idêntico** ao usado na interface (com acento e maiúscula como está aqui).
- Datas como `date` ou `timestamptz`. Dinheiro como `numeric(14,2)` (não existe dinheiro na v1).
- Foto e imagem de prancha vão para o Storage; o banco guarda só o caminho.

---

## Unidade principal

**Obra.** Vai existir mais de uma: **sim** (10 ao mesmo tempo).
- Tabela `obras`.
- **Multi-obra (decidido em 31/10/2026):** coluna `obra_id` **obrigatória** (`not null`) em toda tabela de lançamento — agora e nos módulos que vierem. Exceção: `funcionarios` e `equipamentos` são cadastros que circulam entre obras; neles `obra_id` é a lotação atual e pode ser vazio. Nenhuma consulta devolve dado de duas obras juntas, salvo o comparativo da tela Obras. Regra registrada em `AGENTS.md`.
- Tabela `membros` (obra, pessoa, papel) diz quem tem acesso a qual obra. O engenheiro não precisa estar em `membros`: vê todas.
- Os dois engenheiros veem e lançam em todas as obras. O perfil Mestre não existe (decidido em 31/10/2026). Um cliente (v1.1) normalmente está em uma obra.

---

## Fases de entrega

- **v1.0 (até 15/11/2026):** todas as tabelas, menos `pranchas` e `elementos_prancha`. Processo 1 (fechar RDO atualiza frentes). Todas as permissões das tabelas criadas. Em `equipamentos`, a situação `No conserto` e os campos de conserto já existem, mas a tela só usa `Na obra` e `No depósito`.
- **v1.1 (até o fim de dezembro):** `ocorrencias`, `comentarios`, `comentarios_lidos`, `fotos.ocorrencia_id`, Storage `comentarios/`, processo 2 (aviso de RDO não lançado), consulta Presença do mês, permissões do Cliente em uso.
- **v1.2 (até meados de janeiro/2027):** `pranchas`, `elementos_prancha`, Storage `pranchas/` (PDF original + imagem da folha).
- **v1.3 (até meados de fevereiro/2027):** `medicoes`, `medicao_itens`, `modelos_planilha`, Storage `medicoes/`. A leitura do .xlsx/.xlsm é feita no navegador, no momento do envio, só dos valores (sem macros).

O banco da v1.0 já guarda tudo de que a v1.1 precisa (`rdo_efetivo` com data, fotos com `visivel_cliente`), então nada precisa ser migrado depois.

---

## Tabela `profiles`

Liga o login à pessoa e guarda o perfil dela. É ela que manda nas permissões.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave; é o próprio código do login (a mesma pessoa) |
| nome | text | sim | |
| email | text | sim | único |
| role | text | sim | CHECK: `Engenheiro`, `Cliente`, `Pendente` |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

Criado automaticamente por um gatilho quando alguém se cadastra, já com `role = Pendente`.

---

## Tabela `obras`

Para que serve: cada obra tocada pelo engenheiro.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | ex.: "Residencial Alto da Serra — Casa 4" |
| codigo | text | sim | código/apelido curto, único, em maiúsculas (ex.: `SERRA4`); aparece no seletor de obra |
| tipo | text | sim | CHECK: `Licitação`, `Alto padrão` |
| endereco | text | não | rua, número, bairro |
| cidade | text | sim | |
| cliente | text | não | prefeitura / nome do cliente (era `contratante`) |
| numero_contrato | text | não | útil nas licitações |
| data_inicio | date | sim | |
| data_meta_entrega | date | não | data-meta de entrega (era `previsao_termino`); não pode ser antes do início |
| situacao | text | sim | CHECK: `Em andamento`, `Parada`, `Concluída`; padrão `Em andamento` (era `status` Ativa/Paralisada/Concluída) |
| created_at | timestamptz | sim | automático |

**Relações:** tem vários `membros`, `rdos`, `frentes_servico`, `pranchas`, `fotos`; funcionários e equipamentos apontam para a obra em que estão.
**Índices úteis:** `status`.

---

## Tabela `membros`

Para que serve: diz qual cliente tem acesso a qual obra. Só é usada a partir da v1.1; os engenheiros não precisam estar aqui.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| profile_id | uuid | sim | |
| papel | text | sim | CHECK: `Cliente` |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** o par (obra_id, profile_id) é único.

---

## Tabela `funcionarios`

Para que serve: o efetivo. Funcionário **não tem login**.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | |
| funcao | text | sim | CHECK: `Pedreiro`, `Servente`, `Carpinteiro`, `Armador`, `Eletricista`, `Encanador`, `Pintor`, `Mestre`, `Contramestre`, `Encarregado`, `Betoneiro`, `Auxiliar de pedreiro`, `Auxiliar de serviços gerais`, `Almoxarife`, `Motorista`, `Operador de máquina`, `Outro` (migration -23) |
| obra_id | uuid | não | obra em que está lotado hoje (vazio = sem obra) |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

**Índices úteis:** `obra_id`.
**Regra de negócio:** quando o funcionário é marcado `Deslocado` no RDO com obra de destino, a lotação dele **não** muda (o deslocamento é só daquele dia, confirmado). O engenheiro muda a lotação em Pessoas se for definitivo.

---

## Tabela `equipamentos`

Para que serve: cada equipamento (betoneira, vibrador, andaime, serra etc.) e onde está.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | ex.: "Betoneira 400 L" |
| codigo | text | não | patrimônio / plaqueta |
| situacao | text | sim | CHECK: `Na obra`, `No conserto`, `No depósito` |
| obra_id | uuid | não | preenchido quando `Na obra` |
| situacao_desde | date | sim | data da última mudança de situação |
| oficina | text | não | quando `No conserto` |
| previsao_retorno | date | não | quando `No conserto` |
| defeito | text | não | quando `No conserto` |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** `Na obra` exige `obra_id`; `No conserto` exige `oficina`. Ao sair de `Na obra`, `obra_id` fica vazio.
**Índices úteis:** `situacao`, `obra_id`.

---

## Tabela `rdos`

Para que serve: o diário de uma obra em um dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| data | date | sim | |
| clima_manha | text | sim | CHECK: `Bom`, `Nublado`, `Chuva leve`, `Chuva forte` |
| clima_tarde | text | sim | mesma lista |
| praticavel_manha | boolean | sim | padrão verdadeiro |
| praticavel_tarde | boolean | sim | padrão verdadeiro |
| observacoes | text | não | ocorrências gerais do dia |
| status | text | sim | CHECK: `Em andamento`, `Fechado`; padrão `Em andamento` |
| criado_por | uuid | sim | profile de quem abriu |
| fechado_por | uuid | não | |
| fechado_em | timestamptz | não | |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** um RDO por obra por dia (obra_id + data único). Não fecha sem clima preenchido.
**Índices úteis:** (obra_id, data).

---

## Tabela `rdo_efetivo`

Para que serve: a presença de cada funcionário em um dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| rdo_id | uuid | sim | |
| obra_id | uuid | sim | repete a obra do RDO (para permissão e consulta) |
| data | date | sim | repete a data do RDO (para a trava de duas obras e o relatório do mês) |
| funcionario_id | uuid | sim | |
| situacao | text | sim | CHECK: `Presente`, `Falta`, `Atestado`, `Deslocado`, `Veio de outra obra` |
| obra_destino_id | uuid | não | obrigatório quando `Deslocado` |
| created_at | timestamptz | sim | automático |

**Regras de negócio:**
- (rdo_id, funcionario_id) único.
- **Trava de duas obras:** um funcionário só pode ter **uma** linha com situação `Presente` ou `Veio de outra obra` por `data`, somando todas as obras. A trava fica no banco (índice único parcial em funcionario_id + data), não só na tela. Ao barrar, a tela mostra "João já está presente hoje na obra Casa Lagoa 12".
- Quando um funcionário é marcado `Deslocado` para a obra B, se o RDO do mesmo dia da obra B já existe, ele entra lá como `Veio de outra obra`; se não existe, entra quando o RDO de B for aberto. Na obra A ele fica `Deslocado`, que não conta como presença na obra A.
- O deslocamento vale só para aquele dia: `funcionarios.obra_id` não muda.

**Índices úteis:** (funcionario_id, data), (obra_id, data).

---

## Tabela `rdo_equipamentos`

Para que serve: a situação de cada equipamento da obra no dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| rdo_id | uuid | sim | |
| obra_id | uuid | sim | |
| equipamento_id | uuid | sim | |
| situacao | text | sim | CHECK: `Operando`, `Parado`, `Quebrado` |
| observacao | text | não | |
| created_at | timestamptz | sim | automático |

---

## Tabela `frentes_servico`

Para que serve: cada frente de serviço de uma obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| nome | text | sim | ex.: "Reboco fachada norte" |
| etapa | text | sim | CHECK: `Fundação`, `Estrutura / Concretagem`, `Alvenaria`, `Reboco de fachada`, `Reboco interno`, `Revestimento cerâmico`, `Instalações hidrossanitárias`, `Instalações elétricas`, `Impermeabilização`, `Cobertura`, `Pintura`, `Outro` |
| executor | text | sim | CHECK: `Equipe própria`, `Terceirizado` |
| empreiteiro | text | não | obrigatório quando `Terceirizado` |
| situacao | text | sim | CHECK: `Não iniciada`, `Em execução`, `Parada`, `Concluída`; padrão `Não iniciada` |
| parada_desde | date | não | preenchida pelo processo 1 |
| motivo_parada | text | não | último motivo informado; mesma lista de `rdo_frentes.motivo_parada` |
| data_inicio | date | não | primeiro dia em `Em execução` |
| data_conclusao | date | não | obrigatória quando `Concluída` |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** "Parada há N dias" = hoje − `parada_desde`. Não muda para `Concluída` sem `data_conclusao`.
**Índices úteis:** (obra_id, situacao).

---

## Tabela `rdo_frentes`

Para que serve: o que aconteceu em uma frente em um dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| rdo_id | uuid | sim | |
| obra_id | uuid | sim | |
| frente_id | uuid | sim | |
| situacao | text | sim | CHECK: `Em execução`, `Parada`, `Concluída` |
| motivo_parada | text | não | obrigatório quando `Parada`. CHECK: `Falta de material`, `Falta de mão de obra`, `Chuva`, `Aguardando projeto`, `Aguardando cliente`, `Aguardando terceirizado`, `Outro` |
| descricao | text | não | o que foi feito hoje |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** (rdo_id, frente_id) único.

---

## Tabela `rdo_frente_equipe`

Para que serve: quem trabalhou em qual frente no dia. Um funcionário pode estar em várias frentes no mesmo dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| rdo_frente_id | uuid | sim | |
| obra_id | uuid | sim | |
| funcionario_id | uuid | sim | |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** só aceita funcionário com `Presente` ou `Veio de outra obra` no `rdo_efetivo` do mesmo RDO. (rdo_frente_id, funcionario_id) único.

---

## Tabela `fotos`

Para que serve: as fotos do relatório fotográfico.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| rdo_id | uuid | não | obrigatório, a menos que a foto seja de uma ocorrência |
| rdo_frente_id | uuid | não | a frente da foto |
| ocorrencia_id | uuid | não | v1.1: foto de uma ocorrência. Foto de ocorrência nunca é visível ao cliente |
| caminho | text | sim | caminho no Storage |
| legenda | text | não | |
| visivel_cliente | boolean | sim | padrão verdadeiro |
| enviada_por | uuid | sim | profile |
| created_at | timestamptz | sim | automático |

---

## Tabela `pranchas`

Para que serve: uma folha do PDF do projeto, ligada a uma frente de serviço, onde se pinta o que foi executado.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| frente_id | uuid | sim | frente ligada (ex.: "Fundação — sapatas", "Tubulação água fria") |
| titulo | text | sim | ex.: "Planta de locação — Prancha 02" |
| caminho_pdf | text | sim | PDF original no Storage |
| pagina_pdf | integer | sim | qual folha do PDF (1, 2, 3…) |
| caminho_imagem | text | sim | imagem PNG da folha, gerada no navegador a partir do PDF |
| largura_px | integer | sim | tamanho da imagem gerada |
| altura_px | integer | sim | |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** a imagem é gerada uma vez, no envio, e serve de fundo para o desenho. O PDF fica guardado para consulta e download.
**Relações:** pertence a uma obra e a uma frente; uma frente pode ter várias pranchas (ex.: hidráulica térreo e superior).

---

## Tabela `elementos_prancha`

Para que serve: cada sapata, pilar, pano de fachada, ambiente (áreas) ou trecho de tubo (linhas) desenhado na prancha, para ser pintado quando executado.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| prancha_id | uuid | sim | |
| obra_id | uuid | sim | |
| codigo | text | sim | ex.: "S12", "AF-03" |
| forma | text | sim | CHECK: `Área`, `Linha` |
| pontos | jsonb | sim | lista de pontos [[x, y], …] em % da largura e da altura da imagem (0 a 100). Área: os cantos do contorno (mínimo 3). Linha: os pontos ao longo do tubo (mínimo 2) |
| status | text | sim | CHECK: `Pendente`, `Executado`; padrão `Pendente` |
| data_execucao | date | não | obrigatória quando `Executado` |
| rdo_id | uuid | não | RDO em que foi pintado |
| created_at | timestamptz | sim | automático |

**Regras de negócio:** (prancha_id, codigo) único. Pontos em porcentagem, para o desenho ficar no lugar certo em qualquer tamanho de tela. Tubo executado pela metade = dividir em dois elementos `Linha`.

---

## Tabela `ocorrencias` (v1.1)

Para que serve: os fatos da obra que precisam de registro e, às vezes, de providência.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| data | date | sim | padrão hoje |
| rdo_id | uuid | não | preenchido quando registrada de dentro do RDO do dia |
| frente_id | uuid | não | frente ligada, se houver |
| tipo | text | sim | CHECK: `Acidente de trabalho`, `Visita da fiscalização`, `Visita do cliente`, `Problema com material`, `Problema de projeto`, `Dano ou quebra`, `Clima`, `Terceirizado`, `Outro` |
| gravidade | text | sim | CHECK: `Baixa`, `Média`, `Alta`; padrão `Baixa` |
| titulo | text | sim | ex.: "Aço CA-50 entregue com bitola errada" |
| descricao | text | não | |
| situacao | text | sim | CHECK: `Aberta`, `Resolvida`; padrão `Aberta` |
| resolucao | text | não | obrigatória quando `Resolvida` |
| data_resolucao | date | não | obrigatória quando `Resolvida` |
| registrada_por | uuid | sim | profile |
| resolvida_por | uuid | não | profile |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** "aberta há N dias" = hoje − `data`, enquanto `Aberta`.
**Índices úteis:** (situacao, gravidade), (obra_id, data).

---

## Tabela `comentarios` (v1.1)

Para que serve: as mensagens do mural de cada obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| canal | text | sim | CHECK: `Interno`, `Com o cliente` |
| autor_id | uuid | sim | profile |
| texto | text | sim | |
| caminho_foto | text | não | uma foto, no Storage `comentarios/<obra_id>/` |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** só Engenheiro grava comentários; o cliente só lê o canal `Com o cliente` da obra dele. Não há edição: para corrigir, apaga e escreve de novo.
**Índices úteis:** (obra_id, canal, created_at).

---

## Tabela `comentarios_lidos` (v1.1)

Para que serve: guardar até onde cada pessoa leu cada mural, para mostrar "N comentários novos".

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| canal | text | sim | CHECK: `Interno`, `Com o cliente` |
| profile_id | uuid | sim | |
| lido_ate | timestamptz | sim | atualizado ao abrir o mural |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** (obra_id, canal, profile_id) único.

---

## Tabela `medicoes` (v1.3)

Para que serve: cada medição cuja planilha foi subida, do contrato ou de um empreiteiro.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| tipo | text | sim | CHECK: `Contrato`, `Empreiteiro` |
| empreiteiro | text | não | obrigatório quando `Empreiteiro`; escolhido da lista de empreiteiros já usados nas frentes da obra, ou digitado |
| numero | integer | sim | 1ª, 2ª, 3ª… Lido do cabeçalho quando dá ("Nº 30"); senão, do nome da aba ("30ª med…"); senão, digitado. Sempre confirmado pelo engenheiro |
| periodo_inicio | date | não | Contrato: lido de "Período: 01/09/2026 a 14/10/2026" |
| periodo_fim | date | não | |
| data_medicao | date | sim | Contrato: campo "Data" do cabeçalho. Empreiteiro: célula "DATA" da aba (vem como número de série do Excel e é convertida) |
| caminho_planilha | text | sim | arquivo original (.xlsx ou .xlsm) no Storage `medicoes/<obra_id>/`. No empreiteiro, o mesmo arquivo serve a várias medições |
| aba_origem | text | sim | aba de onde a medição foi lida: "BM", "30ª med 05.07.25"… |
| valor_periodo | numeric(14,2) | sim | total da medição no período, lido da planilha (para conferir com a soma dos itens) |
| desconto | numeric(14,2) | não | empreiteiro: linha "DESCONTO" |
| valor_a_pagar | numeric(14,2) | não | empreiteiro: "VALOR A PAGAR" |
| observacao | text | não | empreiteiro: texto de "OBSERVAÇÃO" (ex.: "Período: junho/25") |
| avisos | jsonb | não | avisos da conferência que o engenheiro aceitou ao importar |
| importada_por | uuid | sim | profile |
| created_at | timestamptz | sim | automático |

**Regras de negócio:** (obra_id, tipo, empreiteiro, numero) único; se a planilha trouxer número repetido, a importação para e pede outro número. Trocar a planilha de uma medição apaga os itens dela e importa de novo.
**Índices úteis:** (obra_id, tipo, empreiteiro, numero).

---

## Tabela `medicao_itens` (v1.3)

Para que serve: cada linha de serviço lida da planilha de uma medição.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| medicao_id | uuid | sim | |
| obra_id | uuid | sim | |
| linha_planilha | integer | sim | linha de origem, para conferência |
| item | text | sim | código como está na planilha: "2.2.6", "12.1", "3" |
| etapa_codigo | text | não | contrato: etapa ("2.0"). Vazio no empreiteiro |
| etapa_nome | text | não | contrato: "REDE COLETORA" |
| subetapa_codigo | text | não | contrato: "2.2", quando existe |
| subetapa_nome | text | não | contrato: "TRABALHOS EM TERRA" |
| descricao | text | sim | |
| unidade | text | sim | "M3", "M²", "UND", "KM", "M3XKM"… como na planilha |
| preco_unitario | numeric(14,2) | sim | |
| qtd_prevista | numeric(14,4) | sim | contrato: "Previsto" (original). Empreiteiro: "Previsto" do físico |
| qtd_contratada | numeric(14,4) | sim | contrato: "Adequado" (é contra ela que se calcula o saldo). Empreiteiro: igual à prevista |
| qtd_periodo | numeric(14,4) | sim | "No período" / "Executado no período" |
| qtd_acumulada | numeric(14,4) | sim | "Acumulado" / "Executado acumulado" |
| valor_previsto | numeric(14,2) | sim | lido da planilha |
| valor_contratado | numeric(14,2) | sim | contrato: "Adequado"; empreiteiro: "Previsto" do financeiro |
| valor_periodo | numeric(14,2) | sim | lido da planilha |
| valor_acumulado | numeric(14,2) | sim | lido da planilha |
| created_at | timestamptz | sim | automático |

**Regras de negócio:**
- Os valores são **lidos** da planilha, não recalculados: o painel mostra o que está no boletim. A conferência compara a soma dos itens com o total da planilha e avisa se não bater.
- Saldo = contratado − acumulado (quantidade e valor). % = acumulado ÷ contratado. Calculado na consulta.
- **Contrato:** só linhas com unidade viram item; linhas sem unidade são etapa (código terminado em ".0") ou subetapa. A leitura para na linha "TOTAL GERAL DA MEDIÇÃO". O mesmo serviço é reconhecido entre medições pelo `item`; se um item sumir ou mudar de descrição, a importação avisa.
- **Empreiteiro:** linha com item mas sem discriminação é ignorada (itens vazios do modelo). A leitura para na linha "EXECUTANTE:". O bloco "Dados para pagamento" nunca é lido. Itens **não** são casados entre medições: cada linha vale dentro da sua medição.
- Saldo negativo (acumulado acima do contratado) é permitido e destacado: é candidato a aditivo.
**Índices úteis:** (medicao_id), (obra_id, item).

---

## Tabela `modelos_planilha` (v1.3)

Para que serve: guardar quais colunas da planilha são o quê, para não perguntar de novo a cada medição.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | |
| tipo | text | sim | CHECK: `Contrato`, `Empreiteiro` |
| empreiteiro | text | não | obrigatório quando `Empreiteiro` |
| aba | text | não | contrato: nome fixo da aba ("BM"). Empreiteiro: vazio (todas as abas de medição são lidas) |
| linha_cabecalho | integer | sim | última linha de títulos (11 nos dois modelos reais) |
| colunas | jsonb | sim | qual coluna é cada informação (ver os dois modelos abaixo) |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** (obra_id, tipo, empreiteiro) único. Editável a qualquer momento ("Refazer escolha de colunas").

**Os dois modelos já conhecidos** (vêm prontos; o engenheiro só aponta colunas se a planilha for diferente):

| Informação | Contrato — "Boletim BM" | Empreiteiro — "Uma aba por medição" |
|---|---|---|
| Item | A | A |
| Descrição | B | B |
| Unidade | C | C |
| Preço unitário | L | D |
| Qtd prevista | D | E |
| Qtd contratada | E (Adequado) | E |
| Qtd no período | F | F |
| Qtd acumulada | H | G |
| Valor previsto | M | I |
| Valor contratado | N (Adequado) | I |
| Valor no período | O | J |
| Valor acumulado | P | K |
| Primeira linha de dados | 12 | 12 |
| Fim dos dados | linha "TOTAL GERAL DA MEDIÇÃO" | linha "EXECUTANTE:" |
| Nº da medição | L7 ("Nº …") | C2 ("MEDIÇÃO : Nº 30"), ou o nome da aba |
| Data | M7 | L2 (data em número de série do Excel) |
| Período | L8 ("01/09/2026 a 14/10/2026") | texto de "OBSERVAÇÃO" (H27) |
| Desconto / valor a pagar | — | K25 / D30 |

O app reconhece o modelo pelos títulos das linhas 10 e 11 ("BOLETIM DE MEDIÇÃO DE SERVIÇOS" com "ADEQUADO" → contrato; "FÍSICO" e "FINANCEIRO" → empreiteiro). Se as posições mudarem um pouco (uma coluna a mais), ele procura pelos títulos e não pela letra.

---

## Permissões

> **Substituída em 02/11/2026 por `docs/permissoes/QUEM-PODE-O-QUE.md` e `docs/permissoes/quadro.json`.** Os perfis passam a ser `admin_master`, `gerente` e `cliente`, e "Pendente" vira situação (`pendente`, `ativo`, `bloqueado`). Onde discordarem, vale o quadro.

Escrito em português. Vira RLS na hora de construir. "Obras dele" = obras onde a pessoa está em `membros`. Quem está com `role = Pendente` ou `ativo = falso` não vê nada.

### `profiles`
- **Ver:** cada um vê o próprio; Engenheiro vê todos.
- **Criar:** só o gatilho de cadastro.
- **Editar:** cada um edita o próprio nome; só o Engenheiro muda `role` e `ativo`.
- **Apagar:** ninguém (desativa).
- **Sem login:** nada.

### `obras`
- **Ver:** Engenheiro todas; Cliente só a dele.
- **Criar / editar / apagar:** só Engenheiro.
- **Sem login:** nada.

### `membros`
- **Ver:** Engenheiro todos; cada pessoa vê as próprias linhas.
- **Criar / editar / apagar:** só Engenheiro.

### `funcionarios`, `equipamentos`
- **Ver:** Engenheiro todos; Cliente nada.
- **Criar / editar / apagar:** só Engenheiro.

### `rdos`, `rdo_efetivo`, `rdo_equipamentos`, `rdo_frentes`, `rdo_frente_equipe`
- **Ver:** Engenheiro todos; **Cliente nada** (o cliente vê o avanço pelas frentes, prancha e fotos).
- **Criar / editar:** só Engenheiro (inclusive RDO `Fechado`).
- **Apagar:** só Engenheiro.

### `frentes_servico`
- **Ver:** Engenheiro todas; Cliente as da obra dele, **sem `motivo_parada` e `parada_desde`** (para o cliente, `Parada` aparece como `Em execução`) `[CHUTE — CONFIRMAR]`. Na construção isso vira uma consulta própria para o cliente, que não traz esses campos.
- **Criar / editar:** só Engenheiro.
- **Apagar:** só Engenheiro.

### `fotos`
- **Ver:** Engenheiro todas; Cliente só as da obra dele com `visivel_cliente = verdadeiro`.
- **Criar:** só Engenheiro.
- **Editar:** só Engenheiro (legenda, `visivel_cliente`).
- **Apagar:** só Engenheiro.
- **Storage:** pasta `fotos/<obra_id>/`; mesma regra de leitura. Nunca público.

### `pranchas`, `elementos_prancha`
- **Ver:** Engenheiro todas; Cliente as da obra dele.
- **Criar / apagar prancha e elementos:** só Engenheiro.
- **Editar `status` e `data_execucao` do elemento:** só Engenheiro.
- **Storage:** pasta `pranchas/<obra_id>/`. Nunca público.

### `ocorrencias`
- **Ver / criar / editar / apagar:** só Engenheiro. **Cliente nada.**

### `comentarios`
- **Ver:** Engenheiro todos; Cliente só os da obra dele com `canal = Com o cliente`.
- **Criar:** só Engenheiro, em qualquer obra e canal. **Cliente não grava.**
- **Editar:** ninguém.
- **Apagar:** só Engenheiro.
- **Storage:** pasta `comentarios/<obra_id>/`; mesma regra de leitura. Nunca público.

### `comentarios_lidos`
- **Ver / criar / editar:** cada pessoa só as próprias linhas.

### `medicoes`, `medicao_itens`, `modelos_planilha`
- **Ver / criar / editar / apagar:** só Engenheiro. **Cliente nada**, nem pela tela nem pelo banco direto.
- **Storage:** pasta `medicoes/<obra_id>/`; só Engenheiro. Nunca público.

---

## Fluxo de cadastro e liberação

1. A pessoa se cadastra com email e senha.
2. O gatilho cria a linha em `profiles` com `role = Pendente`.
3. Ela vê "Conta aguardando liberação do engenheiro" e nenhum dado.
4. Um Engenheiro escolhe o perfil: `Engenheiro` (vê tudo) ou `Cliente` (a partir da v1.1, com a obra dele em `membros`).
5. O primeiro Engenheiro é definido à mão no Supabase, na construção.

## Processos automáticos

### 1. Ao fechar o RDO, atualizar as frentes
- **Gatilho:** RDO muda para `Fechado`.
- **Passos:** para cada `rdo_frentes` do RDO: se `Parada` e a frente não estava `Parada`, grava `parada_desde = data do RDO` e `motivo_parada`; se `Em execução`, limpa `parada_desde` e preenche `data_inicio` se vazio; se `Concluída`, grava `data_conclusao`. Atualiza `situacao` da frente. Grava `fechado_por` e `fechado_em`.
- **Resultado:** "Parada há N dias" sempre certo na lista de frentes.
- **Se falhar:** tudo volta atrás (nada fica pela metade), o RDO continua `Em andamento` e a tela mostra "Não foi possível fechar o diário. Verifique a internet e tente de novo."

### 2. Aviso de RDO não lançado
- **Gatilho:** consulta da lista de obras.
- **Passos:** para cada obra `Em andamento`, verifica se existe RDO `Fechado` com data de ontem.
- **Resultado:** a lista recebe um indicador para mostrar "RDO de ontem não fechado".
- **Se falhar:** o indicador não aparece; nenhum dado é alterado.

## Relatório: Presença do mês

Não é tabela nova nem processo automático: é uma consulta sobre `rdo_efetivo`, feita na hora em que o engenheiro abre a tela.
- **Entrada:** mês e ano.
- **Saída por funcionário:** dias `Presente` + `Veio de outra obra` (presença), dias `Falta`, dias `Atestado`, e a presença quebrada por obra. A linha `Deslocado` não conta como presença; a presença conta na obra de destino.
- **Saída por dia (calendário do funcionário):** a obra e a situação de cada dia; dia sem linha nenhuma em `rdo_efetivo` aparece como "Sem diário".
- **Quem vê:** só Engenheiro.

## Arquivos

- Guardados no Storage, nas pastas `fotos/<obra_id>/` e `pranchas/<obra_id>/`, ambas privadas.
- Foto comprimida no navegador antes de subir (máx. 1200px, qualidade 0.8). Prancha: o PDF original sobe sem mexer (limite de 20 MB); a folha escolhida vira PNG de até 4000px no lado maior, para as cotas e os tubos continuarem legíveis com zoom.
- O banco guarda o caminho.

## Critérios de aceite

- [ ] Usuário recém-cadastrado não enxerga nenhum dado até ser liberado.
- [ ] Os dois engenheiros enxergam e editam todas as obras, inclusive RDO `Fechado`.
- [ ] Cliente não lê nenhuma linha de `rdos`, `rdo_efetivo`, `funcionarios` nem `equipamentos`.
- [ ] Cliente não vê foto com `visivel_cliente = falso`, nem pela tela nem pelo link do Storage.
- [ ] Cliente não vê `motivo_parada` nem `parada_desde`.
- [ ] Não é possível criar dois RDOs da mesma obra no mesmo dia.
- [ ] Não é possível pôr na equipe de uma frente um funcionário que não está presente no RDO.
- [ ] Não é possível marcar o mesmo funcionário como presente em duas obras na mesma data, nem gravando direto no banco.
- [ ] O relatório de presença de um mês bate com a soma dos RDOs: um funcionário deslocado conta 1 dia na obra de destino e 0 na de origem.
- [ ] Fechar o RDO com uma frente `Parada` grava `parada_desde`; reabrir a frente limpa.
- [ ] (v1.1) Cliente não lê nenhuma ocorrência nem foto de ocorrência.
- [ ] (v1.1) Cliente não lê nem grava comentário `Interno`, nem pelo banco direto.
- [ ] (v1.1) Cliente só lê comentários `Com o cliente` da obra dele e não consegue gravar nem apagar nenhum, nem pelo banco direto.
- [ ] (v1.1) Ocorrência não muda para `Resolvida` sem `resolucao` e `data_resolucao`.
- [ ] (v1.3) Cliente não lê nenhuma linha de `medicoes`, `medicao_itens` nem `modelos_planilha`, nem o arquivo da planilha.
- [ ] (v1.3) Não é possível ter duas medições com o mesmo número para a mesma obra, tipo e empreiteiro.
- [ ] (v1.3) Importar `medição real do contrato.xlsm` (aba BM) gera 13 etapas e total adequado de R$ 2.664.011,25, previsto R$ 1.790.178,34, acumulado R$ 1.789.748,40 e período R$ 138.346,23, iguais à linha "TOTAL GERAL DA MEDIÇÃO".
- [ ] (v1.3) Importar `medição empreiteiro.xlsx` lista as 33 abas, ignora os itens sem discriminação e o bloco de dados para pagamento, e avisa os números de medição repetidos.
- [ ] (v1.3) Nenhuma macro da planilha .xlsm é executada.
- [ ] O Engenheiro consegue trocar o perfil de qualquer usuário.
- [ ] Os valores de lista do banco são idênticos aos da interface (acento e maiúscula inclusos).
- [ ] Todo campo obrigatório recusa cadastro vazio.

## A conta que vai chegar depois

- `[PENDENTE: confirmar se o cliente de alto padrão pode ver frente parada e motivo]` — muda a consulta do cliente. Por enquanto: não vê. (O fiscal das licitações não usa o app.)
- As duas planilhas reais estão na pasta do projeto (`medição real do contrato.xlsm` e `medição empreiteiro.xlsx`) e são os arquivos de teste da importação. A de empreiteiro tem dados bancários no bloco "Dados para pagamento": não usar como exemplo público.
- Todos os empreiteiros usam o mesmo modelo (confirmado em 31/10/2026): o modelo "Uma aba por medição" serve para todos.
- v2 (pedidos, aditivo, estoque) vai somar umas 4 tabelas, todas com `obra_id` e com valores escondidos do Cliente. Os pedidos serão comparados com `medicao_itens`.
