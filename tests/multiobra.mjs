// MULTI-OBRA: a camada de dados nunca devolve dado de uma obra na outra,
// e lançamento sem obra escolhida é recusado. É o teste que pega o filtro esquecido.
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const ids = (lista) => lista.map((x) => x.id).sort()

dados._reiniciarMock()
await dados.entrar('eng@novaobra.test', 'x')

dados.definirObraAtual('obra-serra')
const frentesSerra = (await dados.listarFrentes()).data
const pessoasSerra = (await dados.listarPessoas()).data
const equipSerra = (await dados.listarEquipamentos()).data

dados.definirObraAtual('obra-ubs')
const frentesUbs = (await dados.listarFrentes()).data
const pessoasUbs = (await dados.listarPessoas()).data
const equipUbs = (await dados.listarEquipamentos()).data

conferir('frentes da Serra são só da Serra', frentesSerra.every((f) => f.obra_id === 'obra-serra'), true)
conferir('frentes da UBS são só da UBS', frentesUbs.every((f) => f.obra_id === 'obra-ubs'), true)
conferir('nenhuma frente em comum', ids(frentesSerra).filter((id) => ids(frentesUbs).includes(id)), [])
conferir('pessoas lotadas na UBS são só da UBS', pessoasUbs.daObra.every((f) => f.obra_id === 'obra-ubs'), true)
conferir('nenhuma pessoa da Serra na UBS', ids(pessoasUbs.daObra).filter((id) => ids(pessoasSerra.daObra).includes(id)), [])
conferir('UBS não tem equipamento na obra (o da Serra não vaza)', equipUbs.naObra, [])
conferir('Serra tem os dela', equipSerra.naObra.length, 2)

// Diários: cada obra vê só os seus, e não abre o da outra nem pelo id.
dados.definirObraAtual('obra-serra')
const diariosSerra = (await dados.listarDiarios()).data
dados.definirObraAtual('obra-ubs')
const diariosUbs = (await dados.listarDiarios()).data
conferir('diários da Serra são só da Serra', diariosSerra.every((r) => r.obra_id === 'obra-serra'), true)
conferir('diários da UBS são só da UBS', diariosUbs.every((r) => r.obra_id === 'obra-ubs'), true)
conferir('UBS tem um diário só, a Serra tem vários', [diariosUbs.length, diariosSerra.length > 1], [1, true])
conferir('da UBS não abre diário da Serra pelo id', (await dados.obterDiario(diariosSerra[0].id)).erro, 'Diário não encontrado nesta obra.')
const diaUbs = (await dados.obterDiario(diariosUbs[0].id)).data
conferir('efetivo do diário da UBS não tem gente da Serra',
  diaUbs.efetivo.some((l) => ['João', 'Marcos', 'Tiago', 'Paulo', 'Rafael', 'Luís', 'Bruno'].includes(l.nome)), false)
conferir('diário da UBS não tem equipamento', diaUbs.equipamentos, [])

// Efetivo geral (comparativo): a linha de cada obra conta só quem está lotado nela.
const quadro = (await dados.listarQuadroEfetivo()).data
const linha = (id) => quadro.obras.find((o) => o.id === id)
conferir('efetivo geral: Serra conta só os lotados na Serra', linha('obra-serra').total, pessoasSerra.daObra.filter((f) => f.ativo).length)
conferir('efetivo geral: UBS conta só os lotados na UBS', linha('obra-ubs').total, pessoasUbs.daObra.filter((f) => f.ativo).length)
conferir('efetivo geral: o total é a soma das obras', quadro.geral.total, quadro.obras.reduce((s, o) => s + o.total, 0))

// Edson foi deslocado da Serra para a UBS só hoje: aparece lá como vindo.
const efetivoUbs = (await dados.listarEfetivoHoje()).data
conferir('Edson veio da Serra para a UBS', efetivoUbs.find((i) => i.funcionario.id === 'f-edson')?.situacao, 'Veio de outra obra')

