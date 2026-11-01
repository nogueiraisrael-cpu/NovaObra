// Regras do efetivo do dia: a trava de duas obras e o deslocado do dia.
import { montarEfetivo, podeMarcarPresenca, resumoEfetivo, mensagemTrava } from '../src/lib/efetivo.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const funcionarios = [
  { id: 'joao', nome: 'João', obra_id: 'A', ativo: true },
  { id: 'edson', nome: 'Edson', obra_id: 'A', ativo: true },
  { id: 'ze', nome: 'Zé', obra_id: 'B', ativo: true },
  { id: 'inativo', nome: 'Velho', obra_id: 'A', ativo: false },
]
const linha = (obra_id, funcionario_id, situacao, obra_destino_id = null) => ({ obra_id, funcionario_id, situacao, obra_destino_id })

// Trava
const presenteEmB = [linha('B', 'joao', 'Veio de outra obra')]
conferir('presente em B bloqueia presença em A', podeMarcarPresenca('joao', 'A', presenteEmB), { ok: false, obraId: 'B' })
conferir('falta em B não bloqueia', podeMarcarPresenca('joao', 'A', [linha('B', 'joao', 'Falta')]), { ok: true, obraId: null })
conferir('presença na própria obra não bloqueia', podeMarcarPresenca('joao', 'A', [linha('A', 'joao', 'Presente')]), { ok: true, obraId: null })
conferir('mensagem da trava', mensagemTrava('João', 'Casa Lagoa 12'), 'João já está presente hoje na obra Casa Lagoa 12')

// Sem RDO ainda: todo lotado ativo aparece Presente, inativo some.
const vazio = montarEfetivo({ obraId: 'A', funcionarios, linhasDoDia: [] })
conferir('padrão é Presente, sem inativo', vazio.map((i) => [i.funcionario.id, i.situacao]), [['joao', 'Presente'], ['edson', 'Presente']])

// Edson deslocado de A para B: em A fica Deslocado; em B (sem RDO) aparece como vindo.
const desloc = [linha('A', 'edson', 'Deslocado', 'B')]
const emB = montarEfetivo({ obraId: 'B', funcionarios, linhasDoDia: desloc })
conferir('deslocado para B aparece em B como vindo', emB.map((i) => [i.funcionario.id, i.situacao]), [['ze', 'Presente'], ['edson', 'Veio de outra obra']])
conferir('em B ele não está gravado ainda', emB[1].gravada, false)

// Zé já presente em A (trazido): na obra B dele, aparece Deslocado para A.
const trazido = [linha('A', 'ze', 'Veio de outra obra')]
const emBTrazido = montarEfetivo({ obraId: 'B', funcionarios, linhasDoDia: trazido })
conferir('trazido para A fica Deslocado na obra dele', [emBTrazido[0].situacao, emBTrazido[0].obra_destino_id], ['Deslocado', 'A'])

// Resumo: Deslocado não conta como presença; Veio conta.
const r = resumoEfetivo(montarEfetivo({ obraId: 'A', funcionarios, linhasDoDia: [...desloc, ...trazido, linha('A', 'joao', 'Falta')] }))
conferir('resumo de A', r, { total: 3, presentes: 1, faltas: 1, deslocados: 1 })

console.log(`${ok}/${tot} — efetivo`)
process.exit(ok === tot ? 0 : 1)
