# PRD Frontend — Nova Obra

> Especificação da interface. Quem constrói lê este arquivo.
> Nesta fase não existe banco: as telas funcionam com os dados de exemplo do fim deste arquivo.
> Fonte das decisões: `PLANO-DO-PROJETO.md`. **Revisado em 31/10/2026. Construir primeiro a v1.0 (ver "Fases de entrega").**

## O que o sistema é

Diário de obra (RDO) com frentes de serviço, fotos e controle visual na prancha, para 10 obras ao mesmo tempo. Usado principalmente **no celular, no canteiro**, em pé, muitas vezes no sol: botões grandes, pouca digitação, toques em vez de texto sempre que der.

## Padrão técnico

- React + Vite (versões atuais), sem biblioteca de componente pronta.
- Visual a partir de um `index.css` próprio.
- Navegação por estado, sem endereço no navegador.
- **Referência visual aprovada: `preview.html`** (nesta pasta, aprovado em 31/10/2026). Copiar dele as cores, tamanhos, espaçamentos, cartões, gaveta e navegação; o `index.css` do app nasce do `<style>` desse arquivo.
- **Personalidade visual: Noturno, paleta Concreto.** Fundo escuro com um só tom vivo.
  - Fundo da tela `#121A1E`; cartões `#1D282D`; botões não escolhidos e campos `#26333A`; divisórias `#33444C`; bordas e ícones apagados `#4A5A63`. Cantos arredondados 14px, sem sombra.
  - Texto principal `#F2F4F5`; texto secundário `#A3B0B6`. Fonte Inter; base 17px.
  - **Tom vivo único:** turquesa `#00A3B4` (texto pequeno em turquesa: `#2CC6D6`; texto em cima do turquesa: `#06191C`). Usado no botão principal (cheio, largura total, ex.: "Avançar → Frentes"), item ativo do menu, links e números de destaque.
  - Cartão de resumo no topo de cada tela: 3 números grandes (44px) separados por linha fina, rótulo pequeno embaixo.
  - Status: verde `#3DC28C` = ok / em execução / fechado; âmbar `#F2B23E` = atenção / em andamento / equipamento parado; vermelho `#E2574C` (texto `#FF7A70`) = parada / atrasado / crítico, com o cartão inteiro em fundo `#2A1C1D` e borda `#5A2C2A`; cinza = não iniciado. Itens de lista levam a bolinha da cor do status.
  - Data e rótulos de seção em caixa alta pequena, espaçada; a data em turquesa.
  - Botões com no mínimo 46px de altura e sempre com rótulo; contraste mínimo 4,5:1 em todo texto.
  - Estado vazio: cartão com ícone num círculo turquesa claro, título, uma frase acolhedora e o botão principal "+ Criar o primeiro…".
- Celular (até 899px): barra inferior fixa com 5 itens, ícone + rótulo. Computador (900px ou mais): menu lateral fixo à esquerda, 248px. A gaveta sobe de baixo no celular e flutua à direita no computador.
- Todo texto de lista fechada (status, situação, etapa, clima, motivo) é escrito **exatamente** como no `PRD-BACKEND.md`.
- Gráficos: só um tipo no sistema, barras horizontais por etapa, no painel de medição (v1.3).
- Dinheiro sempre em "R$ 1.234.567,89"; quantidades com a unidade da planilha e até 2 casas ("125,40 m³"); percentuais com 1 casa ("63,2%").

## Perfis

- **Engenheiro:** entra em Obras. Vê tudo de todas as obras.
- **Engenheiro** são duas pessoas (você e o outro engenheiro), com os mesmos direitos: os dois lançam o RDO de qualquer obra. Não existe perfil Mestre.
- **Cliente:** o dono da casa de alto padrão. Entra em Avanço da obra. Vê frentes, prancha e fotos liberadas. Não vê efetivo, RDO, equipamentos, motivo de parada nem custo. O fiscal das licitações não usa o app.
- **Pendente:** vê só o aviso de conta aguardando liberação.

## Fases de entrega

Construir nesta ordem. A v1.0 precisa estar em uso em **15/11/2026**.

| Tela | Fase |
|---|---|
| Login | v1.0 |
| Obras | v1.0 |
| RDO — Passo 1 | v1.0 |
| RDO — Passo 2 + gaveta Preencher frente | v1.0 — na v1.0 o botão **Fechar RDO** (com o resumo e "Confirmar e fechar") fica no fim do passo 2, e o indicador diz "Passo 2 de 2" |
| Pessoas | v1.0 (sem o botão Presença do mês) |
| Equipamentos | v1.0 simples: cadastrar, nome, código, mandar para obra. Abas e campos de conserto na v1.1 |
| Perfil e Usuários | v1.0 |
| Presença do mês | v1.1 |
| Diários e Fotos | v1.1 |
| Avanço da obra (Cliente) | v1.1 (sem prancha) |
| Ocorrências (lista, detalhe, botão "+ Ocorrência" no passo 1 do RDO) | v1.1 — na v1.0 fica só o campo de texto "Ocorrências do dia" |
| Comentários (aba da obra, e item do menu do Cliente) | v1.1 |
| RDO — Passo 3 e Pranchas (PDF, áreas e linhas) | v1.2 |
| Medições — contrato e empreiteiro (subir planilha, escolher colunas, painel) | v1.3 |

Na v1.2, o Fechar RDO passa para o passo 3, o indicador vira "Passo N de 3" e a prancha entra na tela do Cliente.

## Mapa de navegação

