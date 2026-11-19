// Gestão à Vista — quantitativo: quanto vale cada marcação (quadro de peças), o resumo da planta
// e o andamento da obra contra a medição do contrato.
import {
  quadroDe, pecasDaPlanta, valorDaMarcacao, valoresDasMarcacoes, somaDaEtapa, previstoDaEtapa, resumoDaPlanta,
  linhasParaAplicar, ultimaMedicaoDoContrato, andamentoDaObra, mesmaUnidade, conferirLinhasDoQuadro, valorNoQuadro, linhasDoRascunho, chaveDaCelula,
} from '../src/lib/quantitativo.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const hoje = '2026-11-19'
const ESC = { nome: 'Escavado', unidade: 'm³', cor: '#F2B23E' }
const FOR = { nome: 'Forma', unidade: 'm²', cor: '#9B6BD6' }
const PIN = { nome: 'Pintado', unidade: 'un', cor: '#000000', meta: 4 }
let n = 0
const m = (rotulo, etapa, extra = {}) => ({ id: `m${++n}`, rotulo, etapa, data: '2026-11-18', quantidade: null, created_at: `2026-11-18T10:${String(n).padStart(2, '0')}:00Z`, ...extra })

const quantitativos = [
  { rotulo: 'S1', etapa: 'Escavado', quantidade: 0.72 }, { rotulo: 'S2', etapa: 'Escavado', quantidade: 0.72 },
  { rotulo: 'S3', etapa: 'Escavado', quantidade: 0.72 }, { rotulo: 'S4', etapa: 'Escavado', quantidade: 0.72 },
  { rotulo: 'S1', etapa: 'Forma', quantidade: 2.88 },
]
const quadro = quadroDe(quantitativos)

// ── Peças da planta ─────────────────────────────────────────────────────────────
conferir('peças: textos do PDF que parecem peça, marcações e quadro, sem repetir, em ordem de obra',
  pecasDaPlanta({ textos: [{ s: 'S10' }, { s: 'S2' }, { s: 'Cota 1,20' }, { s: 'S2' }], marcacoes: [{ rotulo: 'S7' }, { rotulo: null }], quantitativos: [{ rotulo: 'S1' }] }),
  ['S1', 'S2', 'S7', 'S10'])
conferir('planta em imagem (sem textos) não quebra', pecasDaPlanta({ textos: null, marcacoes: [], quantitativos: [] }), [])

// ── Valor de uma marcação ─────────────────────────────────────────────────────────
conferir('quantidade digitada manda', valorDaMarcacao({ rotulo: 'S1', quantidade: 2 }, ESC, quadro), 2)
conferir('etapa "un" vale 1', valorDaMarcacao({ rotulo: 'S1', quantidade: null }, PIN, quadro), 1)
conferir('etapa medida usa o quadro', valorDaMarcacao({ rotulo: 'S3', quantidade: null }, ESC, quadro), 0.72)
conferir('peça fora do quadro: sem quantitativo', valorDaMarcacao({ rotulo: 'S9', quantidade: null }, ESC, quadro), null)
conferir('peça sem nome: sem quantitativo', valorDaMarcacao({ rotulo: null, quantidade: null }, ESC, quadro), null)

// ── Soma da etapa: a mesma peça conta uma vez ─────────────────────────────────────────
const duas = [m('S3', 'Escavado'), m('S3', 'Escavado'), m('S4', 'Escavado', { quantidade: 0.5 }), m('S4', 'Escavado', { quantidade: 0.5 }), m('S9', 'Escavado')]
const soma = somaDaEtapa(duas, ESC, quadro, hoje)
conferir('S3 marcada duas vezes entra uma vez; S4 digitada duas vezes soma as duas; S9 fica sem quantitativo',
  [soma.feito, soma.pecas, soma.semQuantitativo], [1.72, 3, 1])
const valores = valoresDasMarcacoes(duas, new Map([['Escavado', ESC]]), quadro)
conferir('a segunda marcação da mesma peça vale 0 (já contada), não "sem quantitativo"', [valores.get(duas[0].id), valores.get(duas[1].id), valores.get(duas[4].id)], [0.72, 0, null])

