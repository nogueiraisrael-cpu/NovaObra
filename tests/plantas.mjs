// Gestão à Vista: lotes, legenda, histórico, resumo do período, ordem de pavimento e a camada de
// dados (avançar sem apagar, apagar planta leva as marcações, uma obra não mexe na outra).
import {
  normalizarLote, chaveDoLote, lotesDoDia, resumoDoLote, qtdDe, lerNumero, etapasComLegado, marcacoesAtuais, marcacoesNaTela,
  legendaDasEtapas, avancoDe, historicoDaPeca, intervaloDoPeriodo, moverPeriodo, resumoDoPeriodo, agruparPorPavimento,
  ordenarPecas, validarEtapa, trocaDeOrdemEtapa, extrasDaMarcacao, validarMarcacao, corDaMarcacao, PALETA_LOTES, PALETA_ETAPAS,
  coresDosLotes, corPorLote, COR_SEM_LOTE, pedeQuantidade, conferirMarcacao, limparRotulo,
} from '../src/lib/plantas.js'
import { UNIDADES_ETAPA } from '../src/lib/listas.js'
import * as dados from '../src/lib/dados.js'
import { reiniciarMock } from './apoio/bancoMemoria.js'
import { hojeISO, somarDias } from '../src/lib/datas.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// ── Lotes ──────────────────────────────────────────────────────────────────────
conferir('placa escrita de dois jeitos vira uma só', [normalizarLote('bt 1111'), normalizarLote('BT-1111')], ['BT1111', 'BT1111'])
conferir('lote vazio é null', normalizarLote('  - '), null)
conferir('a nota manda na identidade', chaveDoLote({ lote: 'BT1111', nota: 'nf 501' }), 'NF501')
conferir('sem nota, vale a placa', chaveDoLote({ lote: 'bt-1111' }), 'BT1111')

const dia = '2026-11-16'
const m = (id, extra) => ({ id, etapa: 'Concretado', cor: '#3DC28C', data: dia, rotulo: null, quantidade: null, substitui: null, created_at: `${dia}T10:00:00Z`, ...extra })
const doDia = [
  m('a', { lote: 'BT2222', nota: '9', rotulo: 'P10', created_at: `${dia}T09:00:00Z`, quantidade: 2 }),
  m('b', { lote: 'BT1111', nota: '501', rotulo: 'P2', created_at: `${dia}T10:00:00Z`, quantidade: 1.5 }),
  m('c', { lote: 'bt-1111', nota: 'NF 502', rotulo: 'P3', created_at: `${dia}T11:00:00Z` }),
  m('d', { lote: 'BT1111', nota: '501', rotulo: 'P1', created_at: `${dia}T12:00:00Z`, quantidade: 1 }),
  m('e', { lote: 'BT9', data: '2026-11-15', created_at: '2026-11-15T08:00:00Z' }),
]
const lotes = lotesDoDia(doDia, dia)
conferir('mesma placa em notas diferentes = dois lotes', lotes.map((l) => l.chave), ['9', '501', 'NF502'])
conferir('ordem de chegada, não alfabética, e paleta própria', lotes.map((l) => l.cor), PALETA_LOTES.slice(0, 3))
conferir('lote de outro dia não entra', lotes.some((l) => l.lote === 'BT9'), false)
conferir('o que o caminhão fez: peças em ordem natural', resumoDoLote(lotes[1]), {
  chave: '501', data: dia, lote: 'BT1111', nota: '501', cor: PALETA_LOTES[1], pecas: 2, quantidade: 2.5, nomes: ['P1', 'P2'],
})
conferir('cor escolhida à mão ganha da paleta', lotesDoDia([m('x', { nota: '1', lote_cor: '#123456' })], dia)[0].cor, '#123456')
const onze = Array.from({ length: 11 }, (_, i) => m(`l${i}`, { nota: String(i + 1), created_at: `${dia}T0${Math.floor(i / 10)}:${String(i).padStart(2, '0')}:00Z` }))
conferir('passando de 10 lotes, a paleta reinicia', lotesDoDia(onze, dia)[10].cor, PALETA_LOTES[0])
conferir('paleta dos lotes é diferente da das etapas', PALETA_LOTES.some((c) => PALETA_ETAPAS.includes(c)), false)

