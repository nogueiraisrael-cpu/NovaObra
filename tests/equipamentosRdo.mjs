// Equipamentos no RDO: cadastrar à mão (sem repetir código) e desfazer o lançado por engano.
import * as dados from '../src/lib/dados.js'
import { reiniciarMock } from './apoio/bancoMemoria.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const naObra = async () => (await dados.listarEquipamentosHoje()).data.map((x) => x.equipamento.nome)

reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')

// Cadastro à mão, direto nesta obra
const novo = await dados.salvarEquipamento({ nome: ' Vibrador de imersão ', codigo: 'VB-01', nesta_obra: true })
conferir('cadastra o vibrador', novo.erro, null)
conferir('ele entra nos equipamentos do dia', (await naObra()).includes('Vibrador de imersão'), true)
conferir('código repetido é recusado', (await dados.salvarEquipamento({ nome: 'Outro', codigo: 'VB-01', nesta_obra: true })).erro,
  'Já existe um equipamento com o código VB-01.')
conferir('maiúscula não engana a trava', (await dados.salvarEquipamento({ nome: 'Outro', codigo: ' vb-01 ', nesta_obra: true })).erro,
  'Já existe um equipamento com o código vb-01.')
conferir('o que chegou hoje pode sair por engano', (await dados.listarEquipamentosHoje()).data.find((x) => x.equipamento.id === novo.data.id).chegou_hoje, true)
conferir('a betoneira (há 30 dias na obra) não', (await dados.listarEquipamentosHoje()).data.find((x) => x.equipamento.id === 'e-betoneira').chegou_hoje, false)
conferir('tirar a betoneira por engano é recusado', (await dados.tirarEquipamentoDoRdo('e-betoneira')).erro,
  'Betoneira 400 L está na obra desde antes de hoje. Para mandar ao depósito, use a tela Equipamentos.')
conferir('sem nome é recusado', (await dados.salvarEquipamento({ nome: '  ', codigo: '', nesta_obra: true })).erro, 'Informe o nome do equipamento.')
conferir('sem código pode repetir (não há o que comparar)', (await dados.salvarEquipamento({ nome: 'Serra mármore', codigo: '', nesta_obra: false })).erro, null)

// Desfazer: marca o dia (abre o RDO e grava a linha) e depois tira por engano
await dados.marcarEquipamentoDia(novo.data.id, 'Quebrado', 'teste')
const tirou = await dados.tirarEquipamentoDoRdo(novo.data.id)
conferir('tira o vibrador do RDO', tirou.erro, null)
conferir('ele volta para o depósito', (await dados.listarEquipamentos()).data.noDeposito.some((e) => e.id === novo.data.id), true)
conferir('e some dos equipamentos do dia', (await naObra()).includes('Vibrador de imersão'), false)
conferir('tirar de novo diz que não está na obra', (await dados.tirarEquipamentoDoRdo(novo.data.id)).erro, 'Equipamento não está nesta obra.')
conferir('a betoneira continua', (await naObra()).includes('Betoneira 400 L'), true)
// A linha "Quebrado" do dia foi apagada: se ele voltar hoje, volta como Operando, sem a observação velha.
await dados.mandarEquipamentoParaObra(novo.data.id)
const volta = (await dados.listarEquipamentosHoje()).data.find((x) => x.equipamento.id === novo.data.id)
conferir('a linha do dia foi apagada', [volta.situacao, volta.observacao], ['Operando', ''])

// Concluído: o diário de hoje guarda a linha com a observação e o equipamento volta para o depósito
conferir('Concluído não entra pelo toque do dia', (await dados.marcarEquipamentoDia(novo.data.id, 'Concluído')).erro,
  'Para concluir o uso do equipamento, toque em Concluído e confirme.')
conferir('conclui o vibrador', (await dados.concluirEquipamento(novo.data.id, '  Concretagem da laje, acabou em 13/11  ')).erro, null)
conferir('concluído volta para o depósito', (await dados.listarEquipamentos()).data.noDeposito.some((e) => e.id === novo.data.id), true)
conferir('e sai dos equipamentos do dia', (await naObra()).includes('Vibrador de imersão'), false)
const linhaDoDia = async () => (await dados.obterDiario((await dados.obterRdoHoje()).data.id)).data
  .equipamentos.filter((e) => e.nome === 'Vibrador de imersão').map((e) => [e.situacao, e.observacao])
conferir('o diário de hoje guarda Concluído e a observação', await linhaDoDia(), [['Concluído', 'Concretagem da laje, acabou em 13/11']])
conferir('concluir de novo diz que não está na obra', (await dados.concluirEquipamento(novo.data.id, 'x')).erro, 'Equipamento não está nesta obra.')
// Voltou no mesmo dia: recomeça como Operando; concluir outra vez regrava a mesma linha, sem duplicar.
await dados.mandarEquipamentoParaObra(novo.data.id)
const deVolta = (await dados.listarEquipamentosHoje()).data.find((x) => x.equipamento.id === novo.data.id)
conferir('de volta no mesmo dia, recomeça como Operando', [deVolta.situacao, deVolta.observacao], ['Operando', ''])
conferir('e o diário de hoje passa a dizer Operando', await linhaDoDia(), [['Operando', '']])
conferir('conclui de novo, sem observação', (await dados.concluirEquipamento(novo.data.id)).erro, null)
conferir('uma linha só no diário', await linhaDoDia(), [['Concluído', '']])
await dados.mandarEquipamentoParaObra(novo.data.id)

// Multi-obra: da UBS não se tira nem se conclui o que está na Serra
dados.definirObraAtual('obra-ubs')
conferir('da UBS não tira a betoneira da Serra', (await dados.tirarEquipamentoDoRdo('e-betoneira')).erro, 'Equipamento não está nesta obra.')
conferir('da UBS não conclui a betoneira da Serra', (await dados.concluirEquipamento('e-betoneira', 'x')).erro, 'Equipamento não está nesta obra.')
dados.definirObraAtual('obra-serra')
conferir('e a betoneira segue na Serra', (await naObra()).includes('Betoneira 400 L'), true)

console.log(`${ok}/${tot} — equipamentos no RDO`)
process.exit(ok === tot ? 0 : 1)
