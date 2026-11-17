// Diários: ordem do histórico, números do cartão e o texto do clima.
import {
  ordenarDiarios, resumirDiario, situacaoDiario, textoClima, textoResponsavel, planejarCorrecao, semanaDe, idsNoIntervalo, resumirPeriodo, escolhaInicial,
  validarDiaEsquecido, diaEsquecidoSugerido, equipamentosNoDia, ultimoDiaEsquecido, frentesQueSaem,
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
  [{ id: 'rf1', descricao: 'Reboco', mudouDescricao: false, motivo_parada: null, mudouSituacao: false, entra: [], sai: ['a'] }])
conferir('na equipe só entra quem estava presente', plan({ efetivo: { l2: 'Presente' }, frentes: { rf1: { descricao: 'Reboco', equipe: ['a', 'b', 'c', 'b'] } } }).frentes[0].entra, ['b'])
conferir('texto da frente corrigido', plan({ frentes: { rf1: { descricao: 'Reboco interno', equipe: ['a'] } } }).frentes,
  [{ id: 'rf1', descricao: 'Reboco interno', mudouDescricao: true, motivo_parada: null, mudouSituacao: false, entra: [], sai: [] }])

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

// ---- Lançar dia esquecido: regra pura ----
const h = '2026-11-17'
conferir('dia esquecido: sem data', validarDiaEsquecido('', h, []), 'Escolha a data do dia esquecido.')
conferir('dia esquecido: hoje é na aba Hoje', validarDiaEsquecido(h, h, []), 'O diário de hoje se lança na aba Hoje.')
conferir('dia esquecido: amanhã ainda não chegou', validarDiaEsquecido('2026-11-18', h, []), 'Esse dia ainda não chegou.')
conferir('dia esquecido: dia que já tem diário', validarDiaEsquecido('2026-11-16', h, ['2026-11-16']), '16/11 já tem diário: abra ele na lista para corrigir.')
conferir('dia esquecido: ontem sem diário passa', validarDiaEsquecido('2026-11-16', h, ['2026-11-15']), null)
conferir('sugere ontem quando falta ontem', diaEsquecidoSugerido(h, ['2026-11-15']), '2026-11-16')
conferir('sugere o buraco mais novo da semana', diaEsquecidoSugerido(h, ['2026-11-16', '2026-11-15', '2026-11-13']), '2026-11-14')
const semana = Array.from({ length: 7 }, (_, i) => somarDias(h, -(i + 1)))
conferir('o campo vai até ontem', ultimoDiaEsquecido(h), '2026-11-16')
conferir('equipamento que chegou depois do dia fica de fora; no mesmo dia e sem data entram',
  equipamentosNoDia([{ id: 'a', situacao_desde: '2026-11-10' }, { id: 'b', situacao_desde: '2026-11-16' }, { id: 'c', situacao_desde: '2026-11-17' }, { id: 'd' }], '2026-11-16').map((e) => e.id),
  ['a', 'b', 'd'])
conferir('semana toda lançada: sugere ontem', diaEsquecidoSugerido(h, semana), '2026-11-16')

// ---- Lançar dia esquecido: no banco em memória ----
// A Serra perde o diário de anteontem; ele é lançado de novo pela aba Diários.
const bancoEsq = criarBancoMemoria()
dados._usarBancoDeTeste(bancoEsq)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')
const anteontem = somarDias(hojeISO(), -2)
const rfsVelhas = await bancoEsq.ler('rdo_frentes', { rdo_id: 'rdo-serra-2' })
await bancoEsq.apagar('rdo_frente_equipe', { rdo_frente_id: rfsVelhas.map((rf) => rf.id) })
for (const t of ['rdo_frentes', 'rdo_efetivo', 'rdo_equipamentos', 'fotos']) await bancoEsq.apagar(t, { rdo_id: 'rdo-serra-2' })
await bancoEsq.apagar('rdos', { id: 'rdo-serra-2' })
const lancado = await dados.lancarDiaEsquecido(anteontem)
conferir('dia esquecido abre sem erro, aberto', [lancado.erro, lancado.data?.data, lancado.data?.status], [null, anteontem, 'Em andamento'])
const diaEsq = (await dados.obterDiario(lancado.data.id)).data
const lotadosSerra = (await dados.listarPessoas()).data.daObra.filter((f) => f.ativo).length
conferir('efetivo: todos os lotados, presentes', [diaEsq.total, diaEsq.presentes], [lotadosSerra, lotadosSerra])
conferir('equipamentos que já estavam na obra, operando', diaEsq.equipamentos.map((e) => [e.nome, e.situacao]).sort(),
  [['Andaime tubular 12 m', 'Operando'], ['Betoneira 400 L', 'Operando']])
