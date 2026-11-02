// Regras do quadro de pedidos de material (aba Materiais da obra). Puras.
//
// Cada pedido é um lote ("50 sacos de cimento") que anda pelas colunas de
// STATUS_PEDIDO. Toda mudança de coluna entra no histórico { status, data };
// é dele que saem o "há N dias nesta coluna" e o lead time.
import { STATUS_PEDIDO, PRIORIDADES_PEDIDO } from './listas.js'
import { diasEntre, somarDias } from './datas.js'

export const proximoStatus = (status) => STATUS_PEDIDO[STATUS_PEDIDO.indexOf(status) + 1] ?? null
export const statusAnterior = (status) => STATUS_PEDIDO[STATUS_PEDIDO.indexOf(status) - 1] ?? null

// "2,5", "50" e "2.000" viram número; o que não for número positivo vira null.
// Com vírgula, o ponto é de milhar ("1.234,5"). Sem vírgula, o ponto só é de milhar
// quando separa grupos de 3 ("2.000"); senão é decimal ("2.5"), para não virar 25.
export function lerQuantidade(texto) {
  const t = String(texto ?? '').trim()
  const milhar = t.includes(',') || /^\d{1,3}(\.\d{3})+$/.test(t)
  const limpo = milhar ? t.replace(/\./g, '').replace(',', '.') : t
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null
  const n = Number(limpo)
  return n > 0 ? n : null
}

// Só dígitos e uma vírgula: é o que o campo de quantidade deixa digitar.
export function filtrarQuantidade(texto) {
  const [inteiro, ...resto] = String(texto).replace(/[^\d,]/g, '').split(',')
  return resto.length ? `${inteiro},${resto.join('').slice(0, 2)}` : inteiro
}

export const formatarQuantidade = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })

// "10 latas", "1 saco", "0 sacos", "6 m³", "2.000 un": só a unidade escrita por extenso ganha plural.
export function quantidadeComUnidade(n, unidade) {
  const plural = (Number(n) > 1 || Number(n) === 0) && /^[a-zà-ú]+$/i.test(unidade) && unidade !== 'un' && /[aeiou]$/i.test(unidade)
  return `${formatarQuantidade(n)} ${plural ? `${unidade}s` : unidade}`.trim()
}

// Dias desde a última entrada no histórico (o dia em que o pedido chegou à coluna atual).
export function diasNaColuna(pedido, hoje) {
  const ultima = pedido.historico?.at(-1)
  return ultima ? Math.max(0, diasEntre(ultima.data, hoje)) : 0
}

// Já passou pelo checklist de recebimento e está no almoxarifado ou na frente.
export const foiRecebido = (pedido) => ['No almoxarifado', 'Entregue'].includes(pedido.status)

// Dias entre o pedido ("Solicitar") e a chegada ao almoxarifado. Null enquanto não está
// recebido (inclusive se voltou para Comprado depois de chegar).
export function leadTime(pedido) {
  if (!foiRecebido(pedido)) return null
  const h = pedido.historico ?? []
  const pedido_em = h.find((x) => x.status === 'Solicitar')?.data
  const chegou_em = h.find((x) => x.status === 'No almoxarifado')?.data
  return pedido_em && chegou_em ? Math.max(0, diasEntre(pedido_em, chegou_em)) : null
}

export const estaAtrasado = (pedido, hoje) =>
  pedido.status === 'Comprado' && Boolean(pedido.previsao_entrega) && pedido.previsao_entrega < hoje

// Comprado, ainda no prazo, com entrega prevista nos próximos 7 dias (hoje e mais 6).
export const chegaEstaSemana = (pedido, hoje) =>
  pedido.status === 'Comprado' && Boolean(pedido.previsao_entrega)
  && pedido.previsao_entrega >= hoje && pedido.previsao_entrega <= somarDias(hoje, 6)

// Recebido com quantidade que não bate com a NF ou material avariado. Só vale depois de
// receber: se o pedido voltar para Comprado, o checklist antigo não marca o cartão.
export const recebidoComProblema = (pedido) =>
  foiRecebido(pedido) && (pedido.qtd_bate_nf === false || pedido.estado_ok === false)

export function contadores(pedidos, hoje) {
  return {
    em_cotacao: pedidos.filter((p) => p.status === 'Em cotação').length,
    chegando_semana: pedidos.filter((p) => chegaEstaSemana(p, hoje)).length,
    atrasados: pedidos.filter((p) => estaAtrasado(p, hoje)).length,
  }
}

