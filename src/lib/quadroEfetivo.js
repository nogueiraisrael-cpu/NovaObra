// Efetivo geral: quantos funcionários de cada função estão lotados em cada obra.
// É um COMPARATIVO entre obras (ver AGENTS.md): conta o cadastro, não a presença do dia.
// Puras: sem React, sem banco.
import { FUNCOES } from './listas.js'

// Funções com fatia própria na pizza. As outras somam numa fatia "Outras",
// para a pizza nunca passar de 7 fatias.
export const FUNCOES_DA_PIZZA = ['Pedreiro', 'Servente', 'Armador', 'Carpinteiro', 'Eletricista', 'Encanador']
export const OUTRAS = 'Outras'

// Em qual fatia a função cai: a dela, ou "Outras". A tela pinta pela mesma regra.
export const grupoDaPizza = (funcao) => (FUNCOES_DA_PIZZA.includes(funcao) ? funcao : OUTRAS)

// [{ funcao, quantidade }] na ordem de FUNCOES, só as que têm alguém. Inativo não conta.
export function contarPorFuncao(funcionarios) {
  const ativos = funcionarios.filter((f) => f.ativo)
  return FUNCOES
    .map((funcao) => ({ funcao, quantidade: ativos.filter((f) => f.funcao === funcao).length }))
    .filter((x) => x.quantidade > 0)
}

const total = (contagem) => contagem.reduce((s, x) => s + x.quantidade, 0)

// Uma linha por obra, mais o total de todas as obras e quem não está em obra nenhuma.
export function montarQuadro(funcionarios, obras) {
  const porNome = [...obras].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const linhas = porNome.map((o) => {
    const contagem = contarPorFuncao(funcionarios.filter((f) => f.obra_id === o.id))
    return { id: o.id, nome: o.nome, codigo: o.codigo, situacao: o.situacao, contagem, total: total(contagem) }
  })
  const geral = contarPorFuncao(funcionarios.filter((f) => f.obra_id && obras.some((o) => o.id === f.obra_id)))
  const semObra = contarPorFuncao(funcionarios.filter((f) => !f.obra_id))
  return {
    obras: linhas,
    geral: { contagem: geral, total: total(geral) },
    semObra: { contagem: semObra, total: total(semObra) },
  }
}

// Fatias da pizza: as funções principais na ordem fixa, e "Outras" por último.
// `fracao` vai de 0 a 1; `inicio` é onde a fatia começa (a soma das anteriores).
// A cor é da função, nunca da posição.
export function fatiasDaPizza(contagem) {
  const soma = total(contagem)
  if (!soma) return []
  const qtd = (funcao) => contagem.find((x) => x.funcao === funcao)?.quantidade ?? 0
  const outras = contagem.filter((x) => grupoDaPizza(x.funcao) === OUTRAS).reduce((s, x) => s + x.quantidade, 0)
  const fatias = [...FUNCOES_DA_PIZZA.map((rotulo) => ({ rotulo, quantidade: qtd(rotulo) })), { rotulo: OUTRAS, quantidade: outras }]
    .filter((x) => x.quantidade > 0)
  let inicio = 0
  return fatias.map((x) => {
    const fatia = { ...x, fracao: x.quantidade / soma, inicio }
    inicio += fatia.fracao
    return fatia
  })
}

// "23%" — arredondado, para a tabela ao lado da pizza.
export function percentual(fracao) {
  return `${Math.round(fracao * 100)}%`
}