```
Login
└── Engenheiro: Obras · Ocorrências · Equipamentos · Pessoas (com Presença do mês) · Perfil (Usuários dentro de Perfil)
    └── Obra: Hoje (RDO passo 1 → 2 → 3) · Diários · Fotos · Comentários · Pranchas · Medições (abas deslizam para o lado no celular)
└── Cliente: Avanço · Fotos · Comentários · Perfil
```

---

## Tela: Login

**Quem acessa:** todos, antes de entrar.

**O que aparece**
Nome do sistema "Nova Obra", campo de email, campo de senha, botão Entrar, link Criar conta.

**Ações**
- **Entrar:** valida e leva para a tela inicial do perfil.
- **Criar conta:** pede nome, email e senha; cadastra e mostra o aviso "Conta aguardando liberação do engenheiro".

**Estado vazio**
Não se aplica.

---

## Tela: Obras

**Quem acessa:** Engenheiro (todas).
**Chega aqui por:** login, ou item Obras do menu.

**O que aparece**
Título "Obras", filtro em abas (Ativas · Concluídas), botão "+ Nova obra" (só Engenheiro), e um cartão por obra.

**Campos e informações (cartão)**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome da obra | texto | sim | em destaque |
| Tipo | etiqueta | sim | `Licitação` / `Alto padrão` |
| Cidade | texto | sim | |
| RDO de hoje | etiqueta | sim | `Não iniciado` (cinza, quando não existe RDO), `Em andamento` (amarelo), `Fechado` (verde) |
| Frentes paradas | número | sim | "3 paradas" em vermelho; some se 0 |
| Equipamentos quebrados/no conserto | número | não | só Engenheiro |
| Aviso | etiqueta | não | "RDO de ontem não fechado" em vermelho |
| Ocorrências abertas | número | não | v1.1: "1 ocorrência aberta"; em vermelho se alguma for Alta |
| Comentários novos | número | não | v1.1: "2 comentários novos" (soma dos dois canais) |

**Ações**
- **Tocar no cartão:** abre a Obra na aba Hoje, no passo do RDO em que parou (passo 1 se não iniciado).
- **+ Nova obra:** abre formulário (nome, código/apelido, tipo, endereço, cidade, cliente, nº do contrato, data de início, data-meta de entrega, situação `Em andamento` / `Parada` / `Concluída`).

**Multi-obra (31/10/2026):** esta tela é o **comparativo entre obras**, a única que mostra várias juntas. Tocar num cartão escolhe a obra. No topo de todas as telas fica o **seletor de obra**, sempre visível; trocar de obra recarrega a tela inteira, e a escolha fica guardada no aparelho. Pessoas e Equipamentos mostram só o que está na obra escolhida (mais o que não está em obra nenhuma). Aba Ativas = `Em andamento` (as `Parada` num grupo recolhido); aba Concluídas = `Concluída`.
- **Segurar o cartão / menu ⋮:** Editar obra, Mudar status (Engenheiro).

**Ordem:** obras com RDO de hoje `Não iniciado` primeiro, depois `Em andamento`, depois `Fechado`; dentro de cada grupo, por nome.

**Estado vazio**
"Nenhuma obra cadastrada. Toque em + Nova obra para começar."

---

## Tela: RDO — Passo 1 (Efetivo, equipamentos e clima)

**Quem acessa:** Engenheiro.
**Chega aqui por:** tocar numa obra na tela Obras (aba Hoje).

**O que aparece**
Cabeçalho: nome da obra, data de hoje, indicador "Passo 1 de 3". Três blocos, de cima para baixo:

1. **Clima** — Manhã e Tarde, cada um com 4 botões grandes (Bom · Nublado · Chuva leve · Chuva forte) e um interruptor "Praticável".
2. **Efetivo** — lista dos funcionários lotados na obra, com nome e função. Cada linha tem botões de toque: Presente · Falta · Atestado · Deslocado. Começa tudo em Presente. Contador no topo: "12 presentes de 14". Funcionários vindos de outra obra aparecem com etiqueta "Veio de outra obra".
3. **Equipamentos** — lista dos equipamentos na obra. Cada um: Operando · Parado · Quebrado. Começa em Operando.

Campo de texto "Ocorrências do dia" (opcional), botão "Avançar → Frentes". A partir da v1.1, abaixo do campo aparece o botão **"+ Ocorrência"**, que abre o formulário de ocorrência já com a obra, a data e este RDO preenchidos, e a lista das ocorrências registradas hoje.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Clima manhã / tarde | escolha | sim | `Bom`, `Nublado`, `Chuva leve`, `Chuva forte` |
| Praticável manhã / tarde | sim/não | sim | padrão sim |
| Situação do funcionário | escolha | sim | `Presente`, `Falta`, `Atestado`, `Deslocado` |
| Obra de destino | escolha | quando Deslocado | lista das outras obras ativas |
| Situação do equipamento | escolha | sim | `Operando`, `Parado`, `Quebrado` |
| Observação do equipamento | texto | não | aparece quando Parado ou Quebrado |
| Ocorrências do dia | texto | não | |

**Ações**
- **Deslocado:** abre a escolha da obra de destino; a linha mostra "→ Obra X". Vale só para hoje: amanhã ele volta na lista desta obra. Se ele já está presente hoje na obra de destino, nada muda lá.
- **+ Trazer funcionário de outra obra:** lista dos funcionários ativos de outras obras. Quem já está presente hoje em outra obra aparece apagado, com "presente hoje em Casa Lagoa 12", e não pode ser escolhido. O escolhido entra como "Veio de outra obra" e, na obra dele, fica marcado como Deslocado para esta.
- **Trava de duas obras:** se ao marcar Presente o funcionário já está presente hoje em outra obra, a marcação não acontece e aparece "João já está presente hoje na obra Casa Lagoa 12".
- **+ Equipamento chegou na obra:** lista dos equipamentos `No depósito`; o escolhido passa a `Na obra`.
- **Avançar → Frentes:** salva e vai para o passo 2. Cada toque já salva sozinho; não existe botão Salvar neste passo.