// Uma lista por coluna. Dentro de cada uma: atrasados, depois críticos, depois os parados há mais tempo.
export function montarQuadro(pedidos, hoje) {
  const peso = (p) => (estaAtrasado(p, hoje) ? 0 : p.prioridade === 'Crítico' ? 1 : 2)
  return Object.fromEntries(STATUS_PEDIDO.map((s) => [s, pedidos
    .filter((p) => p.status === s)
    .sort((a, b) => (peso(a) - peso(b)) || (diasNaColuna(b, hoje) - diasNaColuna(a, hoje)))]))
}

// Novo pedido: devolve { campo: mensagem } para cada campo com problema ({} = pode gravar).
export function validarNovoPedido({ material_id, quantidade, frente, prioridade }) {
  const erros = {}
  if (!material_id) erros.material_id = 'Escolha o material.'
  if (quantidade === '' || quantidade == null) erros.quantidade = 'Informe a quantidade.'
  else if (lerQuantidade(quantidade) === null) erros.quantidade = 'Quantidade tem que ser um número maior que zero.'
  if (!frente?.trim()) erros.frente = 'Informe a frente onde o material vai ser usado.'
  if (!PRIORIDADES_PEDIDO.includes(prioridade)) erros.prioridade = 'Escolha a prioridade.'
  return erros
}

// Como nasce um pedido: os campos que a tela (otimista) e o banco gravam iguais.
export const novoPedido = ({ material_id, quantidade, frente, prioridade }, hoje) => ({
  material_id, quantidade: lerQuantidade(quantidade), frente: frente.trim(), prioridade,
  status: 'Solicitar', historico: [{ status: 'Solicitar', data: hoje }],
})

// Colunas que pedem dados antes de o pedido entrar nelas (abrem um formulário).
export const pedeFormulario = (novo) => ['Comprado', 'No almoxarifado', 'Entregue'].includes(novo)

// O que cada coluna exige para o pedido entrar nela. Devolve { campo: mensagem }.
export function validarMovimento(pedido, novo, extras, hoje) {
  const erros = {}
  const idx = STATUS_PEDIDO.indexOf(novo)
  const atual = STATUS_PEDIDO.indexOf(pedido.status)
  if (idx < 0 || Math.abs(idx - atual) !== 1) {
    erros.status = 'O pedido anda uma coluna por vez.'
    return erros
  }
  if (idx < atual) return erros // voltar uma coluna não pede nada
  if (novo === 'Comprado') {
    if (!extras.fornecedor?.trim()) erros.fornecedor = 'Informe o fornecedor.'
    if (!extras.previsao_entrega) erros.previsao_entrega = 'Informe a previsão de entrega.'
    else if (extras.previsao_entrega < hoje) erros.previsao_entrega = 'A previsão não pode ser antes de hoje.'
  }
  if (novo === 'No almoxarifado') {
    if (typeof extras.qtd_bate_nf !== 'boolean') erros.qtd_bate_nf = 'Responda se a quantidade bate com a NF.'
    if (extras.qtd_bate_nf === false && lerQuantidade(extras.qtd_recebida) === null) erros.qtd_recebida = 'Informe quanto chegou de fato.'
    if (typeof extras.estado_ok !== 'boolean') erros.estado_ok = 'Responda se o material chegou em perfeito estado.'
  }
  if (novo === 'Entregue' && !extras.frente?.trim()) erros.frente = 'Confirme a frente de aplicação.'
  return erros
}

// Os campos que mudam no pedido ao entrar na coluna `novo` (só os desta coluna).
export function aplicarMovimento(pedido, novo, extras, hoje) {
  const campos = { status: novo, historico: [...(pedido.historico ?? []), { status: novo, data: hoje }] }
  const avancou = STATUS_PEDIDO.indexOf(novo) > STATUS_PEDIDO.indexOf(pedido.status)
  if (!avancou) return campos
  if (novo === 'Comprado') {
    campos.fornecedor = extras.fornecedor.trim()
    campos.previsao_entrega = extras.previsao_entrega
  }
  if (novo === 'No almoxarifado') {
    campos.qtd_bate_nf = extras.qtd_bate_nf
    // É o que entra no estoque: o pedido inteiro se bate com a nota, senão o que chegou de fato.
    campos.qtd_recebida = extras.qtd_bate_nf ? pedido.quantidade : lerQuantidade(extras.qtd_recebida)
    campos.estado_ok = extras.estado_ok
    campos.avarias = extras.avarias?.trim() || null
    campos.foto_nf = extras.foto_nf || null
  }
  if (novo === 'Entregue') campos.frente = extras.frente.trim()
  return campos
}