const revest = diaEsq.frentes.find((f) => f.frente_id === 'fs-revest')
conferir('frente em execução herda a equipe do diário anterior (3 dias atrás)', [revest?.situacao, revest?.equipe_ids.sort()], ['Em execução', ['f-joao', 'f-marcos', 'f-tiago']])
conferir('frente parada não entra sozinha', diaEsq.frentes.some((f) => f.frente_id === 'fs-reboco'), false)
conferir('aparece na lista como Não fechado', situacaoDiario((await dados.listarDiarios()).data.find((r) => r.data === anteontem), hojeISO()), 'Não fechado')
conferir('lançar de novo o mesmo dia é recusado', (await dados.lancarDiaEsquecido(anteontem)).erro, `${formatarDiaMes(anteontem)} já tem diário: abra ele na lista para corrigir.`)
conferir('hoje não se lança por aqui', (await dados.lancarDiaEsquecido(hojeISO())).erro, 'O diário de hoje se lança na aba Hoje.')
const muitoAntes = somarDias(hojeISO(), -20)
const velhoEsq = await dados.lancarDiaEsquecido(muitoAntes)
conferir('equipamento que chegou depois daquele dia fica de fora', (await dados.obterDiario(velhoEsq.data.id)).data.equipamentos.map((e) => e.nome), ['Betoneira 400 L'])
dados.definirObraAtual('obra-ubs')
const ubsEsq = await dados.lancarDiaEsquecido(anteontem)
const diaUbsEsq = (await dados.obterDiario(ubsEsq.data.id)).data
conferir('na UBS o mesmo dia é outro diário, só com gente e coisa da UBS',
  [ubsEsq.erro, diaUbsEsq.efetivo.some((l) => l.funcionario_id === 'f-joao'), diaUbsEsq.equipamentos], [null, false, []])

// ---- Correção com frente nova, situação da frente e equipamentos: regra pura ----
const ctx = (pedido, extra = {}) => planejarCorrecao({
  linhas: linhasEf, frentes: [{ id: 'rf1', frente_id: 'fA', situacao: 'Em execução', motivo_parada: null, descricao: 'Reboco' }],
  equipeAtual: { rf1: ['a'] }, frentesDaObra: ['fA', 'fB'], equipamentosPossiveis: ['eq1', 'eq2'],
  linhasEquip: [{ id: 'le1', equipamento_id: 'eq1', situacao: 'Operando', observacao: '' }, { id: 'le9', equipamento_id: 'eq9', situacao: 'Concluído', observacao: 'Fim' }],
  podeTirarFrente: true, comFoto: [], pedido: { ...base, ...pedido }, ...extra,
})
conferir('frente vira Parada sem motivo: recusa', ctx({ frentes: { rf1: { descricao: 'Reboco', situacao: 'Parada' } } }).erro, 'Escolha o motivo da parada.')
conferir('frente vira Parada com motivo', ctx({ frentes: { rf1: { descricao: 'Reboco', situacao: 'Parada', motivo_parada: 'Chuva' } } }).frentes.map((x) => [x.situacao, x.motivo_parada, x.mudouSituacao]),
  [['Parada', 'Chuva', true]])
conferir('frente nova entra com equipe só de presentes', ctx({ frentes_novas: [{ frente_id: 'fB', situacao: 'Em execução', descricao: 'Forro', equipe: ['a', 'b'] }] }).frentesNovas,
  [{ frente_id: 'fB', situacao: 'Em execução', motivo_parada: null, descricao: 'Forro', equipe: ['a'] }])
conferir('frente de outra obra é recusada', ctx({ frentes_novas: [{ frente_id: 'fZ', situacao: 'Em execução' }] }).erro, 'Frente não encontrada nesta obra.')
conferir('frente "nova" que já está no dia vira edição (repetir completa)',
  [ctx({ frentes_novas: [{ frente_id: 'fA', situacao: 'Concluída', descricao: 'Fim', equipe: ['a'] }] }).frentesNovas, ctx({ frentes_novas: [{ frente_id: 'fA', situacao: 'Concluída', descricao: 'Fim', equipe: ['a'] }] }).frentes[0].situacao],
  [[], 'Concluída'])
