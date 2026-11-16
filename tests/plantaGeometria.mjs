// Gestão à Vista: geometria (traço, caixa, varinha, rótulo do PDF, zoom) e a folha impressa.
import {
  pontoNaImagem, simplificarTraco, bboxDe, sugerirRotulo, binarizar, detectarContorno, caixaNaImagem, escalaDaVarinha,
  limitarZoom, scrollAncorado, pequenoDemais, retanguloEntre, pontaDaSeta, caixaDaPonta, centroDoTexto,
} from '../src/lib/plantaGeometria.js'
import { escaparHtml, orientacaoDaFolha, htmlDaImpressao } from '../src/lib/plantaImpressao.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Coordenada da IMAGEM, não da tela: o mesmo ponto da planta dá o mesmo número em qualquer zoom.
conferir('toque no meio do svg pequeno', pontoNaImagem(150, 100, { left: 100, top: 50, width: 100, height: 100 }, 4000, 2800), [2000, 1400])
conferir('o mesmo ponto com zoom 4x', pontoNaImagem(300, 250, { left: 100, top: 50, width: 400, height: 400 }, 4000, 2800), [2000, 1400])
conferir('retângulo arrastado ao contrário', retanguloEntre([50, 80], [10, 20]), { x: 10, y: 20, w: 40, h: 60 })

// Douglas-Peucker: o tremido some, os cantos ficam.
const tremido = [[0, 0], [10, 1], [20, -1], [30, 1], [40, 0], [40, 10], [41, 20], [39, 30], [40, 40]]
conferir('traço tremido vira três cantos', simplificarTraco(tremido, 3), [[0, 0], [40, 0], [40, 40]])
conferir('dois pontos ficam como estão', simplificarTraco([[1.4, 2.6], [5, 5]]), [[1, 3], [5, 5]])

conferir('caixa da seta', bboxDe({ tipo: 'seta', pontos: { x1: 90, y1: 10, x2: 10, y2: 50 } }), { x: 10, y: 10, w: 80, h: 40 })
conferir('caixa do pincel', bboxDe({ tipo: 'pincel', pontos: { pts: [[5, 9], [1, 2], [7, 4]] } }), { x: 1, y: 2, w: 6, h: 7 })
// Centro do texto do PDF (matriz já na imagem: y para baixo, por isso o "cima" da letra é -y).
conferir('texto deitado: meia largura à direita, meia altura acima', centroDoTexto([10, 0, 0, -10, 100, 200], 40, 10), [120, 195])
conferir('texto em pé (girado 90°): o centro sobe pela largura e vai à esquerda pela altura', centroDoTexto([0, -10, -10, 0, 100, 200], 40, 10), [95, 180])
conferir('ponta da seta horizontal fica na ponta', pontaDaSeta({ x1: 0, y1: 0, x2: 100, y2: 0 }, 10).split(' ')[0], '100,0')
conferir('caixa da ponta: 2% do lado maior para cada lado', caixaDaPonta({ x2: 500, y2: 500 }, 1000, 500), { x: 480, y: 480, w: 40, h: 40 })
conferir('retângulo de 3 px é toque sem querer', pequenoDemais({ tipo: 'ret', pontos: { x: 0, y: 0, w: 3, h: 90 } }, 8), true)

// Rótulo: o texto do PDF dentro da caixa; prefere o que parece peça; no empate, o mais central.
const textos = [{ s: 'Cota 1,20', x: 50, y: 50 }, { s: 'SAP-04', x: 30, y: 30 }, { s: 'P12', x: 52, y: 52 }, { s: 'P13', x: 500, y: 500 }]
conferir('prefere o identificador mais central', sugerirRotulo(textos, { x: 0, y: 0, w: 100, h: 100 }), 'P12')
conferir('só texto que não é peça: fica com ele', sugerirRotulo([{ s: 'Cota 1,20', x: 5, y: 5 }], { x: 0, y: 0, w: 10, h: 10 }), 'Cota 1,20')
conferir('nada dentro: sem sugestão', sugerirRotulo(textos, { x: 900, y: 900, w: 10, h: 10 }), null)
conferir('imagem sem texto: sem sugestão', sugerirRotulo(null, { x: 0, y: 0, w: 10, h: 10 }), null)

