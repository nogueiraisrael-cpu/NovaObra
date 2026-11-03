// Medições (v1.3): a conferência antes de gravar e o que vira linha no banco. Sem React e sem
// banco. A leitura da planilha mora em planilhaMedicao.js; aqui se decide o que ela vira.
//
// Dois níveis de problema:
//   - ERRO (validarMedicao): impede gravar. Nº vazio ou repetido, data faltando.
//   - AVISO (avisosDoContrato, conferirAbas): amarelo, o engenheiro confere e grava assim
//     mesmo. Fica guardado na medição (coluna avisos), para saber depois o que foi aceito.

import { TIPOS_MEDICAO } from './listas.js'

const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatarReais = (n) => REAIS.format(Number(n ?? 0))
export const ordinal = (n) => `${n}ª`
// Percentual com 1 casa ("63,2%") e quantidade com até 2 casas e a unidade da planilha ("125,40 M3").
export const formatarPct = (n) => `${Number(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
export const formatarQtd = (n, unidade) => `${Number(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unidade ? ` ${unidade}` : ''}`

const somar = (lista, campo) => Math.round(lista.reduce((s, i) => s + Number(i[campo] ?? 0), 0) * 100) / 100
// Diferença de centavos é arredondamento da própria planilha, não erro. Vale para a conferência
// (soma × total) e para o painel ("acima do contratado").
export const TOLERANCIA = 0.05
const bateComTotal = (a, b) => Math.abs(a - b) <= TOLERANCIA
const limpar = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const comparavel = (s) => limpar(s).toLocaleLowerCase('pt-BR')

// Quantos serviços um aviso cita pelo nome antes de virar "e mais N".
const CITADOS = 5
function citar(itens) {
  const nomes = itens.slice(0, CITADOS).map((i) => i.item).join(', ')
  return itens.length > CITADOS ? `${nomes} e mais ${itens.length - CITADOS}` : nomes
}

export const proximoNumero = (existentes) => Math.max(0, ...existentes.map((m) => m.numero)) + 1

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

// Os números da conferência. Os totais vêm da linha TOTAL GERAL; sem ela, da soma dos serviços.
export function resumoDoBoletim(lida) {
  const t = lida.total
  return {
    etapas: new Set(lida.itens.map((i) => i.etapa_codigo).filter(Boolean)).size,
    servicos: lida.itens.length,
    previsto: t ? t.previsto : somar(lida.itens, 'valor_previsto'),
    contratado: t ? t.contratado : somar(lida.itens, 'valor_contratado'),
    periodo: t ? t.periodo : somar(lida.itens, 'valor_periodo'),
    acumulado: t ? t.acumulado : somar(lida.itens, 'valor_acumulado'),
  }
}

// `conferido` = o que está nos campos da tela agora (nº e datas podem ter sido corrigidos).
// `anteriores` = os serviços da última medição do contrato desta obra (vazio na 1ª).
export function avisosDoContrato(lida, conferido, anteriores = []) {
  const avisos = []
  if (lida.cabecalho.numero === null) {
    avisos.push(`O nº da medição veio na planilha como “${lida.cabecalho.numeroLido || 'em branco'}”: confira o número.`)
  }
  const { data_medicao: data, periodo_inicio: ini, periodo_fim: fim } = conferido
  if (data && ((ini && data < ini) || (fim && data > fim))) avisos.push('A data da medição está fora do período.')
  if (!lida.total) {
    avisos.push('Não achei a linha “TOTAL GERAL DA MEDIÇÃO”: os totais abaixo são a soma dos serviços.')
  } else {
    for (const [campo, total, rotulo] of [
      ['valor_contratado', lida.total.contratado, 'adequado'],
      ['valor_periodo', lida.total.periodo, 'nesta medição'],
      ['valor_acumulado', lida.total.acumulado, 'acumulado'],
    ]) {
      const soma = somar(lida.itens, campo)
      if (!bateComTotal(soma, total)) {
        avisos.push(`A soma dos serviços (${rotulo}: ${formatarReais(soma)}) não bate com o TOTAL GERAL da planilha (${formatarReais(total)}).`)
      }
    }
  }
  for (const p of lida.problemas) avisos.push(`Linha ${p.linha}: ${p.motivo}. Ela ficou de fora.`)

  if (anteriores.length) {
    const agora = new Map(lida.itens.map((i) => [i.item, i]))
    const sumiram = anteriores.filter((a) => !agora.has(a.item))
    const mudaram = anteriores.filter((a) => agora.has(a.item) && comparavel(agora.get(a.item).descricao) !== comparavel(a.descricao))
    if (sumiram.length) avisos.push(`${sumiram.length === 1 ? 'O serviço' : 'Os serviços'} ${citar(sumiram)} ${sumiram.length === 1 ? 'estava' : 'estavam'} na medição anterior e não ${sumiram.length === 1 ? 'está' : 'estão'} nesta.`)
    if (mudaram.length) avisos.push(`${mudaram.length === 1 ? 'O serviço' : 'Os serviços'} ${citar(mudaram)} ${mudaram.length === 1 ? 'mudou' : 'mudaram'} de descrição desde a medição anterior.`)
  }
  return avisos
}

// ---------------------------------------------------------------------------
// Erros que impedem gravar (os dois tipos)
// ---------------------------------------------------------------------------

// `outrosNumeros` = os nº que já existem para o mesmo contrato ou empreiteiro (e, na importação
// de várias abas, os das outras abas marcadas). Devolve { numero, data, periodo } com as frases.
export function validarMedicao({ numero, data_medicao, periodo_inicio, periodo_fim }, outrosNumeros) {
  const erros = {}
  const n = Number(numero)
  if (numero === '' || numero == null) erros.numero = 'Digite o nº da medição.'
  else if (!Number.isInteger(n) || n < 1) erros.numero = 'O nº da medição é um número inteiro, de 1 para cima.'
  else if (outrosNumeros.includes(n)) erros.numero = `Já existe uma ${ordinal(n)} medição. Use outro número.`
  if (!data_medicao) erros.data = 'Escolha a data da medição.'
  if (periodo_inicio && periodo_fim && periodo_fim < periodo_inicio) erros.periodo = 'O fim do período vem antes do início.'
  return erros
}

const primeiroErro = (erros) => erros.numero ?? erros.data ?? erros.periodo ?? null

// ---------------------------------------------------------------------------
// Empreiteiro
// ---------------------------------------------------------------------------

// Os empreiteiros desta obra: os terceirizados das frentes e os que já têm medição.
// Mesmo nome com maiúscula diferente conta uma vez só.
export function nomesDeEmpreiteiros(frentes, medicoes) {
  const nomes = new Map()
  const juntar = (nome) => {
    const n = limpar(nome)
    if (n && !nomes.has(comparavel(n))) nomes.set(comparavel(n), n)
  }
  frentes.filter((f) => f.executor === 'Terceirizado').forEach((f) => juntar(f.empreiteiro))
  medicoes.filter((m) => m.tipo === 'Empreiteiro').forEach((m) => juntar(m.empreiteiro))
  return [...nomes.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// O nome digitado, com a grafia do que já existe ("reboco forte" vira "Reboco Forte"):
// assim o mesmo empreiteiro não aparece duas vezes na lista.
export function nomeDoEmpreiteiro(digitado, conhecidos) {
  const n = limpar(digitado)
  return conhecidos.find((c) => comparavel(c) === comparavel(n)) ?? n
}

// As medições já gravadas deste empreiteiro (sem ligar para maiúscula e espaço).
export const medicoesDoEmpreiteiro = (medicoes, nome) => medicoes.filter((m) => comparavel(m.empreiteiro) === comparavel(nome))

// O que a lista de abas mostra no topo: total no período e descontos das abas marcadas.
export const somaDasAbas = (abas) => ({ total: somar(abas, 'valor_periodo'), descontos: somar(abas, 'desconto') })

// Contra qual medição do contrato a conferência compara os serviços (o que sumiu ou mudou de
// descrição). Medição nova: a de maior nº. Trocando a planilha da 2ª: a de maior nº ANTES
// dela (a 1ª), mesmo que já exista a 3ª. Null quando não há anterior.
export function medicaoAnterior(contrato, trocando = null) {
  const antes = contrato.filter((m) => m.id !== trocando?.id && (!trocando || m.numero < trocando.numero))
  return antes.length ? antes.reduce((a, b) => (b.numero > a.numero ? b : a)) : null
}

// Cada aba do arquivo, pronta para a lista da tela: já está no app (mesma aba já importada para
// este empreiteiro)? nº repetido no arquivo? `existentes` = medições deste empreiteiro nesta obra.
export function conferirAbas(abas, existentes) {
  return abas.map((a) => {
    const repetidas = a.numero === null ? [] : abas.filter((b) => b !== a && b.numero === a.numero).map((b) => `“${limpar(b.aba)}”`)
    const avisos = []
    if (a.numero === null) avisos.push('Não achei o nº desta medição na aba.')
    if (repetidas.length) avisos.push(`O Nº ${a.numero} também está em ${repetidas.join(', ')}.`)
    if (!a.data) avisos.push('Não achei a data desta medição na aba.')
    const soma = somar(a.itens, 'valor_periodo')
    if (a.totalLido !== null && !bateComTotal(soma, a.totalLido)) {
      avisos.push(`A soma dos itens (${formatarReais(soma)}) não bate com o “Total no período” da aba (${formatarReais(a.totalLido)}).`)
    }
    for (const p of a.problemas) avisos.push(`Linha ${p.linha}: ${p.motivo}. Ela ficou de fora.`)
    return { ...a, jaNoApp: existentes.some((m) => m.aba_origem === a.aba), avisos }
  })
}

// O erro de cada aba marcada (ou null), na mesma ordem. O nº não pode repetir nem com o que
// já está no app nem entre as marcadas.
export function errosDasAbas(marcadas, existentes) {
  return marcadas.map((a) => {
    const outros = [...existentes.map((m) => m.numero), ...marcadas.filter((b) => b !== a).map((b) => Number(b.numero))]
    return primeiroErro(validarMedicao({ numero: a.numero, data_medicao: a.data }, outros))
  })
}

// ---------------------------------------------------------------------------
// O que vai para o banco
// ---------------------------------------------------------------------------

const CAMPOS_ITEM = [
  'linha_planilha', 'item', 'etapa_codigo', 'etapa_nome', 'subetapa_codigo', 'subetapa_nome', 'descricao', 'unidade',
  'preco_unitario', 'qtd_prevista', 'qtd_contratada', 'qtd_periodo', 'qtd_acumulada',
  'valor_previsto', 'valor_contratado', 'valor_periodo', 'valor_acumulado',
]
const itensParaGravar = (itens) => itens.map((i) => Object.fromEntries(CAMPOS_ITEM.map((c) => [c, i[c] ?? null])))

export function medicaoDoContrato(lida, conferido, arquivo, avisos) {
  return {
    campos: {
      tipo: 'Contrato', empreiteiro: null, numero: Number(conferido.numero), data_medicao: conferido.data_medicao,
      periodo_inicio: conferido.periodo_inicio || null, periodo_fim: conferido.periodo_fim || null,
      arquivo_nome: arquivo, aba_origem: lida.aba, valor_periodo: resumoDoBoletim(lida).periodo,
      desconto: null, valor_a_pagar: null, observacao: null, avisos,
    },
    itens: itensParaGravar(lida.itens),
  }
}

export function medicaoDaAba(aba, empreiteiro, arquivo) {
  return {
    campos: {
      tipo: 'Empreiteiro', empreiteiro: limpar(empreiteiro), numero: Number(aba.numero), data_medicao: aba.data,
      periodo_inicio: null, periodo_fim: null, arquivo_nome: arquivo, aba_origem: aba.aba,
      valor_periodo: aba.valor_periodo, desconto: aba.desconto, valor_a_pagar: aba.valor_a_pagar,
      observacao: aba.observacao || null, avisos: aba.avisos ?? [],
    },
    itens: itensParaGravar(aba.itens),
  }
}

// Confere o pacote inteiro antes de gravar (a camada de dados chama, com o que está no banco
// agora). `existentes` = medições do mesmo tipo (e empreiteiro) na obra. `excetoId` = a medição
// que está sendo trocada. Devolve a primeira frase de erro, ou null.
export function conferirParaGravar(medicoes, existentes, excetoId = null) {
  if (!medicoes.length) return 'Nenhuma medição marcada para importar.'
  // `existentes` só vale para um grupo (o contrato, ou um empreiteiro): um pacote misturado
  // escaparia da conferência do nº.
  const grupo = (c) => `${c.tipo}|${comparavel(c.empreiteiro)}`
  if (medicoes.some((m) => grupo(m.campos) !== grupo(medicoes[0].campos))) return 'Importe um contrato ou um empreiteiro de cada vez.'
  const jaGravadas = existentes.filter((m) => m.id !== excetoId)
  for (const m of medicoes) {
    const c = m.campos
    if (!TIPOS_MEDICAO.includes(c.tipo)) return `Tipo de medição desconhecido: ${c.tipo}.`
    if (c.tipo === 'Empreiteiro' && !c.empreiteiro) return 'Escolha ou digite o empreiteiro.'
    const outros = [...jaGravadas.map((x) => x.numero), ...medicoes.filter((o) => o !== m).map((o) => o.campos.numero)]
    const erro = primeiroErro(validarMedicao(c, outros))
    if (erro) return `${c.aba_origem && c.tipo === 'Empreiteiro' ? `Aba “${limpar(c.aba_origem)}”: ` : ''}${erro}`
  }
  return null
}
