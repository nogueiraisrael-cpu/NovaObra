// Diários: ordem do histórico, números do cartão e o texto do clima.
import {
  ordenarDiarios, resumirDiario, situacaoDiario, textoClima, textoResponsavel, planejarCorrecao, semanaDe, idsNoIntervalo, resumirPeriodo, escolhaInicial,
} from '../src/lib/diarios.js'
import { hojeISO, somarDias, formatarDiaMes, formatarDiaCurto } from '../src/lib/datas.js'
import * as dados from '../src/lib/dados.js'
import { reiniciarMock, criarBancoMemoria } from './apoio/bancoMemoria.js'

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
reiniciarMock(dados)
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

// ---- Corrigir dia que já passou: regra pura ----
const linhasEf = [
  { id: 'l1', funcionario_id: 'a', situacao: 'Presente' },
  { id: 'l2', funcionario_id: 'b', situacao: 'Falta' },
  { id: 'l3', funcionario_id: 'c', situacao: 'Deslocado' },
]
const rfs = [{ id: 'rf1', descricao: 'Reboco' }]
const base = { clima_manha: 'Bom', clima_tarde: 'Nublado', praticavel_manha: true, praticavel_tarde: false, observacoes: 'ok' }
const plan = (pedido, equipeAtual = { rf1: ['a'] }) => planejarCorrecao({ linhas: linhasEf, frentes: rfs, equipeAtual, pedido: { ...base, ...pedido } })
conferir('clima fora da lista é recusado', plan({ clima_manha: 'Sol' }).erro, 'Escolha o clima da manhã e da tarde.')
conferir('sem mudança, nada no efetivo nem nas frentes', [plan({}).efetivo, plan({}).frentes], [[], []])
conferir('o dia sempre regrava clima e ocorrências', plan({ observacoes: 'Choveu às 15h' }).rdo.observacoes, 'Choveu às 15h')
conferir('Falta vira Presente e conta para a trava', [plan({ efetivo: { l2: 'Presente' } }).efetivo, plan({ efetivo: { l2: 'Presente' } }).viraramPresenca],
  [[{ id: 'l2', situacao: 'Presente' }], ['b']])
conferir('Deslocado não se corrige aqui', plan({ efetivo: { l3: 'Presente' } }).erro, 'Deslocamento entre obras não se corrige aqui: só Presente, Falta e Atestado.')
conferir('nem se marca Deslocado', plan({ efetivo: { l1: 'Deslocado' } }).erro, 'Deslocamento entre obras não se corrige aqui: só Presente, Falta e Atestado.')
conferir('linha de outro diário é recusada', plan({ efetivo: { x9: 'Falta' } }).erro, 'Funcionário não está neste diário.')
conferir('frente de outro diário é recusada', plan({ frentes: { rf9: { descricao: '' } } }).erro, 'Frente não está neste diário.')
conferir('quem vira Falta sai da equipe da frente', plan({ efetivo: { l1: 'Falta' } }).frentes,
  [{ id: 'rf1', descricao: 'Reboco', mudouDescricao: false, entra: [], sai: ['a'] }])
conferir('na equipe só entra quem estava presente', plan({ efetivo: { l2: 'Presente' }, frentes: { rf1: { descricao: 'Reboco', equipe: ['a', 'b', 'c', 'b'] } } }).frentes[0].entra, ['b'])
conferir('texto da frente corrigido', plan({ frentes: { rf1: { descricao: 'Reboco interno', equipe: ['a'] } } }).frentes,
  [{ id: 'rf1', descricao: 'Reboco interno', mudouDescricao: true, entra: [], sai: [] }])