conferir('tirar frente: só quem pode', ctx({ frentes_tiradas: ['rf1'] }, { podeTirarFrente: false }).erro, 'Só o Engenheiro tira frente do diário, e só de dia não fechado.')
conferir('tirar frente com foto: recusa', ctx({ frentes_tiradas: ['rf1'] }, { comFoto: ['rf1'] }).erro, 'Esta frente tem foto neste dia: ela não sai do diário.')
conferir('tirar frente: sai e não é editada', [ctx({ frentes_tiradas: ['rf1'], efetivo: { l1: 'Falta' } }).frentesTiradas, ctx({ frentes_tiradas: ['rf1'], efetivo: { l1: 'Falta' } }).frentes], [['rf1'], []])
conferir('tirar frente que já saiu é ignorado', ctx({ frentes_tiradas: ['rf8'] }).frentesTiradas, [])
conferir('equipamento muda de situação com observação', ctx({ equipamentos: { le1: { situacao: 'Quebrado', observacao: 'Motor' } } }).equipamentos, [{ id: 'le1', situacao: 'Quebrado', observacao: 'Motor' }])
conferir('Operando não leva observação', ctx({ equipamentos: { le1: { situacao: 'Operando', observacao: 'sobrou' } } }).equipamentos, [])
conferir('frente tirada que já saiu: a edição dela é ignorada; a de outro diário, não',
  [ctx({ frentes_tiradas: ['rf7'], frentes: { rf7: { descricao: '' } } }).erro, ctx({ frentes: { rf7: { descricao: '' } } }).erro], [undefined, 'Frente não está neste diário.'])
conferir('frentes que dá para tirar: só sem foto, e só quem pode', [frentesQueSaem([{ id: 'r1' }, { id: 'r2' }], ['r2'], true), frentesQueSaem([{ id: 'r1' }], [], false)], [['r1'], []])
conferir('Concluído não se corrige', ctx({ equipamentos: { le9: { situacao: 'Operando', observacao: '' } } }).erro, 'O Concluído não se corrige por aqui: só Operando, Parado e Quebrado.')
conferir('Concluído não sai do diário', ctx({ equipamentos_tirados: ['le9'] }).erro, 'Equipamento concluído não sai do diário por aqui.')
conferir('equipamento novo entra; o de fora da lista é recusado',
  [ctx({ equipamentos_novos: [{ equipamento_id: 'eq2', situacao: 'Parado', observacao: 'Chuva' }] }).equipamentosNovos, ctx({ equipamentos_novos: [{ equipamento_id: 'eq7', situacao: 'Operando' }] }).erro],
  [[{ equipamento_id: 'eq2', situacao: 'Parado', observacao: 'Chuva' }], 'Esse equipamento não pode entrar neste diário.'])
conferir('equipamento "novo" que já está no dia vira edição', ctx({ equipamentos_novos: [{ equipamento_id: 'eq1', situacao: 'Parado', observacao: 'x' }] }).equipamentos,
  [{ id: 'le1', situacao: 'Parado', observacao: 'x' }])

// ---- Correção completa do dia esquecido, no banco em memória ----
dados._usarBancoDeTeste(bancoEsq)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')
const op = (await dados.opcoesDaCorrecao(lancado.data.id)).data
conferir('opções: frentes que não estão no dia e equipamentos da obra ou do depósito que não estão nele',
  [op.frentes.some((x) => x.id === 'fs-reboco'), op.frentes.some((x) => x.id === 'fs-revest'), op.equipamentos.map((e) => e.id), op.frentes_que_saem.length > 0],
  [true, false, ['e-fachadeiro'], true])
