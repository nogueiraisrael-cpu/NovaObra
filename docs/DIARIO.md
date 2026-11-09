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

## Rodada 7 · Medições, etapa 1 (subir planilha) — testada pelo Claude no app, com o banco de verdade

- 02/11/2026 · Medições · a lista do contrato da UBS mostra 3ª, 2ª e 1ª com período, data e valor.
- 02/11/2026 · Medições · trocar de obra troca as medições; a Serra mostra contrato vazio e só os empreiteiros dela.
- 02/11/2026 · Medições · a planilha real do contrato abre com 13 etapas, 277 serviços e os quatro totais do PRD; nº XXX vira 4 em amarelo.
- 02/11/2026 · Medições · nº que já existe é recusado com aviso, sem gravar.
- 02/11/2026 · Medições · gravar a planilha real: 1 medição, 277 linhas, continua lá depois do F5, sem duplicar.
- 02/11/2026 · Medições · Trocar planilha regrava as linhas sem dobrar (277).
- 02/11/2026 · Medições · Excluir pede confirmação; "Não" mantém, "Sim" apaga a medição e as linhas.
- 02/11/2026 · Medições · a planilha real do empreiteiro lista 33 abas, acusa os nº 30, 26 e 02 repetidos e não mostra dado bancário.
- 02/11/2026 · Medições · sem empreiteiro, o botão de escolher planilha fica apagado e travado (corrigido na rodada).
- 02/11/2026 · Medições · corrigidos os nº repetidos, as 33 do empreiteiro gravam e continuam lá depois do F5.
- 02/11/2026 · Medições · subir o mesmo arquivo de novo: todas "Já no app", 0 novas, nada gravado.
- 02/11/2026 · Medições · o Cliente não vê medição nenhuma.
- 02/11/2026 · Medições · no celular, lista e detalhe cabem na tela (375 px, sem rolar para o lado).
- 02/11/2026 · Medições · sem banco (queda simulada), a tela avisa "Não foi gravado" e nada entra.

## Rodada 7 · Medições, etapa 2 (painel) — testada pelo Claude no app, com o banco de verdade

- 02/11/2026 · Painel · "Ver painel" no Contrato e no Empreiteiro; subir uma medição abre o painel sozinho, já nela.
- 02/11/2026 · Painel do contrato · UBS, Todas: adequado R$ 2.418.300,00, medido R$ 771.500,00, saldo R$ 1.646.800,00, 31,9%; barras das 8 etapas com o % do PRD.
- 02/11/2026 · Painel do contrato · só a 2ª: medido é o período dela e o saldo conta tudo até a 2ª.
- 02/11/2026 · Painel do contrato · "Só com saldo negativo" deixa só o 2.1.3, em vermelho, com "Acima do contratado" e "Cresceu na adequação".
- 02/11/2026 · Painel do contrato · a planilha real: 13 etapas e saldo R$ 874.262,85, igual ao "SALDO DO CONTRATO" do boletim; Todas = 67,2%.
- 02/11/2026 · Painel do contrato · centavo de arredondamento da planilha (item 1.8) não vira mais "acima do contratado" (corrigido na rodada, com teste).
- 02/11/2026 · Painel do empreiteiro · Drywall e Gesso com previsto, executado, pago e %; 33 medições reais do topógrafo com barras e tabela por medição.
- 02/11/2026 · Painel do empreiteiro · "Todos os empreiteiros" soma tudo, as barras levam o nome e a escolha por nº fica para um empreiteiro só.
- 02/11/2026 · Painel · no celular, cartões com medido, saldo e %; tocar mostra o resto; nada passa da largura.

## Rodada 8 · Login e perfis — conferida pelo Claude (registro do Supabase e modo de teste do app)