**RDO fechado**
Aparece a faixa "Diário fechado em 30/10 às 17:42 por [nome]". Os engenheiros podem editar mesmo fechado.

**Estado vazio**
Efetivo: "Nenhum funcionário lotado nesta obra. Cadastre em Pessoas." Equipamentos: "Nenhum equipamento nesta obra."

---

## Tela: RDO — Passo 2 (Frentes de serviço)

**Quem acessa:** Engenheiro.
**Chega aqui por:** Avançar no passo 1, ou aba "Frentes" no indicador de passos.

**O que aparece**
Indicador "Passo 2 de 3". Lista de cartões, um por frente da obra (exceto `Concluída`, que fica num grupo recolhido "Concluídas (4)"). Botão "+ Nova frente". Botão "Avançar → Prancha".

**Campos e informações (cartão)**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome da frente | texto | sim | "Reboco fachada norte" |
| Etapa | etiqueta | sim | |
| Executor | texto | sim | "Equipe própria" ou "Terceirizado — Gesso & Cia" |
| Situação | etiqueta | sim | `Não iniciada`, `Em execução` (verde), `Parada` (vermelho) |
| Parada há | número | não | "Parada há 6 dias — Falta de material" em vermelho |
| Preenchido hoje | marca | sim | ✓ quando a frente já tem registro neste RDO |
| Equipe hoje | número | não | "4 pessoas" |

**Ordem:** paradas primeiro (mais dias parada no topo), depois em execução, depois não iniciadas.

**Ações**
- **Tocar no cartão:** abre "Preencher frente" (abaixo).
- **+ Nova frente:** formulário com nome, etapa, executor, empreiteiro (se terceirizado).
- **Avançar → Prancha:** vai para o passo 3. Se nenhuma frente foi preenchida hoje, avisa "Nenhuma frente preenchida hoje. Avançar mesmo assim?".

**Estado vazio**
"Nenhuma frente de serviço. Crie a primeira, ex.: Fundação — sapatas."

### Gaveta: Preencher frente (dentro do passo 2)

**O que aparece**
Nome da frente no topo. De cima para baixo:

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Situação hoje | escolha (botões) | sim | `Em execução`, `Parada`, `Concluída` |
| Motivo da parada | escolha | quando Parada | `Falta de material`, `Falta de mão de obra`, `Chuva`, `Aguardando projeto`, `Aguardando cliente`, `Aguardando terceirizado`, `Outro` |
| O que foi feito hoje | texto curto | não | ex.: "Chapisco e emboço 2º pavimento, 40 m²" |
| Equipe | marcar vários | não | só os `Presente` / `Veio de outra obra` do passo 1. Quem já está em outra frente hoje aparece com a etiqueta "também em: Alvenaria" — pode marcar mesmo assim |
| Fotos | foto | não | até 5; botão "Tirar foto" (câmera) e "Da galeria"; miniatura com X para tirar antes de salvar |
| Legenda da foto | texto | não | |

**Ações**
- **Salvar:** grava, fecha a gaveta, o cartão ganha o ✓.
- **Concluída:** pede a confirmação "Marcar Reboco fachada norte como concluída?".

---

## Tela: RDO — Passo 3 (Controle visual na prancha)

**Quem acessa:** Engenheiro.
**Chega aqui por:** Avançar no passo 2.

**O que aparece**
Indicador "Passo 3 de 3". No topo, dois seletores: a **frente de serviço** (só as que têm prancha; começa pela primeira frente preenchida hoje no passo 2) e, se a frente tiver mais de uma, a **prancha** (ex.: "Planta hidráulica — térreo"). A folha do projeto ocupa a tela, com zoom de pinça e arrastar. Por cima dela, os elementos desenhados:

| Forma | Pendente | Executado | Executado hoje |
|---|---|---|---|
| `Área` (sapata, pilar, pano, ambiente) | só o contorno, cinza | pintada por dentro de verde (meio transparente, para o projeto continuar aparecendo) | verde com borda grossa destacada |
| `Linha` (trecho de tubo) | linha fina cinza por cima do tubo | linha grossa verde | verde com contorno destacado |

O código aparece ao lado de cada elemento quando o zoom deixa ler. Rodapé fixo: "18 de 32 executados (56%)", a legenda das cores e o botão "Fechar RDO".

**Ações**
- **Tocar num elemento pendente:** pinta de verde, `Executado` com a data de hoje. A área de toque é generosa (linhas finas pegam o toque a alguns milímetros de distância).
- **Tocar num elemento pintado:** mostra "S12 — executado em 28/10" e o botão "Desfazer".
- **Fechar RDO:** mostra o resumo (presentes, frentes paradas, fotos do dia, elementos executados hoje) e o botão "Confirmar e fechar". Depois, volta para Obras com a mensagem "Diário de hoje fechado".

**Estado vazio**
"Esta frente ainda não tem prancha. Anexe o PDF do projeto em Pranchas." O botão "Fechar RDO" continua disponível.

---

## Tela: Diários (histórico da obra)

**Quem acessa:** Engenheiro.
**Chega aqui por:** aba Diários dentro da Obra.

**O que aparece**
Lista de RDOs, do mais novo para o mais antigo: data, clima (ícone), nº de presentes, nº de frentes paradas, nº de fotos, status. Tocar abre o RDO do dia em modo leitura, com todos os blocos dos 3 passos e as fotos, e o botão "Imprimir" (versão limpa para imprimir pelo navegador).

