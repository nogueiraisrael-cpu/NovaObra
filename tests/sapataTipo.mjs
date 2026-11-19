// Gestão à Vista — sapata por tipo: ler a lista de peças da prancha, as contas da sapata
// (concreto, lastro, forma, escavação, aço), o que gravar no quadro de peças e a próxima peça.
// Medidas e tabelas fictícias, no formato das pranchas reais (que não entram no Git).
import {
  PESO_ACO_NBR, lerListaDePecas, tipoDoFormulario, MEDIDAS_PADRAO_CM, validarTipo, contasDaSapata, acoPorPeca, servicosDoTipo, celulasDosTipos, proximaPeca,
} from '../src/lib/sapataTipo.js'
import { SERVICOS_CALCULO, UNIDADE_DO_SERVICO } from '../src/lib/listas.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// ── Lista de peças ─────────────────────────────────────────────────────────────
const l11 = lerListaDePecas('S1=S2=S3=S4=S5=S9=S12=S19=S20=S21=S22 (X11)')
conferir('lista com "=" e (X11)', [l11.pecas.length, l11.pecas[5], l11.declarado, l11.aviso], [11, 'S9', 11, null])
conferir('"S1 a S5" vira S1..S5', lerListaDePecas('S1 a S5').pecas, ['S1', 'S2', 'S3', 'S4', 'S5'])
conferir('vírgula, ponto e vírgula e quebra de linha', lerListaDePecas('S6, S7; S8\nS9').pecas, ['S6', 'S7', 'S8', 'S9'])
conferir('(11X) também vale e não repete peça', lerListaDePecas('S1=S1=S2 (2X)').pecas, ['S1', 'S2'])
conferir('contagem que não bate avisa', lerListaDePecas('S1=S2 (X3)').aviso, 'A prancha diz 3 peças e a lista tem 2.')
conferir('vazio', lerListaDePecas('  ').pecas, [])

// ── Contas ───────────────────────────────────────────────────────────────────
const M = { A: 1, B: 1, h0: 0.15, H: 0.5, a: 0.34, b: 0.5, e: 0.05, folga: 0.3, prof: 1.2 }
conferir('sapata tronco-piramidal 1,00 × 1,00', contasDaSapata(M), { concreto: 0.3346, lastro: 0.05, forma: 0.6, escavacao: 3.072 })
conferir('sapata reta (H = rodapé)', contasDaSapata({ ...M, A: 0.8, B: 0.8, h0: 0.4, H: 0.4 }).concreto, 0.256)
const aco = [{ bitola: '10', comprimento_cm: 10989 }, { bitola: '10', comprimento_cm: 10593 }]
conferir('aço por peça com o peso do projetista (10 mm = 0,63)', acoPorPeca(aco, 11, { ...PESO_ACO_NBR, 10: 0.63 }), 12.3606)
conferir('aço por peça com a NBR (10 mm = 0,617)', acoPorPeca(aco, 11, PESO_ACO_NBR), 12.1055)
let erroBitola = null
try { acoPorPeca([{ bitola: '9', comprimento_cm: 100 }], 1, PESO_ACO_NBR) } catch (e) { erroBitola = e.message }
conferir('bitola sem peso por metro avisa', erroBitola, 'Sem peso por metro para a bitola 9.')
conferir('NBR 7480: 12,5 mm', PESO_ACO_NBR['12.5'], 0.963)

const tipo1 = { nome: 'Tipo 1', pecasTexto: 'S1=S2 (X2)', pecas: ['S1', 'S2'], medidas: M, aco: [{ bitola: '10', comprimento_cm: 2000 }], aplicadas: [], ultimo: {} }
conferir('serviços por peça do tipo', servicosDoTipo(tipo1, PESO_ACO_NBR), { Escavação: 3.072, Lastro: 0.05, Forma: 0.6, Armação: 6.17, Concreto: 0.3346 })
conferir('vocabulário dos serviços', [SERVICOS_CALCULO, UNIDADE_DO_SERVICO.Armação], [['Escavação', 'Lastro', 'Forma', 'Armação', 'Concreto'], 'kg'])

// ── Validar ──────────────────────────────────────────────────────────────────
conferir('tipo certo passa', validarTipo(tipo1, []), null)
conferir('sem nome', validarTipo({ ...tipo1, nome: ' ' }, []), 'Dê um nome ao tipo.')
conferir('nome repetido', validarTipo({ ...tipo1, pecas: ['S9'] }, [tipo1]), 'Já existe um tipo com esse nome.')
conferir('lista vazia', validarTipo({ ...tipo1, pecas: [] }, []), 'A lista de peças está vazia.')
conferir('peça em dois tipos', validarTipo({ ...tipo1, nome: 'Tipo 2' }, [tipo1]), 'A peça S1 já está no tipo Tipo 1.')
conferir('medida zero', validarTipo({ ...tipo1, medidas: { ...M, A: 0 } }, []), 'Preencha as medidas maiores que zero.')
conferir('altura menor que o rodapé', validarTipo({ ...tipo1, medidas: { ...M, H: 0.1 } }, []), 'A altura total não pode ser menor que o rodapé.')
conferir('topo maior que a base', validarTipo({ ...tipo1, medidas: { ...M, a: 1.2 } }, []), 'O topo do tronco não pode ser maior que a base.')

