// Gestão à Vista — a geometria das marcações. Sem React, sem banco, sem window: roda no Node
// (tests/plantaGeometria.mjs). Todo ponto aqui está em PIXELS DA IMAGEM da planta, nunca da tela:
// zoom, celular deitado ou tela grande não mexem em nada que foi gravado.
//
// Formato de `pontos` por tipo:
//   ret    { x, y, w, h }
//   seta   { x1, y1, x2, y2 }
//   pincel { pts: [[x, y], ...] }

// Ponto da tela → pixel da imagem, dado o retângulo do <svg> na tela (getBoundingClientRect).
export function pontoNaImagem(clienteX, clienteY, caixa, largura, altura) {
  const x = ((clienteX - caixa.left) / caixa.width) * largura
  const y = ((clienteY - caixa.top) / caixa.height) * altura
  return [Math.round(x), Math.round(y)]
}

// Dois cantos quaisquer → retângulo com largura e altura positivas.
export function retanguloEntre([x1, y1], [x2, y2]) {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

// ---------------------------------------------------------------------------
// Pincel: Douglas-Peucker joga fora o tremido do dedo e guarda só os cantos
// ---------------------------------------------------------------------------

function distanciaAoSegmento([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const comprimento2 = dx * dx + dy * dy
  if (!comprimento2) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / comprimento2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export function simplificarTraco(pontos, tolerancia = 3) {
  if (pontos.length <= 2) return pontos.map(([x, y]) => [Math.round(x), Math.round(y)])
  const manter = new Uint8Array(pontos.length)
  manter[0] = 1
  manter[pontos.length - 1] = 1
  const pilha = [[0, pontos.length - 1]]
  while (pilha.length) {
    const [ini, fim] = pilha.pop()
    let maior = 0
    let indice = -1
    for (let i = ini + 1; i < fim; i++) {
      const d = distanciaAoSegmento(pontos[i], pontos[ini], pontos[fim])
      if (d > maior) { maior = d; indice = i }
    }
    if (indice >= 0 && maior > tolerancia) {
      manter[indice] = 1
      pilha.push([ini, indice], [indice, fim])
    }
  }
  return pontos.filter((_, i) => manter[i]).map(([x, y]) => [Math.round(x), Math.round(y)])
}

// A tolerância acompanha o tamanho da planta: ~0,15% do lado maior (6 px numa planta de 4000).
export const toleranciaDoTraco = (largura, altura) => Math.max(2, Math.round(Math.max(largura, altura) * 0.0015))

// ---------------------------------------------------------------------------
// Caixa (bbox), centro e o desenho em SVG
// ---------------------------------------------------------------------------

export function bboxDe(m) {
  const p = m.pontos ?? {}
  if (m.tipo === 'ret') return { x: p.x, y: p.y, w: p.w, h: p.h }
  if (m.tipo === 'seta') return retanguloEntre([p.x1, p.y1], [p.x2, p.y2])
  const pts = p.pts ?? []
  if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 }
  const xs = pts.map((q) => q[0])
  const ys = pts.map((q) => q[1])
  return retanguloEntre([Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)])
}

export function centroDe(m) {
  const b = bboxDe(m)
  return [b.x + b.w / 2, b.y + b.h / 2]
}

// O "d" de um <path> do pincel.
export const caminhoDoPincel = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')

// As três pontas do triângulo da seta (atributo "points" de um <polygon>), em (x2, y2).
export function pontaDaSeta({ x1, y1, x2, y2 }, tamanho) {
  const angulo = Math.atan2(y2 - y1, x2 - x1)
  const lado = (a) => `${Math.round(x2 - tamanho * Math.cos(a))},${Math.round(y2 - tamanho * Math.sin(a))}`
  return `${x2},${y2} ${lado(angulo - Math.PI / 7)} ${lado(angulo + Math.PI / 7)}`
}

// Caixa pequena em volta da ponta da seta: é onde se procura o nome da peça apontada.
export function caixaDaPonta({ x2, y2 }, largura, altura) {
  const r = Math.round(Math.max(largura, altura) * 0.02)
  return { x: x2 - r, y: y2 - r, w: 2 * r, h: 2 * r }
}

// Espessura do traço em pixels da imagem: proporcional à planta, vezes 0,5 / 1 / 2.
export const larguraDoTraco = (largura, altura, espessura = 1) => Math.max(1, Math.round(Math.max(largura, altura) / 400)) * espessura

// O desenho é pequeno demais para valer (toque sem querer)?
export function pequenoDemais(m, minimo) {
  if (m.tipo === 'pincel') return (m.pontos?.pts?.length ?? 0) < 2
  const b = bboxDe(m)
  return m.tipo === 'seta' ? Math.hypot(b.w, b.h) < minimo : b.w < minimo || b.h < minimo
}

// ---------------------------------------------------------------------------
// Rótulo sugerido: o nome da peça vem da camada de texto do PDF
// ---------------------------------------------------------------------------

// Centro de um texto do PDF em pixels da imagem. `t` é a matriz já levada para a imagem
// (pdfjs Util.transform(viewport, item)): t[4], t[5] = começo da linha de base; (t[0], t[1]) aponta
// para onde o texto corre e (t[2], t[3]) para "cima" da letra. Seguir essas direções (e não somar
// largura em x e altura em y) acerta também o texto girado, comum em planta (cota e nome na vertical).
export function centroDoTexto(t, largura, altura) {
  const unit = (a, b) => { const n = Math.hypot(a, b) || 1; return [a / n, b / n] }
  const [ax, ay] = unit(t[0], t[1])
  const [cx, cy] = unit(t[2], t[3])
  return [Math.round(t[4] + (ax * largura) / 2 + (cx * altura) / 2), Math.round(t[5] + (ay * largura) / 2 + (cy * altura) / 2)]
}

export const PADRAO_PECA =/^[A-Z]{1,4}[-.\s]?\d{1,3}[A-Z]?$/ // P12, SAP-04, V1A...

// Entre os textos que caem DENTRO da caixa, prefere o que parece nome de peça; no empate, o mais
// central. Sem texto dentro, null.
export function sugerirRotulo(textos, caixa) {
  if (!textos?.length || !caixa) return null
  const cx = caixa.x + caixa.w / 2
  const cy = caixa.y + caixa.h / 2
  const dentro = textos.filter((t) => t.x >= caixa.x && t.x <= caixa.x + caixa.w && t.y >= caixa.y && t.y <= caixa.y + caixa.h)
  if (!dentro.length) return null
  const nota = (t) => (PADRAO_PECA.test(t.s) ? 0 : 1e6) + Math.hypot(t.x - cx, t.y - cy)
  return [...dentro].sort((a, b) => nota(a) - nota(b))[0].s
}

// ---------------------------------------------------------------------------
// Varinha (🪄): o contorno fechado onde se tocou vira um retângulo
// ---------------------------------------------------------------------------

export const LADO_DA_VARINHA = 1400
export const LIMITE_DA_VARINHA = 0.12 // fração dos pixels: passou disso, o contorno está aberto

// Escala do canvas reduzido (lado maior ≤ 1400 px) em relação à imagem.
export const escalaDaVarinha = (largura, altura) => Math.min(1, LADO_DA_VARINHA / Math.max(largura, altura))

// RGBA → 1 (linha escura) ou 0 (área clara). Transparente conta como claro.
export function binarizar(rgba, largura, altura, corte = 170) {
  const bin = new Uint8Array(largura * altura)
  for (let i = 0; i < bin.length; i++) {
    const o = i * 4
    if (rgba[o + 3] < 128) continue
    bin[i] = 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2] < corte ? 1 : 0
  }
  return bin
}

