// Encolhe a foto no aparelho antes de mandar (lado maior 1200 px, JPEG 0,8): foto de celular tem
// uns 4 MB e vira perto de 200 KB. Precisa do navegador (canvas): nada roda ao importar, então o
// dados.js pode importar daqui mesmo nos testes do Node, que nunca mandam foto.
import { LADO_MAIOR, QUALIDADE } from './fotos.js'

export async function encolherFoto(arquivo) {
  const imagem = await createImageBitmap(arquivo)
  const escala = Math.min(1, LADO_MAIOR / Math.max(imagem.width, imagem.height))
  const tela = document.createElement('canvas')
  tela.width = Math.round(imagem.width * escala)
  tela.height = Math.round(imagem.height * escala)
  tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height)
  imagem.close()
  const foto = await new Promise((pronto) => tela.toBlob(pronto, 'image/jpeg', QUALIDADE))
  if (!foto) throw new Error('Não foi possível ler essa foto. Tente outra.')
  return foto
}