// ── O que vai para o quadro ─────────────────────────────────────────────────────
const etapas = [
  { nome: 'CONCRETAGEM', unidade: 'm³', calcular_como: 'Concreto' },
  { nome: 'ARMAÇÃO', unidade: 't', calcular_como: 'Armação' },
  { nome: 'FORMA', unidade: 'm³', calcular_como: 'Forma' },
  { nome: 'PINTURA', unidade: 'un', calcular_como: null },
]
const r1 = celulasDosTipos({ tipos: [tipo1], etapas, atual: new Map(), kgPorMetro: PESO_ACO_NBR })
conferir('grava concreto e armação (kg → t) das duas peças', r1.linhas, [
  { rotulo: 'S1', etapa: 'CONCRETAGEM', quantidade: 0.3346 }, { rotulo: 'S1', etapa: 'ARMAÇÃO', quantidade: 0.00617 },
  { rotulo: 'S2', etapa: 'CONCRETAGEM', quantidade: 0.3346 }, { rotulo: 'S2', etapa: 'ARMAÇÃO', quantidade: 0.00617 },
])
conferir('forma em etapa de m³ avisa e não grava; serviço sem etapa avisa', r1.avisos, [
  'Escavação: nenhuma etapa calculada como Escavação.', 'Lastro: nenhuma etapa calculada como Lastro.', 'Forma: a etapa FORMA está em m³, o serviço é em m².',
])
conferir('o tipo guarda onde foi aplicado e o que calculou', [r1.tipos[0].aplicadas, r1.tipos[0].ultimo['S1|CONCRETAGEM']], [['S1', 'S2'], 0.3346])
// Reaplicar: S2 saiu do tipo e a S1 tinha valor digitado à mão (0,5) no concreto.
// (o aço é do grupo: tirou uma peça, tira o aço dela também, senão a que fica "herda" o aço da outra)
const tipoDepois = { ...r1.tipos[0], pecas: ['S1'], aco: [{ bitola: '10', comprimento_cm: 1000 }] }
const atual = new Map([['S1|CONCRETAGEM', 0.5], ['S1|ARMAÇÃO', 0.00617], ['S2|CONCRETAGEM', 0.3346], ['S2|ARMAÇÃO', 0.00617]])
const r2 = celulasDosTipos({ tipos: [tipoDepois], etapas, atual, kgPorMetro: PESO_ACO_NBR })
conferir('reaplicar: a peça que saiu perde as células do tipo', r2.linhas.filter((l) => l.rotulo === 'S2'), [
  { rotulo: 'S2', etapa: 'CONCRETAGEM', quantidade: null }, { rotulo: 'S2', etapa: 'ARMAÇÃO', quantidade: null },
])
conferir('reaplicar: conta o que muda e o que tinha sido digitado à mão', [r2.trocadas, r2.digitadas], [3, 1])

// Apagar um tipo inteiro: as células que ele gravou saem do quadro.
const r3 = celulasDosTipos({ tipos: [], removidos: [r1.tipos[0]], etapas, atual: new Map([['S1|CONCRETAGEM', 0.3346]]), kgPorMetro: PESO_ACO_NBR })
conferir('tipo apagado limpa as células que tinha gravado', r3.linhas, [{ rotulo: 'S1', etapa: 'CONCRETAGEM', quantidade: null }])

// ── Formulário (cm, com vírgula) → tipo (m) ───────────────────────────────────────
const form = { nome: ' Tipo 1 ', pecasTexto: 'S1=S2 (X2)', medidas: { A: '100', B: '100', h0: '15', H: '50', a: '34', b: '50', e: '5', folga: '30', prof: '120' },
  aco: [{ bitola: '10', comprimento_cm: '10989' }, { bitola: '', comprimento_cm: '' }] }
const lido = tipoDoFormulario(form)
conferir('formulário vira tipo em metros, linha de aço vazia some', [lido.erro, lido.tipo.nome, lido.tipo.pecas, lido.tipo.medidas, lido.tipo.aco], [
  null, 'Tipo 1', ['S1', 'S2'], { A: 1, B: 1, h0: 0.15, H: 0.5, a: 0.34, b: 0.5, e: 0.05, folga: 0.3, prof: 1.2 }, [{ bitola: '10', comprimento_cm: 10989 }]])
conferir('medida com vírgula', tipoDoFormulario({ ...form, medidas: { ...form.medidas, A: '87,5' } }).tipo.medidas.A, 0.875)
conferir('medida que não é número avisa qual', tipoDoFormulario({ ...form, medidas: { ...form.medidas, H: 'abc' } }).erro, 'Medida inválida: altura total.')
conferir('linha de aço pela metade avisa', tipoDoFormulario({ ...form, aco: [{ bitola: '10', comprimento_cm: '' }] }).erro, 'Preencha bitola e comprimento total em cada linha de aço.')
conferir('padrões do formulário: lastro 5 cm', MEDIDAS_PADRAO_CM.e, '5')

// ── Próxima peça ───────────────────────────────────────────────────────────────
conferir('próxima peça pula a já marcada', proximaPeca(['S1', 'S2', 'S3', 'S10'], new Set(['S2']), 'S1'), 'S3')
conferir('depois da última volta ao começo', proximaPeca(['S1', 'S2', 'S3'], new Set(['S2']), 'S3'), 'S1')
conferir('todas marcadas: nenhuma', proximaPeca(['S1', 'S2'], new Set(['S1', 'S2']), 'S1'), null)

console.log(`${ok}/${tot} — sapata por tipo`)
if (ok !== tot) process.exit(1)