// Abrir o RDO da UBS grava o Edson lá. Aí a trava passa a valer de verdade.
await dados.salvarRdo({ clima_manha: 'Nublado' })
dados.definirObraAtual('obra-serra')
const trava = await dados.trazerFuncionario('f-severino')
conferir('não dá para trazer quem já está presente na obra dele', trava.erro, 'Severino já está presente hoje na obra UBS Nova Esperança')

// Desmarcar o Deslocado do próprio Edson desfaz a chegada na UBS, sem travar.
const volta = await dados.marcarEfetivo('f-edson', 'Presente')
conferir('Edson volta a Presente na Serra', volta.erro, null)
dados.definirObraAtual('obra-ubs')
conferir('e some da UBS', (await dados.listarEfetivoHoje()).data.some((i) => i.funcionario.id === 'f-edson'), false)

// Equipamento: da UBS não se puxa nem se marca o que está na Serra.
dados.definirObraAtual('obra-ubs')
conferir('da UBS não puxa a betoneira que está na Serra', (await dados.mandarEquipamentoParaObra('e-betoneira')).erro,
  'Betoneira 400 L está na obra Casa Alto da Serra 4. Mande para o depósito de lá primeiro.')
conferir('da UBS não marca o dia da betoneira da Serra', (await dados.marcarEquipamentoDia('e-betoneira', 'Quebrado')).erro, 'Equipamento não está nesta obra.')
dados.definirObraAtual('obra-serra')
conferir('e a betoneira continua na Serra', (await dados.listarEquipamentos()).data.naObra.some((e) => e.id === 'e-betoneira'), true)

// Materiais: cada obra vê só o seu quadro, e não mexe nem apaga o pedido da outra.
dados.definirObraAtual('obra-serra')
const quadroSerra = (await dados.listarQuadroMateriais()).data
dados.definirObraAtual('obra-ubs')
const quadroUbs = (await dados.listarQuadroMateriais()).data
conferir('pedidos da Serra são só da Serra', quadroSerra.pedidos.every((p) => p.obra_id === 'obra-serra'), true)
conferir('UBS tem só os 2 pedidos dela', ids(quadroUbs.pedidos), ['ped-ubs-aco', 'ped-ubs-bloco'])
conferir('o catálogo é o mesmo nas duas', quadroUbs.catalogo.length, quadroSerra.catalogo.length)
conferir('sugestão de frente da UBS não traz frente da Serra', quadroUbs.frentes.includes('Reboco fachada norte'), false)
conferir('da UBS não move pedido da Serra', (await dados.moverPedido('ped-tubo', 'Em cotação')).erro, 'Pedido não encontrado nesta obra.')
conferir('da UBS não apaga pedido da Serra, e avisa', (await dados.apagarPedido('ped-tubo')).erro, 'Pedido não encontrado nesta obra.')
const novoUbs = await dados.salvarPedido({ material_id: 'mat-cimento', quantidade: '30', frente: 'Fundação — sapatas', prioridade: 'Normal' })
conferir('pedido novo entra na obra escolhida, em Solicitar', [novoUbs.data.obra_id, novoUbs.data.status], ['obra-ubs', 'Solicitar'])
dados.definirObraAtual('obra-serra')
const depoisSerra = (await dados.listarQuadroMateriais()).data.pedidos
conferir('apagar pela UBS não apagou o pedido da Serra', depoisSerra.some((p) => p.id === 'ped-tubo'), true)
conferir('o pedido novo da UBS não aparece na Serra', depoisSerra.some((p) => p.id === novoUbs.data.id), false)
conferir('mover na Serra anda uma coluna e grava o histórico', (await dados.moverPedido('ped-tubo', 'Em cotação')).data.historico.map((h) => h.status), ['Solicitar', 'Em cotação'])
conferir('o segundo toque igual é recusado', (await dados.moverPedido('ped-tubo', 'Em cotação')).erro, 'O pedido anda uma coluna por vez.')
// Pedido criado na Serra não muda de obra se o seletor trocar enquanto o banco responde.
const pedindo = dados.salvarPedido({ material_id: 'mat-areia', quantidade: '3', frente: 'Reboco fachada norte', prioridade: 'Normal' })
dados.definirObraAtual('obra-ubs')
conferir('o pedido tocado na Serra fica na Serra', (await pedindo).data.obra_id, 'obra-serra')
conferir('e não aparece na UBS', (await dados.listarQuadroMateriais()).data.pedidos.some((p) => p.material_id === 'mat-areia'), false)

