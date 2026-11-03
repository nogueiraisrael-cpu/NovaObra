// O banco em memória recusa o mesmo que o Supabase recusa. Sem isso, o caminho
// de erro da camada de dados (registro repetido, alteração sem filtro) nunca roda
// nos testes e só aparece com o banco de verdade.
import * as dados from '../src/lib/dados.js'
import { criarBancoMemoria, reiniciarMock } from './apoio/bancoMemoria.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const erroDe = async (p) => { try { await p; return null } catch (e) { return [e.code ?? null, e.message] } }

// Direto no banco em memória.
const banco = criarBancoMemoria()
const [rdo] = await banco.ler('rdos', { id: 'rdo-serra-hoje' })
conferir('dois diários da mesma obra no mesmo dia: recusado como no banco',
  await erroDe(banco.inserir('rdos', [{ obra_id: rdo.obra_id, data: rdo.data, status: 'Em andamento' }])),
  ['23505', 'duplicate key value violates unique constraint "rdos_um_por_obra_por_dia"'])
conferir('presente em duas obras no mesmo dia: recusado com o nome da trava',
  (await erroDe(banco.inserir('rdo_efetivo', [{ rdo_id: 'rdo-ubs-x', obra_id: 'obra-ubs', data: rdo.data, funcionario_id: 'f-joao', situacao: 'Presente' }])))?.[1],
  'duplicate key value violates unique constraint "rdo_efetivo_uma_presenca_por_dia"')
conferir('falta não conta para a trava de presença',
  await erroDe(banco.inserir('rdo_efetivo', [{ rdo_id: 'rdo-ubs-x', obra_id: 'obra-ubs', data: rdo.data, funcionario_id: 'f-joao', situacao: 'Falta' }])), null)
conferir('alteração que repetiria não muda nada',
  [await erroDe(banco.atualizar('rdos', { id: 'rdo-serra-ontem' }, { data: rdo.data })) !== null, (await banco.ler('rdos', { id: 'rdo-serra-ontem' }))[0].data !== rdo.data],
  [true, true])

// Pela camada de dados.
reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-ubs')
const [a, b] = await Promise.all([dados.salvarRdo({ clima_manha: 'Nublado' }), dados.salvarRdo({ clima_tarde: 'Chuva leve' })])
conferir('dois toques ao mesmo tempo abrindo o diário: nenhum dá erro', [a.erro, b.erro], [null, null])
conferir('e fica um diário só', (await dados.listarDiarios()).data.filter((r) => r.data === a.data.data).length, 1)

conferir('presente em duas obras: a tela diz onde ele está',
  (await dados.marcarEfetivo('f-joao', 'Presente')).erro, 'João já está presente hoje na obra Casa Alto da Serra 4')

console.log(`${ok}/${tot} — bancoMemoria`)
process.exit(ok === tot ? 0 : 1)
