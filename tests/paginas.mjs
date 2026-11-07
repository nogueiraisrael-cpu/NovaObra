// Lista grande: nada some quando a tabela passa de 1.000 linhas.
import { lerTudo, PAGINA } from '../src/lib/paginas.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Um banco de mentira que corta em 1.000 por pedido, como o Supabase.
const tabela = (n) => Array.from({ length: n }, (_, i) => i)
const banco = (linhas) => async (de, ate) => linhas.slice(de, Math.min(ate + 1, de + PAGINA))

conferir('2.500 linhas vêm todas', (await lerTudo(banco(tabela(2500)))).length, 2500)
conferir('exatamente 1.000 vêm todas', (await lerTudo(banco(tabela(1000)))).length, 1000)
conferir('1.001 vêm todas', (await lerTudo(banco(tabela(1001)))).length, 1001)
conferir('nada repete nem pula', (await lerTudo(banco(tabela(2500)))).every((v, i) => v === i), true)
conferir('tabela vazia não quebra', await lerTudo(banco([])), [])

console.log(`${ok}/${tot} — paginas`)
if (ok !== tot) process.exit(1)
