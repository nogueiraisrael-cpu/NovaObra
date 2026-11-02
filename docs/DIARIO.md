# Diário do projeto

Uma linha por item aprovado na página "Testes do Nova Obra": data, o que mudou, o que passou.

## Rodada 1 · Diários (histórico)

- 01/11/2026 · Aba Diários · a lista mostra os dias da obra, do mais novo para o mais antigo.
- 01/11/2026 · Aba Diários · abrir um dia mostra o diário inteiro (clima, efetivo, ocorrências, frentes e fotos).
- 01/11/2026 · Aba Diários · trocar de obra troca o histórico, sem sobrar nada da anterior.
- 01/11/2026 · Aba Diários · Imprimir sai só o diário, em fundo branco.
- 01/11/2026 · Aba Diários · o diário de hoje acompanha o que se marca na aba Hoje.
- 01/11/2026 · Aba Diários · obra sem diário mostra o convite para lançar o primeiro.
- 01/11/2026 · Efetivo geral · abre com o total de todas as obras por função, com a pizza.
- 01/11/2026 · Efetivo geral · escolher uma obra mostra só a contagem dela, com as mesmas cores.
- 01/11/2026 · Efetivo geral · tocar numa fatia mostra o número dela.
- 01/11/2026 · Efetivo geral · a tabela Por obra mostra as obras lado a lado.
- 01/11/2026 · Efetivo geral · quem está sem obra fica separado e não entra no total.
- 01/11/2026 · Efetivo geral · trocar a obra do seletor do topo não muda os números.
- 01/11/2026 · Efetivo geral · cadastrar ou desativar funcionário muda a contagem (gravado no banco).
- 01/11/2026 · Banco de verdade · o que se marca no efetivo continua lá depois do F5.
- 01/11/2026 · Banco de verdade · texto com acento volta igual e cai no dia certo.
- 01/11/2026 · Banco de verdade · quem está presente numa obra não pode ser trazido para outra.
- 01/11/2026 · Banco de verdade · a foto da frente fica gravada e some quando se tira.
- 01/11/2026 · Banco de verdade · salvar a frente duas vezes não duplica.
- 01/11/2026 · Banco de verdade · sem internet a tela avisa e nada fica gravado pela metade.
- 01/11/2026 · Banco de verdade · fechar o RDO da UBS fica gravado, com o efetivo só da UBS.

## Rodada 4 · Materiais (quadro de pedidos)

Testada pelo Claude no navegador do app, com o banco de verdade, a pedido do dono. Ainda não vista
num celular de verdade (foto da nota pela câmera e Wi-Fi desligado foram simulados).

- 01/11/2026 · Materiais · a aba abre com os contadores (em cotação, chegando esta semana, atrasados) e as colunas.
- 01/11/2026 · Materiais · o pedido atrasado fica em vermelho, no topo da coluna Comprado.
- 01/11/2026 · Materiais · novo pedido vazio avisa cada campo; a quantidade só aceita número.
- 01/11/2026 · Materiais · o pedido criado aparece na hora e continua lá depois do F5, com 2,5 certo.
- 01/11/2026 · Materiais · mandar cotar anda uma coluna; o toque duplo não move o pedido de baixo (consertado na rodada).
- 01/11/2026 · Materiais · marcar comprado pede fornecedor e previsão; previsão nasce hoje e não aceita data passada.
- 01/11/2026 · Materiais · o checklist de recebimento com "Não" marca o cartão; a foto da nota vira miniatura.
- 01/11/2026 · Materiais · os detalhes mostram recebimento, avarias, foto da nota e histórico com datas.
- 01/11/2026 · Materiais · voltar uma coluna tira a etiqueta de problema e o lead time.
- 01/11/2026 · Materiais · entregar na frente tira o pedido do quadro; ele aparece em Ver entregues.
- 01/11/2026 · Materiais · excluir pede confirmação e o pedido não volta depois do F5.
- 01/11/2026 · Materiais · trocar de obra troca o quadro inteiro (UBS só com os 2 dela).
- 01/11/2026 · Materiais · sem internet o cartão volta e a tela avisa, sem perder o quadro (consertado na rodada).
- 01/11/2026 · Materiais · no tamanho de celular as colunas deslizam e a página não anda para o lado.

## Rodada 5 · Estoque em Materiais

Testada pelo Claude no navegador do app, com o banco de verdade, a pedido do dono.

- 02/11/2026 · Estoque · o contador "insumos críticos" aparece no topo e a sub-aba Estoque mostra insumo, saldo, mínimo e situação.
- 02/11/2026 · Estoque · a busca acha sem acento e o filtro "Só críticos" mostra só os críticos.
- 02/11/2026 · Estoque · o histórico do insumo mostra as movimentações; mudar o mínimo muda a situação e o contador.
- 02/11/2026 · Estoque · baixa vazia ou maior que o saldo é recusada, e insumo sem saldo não pode ser escolhido.
- 02/11/2026 · Estoque · a baixa manual derruba o saldo na hora e "Desfazer" (com confirmação) devolve.
- 02/11/2026 · Estoque · pedido recebido entra sozinho no estoque com o que chegou de fato; voltar o pedido tira a entrada.
- 02/11/2026 · Estoque · entregar na frente leva só o que sobrou do lote; voltar a entrega devolve (consertado na revisão).
- 02/11/2026 · Estoque · trocar de obra troca o estoque (UBS só com o cimento dela).