// ---- Resumo de vários dias ----
conferir('dia curto da tabela', formatarDiaCurto('2026-10-31'), 'Sáb 31/10')
conferir('semana de uma quarta: segunda a domingo', semanaDe('2026-11-04'), { de: '2026-11-02', ate: '2026-11-08' })
conferir('semana passada de um domingo', semanaDe('2026-11-08', -1), { de: '2026-10-26', ate: '2026-11-01' })
conferir('resumo abre com esta semana quando ela tem diário', escolhaInicial(lista, '2026-10-01'), ['c'])
conferir('segunda sem diário ainda: abre com a semana passada', escolhaInicial([{ id: 'x', data: '2026-11-06' }], '2026-11-09'), ['x'])
conferir('dias no intervalo, inclusive as pontas', idsNoIntervalo(lista, { de: '2026-10-29', ate: '2026-11-01' }), ['a', 'b'])
const diaR = (data, extra) => ({
  id: data, data, status: 'Fechado', clima_manha: 'Bom', clima_tarde: 'Bom', praticavel_manha: true, praticavel_tarde: true, observacoes: '',
  presentes: 4, total: 5, frentes_paradas: 0, efetivo: [{ situacao: 'Falta' }], frentes: [], ...extra,
})
const per = resumirPeriodo([
  diaR('2026-11-03', { praticavel_tarde: false, clima_tarde: 'Chuva forte', presentes: 3, frentes: [{ frente_id: 'f1', nome: 'Reboco', etapa: 'Revestimento', situacao: 'Parada', motivo_parada: 'Chuva', descricao: '' }] }),
  diaR('2026-11-02', { status: 'Em andamento', frentes: [{ frente_id: 'f1', nome: 'Reboco', etapa: 'Revestimento', situacao: 'Em execução', motivo_parada: null, descricao: 'Fachada norte' }] }),
])
conferir('resumo do mais antigo ao mais novo', per.linhas.map((l) => [l.data, l.clima, l.praticavel, l.texto_praticavel]), [['2026-11-02', 'Bom', true, 'Sim'], ['2026-11-03', 'Bom → Chuva forte', false, 'Tarde não']])
conferir('totais do período', per.totais, { dias: 2, media_presentes: 3.5, faltas: 2, dias_nao_praticaveis: 1, nao_fechados: 1 })
conferir('cada frente com os seus dias', per.frentes.map((f) => [f.nome, f.dias.map((x) => x.situacao)]), [['Reboco', ['Em execução', 'Parada']]])
conferir('período vazio', resumirPeriodo([]).totais, { dias: 0, media_presentes: 0, faltas: 0, dias_nao_praticaveis: 0, nao_fechados: 0 })

// ---- Corrigir dia que já passou: no banco em memória ----
reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')
const serra = (await dados.listarDiarios()).data
const doisDias = serra.find((r) => r.id === 'rdo-serra-2')
const antes2 = (await dados.obterDiario(doisDias.id)).data
const tiago = antes2.efetivo.find((l) => l.funcionario_id === 'f-tiago')
const frente2 = antes2.frentes[0]
const pedidoBase = { clima_manha: 'Chuva leve', clima_tarde: 'Bom', praticavel_manha: false, praticavel_tarde: true, observacoes: 'Corrigido: choveu de manhã' }
const r1 = await dados.corrigirDiario(doisDias.id, {
  ...pedidoBase, efetivo: { [tiago.id]: 'Presente' },
  frentes: { [frente2.id]: { descricao: 'Texto corrigido', equipe: [...frente2.equipe_ids, 'f-tiago'] } },
})
conferir('correção grava sem erro', r1.erro, null)
const depois2 = (await dados.obterDiario(doisDias.id)).data
conferir('clima, praticável e ocorrências corrigidos', [depois2.clima_manha, depois2.praticavel_manha, depois2.observacoes], ['Chuva leve', false, 'Corrigido: choveu de manhã'])
conferir('Tiago virou Presente', depois2.efetivo.find((l) => l.funcionario_id === 'f-tiago').situacao, 'Presente')
conferir('Tiago entrou na equipe e o texto mudou', [depois2.frentes[0].equipe_ids.includes('f-tiago'), depois2.frentes[0].descricao], [true, 'Texto corrigido'])
conferir('continua fechado, com o mesmo fechamento', [depois2.status, depois2.fechado_em], [antes2.status, antes2.fechado_em])
const r2 = await dados.corrigirDiario(doisDias.id, { ...pedidoBase, efetivo: { [tiago.id]: 'Falta' } })
conferir('Falta de novo tira da equipe', [r2.erro, (await dados.obterDiario(doisDias.id)).data.frentes[0].equipe_ids.includes('f-tiago')], [null, false])
const hojeSerra = serra.find((r) => r.data === hojeISO())
conferir('o de hoje se corrige na aba Hoje', (await dados.corrigirDiario(hojeSerra.id, pedidoBase)).erro, 'O diário de hoje se corrige na aba Hoje.')
dados.definirObraAtual('obra-ubs')
conferir('da UBS não corrige diário da Serra', (await dados.corrigirDiario(doisDias.id, pedidoBase)).erro, 'Diário não encontrado nesta obra.')
const ubsOntem = (await dados.listarDiarios()).data.find((r) => r.id === 'rdo-ubs-ontem')
conferir('resumo da UBS ignora id da Serra', (await dados.obterDiarios([ubsOntem.id, doisDias.id])).data.map((d) => d.id), [ubsOntem.id])
conferir('resumo só com id de outra obra', (await dados.obterDiarios([doisDias.id])).erro, 'Escolha pelo menos um diário desta obra.')