**Estado vazio**
"Nenhum diário lançado nesta obra ainda."

---

## Tela: Fotos

**Quem acessa:** Engenheiro, Cliente.
**Chega aqui por:** aba Fotos da Obra (Engenheiro) ou item Fotos do menu (Cliente).

**O que aparece**
Galeria em grade, agrupada por data (mais nova em cima). Filtro por frente de serviço. Tocar abre a foto grande com legenda, frente e data.

**Ações**
- **Engenheiro:** na foto grande, interruptor "Visível ao cliente", editar legenda, Excluir.

**Regras por perfil**
- **Cliente:** só fotos marcadas "Visível ao cliente".

**Estado vazio**
"Nenhuma foto ainda."

---

## Tela: Pranchas (cadastro)

**Quem acessa:** só Engenheiro.
**Chega aqui por:** aba Pranchas da Obra.

**O que aparece**
Lista das pranchas da obra agrupadas por frente de serviço (título, folha do PDF, "18 de 32 executados"). Botão "+ Nova prancha". Melhor usada no computador ou tablet, por causa do desenho; funciona no celular.

**Ações**
- **+ Nova prancha:** escolher a frente de serviço → anexar o **PDF** do projeto (até 20 MB) → se o PDF tiver mais de uma folha, aparecem miniaturas e se escolhe uma → dar o título. O app gera a imagem da folha e abre o desenho. Para usar outra folha do mesmo PDF em outra frente, repete o processo.
- **Desenhar elementos** (abre a folha com uma barra de ferramentas):
  - **Área — retângulo:** arrastar o dedo/mouse de um canto ao outro. Serve para a maioria das sapatas e pilares.
  - **Área — contorno livre:** tocar nos cantos um a um e tocar no primeiro ponto para fechar. Serve para pano de fachada, ambiente, área de impermeabilização.
  - **Linha — tubo:** tocar nos pontos ao longo do tubo e tocar em "Concluir trecho". Cada trecho vira um elemento.
  - Ao terminar cada forma, pede o código, já sugerindo o próximo da sequência (S13 → S14; AF-03 → AF-04).
  - **Copiar e colar:** selecionar uma área e tocar onde a cópia vai ficar; o código avança sozinho.
  - **Tocar num elemento:** renomear, mover, ajustar pontos, excluir.
  - **Desfazer** o último traço.
- **Baixar PDF original:** abre o PDF guardado.

**Estado vazio**
"Nenhuma prancha. Anexe o PDF da planta de locação para acompanhar as sapatas, ou da planta hidráulica para os tubos."

---

## Tela: Ocorrências (v1.1)

**Quem acessa:** só Engenheiro.
**Chega aqui por:** item Ocorrências do menu (todas as obras), ou botão "+ Ocorrência" no passo 1 do RDO.

**O que aparece**
Abas: Abertas · Resolvidas. Filtros: obra (Todas por padrão) e tipo. Botão "+ Ocorrência". Um cartão por ocorrência.

**Campos e informações (cartão)**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Gravidade | etiqueta | sim | `Baixa` (cinza), `Média` (amarelo), `Alta` (vermelho) |
| Título | texto | sim | em destaque |
| Obra | texto | sim | |
| Tipo | etiqueta | sim | |
| Data | data | sim | |
| Aberta há | número | não | "Aberta há 5 dias", só nas abertas |
| Fotos | número | não | "2 fotos" |

**Ordem:** abertas com gravidade Alta primeiro, depois Média e Baixa; dentro de cada uma, a mais antiga no topo. Resolvidas: a mais recente no topo.

**Ações**
- **+ Ocorrência:** formulário com obra, data (padrão hoje), tipo, gravidade, título, descrição, frente de serviço (opcional, só as da obra escolhida), fotos (até 5, câmera ou galeria). Salvar volta para a lista.
- **Tocar no cartão:** abre o detalhe com tudo acima, as fotos grandes, quem registrou e, se resolvida, a resolução.
- **Marcar como resolvida** (no detalhe): pede "O que foi feito?" (obrigatório) e a data (padrão hoje).
- **Reabrir** (no detalhe de uma resolvida).
- **Editar / Excluir** (no detalhe).

**Estado vazio**
Abertas: "Nenhuma ocorrência aberta. Bom sinal." Resolvidas: "Nenhuma ocorrência resolvida ainda."

---

## Tela: Comentários (v1.1)

**Quem acessa:** Engenheiro (lê e escreve nas duas abas, em qualquer obra); Cliente (**só lê** a aba Com o cliente, só na obra dele).
**Chega aqui por:** aba Comentários dentro da Obra (Engenheiro), ou item Comentários do menu (Cliente).

**O que aparece**
No topo, duas abas: **Interno** · **Com o cliente**, cada uma com o número de mensagens não lidas. Abaixo, a conversa como num aplicativo de mensagens: da mais antiga (em cima) para a mais nova (embaixo), já rolada até o fim. Cada mensagem tem o nome do autor, a data e a hora; as suas ficam à direita. Embaixo fixo: campo de texto, botão de foto e botão Enviar.
Na aba Com o cliente, uma faixa discreta no topo lembra: "O cliente lê estes recados." Se a obra não tem cliente cadastrado: "Esta obra não tem cliente com acesso."

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Texto | texto | sim | |
| Foto | foto | não | uma por mensagem |

**Ações**
- **Enviar:** a mensagem aparece no fim da conversa na hora.
- **Segurar uma mensagem:** Apagar (com confirmação). Só Engenheiro.
- **Tocar na foto:** abre grande.
- Abrir a aba marca as mensagens dela como lidas.

