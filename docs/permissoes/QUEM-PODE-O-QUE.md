# Quem pode o quê: Nova Obra

Última atualização: 02/11/2026 · Decidido por: Israel Nogueira

Este quadro manda nas permissões do app. Tudo o mais (`quadro.json`, `src/lib/permissoes.js`, as regras
do banco e o teste de permissões) é cópia dele. Ele substitui a "Matriz de permissões" do
`PLANO-DO-PROJETO.md` e a seção "Permissões" do `PRD-BACKEND.md`: onde discordarem, vale este arquivo.

## 1. Os perfis

| Perfil (valor gravado) | Quem é | Quantas pessoas hoje | Usa mais no | Vê quais obras |
|---|---|---|---|---|
| admin_master | **Engenheiro** (nome na tela): Israel e Ricardo, com os mesmos direitos | 2 | celular no canteiro, computador para consulta | **todas** |
| gerente | engenheiro contratado que toca só algumas obras | 0 (fica no quadro até alguém ser contratado) | celular e computador | só as liberadas para ele |
| cliente | dono da casa de alto padrão (v1.1). Nas obras de licitação não existe cliente com acesso | 0 | celular | só a dele |

O `usuario` do curso ficou de fora: o plano tirou o Mestre e quem lança o diário são os engenheiros.
Funcionário do canteiro não tem login.

Situações, que valem para qualquer perfil: **pendente** (conta nova, não vê nada até o administrador
liberar), **ativo** e **bloqueado** (perdeu o acesso; o que lançou continua no app, com o nome dele).
"Pendente" deixou de ser perfil (decidido em 02/11/2026).

Regras que valem para todo app (não se pergunta de novo):
- Ninguém escolhe o próprio perfil. Conta nova nasce pendente, ou é criada pelo administrador no painel de admin.
- Saiu da equipe é bloqueado, não excluído: perde o acesso na hora, e o que fez continua com o nome dele.
- Depois do painel de admin, o cadastro público fica fechado: quem cria o login é o administrador.
- Ninguém muda o próprio perfil, a própria situação nem as próprias obras, e o app nunca fica sem um administrador ativo.

## 2. As duas perguntas de cada célula

1. **O perfil:** o que a pessoa pode fazer.
2. **As obras:** em quais obras. Quem não está liberado numa obra (tabela `membros`) não vê nada dela.

**Quem vê todas as obras:** só o `admin_master`, porque os dois engenheiros tocam as 10 obras ao mesmo
tempo. O app não liga nem desliga módulos por pessoa: não há terceira dimensão.

## 3. Os valores de uma célula

| Na célula | Quer dizer | O que exige do banco |
|---|---|---|
| pode | pode, em toda linha das obras dele | nada além da obra |
| só os dele | só no que ele mesmo criou | a tabela guarda quem criou (created_by), e ninguém troca o dono depois |
| só da equipe dele | só no que é das pessoas abaixo dele | cada pessoa guarda quem é o gerente dela |
| só ver | lê, não mexe | nada |
| · | não pode, e não vê o botão | nada |
| ninguém | nem o administrador: o banco escreve sozinho (histórico, número automático) | um gatilho ou uma função do banco |

## 4. O quadro