// Revisão final (Important 3): parte digitada + marcação vazia na mesma peça = peça concluída pelo quadro.
const mista = [m('S3', 'Escavado', { quantidade: 0.36 }), m('S3', 'Escavado')]
conferir('0,36 digitado e depois marcada vazia: a peça fecha no valor do quadro (0,72), não 1,08', somaDaEtapa(mista, ESC, quadro, hoje).feito, 0.72)
const passou = [m('S3', 'Escavado', { quantidade: 0.5 }), m('S3', 'Escavado', { quantidade: 0.4 }), m('S3', 'Escavado')]
conferir('digitado já passa do quadro: a vazia não soma nada a mais', somaDaEtapa(passou, ESC, quadro, hoje).feito, 0.9)

// ── Previsto e resumo da planta ─────────────────────────────────────────────────────
const pecas = ['S1', 'S2', 'S3', 'S4']
conferir('previsto: peças com valor e a soma', previstoDaEtapa(ESC, quadro, pecas), { pecas: 4, previsto: 2.88 })
const marcadas = [m('S1', 'Escavado'), m('S2', 'Escavado', { data: hoje }), m('S1', 'Forma')]
const [rEsc, rFor] = resumoDaPlanta([ESC, FOR, PIN], marcadas, quantitativos, pecas, hoje)
conferir('resumo do Escavado', (({ feitas, totalPecas, feito, previsto, pct, hojePecas, hojeFeito, semQuantitativo }) => ({ feitas, totalPecas, feito, previsto, pct, hojePecas, hojeFeito, semQuantitativo }))(rEsc),
  { feitas: 2, totalPecas: 4, feito: 1.44, previsto: 2.88, pct: 50, hojePecas: 1, hojeFeito: 0.72, semQuantitativo: 0 })
conferir('resumo da Forma (uma peça prevista, feita)', [rFor.feitas, rFor.totalPecas, rFor.feito, rFor.pct], [1, 1, 2.88, 100])
const rPin = resumoDaPlanta([PIN], [m('S1', 'Pintado'), m('S2', 'Pintado')], [], pecas, hoje)[0]
conferir('etapa "un" segue a meta', [rPin.feito, rPin.previsto, rPin.pct], [2, 4, 50])
conferir('sem nada previsto, % fica vazio (nunca divide por zero)', resumoDaPlanta([FOR], [], [], [], hoje)[0].pct, null)

// ── Aplicar nas iguais ─────────────────────────────────────────────────────────────
conferir('aplicar os mesmos valores em várias peças', linhasParaAplicar(['S1', 'S2'], { Escavado: 0.72, Forma: null }), [
  { rotulo: 'S1', etapa: 'Escavado', quantidade: 0.72 }, { rotulo: 'S1', etapa: 'Forma', quantidade: null },
  { rotulo: 'S2', etapa: 'Escavado', quantidade: 0.72 }, { rotulo: 'S2', etapa: 'Forma', quantidade: null },
])

conferir('linhas do quadro: número ≥ 0 ou vazio passam', conferirLinhasDoQuadro([{ rotulo: 'S1', etapa: 'E', quantidade: 0 }, { rotulo: 'S1', etapa: 'F', quantidade: null }]), null)
conferir('linhas do quadro: negativo ou texto são recusados', [conferirLinhasDoQuadro([{ rotulo: 'S1', etapa: 'E', quantidade: -1 }]), conferirLinhasDoQuadro([{ rotulo: 'S1', etapa: 'E', quantidade: 'abc' }])],
  ['A quantidade tem que ser um número maior ou igual a zero.', 'A quantidade tem que ser um número maior ou igual a zero.'])
conferir('linhas do quadro: peça ou etapa sem nome são recusadas', [conferirLinhasDoQuadro([{ rotulo: ' ', etapa: 'E', quantidade: 1 }]), conferirLinhasDoQuadro([{ rotulo: 'S1', etapa: '', quantidade: 1 }])],
  ['Cada peça precisa de um nome.', 'Escolha a etapa.'])

// ── Painel do quadro ─────────────────────────────────────────────────────────────
const qp = quadroDe([{ planta_id: 'p1', rotulo: 'S1', etapa: 'Escavado', quantidade: 0.72 }])
conferir('valor no quadro da peça (ou null)', [valorNoQuadro(qp, 'p1', 'S1', 'Escavado'), valorNoQuadro(qp, 'p1', 'S2', 'Escavado'), valorNoQuadro(qp, 'p1', null, 'Escavado')], [0.72, null, null])
const original = new Map([[chaveDaCelula('S1', 'Escavado'), 0.72], [chaveDaCelula('S2', 'Escavado'), 0.9]])
const rascunho = new Map([[chaveDaCelula('S1', 'Escavado'), '0,72'], [chaveDaCelula('S2', 'Escavado'), ''], [chaveDaCelula('S3', 'Escavado'), '1,5'], [chaveDaCelula('S4', 'Escavado'), '']])
conferir('rascunho: só o que mudou (S2 apagada, S3 nova); S1 igual e S4 vazia ficam de fora', linhasDoRascunho(rascunho, original),
  { linhas: [{ rotulo: 'S2', etapa: 'Escavado', quantidade: null }, { rotulo: 'S3', etapa: 'Escavado', quantidade: 1.5 }], erro: null })