// Planejamento: cada obra vê só a sua EAP, e não mexe na atividade da outra.
dados.definirObraAtual('obra-ubs')
const ativUbs = (await dados.listarPlanejamento()).data.atividades
conferir('UBS tem só as 3 atividades dela', ids(ativUbs), ['at-ubs-fun', 'at-ubs-sap', 'at-ubs-vb'])
conferir('da UBS não edita atividade da Serra', (await dados.salvarAtividade({ id: 'at-reb', titulo: 'X', data_inicio: '2026-11-02', data_fim: '2026-11-02' })).erro, 'Atividade não encontrada nesta obra.')
conferir('da UBS não põe atividade dentro de uma da Serra', (await dados.salvarAtividade({ titulo: 'X', data_inicio: '2026-11-02', data_fim: '2026-11-02', pai_id: 'at-reb' })).erro,
  'A atividade-mãe não existe nesta obra (ou está arquivada).')
conferir('da UBS não arquiva nem move atividade da Serra', [(await dados.arquivarAtividade('at-reb')).erro, (await dados.moverAtividade('at-reb', 1)).erro],
  ['Atividade não encontrada nesta obra.', 'Atividade não encontrada nesta obra.'])
const novaAtiv = (await dados.salvarAtividade({ titulo: 'Cintamento', data_inicio: '2026-11-10', data_fim: '2026-11-12', pai_id: 'at-ubs-fun' })).data
conferir('atividade nova entra na UBS, no fim da fundação', [novaAtiv.obra_id, novaAtiv.ordem], ['obra-ubs', 2])
dados.definirObraAtual('obra-serra')
const ativSerra = (await dados.listarPlanejamento()).data.atividades
conferir('atividades da Serra são só da Serra', ativSerra.every((x) => x.obra_id === 'obra-serra'), true)
conferir('e nada da UBS aparece na Serra', ativSerra.some((x) => x.id === novaAtiv.id || x.id === 'at-ubs-fun'), false)
conferir('a Reboco da Serra continua ativa', ativSerra.find((x) => x.id === 'at-reb').arquivada, false)
conferir('arquivar o grupo leva as filhas', (await dados.arquivarAtividade('at-reb')).data.map((x) => x.id).sort(), ['at-reb', 'at-reb-fach', 'at-reb-int'])
conferir('não dá para pôr uma atividade dentro da filha dela', (await dados.salvarAtividade({ id: 'at-aca', titulo: 'Acabamento', data_inicio: '2026-11-02', data_fim: '2026-11-02', pai_id: 'at-aca-rev' })).erro,
  'Uma atividade não pode ficar dentro dela mesma.')
// Médio prazo: cada obra vê só as suas restrições, e não mexe nas da outra.
const hojeRs = (await import('../src/lib/datas.js')).hojeISO()
const rsSerra = (await dados.listarPlanejamento()).data.restricoes
conferir('restrições da Serra são só da Serra', [rsSerra.length, rsSerra.every((r) => r.obra_id === 'obra-serra')], [8, true])
dados.definirObraAtual('obra-ubs')
conferir('UBS tem só o laudo de sondagem', (await dados.listarPlanejamento()).data.restricoes.map((r) => r.id), ['rs-ubs-sondagem'])
conferir('da UBS não resolve, move nem apaga restrição da Serra', [
  (await dados.resolverRestricao('rs-porcelanato')).erro, (await dados.moverRestricao('rs-porcelanato', 1)).erro, (await dados.apagarRestricao('rs-porcelanato')).erro,
], ['Restrição não encontrada nesta obra.', 'Restrição não encontrada nesta obra.', 'Restrição não encontrada nesta obra.'])
conferir('da UBS não cria restrição numa atividade da Serra', (await dados.salvarRestricao({ atividade_id: 'at-aca-pin', descricao: 'x', tipo: 'Material', prazo: hojeRs, responsavel: 'Eu' })).erro,
  'A atividade não existe nesta obra (ou está arquivada).')