| Assunto | Ação | admin_master | gerente | cliente |
|---|---|---|---|---|
| Obra | Ver · admin todas, os outros só as liberadas | pode | pode | pode |
| Obra | Ver o comparativo (tela Obras e Efetivo geral) · só das obras dele | pode | pode | · |
| Obra | Criar · abrir obra nova | pode | · | · |
| Obra | Editar · dados e calendário (dias de trabalho, feriados) | pode | · | · |
| Obra | Apagar · só obra sem nada lançado | pode | · | · |
| Obra | Encerrar · marcar Concluída; fica só leitura, o admin reabre | pode | pode | · |
| Usuários (contas) | Ver a lista | pode | · | · |
| Usuários (contas) | Criar login, liberar conta, escolher perfil e obras | pode | · | · |
| Usuários (contas) | Bloquear | pode | · | · |
| Usuários (contas) | Editar o próprio nome | pode | pode | pode |
| Usuários (contas) | Apagar conta · bloqueia, nunca apaga | · | · | · |
| Funcionários (Pessoas) | Ver nome e função | pode | pode | · |
| Funcionários (Pessoas) | Criar | pode | pode | · |
| Funcionários (Pessoas) | Editar · inclusive mudar a obra de lotação | pode | pode | · |
| Funcionários (Pessoas) | Desativar | pode | pode | · |
| Funcionários (Pessoas) | Apagar · só sem nenhum diário | pode | · | · |
| Equipamentos | Ver | pode | pode | · |
| Equipamentos | Criar | pode | pode | · |
| Equipamentos | Editar e mover (obra, conserto, depósito) | pode | pode | · |
| Equipamentos | Apagar · só sem nenhum diário | pode | · | · |
| Diário (RDO) | Ver | pode | pode | · |
| Diário (RDO) | Criar · um por obra por dia | pode | pode | · |
| Diário (RDO) | Editar · inclusive o dia fechado | pode | pode | · |
| Diário (RDO) | Apagar · só o dia não fechado e sem fotos | pode | · | · |
| Diário (RDO) | Fechar o dia | pode | pode | · |
| Diário (RDO) | Trazer funcionário de outra obra · o gerente só das obras dele | pode | pode | · |
| Frentes de serviço | Ver nome, etapa e situação · para o cliente, Parada aparece como Em execução | pode | pode | pode |
| Frentes de serviço | Ver o motivo da parada e há quantos dias | pode | pode | · |
| Frentes de serviço | Criar | pode | pode | · |
| Frentes de serviço | Editar | pode | pode | · |
| Frentes de serviço | Apagar · só sem nada lançado | pode | · | · |
| Fotos | Ver · o cliente só as "Visível ao cliente" | pode | pode | pode |
| Fotos | Criar | pode | pode | · |
| Fotos | Editar legenda e "Visível ao cliente" | pode | pode | · |
| Fotos | Apagar | pode | pode | · |
| Presença do mês | Ver faltas e atestados · o gerente só os dias nas obras dele | pode | pode | · |
| Presença do mês | Imprimir | pode | pode | · |
| Ocorrências (v1.1) | Ver | pode | pode | · |
| Ocorrências (v1.1) | Criar | pode | pode | · |
| Ocorrências (v1.1) | Editar | pode | pode | · |
| Ocorrências (v1.1) | Apagar | pode | · | · |
| Ocorrências (v1.1) | Resolver · exige escrever o que foi feito | pode | pode | · |
| Comentários | Interno: ver e escrever | pode | pode | · |
| Comentários | Com o cliente: ver · o cliente só na obra dele | pode | pode | pode |
| Comentários | Com o cliente: escrever | pode | pode | · |
| Comentários | Editar mensagem · o gerente apaga e escreve de novo | pode | · | · |
| Comentários | Apagar mensagem | pode | só os dele | · |
| Comentários | Marcar como lido | pode | só os dele | só os dele |
| Pranchas (v1.2) | Ver com o que foi executado | pode | pode | pode |
| Pranchas (v1.2) | Anexar PDF e desenhar | pode | pode | · |
| Pranchas (v1.2) | Editar o desenho | pode | pode | · |
| Pranchas (v1.2) | Apagar prancha | pode | · | · |
| Pranchas (v1.2) | Pintar executado e desfazer | pode | pode | · |
| Medições (dinheiro) | Ver o painel e os valores | pode | · | · |
| Medições (dinheiro) | Subir medição | pode | · | · |
| Medições (dinheiro) | Trocar a planilha | pode | · | · |
| Medições (dinheiro) | Baixar a planilha original · a de empreiteiro tem dado bancário | pode | · | · |
| Medições (dinheiro) | Apagar medição · leva as linhas dela junto | pode | · | · |
| Materiais: catálogo | Ver · o mesmo para todas as obras | pode | pode | · |
| Materiais: catálogo | Criar | pode | pode | · |
| Materiais: catálogo | Editar · muda em todas as obras | pode | · | · |
| Materiais: catálogo | Apagar · só sem pedido; senão, desativar | pode | · | · |
| Materiais: pedidos | Ver · sem a foto da nota fiscal, para quem não pode | pode | pode | · |
| Materiais: pedidos | Criar (solicitar) | pode | pode | · |
| Materiais: pedidos | Editar e mover de coluna | pode | pode | · |
| Materiais: pedidos | Apagar · só em "Solicitar" | pode | pode | · |
| Materiais: pedidos | Ver a foto da nota fiscal · mostra preço | pode | · | · |
| Estoque | Ver saldo | pode | pode | · |
| Estoque | Cadastrar insumo e mínimo | pode | pode | · |
| Estoque | Baixa manual · o banco recusa saldo negativo | pode | pode | · |
| Estoque | Apagar movimento · só baixa manual | pode | · | · |
| Planejamento | Ver · EAP, Longo, Médio e Curto prazo, inclusive o PPC | pode | pode | · |
| Planejamento | Criar atividade e restrição | pode | pode | · |
| Planejamento | Editar datas, ordem e avanço; resolver restrição | pode | pode | · |
| Planejamento | Mover no kanban; marcar "não realizada" | pode | pode | · |
| Planejamento | Arquivar atividade · não se apaga | pode | pode | · |
| Planejamento | Importar e exportar planilha | pode | pode | · |
| Histórico de mudanças | Ver · ainda não existe; entra no passo 10 | pode | · | · |
| Histórico de mudanças | Criar, editar, apagar · o banco grava sozinho | ninguém | ninguém | ninguém |

