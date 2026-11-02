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