**Regras por perfil**
- **Cliente:** não vê a aba Interno, nem sabe que ela existe. Vê a tela com o título "Recados da obra", sem abas, **sem campo de texto, sem botão de foto e sem Enviar**: só lê.

**Estado vazio**
"Nenhum comentário nesta obra ainda."

---

## Tela: Medições (v1.3)

**Quem acessa:** só Engenheiro. O Cliente não vê a aba.
**Chega aqui por:** aba Medições dentro da Obra.

**O que aparece**
Duas abas no topo: **Contrato** · **Empreiteiros**.
- **Contrato:** lista das medições subidas (1ª, 2ª, 3ª…), cada uma com período, data e valor medido no período. Botão "+ Subir medição". Botão grande "Ver painel".
- **Empreiteiros:** seletor de empreiteiro no topo (lista dos terceirizados das frentes da obra + "Todos"), e embaixo a mesma lista de medições daquele empreiteiro. Botão "+ Subir medição" (pede o empreiteiro) e "Ver painel".

**Ações**
- **+ Subir medição:** abre o fluxo "Subir medição" (abaixo).
- **Tocar numa medição:** mostra os dados dela, com "Trocar planilha", "Baixar planilha original" e "Excluir".
- **Ver painel:** abre o "Painel de medição" com o tipo (e o empreiteiro) já escolhidos.

**Estado vazio**
Contrato: "Nenhuma medição ainda. Suba a planilha da 1ª medição." Empreiteiros: "Nenhuma medição deste empreiteiro ainda."

### Fluxo: Subir medição

Melhor no computador. Funciona no celular. Aceita .xlsx e .xlsm (só lê os valores; macros nunca rodam). Os dois modelos reais (ver `PRD-BACKEND.md`, tabela `modelos_planilha`) são reconhecidos sozinhos.

**Contrato (um arquivo por medição, aba BM)**
1. **Arquivo:** escolher o boletim.
2. **Dados lidos do cabeçalho**, já preenchidos para conferir: nº da medição, data, período, contrato. Se o nº vier como "XXX", o campo fica em branco e em amarelo, com o próximo número sugerido.
3. **Conferência:** "13 etapas, 277 serviços · Previsto R$ 1.790.178,34 · Adequado R$ 2.664.011,25 · Nesta medição R$ 138.346,23 · Acumulado R$ 1.789.748,40". Avisos em amarelo: data fora do período; nº repetido; total dos itens diferente do "TOTAL GERAL DA MEDIÇÃO"; serviço que sumiu ou mudou de descrição desde a medição anterior; linha que não deu para ler (com o número da linha).
4. **Confirmar:** grava e abre o painel já nesta medição.

**Empreiteiro (um arquivo por empreiteiro, uma aba por medição)**
1. **Empreiteiro:** escolher da lista (terceirizados das frentes da obra) ou digitar.
2. **Arquivo:** escolher a planilha inteira do empreiteiro.
3. **Abas encontradas:** lista com nome da aba, nº e data lidos, valor da medição, e uma marca em cada aba que ainda não está no app (já vêm marcadas). Abas com nº repetido aparecem em amarelo ("Nº 30 também está em '30ª med 05.07.25'") e pedem o número certo antes de importar.
4. **Conferência:** "3 medições novas · R$ 4.500,00 · descontos R$ 0,00". Itens sem discriminação são ignorados sem aviso. O bloco "Dados para pagamento" não é lido.
5. **Confirmar:** grava e abre o painel do empreiteiro.

**Planilha com outro modelo:** se os títulos não forem reconhecidos, abre o passo "Escolher colunas": escolher a aba, tocar na linha dos títulos e, para cada informação, escolher a coluna numa lista com o título e um exemplo de valor. A escolha fica guardada para a obra (ou para o empreiteiro).

**Como o app acha etapas e serviços (contrato):** linha **com unidade** = serviço. Linha **sem unidade** = título: código terminado em ".0" ("2.0") é etapa; outro código ("2.2") é subetapa. Serviço pertence à etapa do primeiro número e à subetapa logo acima dele, se houver. A leitura para em "TOTAL GERAL DA MEDIÇÃO".

---

## Tela: Painel de medição (v1.3)

**Quem acessa:** só Engenheiro.
**Chega aqui por:** "Ver painel" na tela Medições, ou depois de subir uma medição.
**Serve para:** só ver. Nada é editado aqui.

**O que aparece, de cima para baixo**
1. **Título:** "Medição do contrato" ou "Medição — Reboco Forte" (ou "Todos os empreiteiros").
2. **Escolha das medições:** botões "1ª · 2ª · 3ª · … · **Todas**". Padrão: Todas.
   - **Uma medição marcada:** mostra o que foi medido naquele período.
   - **Várias marcadas:** soma os períodos marcados.
   - **Todas:** o acumulado até a última.
   O saldo é sempre calculado contra o contratado, considerando **tudo** que foi medido até a última medição marcada.
3. **Números grandes (contrato):** Valor previsto original · Valor adequado · Valor medido (na escolha) · Saldo (R$) · % medido. Embaixo de cada um, em letra menor, o equivalente da última medição.
   **Números grandes (empreiteiro):** Valor previsto · Valor executado (na escolha) · Descontos · Valor pago · % executado.
4. **Gráfico de barras horizontais:**
   - **Contrato — por etapa:** cada etapa é uma barra do tamanho do valor adequado, com a parte medida pintada (cor principal) e o saldo em cinza; o % ao lado. Responde a "em que etapa está o dinheiro que falta medir?".
   - **Empreiteiro — por medição:** uma barra por medição (1ª, 2ª, 3ª…) com o valor pago. Responde a "quanto paguei a esse empreiteiro em cada medição?".
