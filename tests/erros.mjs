// Erro de programação nunca chega à tela em inglês; a frase das regras chega igual.
import { fraseDoErroInterno, FRASE_ERRO_INTERNO } from '../src/lib/erros.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('TypeError vira frase em português', fraseDoErroInterno(new TypeError('Cannot read properties of undefined')), FRASE_ERRO_INTERNO)
conferir('ReferenceError vira frase em português', fraseDoErroInterno(new ReferenceError('x is not defined')), FRASE_ERRO_INTERNO)
conferir('frase de regra passa igual', fraseDoErroInterno(new Error('Nenhuma obra escolhida')), 'Nenhuma obra escolhida')
conferir('erro sem mensagem vira frase', fraseDoErroInterno(new Error('')), FRASE_ERRO_INTERNO)

console.log(`${ok}/${tot} — erros`)
if (ok !== tot) process.exit(1)
