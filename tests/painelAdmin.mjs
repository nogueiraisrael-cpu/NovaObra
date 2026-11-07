// O que a lista do Painel de admin mostra.
import { ordenarUsuarios, resumoDasObras, textoDoAcesso } from '../src/lib/painelAdmin.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const lista = [{ nome: 'Bia', status: 'bloqueado' }, { nome: 'Caio', status: 'ativo' }, { nome: 'Ana', status: 'ativo' }, { nome: 'Davi', status: 'pendente' }]
conferir('pendente no topo, bloqueado no fim', ordenarUsuarios(lista).map((u) => u.nome), ['Davi', 'Ana', 'Caio', 'Bia'])
const obras = [{ id: 'a', codigo: 'SERRA4' }, { id: 'b', codigo: 'UBS-NE' }]
conferir('admin vê todas', resumoDasObras({ role: 'admin_master', obras: [] }, obras), 'Todas as obras')
conferir('gerente mostra as dele', resumoDasObras({ role: 'gerente', obras: ['b'] }, obras), 'UBS-NE')
conferir('sem obra diz que não tem', resumoDasObras({ role: 'gerente', obras: [] }, obras), 'Nenhuma obra liberada')
conferir('quem nunca entrou', textoDoAcesso(null), 'Ainda não entrou')
conferir('último acesso tem data', /^Último acesso: \d\d\/\d\d às/.test(textoDoAcesso('2026-11-03T13:38:00Z')), true)

console.log(`${ok}/${tot} — painelAdmin`)
if (ok !== tot) process.exit(1)