const novaRs = (await dados.salvarRestricao({ atividade_id: 'at-ubs-sap', descricao: 'Bomba de concreto', tipo: 'Equipamento', prazo: hojeRs, responsavel: 'Severino' })).data
conferir('restrição nova entra na UBS, aberta', [novaRs.obra_id, novaRs.resolvida], ['obra-ubs', false])
dados.definirObraAtual('obra-serra')
conferir('e não aparece na Serra; a da Serra continua lá', [
  (await dados.listarPlanejamento()).data.restricoes.some((r) => r.id === novaRs.id),
  (await dados.listarPlanejamento()).data.restricoes.some((r) => r.id === 'rs-porcelanato'),
], [false, true])
conferir('resolver grava o dia', (await dados.resolverRestricao('rs-porcelanato')).data.resolvida_em, hojeRs)
conferir('resolvida não muda de semana', (await dados.moverRestricao('rs-porcelanato', 1)).erro, 'Restrição resolvida não muda de semana.')
conferir('reabrir limpa o dia', (await dados.resolverRestricao('rs-porcelanato', false)).data.resolvida_em, null)

// Importação de planilha: entra só na obra escolhida, mãe e filha ligadas.
const lote = [
  { chave: '1', paiChave: null, ordem: 0, titulo: 'Importada', data_inicio: '2026-11-02', data_fim: '2026-11-06' },
  { chave: '1.1', paiChave: '1', ordem: 0, titulo: 'Filha importada', data_inicio: '2026-11-02', data_fim: '2026-11-03' },
]
dados.definirObraAtual('obra-ubs')
const antesUbs = (await dados.listarPlanejamento()).data.atividades.filter((x) => !x.arquivada).length
conferir('importar exige escolher adicionar ou substituir', (await dados.importarCronograma(lote, 'misturar')).erro, 'Escolha entre adicionar e substituir.')
conferir('importar adicionando na UBS', (await dados.importarCronograma(lote, 'adicionar')).data, { criadas: 2, arquivadas: 0 })
const ubsDepois = (await dados.listarPlanejamento()).data.atividades
const mae = ubsDepois.find((x) => x.titulo === 'Importada')
conferir('a importada vai para o fim da EAP e a filha fica dentro dela',
  [mae.obra_id, mae.ordem, ubsDepois.find((x) => x.titulo === 'Filha importada').pai_id === mae.id], ['obra-ubs', 1, true])
conferir('e as que já existiam continuam ativas', ubsDepois.filter((x) => !x.arquivada).length, antesUbs + 2)
conferir('substituir arquiva as que existiam', (await dados.importarCronograma(lote, 'substituir')).data, { criadas: 2, arquivadas: antesUbs + 2 })
conferir('ficam ativas só as da planilha', (await dados.listarPlanejamento()).data.atividades.filter((x) => !x.arquivada).length, 2)
dados.definirObraAtual('obra-serra')
conferir('nada importado na UBS aparece na Serra', (await dados.listarPlanejamento()).data.atividades.some((x) => x.titulo === 'Importada'), false)
dados._reiniciarMock()
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')

// Curto prazo: o Kanban e as subtarefas são da obra escolhida.
const { segundaDaSemana } = await import('../src/lib/planejamento.js')
const semanaAtual = segundaDaSemana(hojeRs)
const plSerra = (await dados.listarPlanejamento()).data
conferir('registros da semana e subtarefas da Serra são só da Serra',
  [plSerra.semanas.every((x) => x.obra_id === 'obra-serra'), plSerra.subtarefas.every((x) => x.obra_id === 'obra-serra'), plSerra.subtarefas.length], [true, true, 6])
