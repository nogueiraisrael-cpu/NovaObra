// Diários: ordem do histórico, números do cartão e o texto do clima.
import { ordenarDiarios, resumirDiario, situacaoDiario, textoClima, textoResponsavel } from '../src/lib/diarios.js'
import { hojeISO } from '../src/lib/datas.js'
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const lista = [{ id: 'a', data: '2026-10-29' }, { id: 'b', data: '2026-11-01' }, { id: 'c', data: '2026-09-30' }]
conferir('mais novo primeiro, virando o mês', ordenarDiarios(lista).map((r) => r.id), ['b', 'a', 'c'])
conferir('não mexe na lista original', lista.map((r) => r.id), ['a', 'b', 'c'])

const resumo = resumirDiario({
  efetivo: [{ situacao: 'Presente' }, { situacao: 'Falta' }, { situacao: 'Veio de outra obra' }, { situacao: 'Deslocado' }, { situacao: 'Atestado' }],
  frentes: [{ situacao: 'Parada' }, { situacao: 'Em execução' }, { situacao: 'Parada' }],
  fotos: [{}, {}],
})
conferir('presentes contam quem veio de outra obra; deslocado, falta e atestado não',
  [resumo.presentes, resumo.total], [2, 5])
conferir('frentes paradas do dia', [resumo.frentes_preenchidas, resumo.frentes_paradas], [3, 2])
conferir('fotos do dia', resumo.fotos, 2)
conferir('dia vazio dá zero em tudo', resumirDiario({ efetivo: [], frentes: [], fotos: [] }),
  { presentes: 0, total: 0, frentes_preenchidas: 0, frentes_paradas: 0, fotos: 0 })

const hoje = '2026-11-01'
conferir('fechado é fechado', situacaoDiario({ status: 'Fechado', data: '2026-10-30' }, hoje), 'Fechado')
conferir('aberto hoje está em andamento', situacaoDiario({ status: 'Em andamento', data: hoje }, hoje), 'Em andamento')
conferir('aberto de ontem é não fechado', situacaoDiario({ status: 'Em andamento', data: '2026-10-31' }, hoje), 'Não fechado')

conferir('clima igual o dia todo', textoClima({ clima_manha: 'Bom', clima_tarde: 'Bom' }), 'Bom')
conferir('clima que mudou', textoClima({ clima_manha: 'Bom', clima_tarde: 'Chuva forte' }), 'Bom → Chuva forte')

conferir('quem fechou', textoResponsavel({ status: 'Fechado', fechado_em: new Date(2026, 9, 30, 17, 42).toISOString(), fechado_por_nome: 'Eng. Ricardo' }),
  'Fechado em 30/10 às 17:42 por Eng. Ricardo')
conferir('aberto sem nome', textoResponsavel({ status: 'Em andamento', criado_por_nome: null }), 'Aberto, ainda não fechado')

// Bug achado na revisão: quem entrou na obra depois que o RDO abriu aparecia na
// aba Hoje mas sumia do diário fechado. Ao fechar, a linha agora é gravada.
dados._reiniciarMock()
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-ubs')
await dados.salvarRdo({ clima_manha: 'Bom' })
await dados.salvarFuncionario({ nome: 'Novato', funcao: 'Servente', obra_id: 'obra-ubs' })
const naTela = (await dados.resumoFechamento()).data
await dados.fecharRdo()
const fechado = (await dados.listarDiarios()).data.find((r) => r.data === hojeISO())
conferir('o diário fechado conta o mesmo efetivo que a tela mostrou', [fechado.presentes, fechado.total], [naTela.presentes, naTela.total])
const dia = (await dados.obterDiario(fechado.id)).data
conferir('o novato está no diário fechado', dia.efetivo.some((l) => l.nome === 'Novato'), true)
conferir('dia sem foto solta', dia.fotos_soltas, [])

console.log(`${ok}/${tot} — diarios`)
process.exit(ok === tot ? 0 : 1)