// ── Quantidade ─────────────────────────────────────────────────────────────────
conferir('quantidade vazia vale 1', qtdDe({ quantidade: null }), 1)
conferir('quantidade lançada vale ela', qtdDe({ quantidade: '2.5' }), 2.5)
conferir('lê vírgula', lerNumero('1,5'), 1.5)
conferir('lê vazio como null', lerNumero(''), null)
conferir('não lê texto', lerNumero('abc'), null)

// ── Etapas, avanço e histórico ───────────────────────────────────────────────────
const etapas = [
  { id: 'e2', nome: 'Forma', cor: '#9B6BD6', ordem: 1, unidade: 'un', meta: null },
  { id: 'e1', nome: 'Escavado', cor: '#F2B23E', ordem: 0, unidade: 'un', meta: 4 },
  { id: 'e3', nome: 'Concretado', cor: '#3DC28C', ordem: 2, unidade: 'm³', meta: 10 },
]
const peca = [
  m('p1', { etapa: 'Escavado', data: '2026-11-03', rotulo: 'P12', planta_id: 'pl', tipo: 'ret', pontos: { x: 1, y: 2, w: 3, h: 4 }, rotacao: 0, espessura: 2, created_at: '2026-11-03T10:00:00Z' }),
  m('p2', { etapa: 'Forma', data: '2026-11-05', rotulo: 'P12', substitui: 'p1', created_at: '2026-11-05T10:00:00Z' }),
  m('p3', { etapa: 'Concretado', data: '2026-11-08', rotulo: 'P12', substitui: 'p2', quantidade: 3, created_at: '2026-11-08T10:00:00Z' }),
  m('q1', { etapa: 'Escavado', data: '2026-11-08', rotulo: 'P2', created_at: '2026-11-08T11:00:00Z' }),
  m('v1', { etapa: 'Viga velha', cor: '#000000', data: '2026-11-01', rotulo: 'V1', created_at: '2026-11-01T10:00:00Z' }),
]
const comLegado = etapasComLegado(etapas, peca)
conferir('etapas por ordem e a apagada vira legado no fim', comLegado.map((e) => [e.nome, e.ativa !== false]), [
  ['Escavado', true], ['Forma', true], ['Concretado', true], ['Viga velha', false],
])
conferir('estado atual: só quem ninguém substituiu', marcacoesAtuais(peca).map((x) => x.id).sort(), ['p3', 'q1', 'v1'])
conferir('ocultar Concretado mostra a peça como estava (Forma)', marcacoesNaTela(peca, new Set(['Concretado'])).map((x) => x.id).sort(), ['p2', 'q1', 'v1'])
const leg = legendaDasEtapas(comLegado, peca, '2026-11-08')
conferir('legenda: Escavado conta as duas escavações, 1 hoje, 1 na planta agora, 50% da meta',
  (({ total, hoje, agora, pct }) => ({ total, hoje, agora, pct }))(leg[0]), { total: 2, hoje: 1, agora: 1, pct: 50 })
conferir('legenda: Concretado em m³ soma a quantidade', [leg[2].total, leg[2].pct], [3, 30])

const extras = extrasDaMarcacao({ etapa: etapas[1], data: '2026-11-09' })
conferir('avançar para a mesma etapa é recusado', avancoDe(peca[0], extras).erro, 'Esta peça já está em Escavado.')
const av = avancoDe(peca[0], extrasDaMarcacao({ etapa: etapas[2], data: '2026-11-09', quantidadeTexto: '2,5', lote: 'bt 1', nota: '' }))
conferir('avanço herda forma, rótulo e espessura e aponta a anterior', av.campos, {
  planta_id: 'pl', tipo: 'ret', pontos: { x: 1, y: 2, w: 3, h: 4 }, rotulo: 'P12', rotacao: 0, espessura: 2,
  etapa: 'Concretado', cor: '#3DC28C', data: '2026-11-09', quantidade: 2.5, lote: 'BT1', nota: null, lote_cor: null, substitui: 'p1',
})
conferir('etapa "un" grava quantidade vazia', extrasDaMarcacao({ etapa: etapas[0], data: dia, quantidadeTexto: '7' }).quantidade, null)
conferir('etapa em m³ sem quantidade é recusada', validarMarcacao({ data: dia, quantidade: null }, etapas[2]),
  'A etapa Concretado é medida em m³: preencha a quantidade antes de marcar.')