- 03/11/2026 · Login · a primeira conta (Israel) nasceu Engenheiro administrador, ativa, com e-mail confirmado (banco e registro do Supabase).
- 03/11/2026 · Login · F5 e reiniciar o app não deslogam: a sessão volta sozinha.
- 03/11/2026 · Login · sair e entrar de novo com a senha certa (registro: logout 204, token 200).
- 03/11/2026 · Login · esqueci minha senha: o link abre e a senha nova grava (registro: recover 200, verify 303, user 200).
- 03/11/2026 · Login · conta nova fica em "Aguardando aprovação do administrador" (modo de teste).
- 03/11/2026 · Perfis · liberar sem perfil é recusado com "Escolha o perfil antes de liberar." (modo de teste).
- 03/11/2026 · Perfis · Gerente liberado só na UBS: seletor, comparativo e Efetivo só com a UBS; sem Medições, sem Usuários, sem "+ Nova obra" e "Editar obra" (modo de teste).
- 03/11/2026 · Perfis · Gerente não vê a foto da nota fiscal nem o "Desfazer" do estoque; o Engenheiro vê os dois (modo de teste).
- 03/11/2026 · Perfis · Gerente sem obra liberada vê "Nenhuma obra liberada para você" (texto do seletor corrigido na rodada).
- 03/11/2026 · Perfis · conta bloqueada recebe "Conta bloqueada. Contate o administrador." (modo de teste).

## Rodada 8 · Fotos no Storage — testada pelo Claude no app, com a sessão do Israel e o banco de verdade

- 03/11/2026 · Fotos · foto do diário (1.294 KB) sobe encolhida para 207 KB, 1200×900, na pasta `fotos/<obra>/diario/`; "Subindo foto…" enquanto sobe.
- 03/11/2026 · Fotos · depois do F5 a foto continua na frente e aparece em Diários, por endereço assinado.
- 03/11/2026 · Fotos · foto da nota fiscal (1.045 KB) sobe com 169 KB e aparece no Recebimento depois do F5.
- 03/11/2026 · Fotos · sem internet para o envio, a foto sai da lista com "A foto não subiu: sem internet…" e o Salvar continua liberado.
- 03/11/2026 · Fotos · tirar a foto da frente e salvar apaga o arquivo da pasta.
- 03/11/2026 · Fotos · receber de novo um pedido que voltou de coluna agora apaga a nota antiga (corrigido na rodada).

## Rodada 9 · Painel de admin — testada com o Israel, na conta de teste marcos

- 04/11/2026 · Painel · novo usuário pelo painel nasce ativo, com senha provisória e as obras escolhidas.
- 04/11/2026 · Painel · conta comum não usa a função (listar, criar, virar admin: 403) nem o banco direto.
- 04/11/2026 · Painel · sem login, cadastro recusado (`signup_disabled`); `disable_signup` e `mailer_autoconfirm` em `true`.
- 04/11/2026 · Painel · Gerente com uma obra: seletor só com ela, sem Painel de admin, sem Medições, sem Desfazer.
- 04/11/2026 · Painel · bloquear corta a sessão aberta na hora (0 obras) e o login; desbloquear devolve os dois.
- 04/11/2026 · Painel · redefinir senha: a antiga é recusada e a nova entra.
- 04/11/2026 · Painel · excluir com nome errado é recusado; com o nome certo somem login, perfil e obras liberadas.
- 04/11/2026 · Login · senha errada é recusada pelo servidor, no teste com a senha antiga.

## Rodada 10 · Banco de verdade, tela por tela — parte feita pelo Claude, sem senha