// Trava de duas obras no dia que passou: Cícero faltou na UBS ontem, mas estava presente na Serra.
const banco = criarBancoMemoria()
dados._usarBancoDeTeste(banco)
await dados.entrar('eng@novaobra.test', 'x')
const ontem = somarDias(hojeISO(), -1)
await banco.inserir('rdo_efetivo', [{ rdo_id: 'rdo-serra-ontem', obra_id: 'obra-serra', data: ontem, funcionario_id: 'f-cicero', situacao: 'Presente', obra_destino_id: null }])
dados.definirObraAtual('obra-ubs')
const cicero = (await dados.obterDiario('rdo-ubs-ontem')).data.efetivo.find((l) => l.funcionario_id === 'f-cicero')
const travado = await dados.corrigirDiario('rdo-ubs-ontem', { ...pedidoBase, efetivo: { [cicero.id]: 'Presente' } })
conferir('trava: presente em outra obra naquele dia', travado.erro, `${cicero.nome} já está presente em ${formatarDiaMes(ontem)} na obra Casa Alto da Serra 4`)
conferir('e nada foi gravado', (await dados.obterDiario('rdo-ubs-ontem')).data.clima_manha !== 'Chuva leve', true)
conferir('Atestado no lugar da Falta passa', (await dados.corrigirDiario('rdo-ubs-ontem', { ...pedidoBase, efetivo: { [cicero.id]: 'Atestado' } })).erro, null)

// ---- Fechar dia anterior que ficou "Não fechado" ----
reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-ubs')
const antesUbs = (await dados.obterDiario('rdo-ubs-ontem')).data
conferir('o de ontem da UBS está aberto', antesUbs.status, 'Em andamento')
const fechou = await dados.fecharDiaAnterior('rdo-ubs-ontem')
const depoisUbs = (await dados.obterDiario('rdo-ubs-ontem')).data
conferir('fechar dia anterior: vira Fechado, com quem fechou', [fechou.erro, depoisUbs.status, Boolean(depoisUbs.fechado_em), depoisUbs.fechado_por_nome !== null], [null, 'Fechado', true, true])
conferir('o efetivo daquele dia fica como foi lançado', depoisUbs.efetivo.map((l) => [l.nome, l.situacao]), antesUbs.efetivo.map((l) => [l.nome, l.situacao]))
conferir('fechar de novo não dá erro nem muda o carimbo', [(await dados.fecharDiaAnterior('rdo-ubs-ontem')).erro, (await dados.obterDiario('rdo-ubs-ontem')).data.fechado_em], [null, depoisUbs.fechado_em])
conferir('não fecha o de outra obra', (await dados.fecharDiaAnterior('rdo-serra-2')).erro, 'Diário não encontrado nesta obra.')
dados.definirObraAtual('obra-serra')
conferir('o de hoje se fecha na aba Hoje', (await dados.fecharDiaAnterior('rdo-serra-hoje')).erro, 'O diário de hoje se fecha na aba Hoje.')

// Fechar atrasado um dia velho da Serra: o Reboco foi dado como Concluído nele, mas os diários
// fechados mais novos (até anteontem) dizem Parada. A frente continua Parada.
const bancoVelho = criarBancoMemoria()
dados._usarBancoDeTeste(bancoVelho)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')
const diaVelho = somarDias(hojeISO(), -10)
const [velho] = await bancoVelho.inserir('rdos', [{ obra_id: 'obra-serra', data: diaVelho, clima_manha: 'Bom', clima_tarde: 'Bom', praticavel_manha: true, praticavel_tarde: true, observacoes: '', status: 'Em andamento', criado_por: null }])
await bancoVelho.inserir('rdo_frentes', [{ rdo_id: velho.id, obra_id: 'obra-serra', frente_id: 'fs-reboco', situacao: 'Concluída', motivo_parada: null, descricao: '' }])
const rebocoAntes = (await dados.listarFrentes()).data.find((x) => x.id === 'fs-reboco')
conferir('fechar o dia velho dá certo', (await dados.fecharDiaAnterior(velho.id)).erro, null)
const rebocoDepois = (await dados.listarFrentes()).data.find((x) => x.id === 'fs-reboco')
conferir('frente decidida por diário fechado mais novo não volta atrás', [rebocoDepois.situacao, rebocoDepois.motivo_parada], [rebocoAntes.situacao, rebocoAntes.motivo_parada])

console.log(`${ok}/${tot} — diarios`)
process.exit(ok === tot ? 0 : 1)