conferir('histórico a partir de qualquer elo', historicoDaPeca(peca, 'p2').map((x) => [x.etapa, x.data]), [
  ['Escavado', '2026-11-03'], ['Forma', '2026-11-05'], ['Concretado', '2026-11-08'],
])
conferir('cor da marcação segue a etapa de hoje; etapa apagada fica com a sua',
  [corDaMarcacao(peca[0], new Map([['Escavado', { cor: '#ABCDEF' }]])), corDaMarcacao(peca[4], new Map())], ['#ABCDEF', '#000000'])

// ── Configuração de etapas ─────────────────────────────────────────────────────
conferir('nome repetido (sem olhar acento) é recusado', validarEtapa({ nome: 'escavado', cor: '#112233', unidade: 'un' }, etapas).nome, 'Já existe uma etapa com esse nome.')
conferir('meta inválida é recusada', Boolean(validarEtapa({ nome: 'X', cor: '#112233', unidade: 'un', meta: '-3' }, etapas).meta), true)
conferir('unidades iguais ao CHECK do banco', UNIDADES_ETAPA, ['un', 'm²', 'm', 'm³', 'kg', 't'])
conferir('subir a Forma troca com Escavado', trocaDeOrdemEtapa(etapas, 'e2', 'subir'), [{ id: 'e2', ordem: 0 }, { id: 'e1', ordem: 1 }])
conferir('subir a primeira não faz nada', trocaDeOrdemEtapa(etapas, 'e1', 'subir'), null)

// ── Resumo do período ───────────────────────────────────────────────────────────
const semana = intervaloDoPeriodo('semana', '2026-11-05') // quinta
conferir('a semana começa na segunda', [semana.de, semana.ate], ['2026-11-02', '2026-11-08'])
conferir('mês', intervaloDoPeriodo('mês', '2026-02-10'), { de: '2026-02-01', ate: '2026-02-28', titulo: 'fev/2026' })
conferir('mês anterior atravessa o ano', moverPeriodo('mês', '2026-01-15', -1), '2025-12-01')
const r = resumoDoPeriodo(comLegado, peca, semana)
const esc = r.etapas.find((e) => e.nome === 'Escavado')
conferir('média real: produção ÷ dias em que a etapa andou', [esc.feito, esc.dias, esc.media], [2, 2, 1])
conferir('peças que andaram, em ordem natural (P2 antes de P12)', esc.pecas, ['P2', 'P12'])
conferir('o resumo "tudo" bate com a contagem das marcações', resumoDoPeriodo(comLegado, peca, intervaloDoPeriodo('tudo')).etapas.reduce((s, e) => s + e.feito, 0), 1 + 1 + 3 + 1 + 1)

// ── Pavimentos e peças ─────────────────────────────────────────────────────────
const pav = agruparPorPavimento(['Cobertura', '2º Pavimento', 'Térreo', '10º Pavimento', 'Subsolo', 'Casa de bombas', null, 'Fundação']
  .map((p, i) => ({ id: String(i), nome: `Planta ${i}`, pavimento: p })))
conferir('pavimentos na ordem do prédio; fora da lista por nome; sem pavimento no fim', pav.map((g) => g.pavimento),
  ['Fundação', 'Subsolo', 'Térreo', '2º Pavimento', '10º Pavimento', 'Cobertura', 'Casa de bombas', 'Sem pavimento'])
conferir('peças em ordem natural', ordenarPecas(['P10', 'P2', 'P1']), ['P1', 'P2', 'P10'])

// ── Camada de dados ───────────────────────────────────────────────────────────
const hoje = hojeISO()
reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')
const plantasSerra = (await dados.listarPlantas()).data
conferir('a Serra vê as duas plantas dela, sem a camada de texto', [plantasSerra.length, plantasSerra.every((p) => p.textos === undefined)], [2, true])
const aberta = (await dados.abrirPlanta('pl-serra-fund')).data
conferir('abrir traz etapas e marcações com o nome de quem marcou', [aberta.etapas.length, aberta.marcacoes.length, aberta.marcacoes[0].por], [4, 6, 'Eng. Israel'])

