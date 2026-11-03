// Quem pode o quê: a cópia em código do quadro (docs/permissoes/QUEM-PODE-O-QUE.md, dados em
// docs/permissoes/quadro.json). Toda tela pergunta `pode(acao, usuario, dono)`; nenhuma decide
// sozinha por perfil. tests/permissoes.mjs confere esta tabela contra o quadro.json, linha por linha.
// Esconder botão não protege nada: a barreira é o banco (RLS). Isto só decide o que a tela mostra.

const P = 'pode'
const D = 'só os dele'
const X = '·'
const N = 'ninguém'

import { ROLES } from './listas.js'

export const PERFIS = ROLES

// Ação → [admin_master, gerente, cliente]
export const QUADRO = {
  'obra.ver': [P, P, P],
  'obra.ver_comparativo': [P, P, X],
  'obra.criar': [P, X, X],
  'obra.editar': [P, X, X],
  'obra.apagar': [P, X, X],
  'obra.encerrar': [P, P, X],
  'usuarios.ver': [P, X, X],
  'usuarios.liberar': [P, X, X],
  'usuarios.bloquear': [P, X, X],
  'usuarios.editar_proprio_nome': [P, P, P],
  'usuarios.apagar': [X, X, X],
  'funcionarios.ver': [P, P, X],
  'funcionarios.criar': [P, P, X],
  'funcionarios.editar': [P, P, X],
  'funcionarios.desativar': [P, P, X],
  'funcionarios.apagar': [P, X, X],
  'equipamentos.ver': [P, P, X],
  'equipamentos.criar': [P, P, X],
  'equipamentos.editar': [P, P, X],
  'equipamentos.apagar': [P, X, X],
  'diario.ver': [P, P, X],
  'diario.criar': [P, P, X],
  'diario.editar': [P, P, X],
  'diario.apagar': [P, X, X],
  'diario.fechar': [P, P, X],
  'diario.trazer_de_outra_obra': [P, P, X],
  'frentes.ver': [P, P, P],
  'frentes.ver_parada': [P, P, X],
  'frentes.criar': [P, P, X],
  'frentes.editar': [P, P, X],
  'frentes.apagar': [P, X, X],
  'fotos.ver': [P, P, P],
  'fotos.criar': [P, P, X],
  'fotos.editar': [P, P, X],
  'fotos.apagar': [P, P, X],
  'presenca.ver': [P, P, X],
  'presenca.imprimir': [P, P, X],
  'ocorrencias.ver': [P, P, X],
  'ocorrencias.criar': [P, P, X],
  'ocorrencias.editar': [P, P, X],
  'ocorrencias.apagar': [P, X, X],
  'ocorrencias.resolver': [P, P, X],
  'comentarios.interno': [P, P, X],
  'comentarios.cliente_ver': [P, P, P],
  'comentarios.cliente_escrever': [P, P, X],
  'comentarios.editar': [P, X, X],
  'comentarios.apagar': [P, D, X],
  'comentarios.marcar_lido': [P, D, D],
  'pranchas.ver': [P, P, P],
  'pranchas.criar': [P, P, X],
  'pranchas.editar': [P, P, X],
  'pranchas.apagar': [P, X, X],
  'pranchas.pintar': [P, P, X],
  'medicoes.ver': [P, X, X],
  'medicoes.criar': [P, X, X],
  'medicoes.trocar_planilha': [P, X, X],
  'medicoes.baixar_original': [P, X, X],
  'medicoes.apagar': [P, X, X],
  'catalogo.ver': [P, P, X],
  'catalogo.criar': [P, P, X],
  'catalogo.editar': [P, X, X],
  'catalogo.apagar': [P, X, X],
  'pedidos.ver': [P, P, X],
  'pedidos.criar': [P, P, X],
  'pedidos.editar': [P, P, X],
  'pedidos.apagar': [P, P, X],
  'pedidos.ver_nota_fiscal': [P, X, X],
  'estoque.ver': [P, P, X],
  'estoque.cadastrar_insumo': [P, P, X],
  'estoque.baixa_manual': [P, P, X],
  'estoque.apagar_movimento': [P, X, X],
  'planejamento.ver': [P, P, X],
  'planejamento.criar': [P, P, X],
  'planejamento.editar': [P, P, X],
  'planejamento.mover_kanban': [P, P, X],
  'planejamento.arquivar': [P, P, X],
  'planejamento.planilha': [P, P, X],
  'historico.ver': [P, X, X],
  'historico.escrever': [N, N, N],
}

// A pessoa pode fazer `acao`? `dono` é o id de quem criou o registro (para "só os dele").
// Conta pendente ou bloqueada não pode nada. Ação fora do quadro é erro de programação.
export function pode(acao, usuario, dono = null) {
  const linha = QUADRO[acao]
  if (!linha) throw new Error(`Ação fora do quadro de permissões: ${acao}`)
  if (!usuario || usuario.status !== 'ativo') return false
  const valor = linha[PERFIS.indexOf(usuario.role)]
  if (valor === P) return true
  if (valor === D) return Boolean(dono) && dono === usuario.id
  return false
}

// Quem vê todas as obras: só o admin ativo (quadro, seção 2). Os outros, só as liberadas.
export const veTodasAsObras = (usuario) => usuario?.status === 'ativo' && usuario.role === 'admin_master'

// O gerente (e, na v1.1, o cliente) precisa de obras liberadas; o admin não tem lista.
export const precisaEscolherObras = (role) => Boolean(role) && role !== 'admin_master'

// Os textos que mudam conforme a pessoa vê todas as obras ou só as dela.
export function textosDeObras(usuario) {
  const todas = veTodasAsObras(usuario)
  return {
    acesso: todas ? 'todas as obras' : 'obras liberadas',
    comparativo: todas ? 'Comparativo de todas as obras' : 'Comparativo das suas obras',
    comparar: todas ? 'Comparar todas as obras' : 'Comparar as suas obras',
    semObra: todas ? 'Nenhuma obra cadastrada' : 'Nenhuma obra liberada',
  }
}

// As obras que a pessoa enxerga: o admin, todas; os outros, só as liberadas em `membros`.
export function obrasVisiveis(obras, usuario, membros) {
  if (!usuario || usuario.status !== 'ativo') return []
  if (veTodasAsObras(usuario)) return obras
  const liberadas = new Set(membros.filter((m) => m.profile_id === usuario.id).map((m) => m.obra_id))
  return obras.filter((o) => liberadas.has(o.id))
}

// O que é preciso poder para abrir cada tela e cada aba (quadro, seção 5: o menu segue o "Ver").
const PARA_ABRIR = {
  obras: 'obra.ver_comparativo',
  obra: 'obra.ver',
  ocorrencias: 'ocorrencias.ver',
  equipamentos: 'equipamentos.ver',
  pessoas: 'funcionarios.ver',
  presenca: 'presenca.ver',
  efetivo: 'obra.ver_comparativo',
  perfil: 'usuarios.editar_proprio_nome',
  Hoje: 'diario.ver',
  Diários: 'diario.ver',
  Fotos: 'fotos.ver',
  Comentários: 'comentarios.interno',
  Pranchas: 'pranchas.ver',
  Medições: 'medicoes.ver',
  Materiais: 'pedidos.ver',
  Planejamento: 'planejamento.ver',
}

export function podeAbrir(tela, usuario) {
  const acao = PARA_ABRIR[tela]
  if (!acao) throw new Error(`Tela sem regra de acesso: ${tela}`)
  return pode(acao, usuario)
}