- 04/11/2026 · Banco · 47 gravações por tela (Engenheiro e Gerente) em `supabase/testes/gravacoes.sql`, tudo desfeito: passaram.
- 04/11/2026 · Banco · 49 permissões em `supabase/testes/permissoes.sql`: passaram.
- 04/11/2026 · Recusa calada · alteração recusada pela regra do banco agora avisa "Não foi gravado" (corrigido na rodada, com teste).
- 04/11/2026 · Clique duplo · Funcionário, Equipamento e Frente gravam um só, com o banco lento (corrigido na rodada; banco em memória).
- 04/11/2026 · Lista vazia · Hoje, Frentes, Pessoas, Equipamentos, Pedidos, Estoque, EAP, Longo, Curto e Medições dizem o que fazer (banco em memória).
- 04/11/2026 · Erro de rede · Obras, Efetivo, Frentes, Pessoas, Equipamentos, Pedidos, Estoque, Longo e Médio avisam e não deixam nada pela metade (queda simulada, banco em memória).
- 04/11/2026 · Lista grande · 2.500 linhas vêm todas (teste automático).

## Rodada 10 · parte feita pelo Claude com a sessão do Israel · 07/11/2026

- 07/11/2026 · 0 · Antes de começar · Preparar a Obra de Teste (Claude, com a conta do Israel).
- 07/11/2026 · Login e perfis · A sessão continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Login e perfis · Foto tirada no app continua lá depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Obras · Ficou gravado: a obra continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Obras · Gravou certo: acento, data e número voltam iguais (Claude, com a conta do Israel).
- 07/11/2026 · Obras · Nada duplica: código repetido é recusado (Claude, com a conta do Israel).
- 07/11/2026 · Obras · Apagar não some com histórico: obra concluída continua consultável (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Efetivo e clima · Ficou gravado: falta e clima continuam depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Efetivo e clima · Gravou certo: a ocorrência volta com acento (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Efetivo e clima · Cada um vê o seu: trocar de obra troca o efetivo (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Efetivo e clima · Quem não pode: funcionário presente em outra obra não é trazido (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Efetivo e clima · Nada duplica: tocar duas vezes não repete a pessoa (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Frentes e fechar · Ficou gravado: frente nova e preenchida continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Frentes e fechar · Gravou certo: nome e texto voltam iguais (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Frentes e fechar · Cada um vê o seu: frentes não passam de uma obra para a outra (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Frentes e fechar · Apagar não some com histórico: frente concluída segue no diário (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Frentes e fechar · Fechar RDO: o dia fechado continua fechado depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Diário · Frentes e fechar · Fechar RDO: clique duplo não fecha nem repete nada (Claude, com a conta do Israel).
- 07/11/2026 · Pessoas · Ficou gravado: funcionário novo continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Pessoas · Gravou certo: nome com acento e lotação voltam iguais (Claude, com a conta do Israel).
- 07/11/2026 · Pessoas · Cada um vê o seu: cada obra mostra a sua equipe (Claude, com a conta do Israel).
- 07/11/2026 · Pessoas · Apagar não some com histórico: desativar não tira do diário (Claude, com a conta do Israel).
- 07/11/2026 · Equipamentos · Ficou gravado: equipamento novo continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Equipamentos · Gravou certo: nome, código e data voltam iguais (Claude, com a conta do Israel).
- 07/11/2026 · Equipamentos · Cada um vê o seu: a UBS segue sem equipamento próprio (Claude, com a conta do Israel).
- 07/11/2026 · Equipamentos · Apagar não some com histórico: mandar ao depósito não tira do diário (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Pedidos · Ficou gravado: pedido novo continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Pedidos · Gravou certo: quantidade quebrada e texto voltam iguais (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Pedidos · Cada um vê o seu: pedidos não passam de uma obra para a outra (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Pedidos · Nada duplica: tocar duas vezes não move duas colunas (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Pedidos · Apagar não some com histórico: pedido recebido não se exclui (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Estoque · Ficou gravado: baixa continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Estoque · Gravou certo: número quebrado no mínimo volta igual (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Estoque · Cada um vê o seu: cada obra tem o seu saldo (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Estoque · Quem não pode: saldo negativo é recusado com aviso (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Estoque · Nada duplica: clique duplo em Dar baixa baixa uma vez (Claude, com a conta do Israel).
- 07/11/2026 · Materiais · Estoque · Apagar não some com histórico: desfazer devolve o saldo (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · EAP · Ficou gravado: atividade nova continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · EAP · Gravou certo: nome e datas voltam iguais (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · EAP · Cada um vê o seu: trocar de obra troca a EAP (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · EAP · Nada duplica: clique duplo em salvar cria uma atividade só (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · EAP · Apagar não some com histórico: arquivar mantém o registro (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Longo prazo · Ficou gravado: avanço continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Longo prazo · Gravou certo: calendário volta igual (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Longo prazo · Cada um vê o seu: o calendário é de cada obra (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Longo prazo · Nada duplica: salvar o mesmo avanço duas vezes não muda nada (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Médio prazo · Ficou gravado: restrição continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Médio prazo · Gravou certo: texto e responsável voltam iguais (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Médio prazo · Cada um vê o seu: restrições são de cada obra (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Médio prazo · Nada duplica: mover duas vezes rápido anda uma semana (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Médio prazo · Apagar não some com histórico: resolver mantém a restrição (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Médio prazo · Lista vazia: sem restrição, a tela diz o que fazer (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Curto prazo · Ficou gravado: mover para Concluído continua depois do F5 (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Curto prazo · Gravou certo: causa da não realizada volta igual (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Curto prazo · Cada um vê o seu: o kanban é de cada obra (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Curto prazo · Nada duplica: subtarefa com clique duplo entra uma vez (Claude, com a conta do Israel).
- 07/11/2026 · Planejamento · Curto prazo · Apagar não some com histórico: excluir subtarefa não mexe na atividade (Claude, com a conta do Israel).
- 07/11/2026 · Medições · Cada um vê o seu: medições são de cada obra (Claude, com a conta do Israel).
- 07/11/2026 · Equipamentos · Nada duplica: mandar para a obra duas vezes não repete (corrigido: o botão trava enquanto grava).
- 07/11/2026 · Obras · Obra nova e segunda-feira não cobram mais "RDO de ontem não fechado" (corrigido, com teste).
- 07/11/2026 · No ar · App publicado na Vercel (nova-obra-weld.vercel.app), republicando sozinho a cada envio ao GitHub (testado com "Bora pra Obra").
- 07/11/2026 · No ar · O link abre no celular, no 4G, e no computador (Israel).
- 07/11/2026 · No ar · Entrar com a conta do Engenheiro no link público, no celular e no computador (Israel).
- 07/11/2026 · No ar · Trocar de obra e abrir cada módulo no link público (Israel).
- 07/11/2026 · No ar · Funcionário criado no celular pelo link público ficou gravado na obra certa (conferido no banco) (Israel).
- 07/11/2026 · No ar · Ctrl+F5 no link público volta logado, sem tela em branco (Israel).
- 09/11/2026 · Diários · Corrigir dia anterior: clima, praticável e ocorrências gravam com acento, continuam depois do F5, e o diário segue "Fechado" com o mesmo carimbo (Claude, Obra de Teste, desfeito).
- 09/11/2026 · Diários · Corrigir dia anterior: Falta↔Presente muda o efetivo e a equipe da frente (quem falta sai da equipe), texto da frente corrigido, tudo depois do F5 (Claude, Serra 30/10, desfeito).
- 09/11/2026 · Diários · Deslocado aparece só com o selo e "não se corrige aqui"; o diário de hoje não tem "Corrigir este dia"; Cancelar não grava nada (Claude).
- 09/11/2026 · Diários · Imprimir resumo: dias soltos, Limpar trava o botão, números e frentes batem com os diários, tabela rola só dentro do bloco; numa segunda abre com a semana passada (Claude).
- 09/11/2026 · Diários · Fechar dia anterior "Não fechado": 07/11 da Serra fechado pela tela, selo Fechado com quem e quando, continua depois do F5; a correção mostra "Salvar e fechar o dia" (Claude, com ok do Israel).