const nova = await dados.criarMarcacao('pl-serra-fund', { tipo: 'ret', pontos: { x: 1, y: 1, w: 50, h: 50 }, etapa: 'Escavado', cor: '#F2B23E', data: hoje, espessura: 1, rotulo: 'S20' })
conferir('marcar grava com a obra atual e quem marcou', [nova.erro, nova.data.obra_id, nova.data.planta_id, nova.data.por], [null, 'obra-serra', 'pl-serra-fund', 'Eng. Israel'])
const avancou = await dados.avancarMarcacao(nova.data.id, extrasDaMarcacao({ etapa: aberta.etapas.find((e) => e.nome === 'Forma'), data: hoje }))
conferir('avançar cria linha nova apontando a anterior, na mesma planta e obra', [avancou.data.substitui, avancou.data.etapa, avancou.data.rotulo, avancou.data.planta_id, avancou.data.obra_id], [nova.data.id, 'Forma', 'S20', 'pl-serra-fund', 'obra-serra'])
const depois = (await dados.abrirPlanta('pl-serra-fund')).data.marcacoes
conferir('a anterior continua gravada (histórico)', depois.some((x) => x.id === nova.data.id), true)
conferir('avançar de novo o mesmo elo é recusado', (await dados.avancarMarcacao(nova.data.id, extrasDaMarcacao({ etapa: aberta.etapas[3], data: hoje, quantidadeTexto: '1' }))).erro,
  'Esta peça já avançou de etapa (talvez em outro aparelho). Recarregue a planta.')
await dados.apagarMarcacao(avancou.data.id)
const semAvanco = (await dados.abrirPlanta('pl-serra-fund')).data.marcacoes
conferir('apagar o avanço faz a anterior voltar à planta', marcacoesAtuais(semAvanco).some((x) => x.id === nova.data.id), true)
conferir('marcação com tipo inventado é recusada', (await dados.criarMarcacao('pl-serra-fund', { tipo: 'circulo', pontos: {}, etapa: 'Escavado', cor: '#F2B23E', data: hoje })).erro, 'Desenho de tipo desconhecido.')

// Etapas: sugeridas não repetem; renomear leva as marcações junto.
dados.definirObraAtual('obra-ubs')
const sugeridas = (await dados.criarEtapasSugeridas()).data
conferir('UBS ganha as 4 sugeridas', sugeridas.map((e) => e.nome), ['Escavado', 'Forma', 'Armado', 'Concretado'])
conferir('pedir de novo não repete', (await dados.criarEtapasSugeridas()).data, [])
conferir('nome repetido é recusado', (await dados.salvarEtapa({ nome: 'forma', cor: '#112233', unidade: 'un' })).erro, 'Já existe uma etapa com esse nome.')
const estaca = (await dados.listarEtapasDaPlanta()).data.find((e) => e.nome === 'Estaca')
await dados.salvarEtapa({ ...estaca, nome: 'Estaca cravada', meta: '' })
const ubs = (await dados.abrirPlanta('pl-ubs-fund')).data
conferir('renomear a etapa muda o nome nas marcações', ubs.marcacoes.map((x) => x.etapa), ['Estaca cravada'])
conferir('mover etapa troca a ordem', (await dados.moverEtapa(sugeridas[0].id, 'subir')).data, true)

// Uma obra não abre nem marca na planta da outra.
conferir('da UBS não abre planta da Serra', (await dados.abrirPlanta('pl-serra-fund')).erro, 'Planta não encontrada nesta obra.')
conferir('da UBS não marca na planta da Serra', (await dados.criarMarcacao('pl-serra-fund', { tipo: 'ret', pontos: { x: 1, y: 1, w: 9, h: 9 }, etapa: 'Forma', cor: '#9B6BD6', data: hoje })).erro, 'Planta não encontrada nesta obra.')
conferir('da UBS não avança marcação da Serra', (await dados.avancarMarcacao('pm-s10-esc', extrasDaMarcacao({ etapa: sugeridas[1], data: hoje }))).erro, 'Marcação não encontrada nesta obra.')
conferir('da UBS não apaga marcação da Serra', (await dados.apagarMarcacao('pm-s10-esc')).erro !== null, true)
conferir('da UBS não apaga planta da Serra', (await dados.apagarPlanta('pl-serra-fund')).erro, 'Planta não encontrada nesta obra.')