dados.definirObraAtual('obra-ubs')
const plUbs = (await dados.listarPlanejamento()).data
conferir('UBS: só o registro e as 2 subtarefas das Sapatas', [plUbs.semanas.map((x) => x.id), plUbs.subtarefas.map((x) => x.id)], [['sa-ubs-sap'], ['st-ubs-sap-1', 'st-ubs-sap-2']])
conferir('da UBS não move no Kanban atividade da Serra', (await dados.moverNaSemana('at-reb-int', semanaAtual, 'Concluído')).erro, 'Atividade não encontrada nesta obra.')
conferir('da UBS não marca, não cria nem apaga subtarefa da Serra', [
  (await dados.marcarSubtarefa('st-reb-int-3', { feita: true })).erro, (await dados.criarSubtarefa('at-reb-int', 'x')).erro, (await dados.apagarSubtarefa('st-reb-int-3')).erro,
], ['Subtarefa não encontrada nesta obra.', 'Atividade não encontrada nesta obra.', 'Subtarefa não encontrada nesta obra.'])
dados.definirObraAtual('obra-serra')
conferir('grupo não entra no Kanban', (await dados.moverNaSemana('at-ele', semanaAtual, 'Concluído')).erro, 'Um grupo não entra no Kanban: mova as subatividades dele.')
conferir('semana precisa ser uma segunda-feira', (await dados.moverNaSemana('at-ele-fio', (await import('../src/lib/datas.js')).somarDias(semanaAtual, 2), 'Concluído')).erro, 'Semana inválida.')
conferir('não realizada exige causa da lista', (await dados.marcarNaoRealizada('at-ele-fio', semanaAtual, 'Preguiça')).erro, 'Escolha a causa.')
await dados.marcarNaoRealizada('at-ele-fio', semanaAtual, 'Clima')
const concluiu = await dados.moverNaSemana('at-ele-fio', semanaAtual, 'Concluído')
const progressoDe = async (id) => (await dados.listarPlanejamento()).data.atividades.find((x) => x.id === id).progresso
conferir('concluir tira o "não realizada" e guarda o avanço de antes', [concluiu.data.nao_realizada, concluiu.data.progresso_antes], [false, 20])
conferir('e põe o avanço da atividade em 100%', await progressoDe('at-ele-fio'), 100)
conferir('concluída não pode virar não realizada', (await dados.marcarNaoRealizada('at-ele-fio', semanaAtual, 'Clima')).erro, 'Atividade concluída não pode ser marcada como não realizada.')
await dados.moverNaSemana('at-ele-fio', semanaAtual, 'Em andamento')
conferir('voltar de Concluído devolve o avanço de antes', await progressoDe('at-ele-fio'), 20)
conferir('a primeira mexida numa semana cria o registro', (await dados.moverNaSemana('at-aca-rev-ban', semanaAtual, 'Em andamento')).data.status, 'Em andamento')
const novaSt = (await dados.criarSubtarefa('at-ele-fio', 'Passar os cabos')).data
conferir('subtarefa nova entra no fim, pendente', [novaSt.obra_id, novaSt.ordem, novaSt.feita], ['obra-serra', 0, false])
conferir('subtarefa não realizada exige causa e tira o feita', (await dados.marcarSubtarefa('st-reb-int-1', { causa: 'Material' })).data, {
  ...plSerra.subtarefas.find((x) => x.id === 'st-reb-int-1'), feita: false, nao_realizada: true, causa: 'Material',
})
conferir('marcar feita tira o não realizada', (await dados.marcarSubtarefa('st-reb-int-1', { feita: true })).data.nao_realizada, false)

