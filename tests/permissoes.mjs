// Permissões: o código (src/lib/permissoes.js) é cópia fiel do quadro decidido pelo Israel
// (docs/permissoes/quadro.json). Mudou um sem o outro, este teste reprova.
import fs from 'node:fs'
import { QUADRO, PERFIS, pode, obrasVisiveis, podeAbrir } from '../src/lib/permissoes.js'

const quadro = JSON.parse(fs.readFileSync(new URL('../docs/permissoes/quadro.json', import.meta.url), 'utf8'))

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('mesmos perfis do quadro', PERFIS, quadro.perfis)
conferir('mesmas ações do quadro', Object.keys(QUADRO).sort(), Object.keys(quadro.acoes).sort())
for (const [acao, linha] of Object.entries(quadro.acoes)) {
  conferir(`célula ${acao}`, QUADRO[acao], PERFIS.map((p) => linha[p]))
}

const admin = { id: 'a', role: 'admin_master', status: 'ativo' }
const gerente = { id: 'g', role: 'gerente', status: 'ativo' }
const cliente = { id: 'c', role: 'cliente', status: 'ativo' }
conferir('admin vê medições', pode('medicoes.ver', admin), true)
conferir('gerente NÃO vê medições', pode('medicoes.ver', gerente), false)
conferir('gerente NÃO vê a nota fiscal', pode('pedidos.ver_nota_fiscal', gerente), false)
conferir('gerente NÃO vê usuários', pode('usuarios.ver', gerente), false)
conferir('gerente apaga pedido', pode('pedidos.apagar', gerente), true)
conferir('gerente NÃO apaga baixa do estoque', pode('estoque.apagar_movimento', gerente), false)
conferir('gerente apaga o próprio comentário', pode('comentarios.apagar', gerente, 'g'), true)
conferir('gerente NÃO apaga comentário de outro', pode('comentarios.apagar', gerente, 'a'), false)
conferir('"só os dele" sem dono é não', pode('comentarios.apagar', gerente), false)
conferir('cliente não vê diário', pode('diario.ver', cliente), false)
conferir('ninguém escreve o histórico, nem o admin', pode('historico.escrever', admin), false)
conferir('pendente não pode nada', pode('obra.ver', { id: 'p', role: null, status: 'pendente' }), false)
conferir('bloqueado não pode nada, mesmo admin', pode('obra.ver', { ...admin, status: 'bloqueado' }), false)
conferir('sem login não pode nada', pode('obra.ver', null), false)
let estourou = false
try { pode('obra.inventada', admin) } catch { estourou = true }
conferir('ação fora do quadro é erro', estourou, true)

const obras = [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }]
const membros = [{ obra_id: 'o2', profile_id: 'g' }, { obra_id: 'o3', profile_id: 'outro' }]
conferir('admin vê todas as obras', obrasVisiveis(obras, admin, membros).map((o) => o.id), ['o1', 'o2', 'o3'])
conferir('gerente vê só a liberada para ele', obrasVisiveis(obras, gerente, membros).map((o) => o.id), ['o2'])
conferir('gerente sem obra liberada não vê nenhuma', obrasVisiveis(obras, gerente, []).map((o) => o.id), [])
conferir('pendente não vê obra', obrasVisiveis(obras, { id: 'g', role: 'gerente', status: 'pendente' }, membros), [])

conferir('aba Medições some para o gerente', podeAbrir('Medições', gerente), false)
conferir('aba Medições aparece para o admin', podeAbrir('Medições', admin), true)
conferir('gerente abre o comparativo de obras', podeAbrir('obras', gerente), true)
conferir('todo ativo abre o Perfil', podeAbrir('perfil', cliente), true)

console.log(`${ok}/${tot} — permissoes`)
if (ok !== tot) process.exit(1)