// Subir (no banco dos testes nada vai ao Storage) e apagar planta, que leva as marcações.
const subida = await dados.subirPlanta({ nome: '  Estacas  ', pavimento: '', preparada: { blob: null, extensao: 'png', contentType: 'image/png', largura: 800, altura: 600, textos: null } })
conferir('subir grava nome limpo, sem pavimento, na pasta plantas da obra', [subida.data.nome, subida.data.pavimento, subida.data.caminho_imagem.startsWith('obra-ubs/plantas/')], ['Estacas', null, true])
conferir('planta sem nome é recusada', (await dados.subirPlanta({ nome: ' ', preparada: { largura: 1, altura: 1 } })).erro, 'Dê um nome à planta (ex.: Fundação, Forma do 1º pavimento).')
dados.definirObraAtual('obra-serra')
conferir('conta quantas marcações vão junto', (await dados.contarMarcacoesDaPlanta('pl-serra-fund')).data, 7)
await dados.apagarPlanta('pl-serra-fund')
conferir('apagar a planta leva as marcações', (await dados.contarMarcacoesDaPlanta('pl-serra-fund')).data, 0)
dados.definirObraAtual('obra-ubs')
conferir('e a UBS continua com a dela', (await dados.abrirPlanta('pl-ubs-fund')).data.marcacoes.length, 1)

// ── Quantitativo (19/11): quadro de peças ──────────────────────────────────────────
conferir('etapa medida não pede quantidade quando a peça está no quadro', validarMarcacao({ data: dia, quantidade: null }, etapas[2], true), null)
conferir('etapa medida continua pedindo quando a peça não está no quadro', Boolean(validarMarcacao({ data: dia, quantidade: null }, etapas[2], false)), true)
const valoresP3 = new Map([['p1', 1], ['p2', 1], ['p3', 3], ['q1', 1], ['v1', 1], ['dup', 0]])
const comDuplicada = [...peca, m('dup', { etapa: 'Escavado', data: '2026-11-04', rotulo: 'P2', created_at: '2026-11-08T12:00:00Z' })]
const rq = resumoDoPeriodo(comLegado, comDuplicada, semana, valoresP3)
conferir('resumo do período usa os valores do quadro (a peça repetida vale 0)', rq.etapas.find((e) => e.nome === 'Escavado').feito, 2)

// ── Achados da revisão de código (16/11) ──────────────────────────────────────────
// Por caminhão: só os caminhões do dia escolhido ganham cor; os de outro dia ficam cinza.
const coresHoje = coresDosLotes(doDia, dia)
conferir('cor por caminhão só para o dia da legenda', [corPorLote(doDia[1], coresHoje), corPorLote(doDia[4], coresHoje)], [PALETA_LOTES[1], COR_SEM_LOTE])
// Quantidade: etapa antiga (sem unidade conhecida) com número continua pedindo número.
conferir('etapa medida pede quantidade', pedeQuantidade({ unidade: 'm³' }), true)
conferir('etapa "un" sem número não pede', pedeQuantidade({ unidade: 'un' }, { quantidade: null }), false)
conferir('peça que já tem número não perde (etapa antiga ou que virou "un")', [pedeQuantidade({ unidade: '' }, { quantidade: 2 }), pedeQuantidade({ unidade: 'un' }, { quantidade: 2 })], [true, true])
conferir('nome da peça: limpa e corta em 40', [limparRotulo('  P12 '), limparRotulo('   '), limparRotulo('x'.repeat(50)).length], ['P12', null, 40])
conferir('desenho completo passa', conferirMarcacao({ tipo: 'ret', espessura: 1, etapa: 'A', cor: '#000000', data: '2026-11-16' }), null)
conferir('data inválida é recusada', conferirMarcacao({ tipo: 'ret', espessura: 1, etapa: 'A', cor: '#000000', data: '16/11/2026' }), 'Escolha a data da marcação.')
// Dentro do pavimento, a ordem em que chegaram (a lista vem da mais nova para a mais antiga).
conferir('dentro do pavimento mantém a ordem recebida', agruparPorPavimento([{ id: 'b', nome: 'Z', pavimento: 'Térreo' }, { id: 'a', nome: 'A', pavimento: 'Térreo' }])[0].plantas.map((x) => x.id), ['b', 'a'])