conferir('rascunho com texto que não é número avisa onde', linhasDoRascunho(new Map([[chaveDaCelula('S5', 'Forma'), 'abc']]), new Map()).erro, 'Número inválido em S5 · Forma.')

// ── Medição de referência ───────────────────────────────────────────────────────────
conferir('a última medição do contrato é a de maior número (empreiteiro não entra)',
  ultimaMedicaoDoContrato([{ id: 'a', tipo: 'Contrato', numero: 1 }, { id: 'b', tipo: 'Contrato', numero: 3 }, { id: 'c', tipo: 'Contrato', numero: 2 }, { id: 'd', tipo: 'Empreiteiro', numero: 5 }]).id, 'b')
conferir('sem medição do contrato: nenhuma', ultimaMedicaoDoContrato([{ tipo: 'Empreiteiro', numero: 1 }]), null)
conferir('unidades: M3 é m³, M2 é m², m3 é m³', [mesmaUnidade('M3', 'm³'), mesmaUnidade('m3', 'm³'), mesmaUnidade('M2', 'm²'), mesmaUnidade('m²', 'M3')], [true, true, true, false])

// ── Andamento da obra ───────────────────────────────────────────────────────────────
const etapasObra = [
  { nome: 'Escavado', unidade: 'm³', item_medicao: '2.1' }, { nome: 'Reaterro', unidade: 'm³', item_medicao: '2.1' },
  { nome: 'Forma', unidade: 'm²', item_medicao: '2.4' }, { nome: 'Armado', unidade: 'kg', item_medicao: '9.9' },
  { nome: 'Pintado', unidade: 'un', item_medicao: null },
]
const plantas = [{ id: 'p1', conta_no_andamento: true }, { id: 'p2', conta_no_andamento: false }]
const quantObra = [
  { planta_id: 'p1', rotulo: 'S1', etapa: 'Escavado', quantidade: 2 }, { planta_id: 'p1', rotulo: 'S1', etapa: 'Reaterro', quantidade: 1 },
  { planta_id: 'p1', rotulo: 'S1', etapa: 'Forma', quantidade: 3 }, { planta_id: 'p2', rotulo: 'S1', etapa: 'Escavado', quantidade: 50 },
]
const marcObra = [
  { id: 'a', planta_id: 'p1', rotulo: 'S1', etapa: 'Escavado', quantidade: null, data: hoje },
  { id: 'b', planta_id: 'p1', rotulo: 'S1', etapa: 'Reaterro', quantidade: null, data: hoje },
  { id: 'c', planta_id: 'p1', rotulo: 'S1', etapa: 'Forma', quantidade: null, data: hoje },
  { id: 'd', planta_id: 'p2', rotulo: 'S1', etapa: 'Escavado', quantidade: null, data: hoje },
]
const itens = [
  { item: '2.1', descricao: 'Escavação manual', unidade: 'M3', qtd_contratada: 60, qtd_acumulada: 1.5 },
  { item: '2.4', descricao: 'Forma de madeira', unidade: 'M3', qtd_contratada: 0, qtd_acumulada: 0 },
]
const and = andamentoDaObra({ etapas: etapasObra, plantas, marcacoes: marcObra, quantitativos: quantObra, itens })
conferir('uma linha por item ligado (Escavado e Reaterro juntos no 2.1)', and.map((l) => [l.item, l.etapas]), [['2.1', ['Escavado', 'Reaterro']], ['2.4', ['Forma']], ['9.9', ['Armado']]])
const l21 = and[0]
conferir('2.1: executado só das plantas que contam, saldo e %', [l21.contratado, l21.executado, l21.medido, l21.saldo, l21.pct, l21.avisoUnidade, l21.semItem], [60, 3, 1.5, 1.5, 5, false, false])
conferir('2.4: unidade diferente avisa; contratado zero não divide', [and[1].avisoUnidade, and[1].pct], [true, null])
conferir('9.9: item que não está na medição', [and[2].semItem, and[2].contratado], [true, null])

console.log(`${ok}/${tot} — quantitativo`)
if (ok !== tot) process.exit(1)