// Flood fill de 4 vizinhos pela área clara a partir de (px, py), no canvas reduzido.
// Devolve { caixa } (no canvas reduzido) ou { erro } com a frase para a tela.
export function detectarContorno(bin, largura, altura, px, py, limite = LIMITE_DA_VARINHA) {
  px = Math.floor(px)
  py = Math.floor(py)
  if (px < 0 || py < 0 || px >= largura || py >= altura) return { erro: 'Toque dentro da planta.' }
  const inicio = py * largura + px
  if (bin[inicio]) return { erro: 'Você tocou em cima de uma linha. Toque dentro da área clara da peça.' }
  const maximo = Math.floor(largura * altura * limite)
  const visto = new Uint8Array(largura * altura)
  const fila = new Int32Array(maximo + 4)
  let cabeca = 0
  let cauda = 0
  fila[cauda++] = inicio
  visto[inicio] = 1
  let minX = px
  let maxX = px
  let minY = py
  let maxY = py
  let pintados = 0
  while (cabeca < cauda) {
    const p = fila[cabeca++]
    pintados++
    if (pintados > maximo) return { erro: 'O contorno não está fechado: a pintura vazaria pela planta. Use o retângulo (R).' }
    const x = p % largura
    const y = (p - x) / largura
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    for (const q of [p - 1, p + 1, p - largura, p + largura]) {
      if (q < 0 || q >= bin.length) continue
      if (Math.abs((q % largura) - x) > 1) continue // não atravessa a borda lateral
      if (visto[q] || bin[q]) continue
      visto[q] = 1
      if (cauda >= fila.length) return { erro: 'O contorno não está fechado: a pintura vazaria pela planta. Use o retângulo (R).' }
      fila[cauda++] = q
    }
  }
  return { caixa: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } }
}

// A caixa do canvas reduzido de volta para pixels da imagem, com 1 px de folga.
// null = pequena demais (menos de 8×8 na imagem): a tela pede para dar zoom.
export function caixaNaImagem(caixa, escala, largura, altura) {
  const x = Math.max(0, Math.floor(caixa.x / escala) - 1)
  const y = Math.max(0, Math.floor(caixa.y / escala) - 1)
  const x2 = Math.min(largura, Math.ceil((caixa.x + caixa.w) / escala) + 1)
  const y2 = Math.min(altura, Math.ceil((caixa.y + caixa.h) / escala) + 1)
  const r = { x, y, w: x2 - x, h: y2 - y }
  return r.w < 8 || r.h < 8 ? null : r
}

// ---------------------------------------------------------------------------
// Zoom ancorado no cursor (estilo CAD)
// ---------------------------------------------------------------------------

export const ZOOM_MIN = 0.35
export const ZOOM_MAX = 6
export const limitarZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

// Novo scroll para que o ponto sob o cursor (cx, cy, relativos ao contêiner) fique no mesmo lugar.
export function scrollAncorado({ scrollLeft, scrollTop, cx, cy, zoomAntes, zoomDepois }) {
  const f = zoomDepois / zoomAntes
  return { left: (scrollLeft + cx) * f - cx, top: (scrollTop + cy) * f - cy }
}