// Apagar um passo do meio (A ← B ← C): C passa a apontar A, e a vida da peça continua inteira.
reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')
await dados.apagarMarcacao('pm-s1-forma')
const depoisDoMeio = (await dados.abrirPlanta('pl-serra-fund')).data.marcacoes
conferir('apagar o passo do meio religa o seguinte ao anterior', depoisDoMeio.find((x) => x.id === 'pm-s1-conc').substitui, 'pm-s1-esc')
conferir('a vida da peça continua inteira', historicoDaPeca(depoisDoMeio, 'pm-s1-conc').map((x) => x.etapa), ['Escavado', 'Concretado'])
conferir('o primeiro passo não reaparece por cima', marcacoesAtuais(depoisDoMeio).some((x) => x.id === 'pm-s1-esc'), false)
conferir('apagar marcação de outra obra (ou que não existe) avisa', (await dados.apagarMarcacao('nao-existe')).erro, 'Marcação não encontrada nesta obra.')
await dados.salvarQuantitativos('pl-serra-fund', [{ rotulo: 'S1', etapa: 'Concretado', quantidade: null }])
conferir('peça medida fora do quadro não fica sem quantidade ao editar', (await dados.editarMarcacao('pm-s1-conc', { quantidade: null })).erro, 'Esta peça é medida: preencha a quantidade.')
await dados.salvarQuantitativos('pl-serra-fund', [{ rotulo: 'S1', etapa: 'Concretado', quantidade: 1.5 }])
conferir('com valor no quadro, a quantidade digitada pode ficar vazia', (await dados.editarMarcacao('pm-s2-conc', { quantidade: null })).erro, null)
conferir('mudar só o nome não mexe na quantidade', [(await dados.editarMarcacao('pm-s1-conc', { rotulo: ' S1A ' })).data.rotulo, depoisDoMeio.find((x) => x.id === 'pm-s1-conc').quantidade], ['S1A', 1.5])

// ── Quadro de peças e andamento (camada de dados, 19/11) ─────────────────────────────
reiniciarMock(dados)
await dados.entrar('eng@novaobra.test', 'x')
dados.definirObraAtual('obra-serra')
const quadroSerra = () => dados.abrirPlanta('pl-serra-fund').then((r) => r.data.quantitativos)
conferir('abrir a planta traz o quadro de peças dela', (await quadroSerra()).length, 3)
await dados.salvarQuantitativos('pl-serra-fund', [{ rotulo: 'S20', etapa: 'Concretado', quantidade: 0.72 }])
await dados.salvarQuantitativos('pl-serra-fund', [{ rotulo: 'S20', etapa: 'Concretado', quantidade: 0.8 }])
conferir('regravar a mesma célula troca o valor, sem repetir', (await quadroSerra()).filter((q) => q.rotulo === 'S20').map((q) => q.quantidade), [0.8])
await dados.salvarQuantitativos('pl-serra-fund', [{ rotulo: 'S20', etapa: 'Concretado', quantidade: null }])
conferir('célula vazia apaga o valor', (await quadroSerra()).some((q) => q.rotulo === 'S20'), false)
conferir('quantidade negativa é recusada com frase', (await dados.salvarQuantitativos('pl-serra-fund', [{ rotulo: 'S1', etapa: 'Concretado', quantidade: -1 }])).erro, 'A quantidade tem que ser um número maior ou igual a zero.')
await dados.tirarPecaDoQuadro('pl-serra-fund', 'S10')
conferir('tirar a peça apaga as células dela', (await quadroSerra()).some((q) => q.rotulo === 'S10'), false)
await dados.salvarQuantitativos('pl-serra-fund', [{ rotulo: 'S10', etapa: 'Concretado', quantidade: 1.25 }])
const conc = { tipo: 'ret', pontos: { x: 1, y: 1, w: 9, h: 9 }, etapa: 'Concretado', cor: '#3DC28C', data: hoje, espessura: 1, quantidade: null }
conferir('peça com valor no quadro marca em m³ sem digitar', (await dados.criarMarcacao('pl-serra-fund', { ...conc, rotulo: 'S10' })).erro, null)
conferir('peça sem valor no quadro continua pedindo a quantidade', (await dados.criarMarcacao('pl-serra-fund', { ...conc, rotulo: 'S9' })).erro, 'A etapa Concretado é medida em m³: preencha a quantidade antes de marcar.')
const conc2 = (await dados.listarEtapasDaPlanta()).data.find((e) => e.nome === 'Concretado')
await dados.salvarEtapa({ ...conc2, nome: 'Concretagem' })
conferir('renomear a etapa leva o quadro junto', (await quadroSerra()).every((q) => q.etapa === 'Concretagem'), true)
await dados.editarPlanta('pl-serra-fund', { nome: 'Fundação', pavimento: 'Fundação', conta_no_andamento: false })
conferir('"conta no andamento" grava', (await dados.listarPlantas()).data.find((p) => p.id === 'pl-serra-fund').conta_no_andamento, false)
conferir('Serra sem medição do contrato: nenhum item para ligar', (await dados.listarItensDoContrato()).data, [])
conferir('da UBS não grava no quadro da Serra', (await dados.salvarQuantitativos('pl-serra-fund', [{ rotulo: 'S1', etapa: 'Concretagem', quantidade: 1 }]).then(() => { dados.definirObraAtual('obra-ubs'); return dados.salvarQuantitativos('pl-serra-fund', [{ rotulo: 'S1', etapa: 'Concretagem', quantidade: 1 }]) })).erro, 'Planta não encontrada nesta obra.')
// Andamento na UBS (que tem medição do contrato): etapa ligada ao item 2.1.3, quadro e uma marcação.
const itensUbs = (await dados.listarItensDoContrato()).data
conferir('itens da última medição do contrato da UBS, com unidade', [itensUbs.length > 0, itensUbs.find((i) => i.item === '2.1.3')], [true, { item: '2.1.3', descricao: 'Concreto fck 25 MPa em sapatas', unidade: 'M3' }])
await dados.salvarEtapa({ nome: 'Concretado', cor: '#3DC28C', unidade: 'm³', meta: '', item_medicao: '2.1.3' })
await dados.salvarQuantitativos('pl-ubs-fund', [{ rotulo: 'E1', etapa: 'Concretado', quantidade: 2 }])
await dados.criarMarcacao('pl-ubs-fund', { ...conc, rotulo: 'E1' })
const andUbs = (await dados.obterAndamentoDaObra()).data
conferir('andamento: medição de referência é a 3ª', andUbs.medicao.numero, 3)
conferir('andamento do 2.1.3: contratado, medido, executado, saldo, %', (({ item, contratado, medido, executado, saldo, pct }) => ({ item, contratado, medido, executado, saldo, pct }))(andUbs.linhas[0]),
  { item: '2.1.3', contratado: 86.4, medido: 91.2, executado: 2, saldo: -89.2, pct: 2 })