// Longo prazo: avanço e calendário são da obra escolhida.
conferir('a Serra trabalha de segunda a sexta, com feriados', (await dados.listarPlanejamento()).data.calendario.dias, [1, 2, 3, 4, 5])
conferir('grupo não recebe avanço à mão', (await dados.salvarProgresso('at-aca', '50')).erro, 'O avanço de um grupo vem das subatividades.')
conferir('avanço fora de 0 a 100 é recusado', (await dados.salvarProgresso('at-ele-fio', '120')).erro, 'Informe um número de 0 a 100.')
conferir('avanço da Serra grava na Serra', (await dados.salvarProgresso('at-ele-fio', '60')).data.progresso, 60)
dados.definirObraAtual('obra-ubs')
conferir('da UBS não lança avanço na Serra', (await dados.salvarProgresso('at-ele-fio', '10')).erro, 'Atividade não encontrada nesta obra.')
conferir('a UBS trabalha também no sábado', (await dados.listarPlanejamento()).data.calendario, { dias: [1, 2, 3, 4, 5, 6], feriados: [] })
await dados.salvarCalendario({ dias: [1, 2, 3, 4, 5], feriados: ['2026-12-08'] })
dados.definirObraAtual('obra-serra')
conferir('mudar o calendário da UBS não mexe no da Serra', (await dados.listarPlanejamento()).data.calendario.feriados.includes('2026-12-08'), false)

// Estoque: cada obra vê só os insumos dela, e não dá baixa no insumo da outra.
dados._reiniciarMock()
await dados.entrar('eng@novaobra.test', 'x')
const hojeISOteste = (await import('../src/lib/datas.js')).hojeISO()
const linhaDe = (estoque, nome) => estoque.find((l) => l.nome.startsWith(nome))
dados.definirObraAtual('obra-serra')
const estoqueSerra = (await dados.listarQuadroMateriais()).data.estoque
dados.definirObraAtual('obra-ubs')
const estoqueUbs = (await dados.listarQuadroMateriais()).data.estoque
conferir('estoque da UBS: só o cimento dela', estoqueUbs.map((l) => [l.nome, l.saldo]), [['Cimento CP-II 50 kg', 25]])
conferir('estoque da Serra: 4 insumos, 2 críticos', [estoqueSerra.length, estoqueSerra.filter((l) => l.situacao === 'Crítico').length], [4, 2])
conferir('da UBS não dá baixa no insumo da Serra', (await dados.registrarBaixa({ insumo_id: 'ins-brita', quantidade: '1', frente: 'X', data: hojeISOteste })).erro, 'Insumo não encontrado nesta obra.')
conferir('da UBS não abre o histórico da Serra', (await dados.obterHistoricoInsumo('ins-brita')).erro, 'Insumo não encontrado nesta obra.')
conferir('da UBS não muda o mínimo da Serra', (await dados.salvarMinimo('ins-brita', '9')).erro, 'Insumo não encontrado nesta obra.')
conferir('baixa maior que o saldo é recusada', (await dados.registrarBaixa({ insumo_id: 'ins-ubs-cimento', quantidade: '26', frente: 'Sapatas', data: hojeISOteste })).erro,
  'Saldo insuficiente: há só 25 sacos no estoque.')
conferir('baixa dentro do saldo grava', (await dados.registrarBaixa({ insumo_id: 'ins-ubs-cimento', quantidade: '5', frente: 'Sapatas', data: hojeISOteste })).data.obra_id, 'obra-ubs')
conferir('e o saldo cai para 20, que é o mínimo: vira crítico', linhaDe((await dados.listarQuadroMateriais()).data.estoque, 'Cimento').situacao, 'Crítico')
dados.definirObraAtual('obra-serra')
conferir('da Serra não desfaz a baixa da UBS', (await dados.desfazerBaixa('mv-ubs-cimento-s')).erro, 'Baixa não encontrada nesta obra.')
conferir('desfazer só vale para baixa manual (não para saída de pedido)', (await dados.desfazerBaixa('mv-rejunte-s')).erro, 'Baixa não encontrada nesta obra.')
conferir('desfazer a baixa manual da brita devolve o saldo', [(await dados.desfazerBaixa('mv-brita-s')).erro, linhaDe((await dados.listarQuadroMateriais()).data.estoque, 'Brita').saldo], [null, 3.5])
await dados.registrarBaixa({ insumo_id: 'ins-brita', quantidade: '2', frente: 'Fundação — sapatas', data: hojeISOteste })
conferir('a baixa da UBS não mexeu na Serra', (await dados.listarQuadroMateriais()).data.estoque.map((l) => l.saldo), estoqueSerra.map((l) => l.saldo))