const antesEsq = (await dados.obterDiario(lancado.data.id)).data
const rfRevest = antesEsq.frentes.find((x) => x.frente_id === 'fs-revest')
const rfTirar = antesEsq.frentes.find((x) => x.frente_id === 'fs-hidro')
conferir('o dia esquecido tinha a hidráulica (para tirar)', Boolean(rfTirar), true)
const linhaBetoneira = antesEsq.equipamentos.find((e) => e.nome.startsWith('Betoneira'))
const linhaAndaime = antesEsq.equipamentos.find((e) => e.nome.startsWith('Andaime'))
const pedidoEsq = {
  ...pedidoBase,
  // Como a tela manda: todas as linhas do dia, também as que pediu para tirar.
  frentes: {
    ...Object.fromEntries(antesEsq.frentes.map((x) => [x.id, { descricao: x.descricao, equipe: x.equipe_ids, situacao: x.situacao, motivo_parada: x.motivo_parada }])),
    [rfRevest.id]: { descricao: 'Rejunte da suíte', equipe: rfRevest.equipe_ids, situacao: 'Parada', motivo_parada: 'Chuva' },
  },
  frentes_novas: [{ frente_id: 'fs-reboco', situacao: 'Em execução', motivo_parada: null, descricao: 'Chapisco', equipe: ['f-paulo'] }],
  frentes_tiradas: [rfTirar.id],
  equipamentos: {
    ...Object.fromEntries(antesEsq.equipamentos.map((e) => [e.id, { situacao: e.situacao, observacao: e.observacao }])),
    [linhaAndaime.id]: { situacao: 'Parado', observacao: 'Chuva' },
  },
  equipamentos_novos: [{ equipamento_id: 'e-fachadeiro', situacao: 'Operando', observacao: '' }],
  equipamentos_tirados: [linhaBetoneira.id],
}
conferir('correção completa grava sem erro', (await dados.corrigirDiario(lancado.data.id, pedidoEsq)).erro, null)
conferir('repetir a mesma correção (o que foi tirado já saiu) não dá erro nem duplica', (await dados.corrigirDiario(lancado.data.id, pedidoEsq)).erro, null)
const depoisEsq = (await dados.obterDiario(lancado.data.id)).data
const fr = (id) => depoisEsq.frentes.filter((x) => x.frente_id === id)
conferir('revestimento ficou Parada por chuva, com o texto novo', fr('fs-revest').map((x) => [x.situacao, x.motivo_parada, x.descricao]), [['Parada', 'Chuva', 'Rejunte da suíte']])
conferir('reboco entrou uma vez só, com o Paulo', fr('fs-reboco').map((x) => [x.situacao, x.descricao, x.equipe_ids]), [['Em execução', 'Chapisco', ['f-paulo']]])
conferir('hidráulica saiu do dia', fr('fs-hidro'), [])
conferir('equipamentos: betoneira saiu, andaime parado, fachadeiro entrou uma vez',
  depoisEsq.equipamentos.map((e) => [e.nome, e.situacao, e.observacao]).sort(),
  [['Andaime fachadeiro 30 m', 'Operando', ''], ['Andaime tubular 12 m', 'Parado', 'Chuva']])
const frentesObraAntes = (await dados.listarFrentes()).data
conferir('dia não fechado: a lista de frentes da obra ainda não muda', frentesObraAntes.find((x) => x.id === 'fs-reboco').situacao, 'Parada')

// Dia já fechado: mudar a situação vai para a lista de frentes da obra (ninguém mais novo decidiu).
const rfHidro = (await dados.obterDiario('rdo-serra-ontem')).data.frentes.find((x) => x.frente_id === 'fs-hidro')
const fechadoOntem = await dados.corrigirDiario('rdo-serra-ontem', { ...pedidoBase, frentes: { [rfHidro.id]: { descricao: rfHidro.descricao, equipe: rfHidro.equipe_ids, situacao: 'Concluída' } } })
const hidro = (await dados.listarFrentes()).data.find((x) => x.id === 'fs-hidro')
conferir('dia fechado: a frente concluída na correção fica Concluída na obra', [fechadoOntem.erro, hidro.situacao, hidro.data_conclusao], [null, 'Concluída', ontem])
const vivaDeNovo = await dados.corrigirDiario('rdo-serra-ontem', { ...pedidoBase, frentes: { [rfHidro.id]: { descricao: rfHidro.descricao, equipe: rfHidro.equipe_ids, situacao: 'Em execução' } } })
const hidro2 = (await dados.listarFrentes()).data.find((x) => x.id === 'fs-hidro')
conferir('voltar para Em execução limpa a data de conclusão', [vivaDeNovo.erro, hidro2.situacao, hidro2.data_conclusao], [null, 'Em execução', null])
conferir('dia fechado: tirar frente é recusado', (await dados.corrigirDiario('rdo-serra-ontem', { ...pedidoBase, frentes_tiradas: [rfHidro.id] })).erro,
  'Só o Engenheiro tira frente do diário, e só de dia não fechado.')

console.log(`${ok}/${tot} — diarios`)
process.exit(ok === tot ? 0 : 1)
