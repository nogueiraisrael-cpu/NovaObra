// Fotos no Storage: o caminho que o banco confere e as frases de envio que falhou.
import { caminhoDaFoto, caminhoEhDe, estaNoStorage, mensagemDoEnvio } from '../src/lib/fotos.js'

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

const outra = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const arquivo = '0d9c8b7a-6f5e-4d3c-8b2a-1f0e9d8c7b6a.jpg'
conferir('apaga arquivo da mesma obra e módulo', caminhoEhDe(`${obra}/diario/${arquivo}`, obra, 'diario'), true)
conferir('não apaga arquivo de outra obra', caminhoEhDe(`${outra}/diario/${arquivo}`, obra, 'diario'), false)
conferir('não apaga a nota fiscal pelo diário', caminhoEhDe(`${obra}/nota-fiscal/${arquivo}`, obra, 'diario'), false)
conferir('não apaga caminho com pasta a mais', caminhoEhDe(`${obra}/diario/x/${arquivo}`, obra, 'diario'), false)
conferir('não apaga foto antiga dentro da tabela', caminhoEhDe('data:image/jpeg;base64,AA', obra, 'diario'), false)

conferir('sem internet', mensagemDoEnvio({ message: 'Failed to fetch' }), 'A foto não subiu: sem internet. O resto você pode salvar; tire a foto de novo depois.')
conferir('sem permissão', mensagemDoEnvio({ statusCode: '403', message: 'new row violates row-level security policy' }), 'A foto não subiu: você não tem permissão para mandar foto aqui.')
conferir('grande demais', mensagemDoEnvio({ statusCode: '413', message: 'Payload too large' }), 'A foto não subiu: ficou grande demais. Tente outra.')
conferir('erro desconhecido não vaza inglês', mensagemDoEnvio({ message: 'weird' }), 'A foto não subiu. O resto você pode salvar; tente a foto de novo depois.')

console.log(`${ok}/${tot} — fotos`)
if (ok !== tot) process.exit(1)