## 5. O menu de cada perfil

- **admin_master:** Obras · Ocorrências · Equipamentos · Pessoas (com Presença do mês e Efetivo geral) ·
  Perfil (com Usuários). Dentro da obra: Hoje · Diários · Fotos · Comentários · Pranchas · Medições ·
  Materiais · Planejamento.
- **gerente:** Obras · Ocorrências · Equipamentos · Pessoas · Perfil (sem Usuários). Dentro da obra: Hoje ·
  Diários · Fotos · Comentários · Pranchas · Materiais (sem a foto da nota fiscal) · Planejamento. **Sem
  Medições.**
- **cliente:** Avanço · Fotos · Recados · Perfil.

## 6. As perguntas que pegam (respondidas em 02/11/2026)

**Perfis**
- [x] O `gerente` fica no quadro, vazio até alguém ser contratado. O `usuario` fica de fora.
- [x] "Pendente" deixa de ser perfil e vira situação (pendente, ativo, bloqueado).

**Dinheiro e dado de terceiro**
- [x] **Valor (medição):** só o `admin_master`. O gerente não vê, até o Israel decidir o contrário. O cliente nunca.
- [x] **Foto da nota fiscal do pedido (mostra preço):** só o `admin_master`. O gerente vê o resto do pedido.
- [x] **Faltas e atestados (dado de saúde do funcionário):** o gerente vê, só os dias nas obras dele.
  Funcionário guarda só nome e função (sem CPF, telefone ou endereço).
- [x] **Rascunho só do autor:** não existe.

**Apagar**
- [x] Apagar de vez só o que não tem nada ligado: o banco recusa e a tela diz o que está ligado. Nada
  sai em cascata. Exceção: apagar uma medição leva as linhas dela junto.
- [x] Obra, funcionário, equipamento e material do catálogo se desativam. Quem decide é o admin.
- [x] Foto não sai junto com o diário: apagar o diário fica travado enquanto ele tiver fotos.

