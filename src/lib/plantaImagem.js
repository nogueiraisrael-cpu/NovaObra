// Prepara a planta no aparelho antes de subir. Precisa do navegador (canvas); nada roda ao importar,
// e só a tela da Gestão à Vista importa este arquivo.
//
// A planta NÃO usa encolherFoto (1200 px, JPEG 0,8): nessa resolução a sapata vira borrão.
// - PDF: a 1ª página vira PNG com até 4000 px no maior lado (pdfjs-dist, carregado sob demanda, só
//   quando alguém sobe um PDF). A camada de texto do PDF vem junto, em pixels da imagem gerada:
//   é ela que sugere o nome da peça ao marcar. PDF escaneado não tem texto: sobe assim mesmo.
// - Imagem: as dimensões dela (até 4000 px), redesenhada no canvas: isso também tira o GPS da foto.
// O arquivo vai em PNG (linhas nítidas); se passar de 9,5 MB, vai em JPEG 0,9.
import { centroDoTexto } from './plantaGeometria.js'

export const LADO_MAXIMO_PLANTA = 4000
const LIMITE_PNG = 9.5 * 1024 * 1024

export const ehPdf = (arquivo) => arquivo?.type === 'application/pdf' || /\.pdf$/i.test(arquivo?.name ?? '')
export const ehImagem = (arquivo) => /^image\/(png|jpeg|webp)$/.test(arquivo?.type ?? '') || /\.(png|jpe?g|webp)$/i.test(arquivo?.name ?? '')

const comoBlob = (tela, tipo, qualidade) => new Promise((pronto) => tela.toBlob(pronto, tipo, qualidade))

async function codificar(tela) {
  const png = await comoBlob(tela, 'image/png')
  if (png && png.size <= LIMITE_PNG) return { blob: png, extensao: 'png', contentType: 'image/png' }
  const jpg = await comoBlob(tela, 'image/jpeg', 0.9)
  if (!jpg) throw new Error('Não foi possível gerar a imagem da planta.')
  return { blob: jpg, extensao: 'jpg', contentType: 'image/jpeg' }
}

function telaBranca(largura, altura) {
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  const ctx = tela.getContext('2d')
  ctx.fillStyle = '#ffffff' // PDF sem fundo sairia preto em JPEG
  ctx.fillRect(0, 0, largura, altura)
  return { tela, ctx }
}

async function carregarPdfjs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

async function deUmPdf(arquivo) {
  const pdfjs = await carregarPdfjs()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise
  try {
    const pagina = await pdf.getPage(1)
    const base = pagina.getViewport({ scale: 1 })
    // Resolução alta o bastante para dar zoom na sapata sem virar borrão.
    const escala = Math.min(4, LADO_MAXIMO_PLANTA / Math.max(base.width, base.height))
    const vp = pagina.getViewport({ scale: escala })
    const largura = Math.floor(vp.width)
    const altura = Math.floor(vp.height)
    const { tela, ctx } = telaBranca(largura, altura)
    // intent 'print': desenha de uma vez, sem esperar o "próximo quadro" do navegador. No modo normal,
    // o pdf.js espera requestAnimationFrame, que o navegador PAUSA quando a aba vai para segundo plano
    // (trocar de app no celular no meio da leitura): a planta ficava "preparando" para sempre.
    await pagina.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise
    let textos = null
    try {
      const conteudo = await pagina.getTextContent()
      textos = conteudo.items
        .filter((i) => i.str && i.str.trim())
        .map((i) => {
          const t = pdfjs.Util.transform(vp.transform, i.transform)
          const [x, y] = centroDoTexto(t, (i.width ?? 0) * escala, (i.height ?? 0) * escala)
          return { s: i.str.trim().slice(0, 40), x, y }
        })
        .slice(0, 5000)
    } catch (e) {
      console.warn('[planta] PDF sem camada de texto', e)
    }
    return { ...(await codificar(tela)), largura, altura, textos: textos?.length ? textos : null }
  } finally {
    pdf.destroy()
  }
}

async function deUmaImagem(arquivo) {
  const imagem = await createImageBitmap(arquivo)
  const escala = Math.min(1, LADO_MAXIMO_PLANTA / Math.max(imagem.width, imagem.height))
  const largura = Math.round(imagem.width * escala)
  const altura = Math.round(imagem.height * escala)
  const { tela, ctx } = telaBranca(largura, altura)
  ctx.drawImage(imagem, 0, 0, largura, altura)
  imagem.close()
  return { ...(await codificar(tela)), largura, altura, textos: null }
}

// Ler o PDF depende de baixar o leitor (pdf.js) na primeira vez: sem internet, a promessa nunca
// voltaria e a tela ficaria "preparando" para sempre. Passou do prazo, vira erro com frase.
const PRAZO_DO_PDF = 90_000
const DEMOROU = 'A leitura do PDF demorou demais. Confira a internet e escolha o arquivo de novo.'
const comPrazo = (promessa, ms) => Promise.race([
  promessa,
  new Promise((_, falha) => setTimeout(() => falha(Object.assign(new Error(DEMOROU), { prazo: true })), ms)),
])

// { blob, extensao, contentType, largura, altura, textos } ou exceção com frase para a tela.
export async function prepararPlanta(arquivo) {
  if (ehPdf(arquivo)) {
    try { return await comPrazo(deUmPdf(arquivo), PRAZO_DO_PDF) } catch (e) {
      console.error('[planta] PDF', e)
      if (e.prazo) throw e
      throw new Error('Não consegui abrir este PDF. Se ele tiver senha, tire a senha; ou exporte a planta como imagem (PNG/JPG).')
    }
  }
  if (ehImagem(arquivo)) {
    try { return await deUmaImagem(arquivo) } catch (e) {
      console.error('[planta] imagem', e)
      throw new Error('Não consegui ler esta imagem. Tente outra (PNG ou JPG).')
    }
  }
  throw new Error('Escolha um PDF ou uma imagem (PNG ou JPG).')
}