5. **Tabela:**
   - **Contrato:** etapa → subetapa → serviço. Tocar na etapa abre as subetapas; tocar na subetapa abre os serviços.
   - **Empreiteiro:** uma linha por item de cada medição, agrupada por medição.

**Campos e informações (tabela do contrato)**

| Coluna | Etapa / Subetapa | Serviço |
|---|---|---|
| Item | "2.0" / "2.2" | "2.2.6" |
| Descrição | "REDE COLETORA" / "TRABALHOS EM TERRA" | "Reaterro manual de valas…" |
| Unidade | — | "M3" |
| Qtd prevista | — | sim |
| Qtd adequada | — | sim (amarelo se maior que a prevista) |
| Qtd medida (escolha) | — | sim |
| Saldo qtd | — | sim |
| % qtd | — | sim |
| Valor adequado | soma | sim |
| Valor medido (escolha) | soma | sim |
| Saldo R$ | soma | sim |
| % valor | sim | sim |

**Campos e informações (tabela do empreiteiro):** Medição · Item · Discriminação · Unid. · Qtd prevista · Qtd executada · Saldo qtd · Valor previsto · Valor executado · Saldo R$ · %.

No celular, a tabela mostra Descrição, Valor medido, Saldo R$ e % valor; tocar na linha mostra o resto. No computador, todas as colunas.

**Ações**
- **Trocar a escolha de medições:** atualiza tudo na hora.
- **Filtro "Só com saldo negativo":** mostra os serviços medidos acima do contratado (candidatos a aditivo), em vermelho.
- **Busca por descrição.**
- **Imprimir:** versão limpa da tela.

**Regras**
- Serviço com saldo negativo aparece com a linha em vermelho e a etiqueta "Acima do contratado".
- Contrato: serviço com quantidade adequada maior que a prevista aparece com a etiqueta amarela "Cresceu na adequação".
- Empreiteiro: o saldo vale linha por linha, dentro de cada medição; itens de medições diferentes não são somados entre si.
- Em "Todos os empreiteiros", os valores são somados e a tabela ganha a coluna Empreiteiro.

**Estado vazio**
"Nenhuma medição para mostrar. Suba a planilha da 1ª medição."

---

## Tela: Equipamentos

**Quem acessa:** só Engenheiro.
**Chega aqui por:** item Equipamentos do menu.

**O que aparece**
Abas: Todos · Na obra · No conserto · No depósito. Lista com nome, código, onde está, "desde 12/10". Os do conserto mostram oficina, defeito, previsão de retorno e "há 19 dias no conserto" (vermelho se passou da previsão). No topo, faixa "2 equipamentos marcados como Quebrado nos diários" quando houver.

**Ações**
- **+ Equipamento:** nome, código, situação inicial, obra.
- **Mandar para obra / Mandar para conserto / Voltou do conserto (vai para depósito):** cada um abre os campos que a situação pede (obra; oficina + defeito + previsão).

**Estado vazio**
"Nenhum equipamento cadastrado."

---

## Tela: Pessoas (funcionários)

**Quem acessa:** só Engenheiro.
**Chega aqui por:** item Pessoas do menu.

**O que aparece**
Lista agrupada por obra de lotação (e "Sem obra"), com nome e função. Busca por nome.

**Ações**
- **+ Funcionário:** nome, função, obra de lotação.
- **Tocar:** editar, trocar de obra (definitivo), desativar.
- **Presença do mês:** botão no topo; abre a tela abaixo.

**Estado vazio**
"Nenhum funcionário cadastrado. O efetivo do diário vem daqui."

---

## Tela: Presença do mês

**Quem acessa:** só Engenheiro.
**Chega aqui por:** botão "Presença do mês" na tela Pessoas.

**O que aparece**
Seletor de mês no topo (setas ‹ outubro 2026 ›; padrão: mês atual, ou o anterior até o dia 5). Tabela com uma linha por funcionário ativo no mês. Botão "Imprimir".

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Funcionário | texto | sim | nome e função |
| Presenças | número | sim | `Presente` + `Veio de outra obra` |
| Faltas | número | sim | em vermelho se maior que 0 |
| Atestados | número | sim | |
| Obras | texto | sim | "Casa Alto da Serra 4: 18 · Casa Lagoa 12: 3" |

**Ordem:** por nome. Filtro: obra de lotação (Todas por padrão).

**Ações**
- **Tocar no funcionário:** abre o calendário do mês dele: cada dia com a sigla da obra e a situação (P, F, A, D → obra, "Sem diário"). Botão Imprimir.
- **Imprimir:** versão limpa da tabela para imprimir pelo navegador.

**Estado vazio**
"Nenhum diário lançado neste mês."

---

## Tela: Avanço da obra (Cliente)

**Quem acessa:** Cliente.
**Chega aqui por:** login.

**O que aparece**
Nome da obra. Lista das frentes com etapa e situação (`Não iniciada`, `Em execução`, `Concluída`; frente `Parada` aparece como `Em execução`, sem motivo) `[CHUTE — CONFIRMAR]`. Abaixo, as pranchas em modo leitura com "18 de 32 executados". Últimas 6 fotos com link "Ver todas".

**Estado vazio**
"A obra ainda não tem frentes registradas."

---

## Tela: Perfil e Usuários

**Quem acessa:** todos (Perfil); Engenheiro (Usuários).