// Varinha: uma "sapata" fechada (quadrado de linha escura) numa folha 40×40.
const L = 40
function folha(fechada) {
  const rgba = new Uint8ClampedArray(L * L * 4).fill(255)
  const escuro = (x, y) => { const o = (y * L + x) * 4; rgba[o] = rgba[o + 1] = rgba[o + 2] = 0 }
  for (let i = 10; i <= 20; i++) { escuro(i, 10); escuro(i, 20); escuro(10, i); if (fechada || i < 14) escuro(20, i) }
  return binarizar(rgba, L, L)
}
const fechada = folha(true)
conferir('binariza: linha é 1, papel é 0', [fechada[10 * L + 10], fechada[0]], [1, 0])
conferir('toque dentro da sapata fechada acha o miolo', detectarContorno(fechada, L, L, 15, 15), { caixa: { x: 11, y: 11, w: 9, h: 9 } })
conferir('toque em cima da linha avisa', detectarContorno(fechada, L, L, 10, 15).erro, 'Você tocou em cima de uma linha. Toque dentro da área clara da peça.')
conferir('contorno aberto avisa em vez de pintar a planta', detectarContorno(folha(false), L, L, 15, 15).erro, 'O contorno não está fechado: a pintura vazaria pela planta. Use o retângulo (R).')
// Sem a trava da borda lateral, o preenchimento da coluna 0 "pularia" para a última coluna da linha de cima.
const faixa = new Uint8Array(4 * 4).fill(1)
faixa[1 * 4 + 0] = 0
faixa[0 * 4 + 3] = 0
conferir('não atravessa a borda lateral', detectarContorno(faixa, 4, 4, 0, 1, 1), { caixa: { x: 0, y: 1, w: 1, h: 1 } })
conferir('escala da varinha: lado maior vira 1400', escalaDaVarinha(4000, 2000), 0.35)
conferir('caixa volta para a imagem com 1 px de folga', caixaNaImagem({ x: 35, y: 35, w: 35, h: 35 }, 0.35, 4000, 2000), { x: 99, y: 99, w: 102, h: 102 })
conferir('caixa minúscula pede zoom', caixaNaImagem({ x: 10, y: 10, w: 2, h: 2 }, 1, 100, 100), null)

conferir('zoom tem limite', [limitarZoom(0.1), limitarZoom(9), limitarZoom(2)], [0.35, 6, 2])
conferir('zoom ancorado: o ponto sob o cursor não sai do lugar', scrollAncorado({ scrollLeft: 100, scrollTop: 0, cx: 50, cy: 20, zoomAntes: 1, zoomDepois: 2 }), { left: 250, top: 20 })

// Impressão: orientação, texto escapado e o svg da tela sem redesenho.
conferir('planta larga sai deitada', orientacaoDaFolha(4000, 2800), 'landscape')
conferir('planta alta sai em pé', orientacaoDaFolha(2800, 4000), 'portrait')
conferir('escapa o que entra no HTML', escaparHtml('P&1 <b> "x"'), 'P&amp;1 &lt;b&gt; &quot;x&quot;')
const html = htmlDaImpressao({ titulo: 'Fundação <1>', subtitulo: 'Obra', filtro: 'Todas as etapas', legenda: [{ nome: 'Escavado', cor: '#F2B23E', texto: '3' }],
  svg: '<svg viewBox="0 0 10 10"></svg>', imagem: 'https://x/y.png?a=1&b=2', largura: 4000, altura: 2800 })
conferir('folha deitada, título escapado, svg da tela e imagem', [
  html.includes('size: A4 landscape'), html.includes('Fundação &lt;1&gt;'), html.includes('<svg viewBox="0 0 10 10"></svg>'), html.includes('y.png?a=1&amp;b=2'),
], [true, true, true, true])

console.log(`${ok}/${tot} — geometria da planta`)
if (ok !== tot) process.exit(1)