// Pedido recebido dá entrada (criando o insumo); entregue dá saída; voltar desfaz.
const chegou = { qtd_bate_nf: false, qtd_recebida: '5,5', estado_ok: true }
await dados.moverPedido('ped-areia', 'No almoxarifado', chegou)
const comAreia = (await dados.listarQuadroMateriais()).data.estoque
conferir('areia recebida: insumo novo com o que chegou, sem mínimo', [linhaDe(comAreia, 'Areia')?.saldo, linhaDe(comAreia, 'Areia')?.situacao], [5.5, 'Sem mínimo'])
await dados.moverPedido('ped-areia', 'Comprado')
conferir('voltar o recebimento tira a entrada', linhaDe((await dados.listarQuadroMateriais()).data.estoque, 'Areia').saldo, 0)
await dados.moverPedido('ped-areia', 'No almoxarifado', chegou)
conferir('receber de novo não duplica a entrada', linhaDe((await dados.listarQuadroMateriais()).data.estoque, 'Areia').saldo, 5.5)
await dados.moverPedido('ped-areia', 'Entregue', { frente: 'Reboco fachada norte' })
conferir('entregar na frente dá saída do lote', linhaDe((await dados.listarQuadroMateriais()).data.estoque, 'Areia').saldo, 0)
// Porcelanato: chegaram 45, saíram 30 por baixa manual. Entregar leva só os 15 que sobraram.
conferir('entregar depois de baixa parcial passa', (await dados.moverPedido('ped-porcelanato', 'Entregue', { frente: 'Revestimento banheiros' })).erro, null)
conferir('e leva só o que sobrou do lote (saldo 0, não negativo)', linhaDe((await dados.listarQuadroMateriais()).data.estoque, 'Porcelanato').saldo, 0)
await dados.moverPedido('ped-porcelanato', 'No almoxarifado')
conferir('voltar a entrega devolve os 15', linhaDe((await dados.listarQuadroMateriais()).data.estoque, 'Porcelanato').saldo, 15)
conferir('voltar recebimento já consumido é bloqueado', (await dados.moverPedido('ped-brita', 'Comprado')).erro,
  'Parte deste lote já saiu do estoque (há 1,5 m³). Não dá para voltar o recebimento.')

// Trocar de obra no meio de uma gravação: ela termina na obra em que foi tocada.
dados._reiniciarMock()
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-ubs')
const tocado = dados.marcarEfetivo('f-severino', 'Falta')
dados.definirObraAtual('obra-serra') // o seletor mudou antes de a gravação acabar
conferir('a gravação tocada na UBS não falha com a troca', (await tocado).erro, null)
dados.definirObraAtual('obra-ubs')
const hojeUbs = (await dados.listarDiarios()).data[0]
conferir('o Severino ficou no diário da UBS', (await dados.obterDiario(hojeUbs.id)).data.efetivo.find((l) => l.nome === 'Severino')?.situacao, 'Falta')
dados.definirObraAtual('obra-serra')
conferir('e a Serra não ganhou diário novo por causa disso', (await dados.listarDiarios()).data.filter((r) => r.data === hojeUbs.data).length, 1)

// Sem obra escolhida a camada se recusa, em vez de cair numa obra qualquer.
dados.definirObraAtual(null)
const registrar = console.error
console.error = () => {} // o erro aqui é provocado de propósito; não suja a saída da régua
conferir('sem obra escolhida, a camada se recusa', (await dados.listarFrentes()).erro, 'Nenhuma obra escolhida')
console.error = registrar

console.log(`${ok}/${tot} — multiobra`)
process.exit(ok === tot ? 0 : 1)