// Gerente: marca e configura, mas não apaga planta (quadro: pranchas.apagar só do admin).
reiniciarMock(dados, somarDias(hoje, 0))
const fulano = (await dados.entrar('fulano@novaobra.test', 'x')).data
await dados.entrar('eng@novaobra.test', 'x')
await dados.mudarPerfil(fulano.id, 'gerente')
await dados.mudarObras(fulano.id, ['obra-ubs'])
await dados.entrar('fulano@novaobra.test', 'x')
dados.definirObraAtual('obra-ubs')
conferir('gerente marca na planta da obra dele', (await dados.criarMarcacao('pl-ubs-fund', { tipo: 'seta', pontos: { x1: 1, y1: 1, x2: 90, y2: 90 }, etapa: 'Estaca', cor: '#E2574C', data: hoje })).erro, null)
conferir('gerente configura etapa', (await dados.salvarEtapa({ nome: 'Arrasada', cor: '#112233', unidade: 'un' })).erro, null)
conferir('gerente não apaga planta', (await dados.apagarPlanta('pl-ubs-fund')).erro, 'Só o Engenheiro apaga planta.')
conferir('gerente não vê o andamento (medição é só do Engenheiro)', (await dados.obterAndamentoDaObra()).erro, 'Só o Engenheiro vê o andamento contra a medição.')
conferir('gerente grava no quadro de peças da obra dele', (await dados.salvarQuantitativos('pl-ubs-fund', [{ rotulo: 'E2', etapa: 'Estaca', quantidade: 1 }])).erro, null)
const etapaGer = (await dados.listarEtapasDaPlanta()).data.find((e) => e.nome === 'Estaca')
await dados.salvarEtapa({ ...etapaGer, item_medicao: '2.1.1' })
conferir('gerente não liga etapa a item do contrato (o campo é ignorado)', (await dados.listarEtapasDaPlanta()).data.find((e) => e.nome === 'Estaca').item_medicao ?? null, null)

console.log(`${ok}/${tot} — gestão à vista`)
if (ok !== tot) process.exit(1)