**O que aparece**
Nome, email, botão Sair. Para o Engenheiro, a lista "Usuários" com etiqueta `Pendente` no topo. Tocar num usuário: escolher perfil (`Engenheiro` / `Cliente`; Cliente só na v1.1, com a obra dele), ativar/desativar.

**Estado vazio**
Usuários: "Ninguém se cadastrou ainda. Mande o link do sistema para o outro engenheiro."

---

## Textos do sistema

- Botões: Entrar, Criar conta, Avançar, Salvar, Cancelar, Fechar RDO, Confirmar e fechar, Desfazer, Excluir, Imprimir.
- Confirmação de exclusão: "Excluir isto? Não dá para desfazer."
- Aviso de conta pendente: "Conta aguardando liberação do engenheiro."
- Erro genérico: "Não foi possível salvar. Verifique a internet e tente de novo."
- RDO fechado: "Diário fechado em [data] às [hora]. Só o engenheiro pode alterar."

## Dados de exemplo

```
Usuários:
- Eng. (Engenheiro) · todas as obras
- Eng. Ricardo (Engenheiro) · todas as obras
- Fulano Silva (Pendente) · aguardando liberação
- Dra. Helena Duarte (Cliente) · Casa Alto da Serra 4

Obras (status Ativa, salvo indicação):
1. UBS Nova Esperança — Licitação — Parnamirim — RDO hoje: Não iniciado — 2 frentes paradas — aviso "RDO de ontem não fechado"
2. Escola Municipal Rio Doce (ampliação) — Licitação — Natal — RDO hoje: Em andamento
3. Casa Alto da Serra 4 — Alto padrão — Natal — RDO hoje: Fechado
4. Casa Lagoa 12 — Alto padrão — Parnamirim — RDO hoje: Não iniciado — 1 frente parada
5. Praça Central de Macaíba — Licitação — Macaíba — status Paralisada
6. Casa Ponta Negra 7 — Alto padrão — Natal — status Concluída

Funcionários (Casa Alto da Serra 4): João (Pedreiro), Marcos (Pedreiro), Tiago (Servente),
Paulo (Servente), Rafael (Carpinteiro), Luís (Armador), Edson (Encanador), Bruno (Eletricista)
— no RDO de hoje: 6 Presente, 1 Falta (Paulo), 1 Deslocado → Casa Lagoa 12 (Edson)

Presença de outubro (para a tela Presença do mês):
- João (Pedreiro): 22 presenças, 0 faltas, 0 atestados — Casa Alto da Serra 4: 22
- Paulo (Servente): 18 presenças, 3 faltas, 1 atestado — Casa Alto da Serra 4: 18
- Edson (Encanador): 21 presenças, 1 falta — Casa Alto da Serra 4: 17 · Casa Lagoa 12: 4

Equipamentos:
- Betoneira 400 L — Na obra (Casa Alto da Serra 4) desde 01/10
- Vibrador de imersão — No conserto (Oficina Tec Máquinas) desde 12/10, previsão 25/10 → atrasado
- Serra mármore — Na obra (UBS Nova Esperança) — marcado Quebrado no RDO de ontem
- Andaime fachadeiro 30 m — No depósito desde 20/10

Frentes (Casa Alto da Serra 4):
- Fundação — sapatas · Estrutura / Concretagem · Equipe própria · Concluída em 05/10
- Reboco fachada norte · Reboco de fachada · Terceirizado — Reboco Forte · Parada desde 25/10 (Falta de material)
- Revestimento banheiros · Revestimento cerâmico · Terceirizado — Cerâmica Silva · Em execução
- Tubulação água fria e esgoto · Instalações hidrossanitárias · Equipe própria · Em execução
- Impermeabilização laje cobertura · Impermeabilização · Terceirizado — Imperme RN · Parada desde 29/10 (Chuva)
- Pintura interna · Pintura · Equipe própria · Não iniciada

Pranchas (UBS Nova Esperança):
- Frente "Fundação — sapatas" · "Planta de locação — Prancha 02" (folha 2 do PDF) · 32 áreas
  (S1 a S32), 18 Executado (datas entre 02/10 e 30/10), 14 Pendente
- Frente "Tubulação água fria" · "Planta hidráulica — térreo" (folha 1 do PDF) · 22 linhas
  (AF-01 a AF-22), 14 Executado, 8 Pendente, 2 executados hoje

Fotos: 12 fotos espalhadas entre 10/10 e 30/10, 3 com "Visível ao cliente" desligado.

Ocorrências:
- 30/10 · Casa Alto da Serra 4 · Problema com material · Alta · "Aço CA-50 entregue com bitola errada" · Aberta
- 27/10 · UBS Nova Esperança · Visita da fiscalização · Baixa · "Fiscal conferiu armação das sapatas S10 a S18" · Resolvida em 27/10
- 24/10 · Casa Lagoa 12 · Dano ou quebra · Média · "Tubo de esgoto 100 mm rompido no reaterro" · Aberta (com 2 fotos)
- 15/10 · Escola Municipal Rio Doce · Acidente de trabalho · Alta · "Servente cortou a mão na serra mármore" · Resolvida em 16/10

Comentários (Casa Alto da Serra 4):
- Interno: 4 mensagens entre Eng. e Eng. Ricardo entre 28/10 e 30/10, 1 com foto, 2 não lidas
- Com o cliente: 3 recados dos engenheiros para a Dra. Helena Duarte sobre o porcelanato dos banheiros, 1 não lido por ela

Medições (UBS Nova Esperança — Contrato, quantidade acumulada):
- Valor contratado R$ 2.418.300,00 · 3 medições (01/09–30/09, 01/10–31/10, 01/11–30/11)
- Etapas: 1 SERVIÇOS PRELIMINARES (R$ 96.000, 100% medido) · 2 FUNDAÇÃO (R$ 412.000, 85%) ·
  3 ESTRUTURA (R$ 640.000, 40%) · 4 ALVENARIA (R$ 310.000, 15%) · 5 INSTALAÇÕES HIDROSSANITÁRIAS
  (R$ 228.000, 10%) · 6 IMPERMEABILIZAÇÃO (R$ 74.000, 0%) · 7 REVESTIMENTOS (R$ 420.000, 0%) ·
  8 PINTURA (R$ 238.300, 0%)
- 1 serviço acima do contratado: "2.1.3 Concreto fck 25 MPa em sapatas" — contratado 86,40 m³, medido 91,20 m³
Medições de empreiteiro (UBS Nova Esperança):
- Reboco Forte: 2 medições · Imperme RN: 1 medição

```