## Rodada 6 · Planejamento (EAP, Longo, Médio e Curto prazo, importar planilha)

Testada pelo Claude no navegador do app, com o banco de verdade, a pedido do dono (43 de 48 itens).

- 02/11/2026 · EAP · a árvore mostra os 5 grupos com código automático, terceiro nível (5.1.1), datas e dias úteis.
- 02/11/2026 · EAP · criar atividade principal: datas nascem com hoje, mostra dias úteis e calendário; continua depois do F5.
- 02/11/2026 · EAP · criar subatividade: a mãe já vem escolhida, vira grupo e pega o período da filha.
- 02/11/2026 · EAP · editar e mudar de "dentro de": vai para o fim do novo grupo e o antigo deixa de ser grupo.
- 02/11/2026 · EAP · subir e descer muda o código, continua depois do F5; "Subir" apagado na primeira.
- 02/11/2026 · EAP · arquivar pede confirmação, renumera sem buraco, Arquivadas lista e desarquiva.
- 02/11/2026 · EAP · formulário recusa nome vazio e fim antes do início.
- 02/11/2026 · EAP · trocar de obra troca a EAP inteira.
- 02/11/2026 · EAP · no celular cabe na tela e o 3º nível fica mais recuado.
- 02/11/2026 · Longo prazo · barras com cores por situação, traço do previsto e linha de hoje; números do topo.
- 02/11/2026 · Longo prazo · por semana e por mês; só a área das barras desliza.
- 02/11/2026 · Longo prazo · lançar avanço (75%) muda barra, grupo e total; continua depois do F5.
- 02/11/2026 · Longo prazo · grupo não recebe avanço à mão; avanço só aceita 0 a 100, com teclado numérico.
- 02/11/2026 · Longo prazo · atividade que começa hoje fica "Não iniciada", previsto 0% (corrigido na rodada).
- 02/11/2026 · Longo prazo · 100% no Longo prazo vira Concluído no Kanban e conta no PPC (corrigido na revisão).
- 02/11/2026 · Longo prazo · calendário com sábado muda dias úteis e previsto; sem nenhum dia é recusado.
- 02/11/2026 · Longo prazo · mudar a data na EAP estica a barra sem F5.
- 02/11/2026 · Longo prazo · trocar de obra troca cronograma e calendário; no celular vira lista.
- 02/11/2026 · Médio prazo · quadro de 4 semanas, contadores, vencida em vermelho na semana atual.
- 02/11/2026 · Médio prazo · criar restrição (prazo nasce hoje, sugestão de responsável); continua depois do F5.
- 02/11/2026 · Médio prazo · formulário recusa campos vazios e prazo no passado.
- 02/11/2026 · Médio prazo · setas mudam de semana; vencida empurrada sai do vermelho.
- 02/11/2026 · Médio prazo · resolver, ver resolvidas (riscada) e reabrir.
- 02/11/2026 · Médio prazo · editar o tipo e excluir com confirmação.
- 02/11/2026 · Médio prazo · filtros de semanas e responsável; o filtro só lista quem tem restrição visível (corrigido na rodada).
- 02/11/2026 · Médio prazo · trocar de obra troca as restrições; no celular as semanas deslizam.
- 02/11/2026 · Curto prazo · PPC com número, barra, "X de Y" e gráfico de 6 semanas; Kanban em 3 colunas.
- 02/11/2026 · Curto prazo · concluir põe 100% no Longo prazo e voltar devolve o avanço de antes.
- 02/11/2026 · Curto prazo · "não realizada" exige causa; em atividade concluída o botão não aparece.
- 02/11/2026 · Curto prazo · checklist de subtarefas: criar, marcar, excluir com confirmação; não feita pede causa.
- 02/11/2026 · Curto prazo · navegar entre semanas; trocar de obra troca a semana; no celular desliza.
- 02/11/2026 · Planejamento · a tela muda no toque (20 a 36 ms) nas 4 abas e o banco confirma depois.
- 02/11/2026 · Importar planilha · modelo com as 5 colunas, 1/2/2.1/2.2, aba "Como preencher" e ITEM como texto.
- 02/11/2026 · Importar planilha · adicionar entra depois das atuais e aparece no Longo prazo.
- 02/11/2026 · Importar planilha · substituir arquiva as atuais e mostra quantas.
- 02/11/2026 · Importar planilha · conferência aponta código órfão, data inválida e sem nome; corrigir ali tira o vermelho.
- 02/11/2026 · Importar planilha · .csv em ponto e vírgula abre a mesma conferência; foto é recusada.
