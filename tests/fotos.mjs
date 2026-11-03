// Fotos no Storage: o caminho que o banco confere e as frases de envio que falhou.
import { caminhoDaFoto, estaNoStorage, mensagemDoEnvio } from '../src/lib/fotos.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const estoura = (f) => { try { f(); return false } catch { return true } }

const obra = '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
conferir('caminho do diário', caminhoDaFoto(obra, 'diario', 'abc'), `${obra}/diario/abc.jpg`)
conferir('caminho da nota fiscal', caminhoDaFoto(obra, 'nota-fiscal', 'x'), `${obra}/nota-fiscal/x.jpg`)
conferir('obra que não é uuid é recusada', estoura(() => caminhoDaFoto('obra-serra', 'diario', 'x')), true)
conferir('módulo inventado é recusado', estoura(() => caminhoDaFoto(obra, 'outro', 'x')), true)

conferir('caminho do Storage', estaNoStorage(`${obra}/diario/abc.jpg`), true)
conferir('foto antiga dentro da tabela não é do Storage', estaNoStorage('data:image/jpeg;base64,AAA'), false)
conferir('prévia local não é do Storage', estaNoStorage('blob:http://localhost/1'), false)
conferir('vazio não é do Storage', estaNoStorage(null), false)

conferir('sem internet', mensagemDoEnvio({ message: 'Failed to fetch' }), 'A foto não subiu: sem internet. O resto você pode salvar; tire a foto de novo depois.')
conferir('sem permissão', mensagemDoEnvio({ statusCode: '403', message: 'new row violates row-level security policy' }), 'A foto não subiu: você não tem permissão para mandar foto aqui.')
conferir('grande demais', mensagemDoEnvio({ statusCode: '413', message: 'Payload too large' }), 'A foto não subiu: ficou grande demais. Tente outra.')
conferir('erro desconhecido não vaza inglês', mensagemDoEnvio({ message: 'weird' }), 'A foto não subiu. O resto você pode salvar; tente a foto de novo depois.')

console.log(`${ok}/${tot} — fotos`)
if (ok !== tot) process.exit(1)
