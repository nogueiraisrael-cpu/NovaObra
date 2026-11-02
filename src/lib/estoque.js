// Regras do estoque (aba Materiais → Estoque). Puras.
//
// O saldo não é guardado em lugar nenhum: é a soma das movimentações (entradas menos
// saídas) de cada insumo. A entrada vem do pedido recebido no almoxarifado, a saída do
// pedido entregue na frente ou da baixa manual.
import { lerQuantidade, quantidadeComUnidade } from './materiais.js'

const sinal = (m) => (m.tipo === 'Entrada' ? 1 : -1) * Number(m.quantidade)
// Soma em centésimos: 0,1 + 0,2 não pode virar 0,30000000000000004.
const arredondar = (n) => Math.round(n * 100) / 100

export const saldoDe = (movimentos, insumoId) =>
  arredondar(movimentos.filter((m) => m.insumo_id === insumoId).reduce((s, m) => s + sinal(m), 0))

// Mínimo 0 quer dizer "sem mínimo definido": o insumo nunca fica crítico.
export function situacao(saldo, minimo) {
  if (!(Number(minimo) > 0)) return 'Sem mínimo'
  return saldo <= Number(minimo) ? 'Crítico' : 'Ok'
}

// Uma linha por insumo da obra. Críticos primeiro, depois por nome.
export function montarEstoque(insumos, movimentos, materiais) {
  return insumos.map((i) => {
    const m = materiais.find((x) => x.id === i.material_id)
    const saldo = saldoDe(movimentos, i.id)
    const saldo_minimo = Number(i.saldo_minimo)
    return {
      id: i.id, material_id: i.material_id, nome: m?.nome ?? 'Material removido', unidade: m?.unidade ?? '',
      saldo, saldo_minimo, situacao: situacao(saldo, saldo_minimo),
    }
  }).sort((a, b) => ((a.situacao === 'Crítico' ? 0 : 1) - (b.situacao === 'Crítico' ? 0 : 1)) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

// A mesma linha depois de uma entrada (+) ou saída (−), para a tela mudar na hora.
export function ajustarLinha(linha, delta) {
  const saldo = arredondar(linha.saldo + delta)
  return { ...linha, saldo, situacao: situacao(saldo, linha.saldo_minimo) }
}

export const contarCriticos = (linhas) => linhas.filter((l) => l.situacao === 'Crítico').length

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function filtrarEstoque(linhas, { busca = '', soCriticos = false } = {}) {
  const termo = semAcento(busca.trim())
  return linhas.filter((l) => (!soCriticos || l.situacao === 'Crítico') && (!termo || semAcento(l.nome).includes(termo)))
}

// Baixa manual: devolve { campo: mensagem }. O saldo nunca fica negativo.
export function validarBaixa({ insumo_id, quantidade, frente, data }, linha, hoje) {
  const erros = {}
  if (!insumo_id || !linha) erros.insumo_id = 'Escolha o insumo.'
  const n = lerQuantidade(quantidade)
  if (quantidade === '' || quantidade == null) erros.quantidade = 'Informe a quantidade.'
  else if (n === null) erros.quantidade = 'Quantidade tem que ser um número maior que zero.'
  else if (linha && n > linha.saldo) erros.quantidade = `Saldo insuficiente: há só ${quantidadeComUnidade(linha.saldo, linha.unidade)} no estoque.`
  if (!frente?.trim()) erros.frente = 'Informe a frente onde o material foi usado.'
  if (!data) erros.data = 'Informe a data.'
  else if (data > hoje) erros.data = 'A data não pode ser depois de hoje.'
  return erros
}

// Saldo mínimo digitado: vazio ou "0" = sem mínimo. Null se não for número.
export function lerMinimo(texto) {
  const t = String(texto ?? '').trim()
  if (t === '' || /^0+([.,]0*)?$/.test(t)) return 0
  return lerQuantidade(t)
}

export const validarMinimo = (texto) => (lerMinimo(texto) === null ? 'O mínimo tem que ser um número (0 = sem mínimo).' : null)

// Só a baixa manual se desfaz pelo histórico: o que veio de pedido se desfaz voltando o pedido.
export const podeDesfazer = (movimento) => movimento.tipo === 'Saída' && movimento.origem === 'Manual'

// Histórico do mais novo para o mais antigo (no mesmo dia, o lançado por último primeiro).
export const ordenarHistorico = (movimentos) => [...movimentos].sort((a, b) =>
  b.data.localeCompare(a.data) || String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))

// O que mudar o pedido de coluna faz no estoque. `depois` é o pedido já na coluna nova.
// Devolve { tipo, desfazer, quantidade } ou null (a coluna não mexe no estoque):
//   chegou no almoxarifado → Entrada        · voltou do almoxarifado → desfaz a Entrada
//   entregue na frente     → Saída          · voltou da entrega      → desfaz a Saída
export function efeitoNoEstoque(antes, depois) {
  const quantidade = Number(depois.qtd_recebida ?? antes.qtd_recebida ?? depois.quantidade)
  const de = antes.status
  const para = depois.status
  if (de === 'Comprado' && para === 'No almoxarifado') return { tipo: 'Entrada', desfazer: false, quantidade }
  if (de === 'No almoxarifado' && para === 'Comprado') return { tipo: 'Entrada', desfazer: true, quantidade }
  if (de === 'No almoxarifado' && para === 'Entregue') return { tipo: 'Saída', desfazer: false, quantidade }
  if (de === 'Entregue' && para === 'No almoxarifado') return { tipo: 'Saída', desfazer: true, quantidade }
  return null
}

// Entregar na frente leva o que SOBROU do lote: o que já saiu por baixa manual não sai de novo.
// Se não sobrou nada, a entrega não mexe no estoque (null).
export function saidaDoQueSobrou(efeito, saldo) {
  if (!efeito || efeito.tipo !== 'Saída' || efeito.desfazer) return efeito
  const quantidade = Math.min(efeito.quantidade, saldo)
  return quantidade > 0 ? { ...efeito, quantidade } : null
}

// O que impede o movimento por causa do saldo (null = pode). `saldo` é o atual do insumo.
// Só voltar um recebimento já consumido é impedido: o saldo ficaria negativo.
export function bloqueioNoEstoque(efeito, saldo, unidade) {
  if (efeito?.tipo === 'Entrada' && efeito.desfazer && efeito.quantidade > saldo) {
    return `Parte deste lote já saiu do estoque (há ${quantidadeComUnidade(saldo, unidade)}). Não dá para voltar o recebimento.`
  }
  return null
}