**Planilhas reais para testar a importação** (estão na pasta do projeto):
- `medição real do contrato.xlsm` — aba BM, 13 etapas, previsto R$ 1.790.178,34, adequado R$ 2.664.011,25, nesta medição R$ 138.346,23, acumulado R$ 1.789.748,40. Tem nº "XXX" e data fora do período: serve para testar os avisos.
- `medição empreiteiro.xlsx` — 33 abas de medição de um topógrafo, com números repetidos: serve para testar a lista de abas e o aviso de repetido. Contém dados bancários de uma pessoa: usar só aqui, nunca em demonstração.

## Critérios de aceite

- [ ] O sistema abre na tela Obras com o filtro Ativas aplicado e as obras sem RDO de hoje no topo.
- [ ] Do toque na obra até "Fechar RDO" são no máximo 3 telas.
- [ ] No passo 1, marcar presença é um toque por funcionário, sem digitar nada.
- [ ] Marcar um funcionário como Deslocado para a obra B faz ele aparecer no RDO de B como "Veio de outra obra".
- [ ] No dia seguinte, o funcionário deslocado volta a aparecer na lista da obra em que está lotado.
- [ ] Não é possível marcar o mesmo funcionário como presente em duas obras no mesmo dia; aparece o aviso com o nome da outra obra.
- [ ] A Presença do mês mostra, para cada funcionário, presenças, faltas e atestados que batem com os RDOs do mês.
- [ ] Na gaveta da frente, a lista de equipe mostra só quem está presente; o mesmo funcionário pode ser marcado em duas frentes.
- [ ] Frente parada mostra "Parada há N dias" e fica no topo da lista.
- [ ] Tirar foto pela câmera do celular funciona dentro da gaveta da frente.
- [ ] (v1.2) Anexar um PDF de várias folhas permite escolher a folha, e a folha aparece nítida com zoom.
- [ ] (v1.2) Desenhar um retângulo, um contorno livre e um trecho de tubo cria os três elementos no lugar certo, inclusive vistos em outro tamanho de tela.
- [ ] (v1.2) Tocar numa sapata pendente a pinta de verde com a data de hoje; tocar num trecho de tubo pendente o deixa como linha grossa verde.
- [ ] (v1.2) No passo 3, trocar a frente de serviço mostra só as pranchas daquela frente.
- [ ] Os dois engenheiros veem todas as obras e conseguem lançar e corrigir o RDO de qualquer uma.
- [ ] Usuário Pendente vê só o aviso de liberação.
- [ ] Cliente não vê efetivo, RDO, equipamentos, motivo de parada nem foto oculta.
- [ ] Todas as telas funcionam no celular sem rolagem horizontal.
- [ ] Cada lista tem estado vazio com texto próprio.
- [ ] (v1.1) Registrar uma ocorrência pelo RDO já traz a obra e a data preenchidas, e ela aparece na tela Ocorrências sem recarregar.
- [ ] (v1.1) Ocorrência Alta aberta aparece no topo da lista e em vermelho no cartão da obra.
- [ ] (v1.1) Não é possível marcar ocorrência como resolvida sem escrever o que foi feito.
- [ ] (v1.1) O cliente vê só a aba Com o cliente da obra dele, sem campo para escrever; a aba Interno não aparece para ele.
- [ ] (v1.1) Enviar comentário faz ele aparecer no fim da conversa na hora; abrir a aba zera o contador de não lidos.
- [ ] (v1.3) As duas planilhas reais da pasta são reconhecidas sem pedir escolha de colunas; uma planilha de modelo desconhecido pede a escolha uma vez e não pede de novo.
- [ ] (v1.3) Subir de novo a planilha do empreiteiro com uma aba a mais importa só a aba nova.
- [ ] (v1.3) A conferência antes de gravar mostra etapas, número de serviços e valores, e o total bate com a planilha.
- [ ] (v1.3) No painel, marcar só a 2ª medição mostra o que foi medido no período dela; marcar Todas mostra o acumulado; o saldo é sempre contra o contratado.
- [ ] (v1.3) Serviço medido acima do contratado aparece em vermelho e no filtro "Só com saldo negativo".
- [ ] (v1.3) O painel de empreiteiro funciona igual, com o seletor de empreiteiro e a opção "Todos".
- [ ] (v1.3) O Cliente não vê a aba Medições.

## A conta que vai chegar depois

- `[PENDENTE: cliente de alto padrão vê frente parada e motivo?]` — muda a tela Avanço da obra. Por enquanto: não vê.
- ~~`[PENDENTE: cor]`~~ — decidido em 31/10/2026: personalidade Noturno, paleta Concreto (turquesa `#00A3B4`), tema escuro. Referência: `preview.html`.
- `[PENDENTE: logo]` — sem logo até decidir.