**Fechar o dia (o "assinar" do app)**
- [x] O dia fechado continua corrigível pelos engenheiros. Trava só o apagar.
- [x] Não existe "reabrir": corrigir já é permitido. O rastro da correção vem do histórico.
- [x] O que nasce depois de fechado entra normal: os diários seguintes são outros dias.

**Quem dá poder a quem**
- [x] Só o admin cria login, libera conta, muda perfil, escolhe obras e bloqueia. Quando o painel de
  Usuários funcionar, o **cadastro público fecha** (muda o plano, que previa cadastro aberto).
- [x] "Só os dele": hoje guardam quem criou o diário (`criado_por`), a foto (`enviada_por`) e o pedido
  (`criado_por`). Comentários nascem com autor. Os dados de exemplo ficam sem dono real até o login.

**Obra**
- [x] Quem vê todas: só o `admin_master`.
- [x] Obra Concluída fica **só para leitura** para todos; o admin reabre.
- [x] Quem abre obra nova: o admin, sozinho, pelo app.

**Histórico**
- [x] Criar um **histórico de mudanças** gravado pelo próprio banco (quem mudou o quê, quando), ao menos
  para o diário fechado e as medições, no passo 10. Ninguém edita nem apaga o histórico.

**Telas**
- [x] Botão que a pessoa não pode usar não aparece, e o menu segue o "Ver" (seção 5). A barreira é o banco.

**Do plano**
- [x] O cliente **não vê** a frente parada nem o motivo: para ele, Parada aparece como Em execução.

## 7. Como o quadro vira app

1. `docs/permissoes/quadro.json`: uma entrada por ação, chave `assunto.acao` (ex.: `diario.fechar`).
2. `src/lib/permissoes.js`: toda tela pergunta `pode('diario.fechar', usuario, dono)`; nenhuma tela decide
   sozinha por perfil.
3. Um teste confere o código contra o JSON, linha por linha, dentro do `npm run check`.
4. A barreira é o banco (RLS): uma regra por ação, com a lista dos perfis que podem, e nenhuma `using (true)`.
5. Um teste de permissões no banco: cada perfil tenta cada ação na obra dele e numa obra de outra pessoa.
6. Antes de abrir para gente de verdade, o teste do estranho.

Hoje (02/11/2026) nada disso existe ainda: o app não tem login e o banco está aberto de propósito
(`20261101-02-acesso-provisorio-dev.sql`). O passo 10 constrói os itens 2 a 5 a partir deste quadro.

## 8. Mudar depois

Mudar uma permissão é mudar, de uma vez: o quadro deste arquivo, o JSON, o `src/lib/permissoes.js`, a
regra do banco e o teste de permissões. E uma linha aqui embaixo dizendo a data, quem decidiu e por quê.
Decisão que só existe no chat não existe.

| Data | Quem decidiu | O que mudou e por quê |
|---|---|---|
| 02/11/2026 | Israel Nogueira | Quadro criado. Mudanças sobre a proposta: o `admin_master` edita e apaga qualquer comentário e marca como lido (era "·" e "só os dele"). |

## Em aberto

- `[PENDENTE]` **"Marcar como lido" do admin_master está "pode"**: o "lido" é de cada pessoa (a contagem
  de "comentários novos" de cada um). Do jeito que está, o admin poderia marcar como lido no lugar de
  outra pessoa. Recomendação: o admin marca só os dele, como os outros. Confirmar com o Israel.
- `[PENDENTE]` **Editar comentário:** o `PRD-BACKEND.md` dizia "não há edição". Agora o admin edita.
  Falta decidir se a mensagem editada mostra "editada" para quem lê (inclusive o cliente).
- `[DESCOBRIR NO USO]` Se um gerente for contratado: ele precisa ver medições? (hoje não).
- O histórico de mudanças não existe: entra no passo 10.
