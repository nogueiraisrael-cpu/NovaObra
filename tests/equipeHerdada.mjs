// A equipe da frente continua de um dia para o outro: já vem a do último diário, vale sozinha
// ao fechar o RDO, e dá para tirar e incluir gente direto no cartão.
import * as dados from '../src/lib/dados.js'
import { reiniciarMock } from './apoio/bancoMemoria.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const frente = async (id) => (await dados.listarFrentes()).data.find((f) => f.id === id)
const nomes = (f) => f.equipe.map((x) => x.nome)

reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')

// ---- UBS: hoje ainda não tem RDO. Ontem (diário aberto) as sapatas tinham Damião e Francisco. ----
dados.definirObraAtual('obra-ubs')
let sapatas = await frente('fs-ubs-sapatas')
conferir('a frente em execução já vem com a equipe de ontem', nomes(sapatas), ['Damião', 'Francisco'])
conferir('e avisa que é a do último diário', sapatas.equipe_herdada, true)
conferir('olhar não lança a frente', sapatas.preenchida_hoje, false)
conferir('olhar não abre o RDO de hoje', (await dados.obterRdoHoje()).data, null)
conferir('frente parada não puxa ninguém', nomes(await frente('fs-ubs-alv')), [])
const gaveta = (await dados.obterPreenchimento('fs-ubs-sapatas')).data
conferir('"Preencher frente" abre com os mesmos marcados', [...gaveta.equipe].sort(), ['f-damiao', 'f-francisco'])
conferir('e a outra frente mostra "também em"', (await dados.obterPreenchimento('fs-ubs-alv')).data.presentes.find((p) => p.id === 'f-damiao').tambem_em, ['Fundação — sapatas'])

// Quem falta hoje sai da equipe herdada; voltando a Presente, volta para ela (ninguém mexeu na frente).
await dados.marcarEfetivo('f-damiao', 'Falta')
conferir('quem falta hoje não vem na equipe', nomes(await frente('fs-ubs-sapatas')), ['Francisco'])
await dados.marcarEfetivo('f-damiao', 'Presente')
conferir('voltou a Presente, volta para a frente', nomes(await frente('fs-ubs-sapatas')), ['Damião', 'Francisco'])

conferir('o resumo de fechar conta a frente que entra sozinha', (await dados.resumoFechamento()).data.frentes_herdadas, 1)

// Tirar e incluir pelo cartão
await dados.mudarEquipeDaFrente('fs-ubs-sapatas', 'f-antonio', false)
conferir('tirar quem não está na frente não lança a frente', (await frente('fs-ubs-sapatas')).preenchida_hoje, false)
conferir('incluir quem não está presente é recusado', (await dados.mudarEquipeDaFrente('fs-ubs-sapatas', 'f-joao', true)).erro, 'Só quem está presente hoje pode entrar na equipe.')
conferir('tirar pelo cartão', (await dados.mudarEquipeDaFrente('fs-ubs-sapatas', 'f-francisco', false)).erro, null)
sapatas = await frente('fs-ubs-sapatas')
conferir('fica só o Damião', nomes(sapatas), ['Damião'])
conferir('o toque lançou a frente hoje, em execução', [sapatas.preenchida_hoje, sapatas.situacao_hoje, sapatas.equipe_herdada], [true, 'Em execução', false])
await dados.mudarEquipeDaFrente('fs-ubs-sapatas', 'f-antonio', true)
await dados.mudarEquipeDaFrente('fs-ubs-sapatas', 'f-antonio', true)
conferir('incluir duas vezes não repete', nomes(await frente('fs-ubs-sapatas')), ['Antônio', 'Damião'])
await dados.mudarEquipeDaFrente('fs-ubs-alv', 'f-severino', true)
const alv = await frente('fs-ubs-alv')
conferir('incluir em frente parada a lança parada, com o motivo dela', [alv.situacao_hoje, nomes(alv)], ['Parada', ['Severino']])

// Multi-obra: da Serra não se mexe em frente da UBS
dados.definirObraAtual('obra-serra')
conferir('da Serra não mexe em frente da UBS', (await dados.mudarEquipeDaFrente('fs-ubs-sapatas', 'f-joao', true)).erro, 'Frente não encontrada nesta obra.')
conferir('frente concluída não recebe gente', (await dados.mudarEquipeDaFrente('fs-sapatas', 'f-joao', true)).erro, 'Esta frente já foi concluída.')

// ---- Serra: a hidráulica tinha Edson e Paulo ontem; hoje Edson está deslocado e Paulo faltou. ----
conferir('ninguém da equipe de ontem veio: frente sem ninguém', nomes(await frente('fs-hidro')), [])
conferir('a frente lançada hoje mostra a equipe gravada', nomes(await frente('fs-revest')), ['João', 'Marcos', 'Tiago'])
await dados.marcarEfetivo('f-paulo', 'Presente')
conferir('Paulo chegou: volta para a frente de ontem', nomes(await frente('fs-hidro')), ['Paulo'])

// Vale sozinha: fechar o RDO grava a equipe herdada em que ninguém mexeu.
conferir('fecha o RDO', (await dados.fecharRdo()).erro, null)
const hidro = await frente('fs-hidro')
conferir('ao fechar, a equipe herdada ficou gravada', [hidro.preenchida_hoje, hidro.situacao_hoje, nomes(hidro), hidro.equipe_herdada], [true, 'Em execução', ['Paulo'], false])
conferir('frente parada continua sem lançamento', (await frente('fs-imper')).preenchida_hoje, false)
conferir('fechar de novo não repete nada', (await dados.fecharRdo()).erro, null)
conferir('e a equipe segue a mesma', nomes(await frente('fs-hidro')), ['Paulo'])

console.log(`${ok}/${tot} — equipe herdada`)
process.exit(ok === tot ? 0 : 1)
