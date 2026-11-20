// Gestão à Vista — sapata por tipo (desenho: docs/superpowers/specs/2026-11-19-gestao-a-vista-sapata-por-tipo-design.md).
// O projeto agrupa as sapatas por tipo ("S1=S2=…=S22 (X11)"), com as medidas do detalhe e um bloco da tabela de
// aço por tipo. Aqui ficam a leitura da lista, as contas por peça e o que gravar no quadro de peças.
// Sem React, sem banco, sem window: roda no Node (tests/sapataTipo.mjs).
//
// Medidas em metros: base A × B, rodapé h0, altura total H, topo do tronco a × b, lastro e, folga e
// profundidade da cava. Contas (decididas com o Israel, 19/11/2026):
//   concreto  = A·B·h0 + (h1/3)·(A·B + a·b + √(A·B·a·b)), h1 = H − h0 (tronco de pirâmide)
//   lastro    = A·B·e
//   forma     = 2·(A + B)·h0 (só o rodapé)
//   escavação = (A + 2·folga)·(B + 2·folga)·profundidade
//   armação   = Σ comprimento total (m) × peso por metro da bitola ÷ peças do tipo (a linha é do grupo inteiro)
import { SERVICOS_CALCULO, UNIDADE_DO_SERVICO } from './listas.js'
import { ordemNatural, lerNumero, limparRotulo } from './plantas.js'
import { chaveDaCelula } from './quantitativo.js'

// Peso por metro (kg/m) da NBR 7480. Cada planta pode trocar (o projetista do Israel usa 0,63 para 10 mm).
export const PESO_ACO_NBR = { 5: 0.154, 6.3: 0.245, 8: 0.395, 10: 0.617, 12.5: 0.963, 16: 1.578, 20: 2.466, 25: 3.853, 32: 6.313 }

const arred = (n, casas = 4) => Math.round(n * 10 ** casas) / 10 ** casas

// O nome do campo Peça, pela mesma regra de limparRotulo (maiúsculas); vazio = ''.
export const nomeDaPeca = (texto) => limparRotulo(texto) ?? ''

// O nome de uma marcação nova. O nome que veio do PDF (`doPdf`, de sugerirRotulo) ganha sempre: o campo Peça
// existe para a prancha cujo PDF não tem os nomes em texto, e um campo esquecido preenchido não pode renomear
// peça que o PDF já nomeia. A seta não usa o campo (é anotação). `usouCampo` diz se o campo deve avançar.
export function nomeDaMarcacaoNova(tipo, campo, doPdf) {
  if (doPdf) return { rotulo: doPdf, usouCampo: false }
  const doCampo = tipo === 'seta' ? '' : nomeDaPeca(campo)
  return doCampo ? { rotulo: doCampo, usouCampo: true } : { rotulo: null, usouCampo: false }
}

// Renomear uma etapa: as células que cada tipo lembra ter gravado (`ultimo`, chave "peça|etapa") passam a usar o
// nome novo, nos tipos e nos apagados ainda não aplicados. Sem isso, a conferência acharia as células "digitadas
// à mão" e apagar o tipo não as limparia. Devolve o objeto novo, ou null se a etapa não aparece em nenhum tipo.
export function renomearEtapaNosTipos(tiposDePeca, antigo, novo) {
  let mudou = false
  const renomear = (t) => {
    const ultimo = {}
    for (const [k, v] of Object.entries(t.ultimo ?? {})) {
      const i = k.lastIndexOf('|')
      if (k.slice(i + 1) === antigo) { ultimo[`${k.slice(0, i)}|${novo}`] = v; mudou = true } else ultimo[k] = v
    }
    return { ...t, ultimo }
  }
  const tipos = (tiposDePeca?.tipos ?? []).map(renomear)
  const removidos = (tiposDePeca?.removidos ?? []).map(renomear)
  return mudou ? { ...tiposDePeca, tipos, removidos } : null
}

// "S1=S2=S3 (X11)", "S1, S2; S3", "S1 a S5" → { pecas, declarado, aviso }. Peças em maiúsculas.
export function lerListaDePecas(texto) {
  let t = String(texto ?? '').toUpperCase()
  let declarado = null
  t = t.replace(/\(\s*(?:x\s*(\d+)|(\d+)\s*x)\s*\)/gi, (_, a, b) => { declarado = Number(a ?? b); return ' ' })
  const pecas = []
  const incluir = (p) => { if (p && !pecas.includes(p)) pecas.push(p) }
  t = t.replace(/([A-Za-z]+)(\d+)\s+(?:a|até)\s+\1(\d+)/gi, (_, prefixo, de, ate) => {
    for (let n = Number(de); n <= Number(ate); n++) incluir(`${prefixo}${n}`)
    return ' '
  })
  for (const p of t.split(/[=,;\s]+/)) incluir(p.trim())
  const aviso = declarado != null && declarado !== pecas.length ? `A prancha diz ${declarado} peças e a lista tem ${pecas.length}.` : null
  return { pecas, declarado, aviso }
}

// O formulário mede em CENTÍMETROS (como o detalhe da prancha) e aceita vírgula; o tipo guarda metros.
export const ROTULOS_DAS_MEDIDAS = {
  A: 'base A', B: 'base B', h0: 'altura do rodapé', H: 'altura total', a: 'topo a', b: 'topo b',
  e: 'lastro', folga: 'folga da cava', prof: 'profundidade da cava',
}
export const MEDIDAS_PADRAO_CM = { A: '', B: '', h0: '', H: '', a: '', b: '', e: '5', folga: '30', prof: '' }

// { tipo, erro }: o rascunho do formulário (textos em cm) como tipo (números em m).
export function tipoDoFormulario({ nome, pecasTexto, medidas, aco, aplicadas = [], ultimo = {} }) {
  const m = {}
  for (const [k, rotulo] of Object.entries(ROTULOS_DAS_MEDIDAS)) {
    const v = lerNumero(medidas?.[k])
    if (v === null) return { tipo: null, erro: `Medida inválida: ${rotulo}.` }
    m[k] = Math.round(v * 100) / 10000
  }
  const linhas = []
  for (const l of aco ?? []) {
    const b = String(l.bitola ?? '').trim()
    // A tabela da prancha imprime "10.989" (ponto de milhar): ponto seguido de 3 algarismos é milhar.
    const bruto = String(l.comprimento_cm ?? '').trim()
    const c = /^\d{1,3}(\.\d{3})+$/.test(bruto) ? bruto.replace(/\./g, '') : bruto
    if (!b && !c) continue
    const bitola = lerNumero(b)
    const comprimento = lerNumero(c)
    if (bitola === null || comprimento === null) return { tipo: null, erro: 'Preencha bitola e comprimento total em cada linha de aço.' }
    linhas.push({ bitola: String(bitola), comprimento_cm: comprimento })
  }
  return {
    tipo: { nome: String(nome ?? '').trim(), pecasTexto, pecas: lerListaDePecas(pecasTexto).pecas, medidas: m, aco: linhas, aplicadas, ultimo },
    erro: null,
  }
}

// Erro (frase) ou null. `outrosTipos` = os demais tipos da planta (uma peça só pode estar em um tipo).
export function validarTipo(tipo, outrosTipos) {
  if (!String(tipo.nome ?? '').trim()) return 'Dê um nome ao tipo.'
  const outros = outrosTipos.filter((o) => o !== tipo)
  if (outros.some((o) => o.nome.trim().toLowerCase() === tipo.nome.trim().toLowerCase())) return 'Já existe um tipo com esse nome.'
  if (!tipo.pecas?.length) return 'A lista de peças está vazia.'
  for (const p of tipo.pecas) {
    const dono = outros.find((o) => o.pecas.includes(p))
    if (dono) return `A peça ${p} já está no tipo ${dono.nome}.`
  }
  const m = tipo.medidas ?? {}
  if (!['A', 'B', 'h0', 'H', 'a', 'b', 'e', 'prof'].every((k) => Number(m[k]) > 0) || !(Number(m.folga) >= 0)) {
    return 'Preencha as medidas maiores que zero.'
  }
  if (m.H < m.h0) return 'A altura total não pode ser menor que o rodapé.'
  if (m.a > m.A || m.b > m.B) return 'O topo do tronco não pode ser maior que a base.'
  return null
}

export function contasDaSapata({ A, B, h0, H, a, b, e, folga, prof }) {
  const h1 = H - h0
  const tronco = h1 > 0 ? (h1 / 3) * (A * B + a * b + Math.sqrt(A * B * a * b)) : 0
  return {
    concreto: arred(A * B * h0 + tronco),
    lastro: arred(A * B * e),
    forma: arred(2 * (A + B) * h0),
    escavacao: arred((A + 2 * folga) * (B + 2 * folga) * prof),
  }
}

// kg de aço por peça. Cada linha é o total do GRUPO (como na tabela da prancha), por isso divide pelas peças.
export function acoPorPeca(linhas, nPecas, kgPorMetro) {
  let kg = 0
  for (const l of linhas ?? []) {
    const peso = kgPorMetro[String(Number(l.bitola))]
    if (!(peso > 0)) throw new Error(`Sem peso por metro para a bitola ${String(Number(l.bitola)).replace('.', ',')}.`)
    kg += (Number(l.comprimento_cm) / 100) * peso
  }
  return nPecas ? arred(kg / nPecas) : 0
}

// O valor de cada serviço para UMA peça do tipo, na unidade do serviço. Tipo sem linha de aço: Armação null
// ("sem quantitativo"), nunca 0, senão a armação executada somaria zero calada.
export function servicosDoTipo(tipo, kgPorMetro) {
  const c = contasDaSapata(tipo.medidas)
  const armacao = tipo.aco?.length ? acoPorPeca(tipo.aco, tipo.pecas.length, kgPorMetro) : null
  return { Escavação: c.escavacao, Lastro: c.lastro, Forma: c.forma, Armação: armacao, Concreto: c.concreto }
}

// O que aplicar os tipos grava no quadro de peças (só as células que mudam), os avisos (serviço sem etapa,
// unidade diferente), quantas células mudam e quantas tinham valor digitado à mão (diferente do que o tipo
// calculou da última vez), e os tipos com `aplicadas` e `ultimo` atualizados para guardar.
// `atual`: Map chaveDaCelula(peça, etapa) → número, o quadro gravado hoje. `removidos`: tipos apagados
// nesta edição; as células que eles gravaram (`ultimo`) saem do quadro, se ainda estão como o tipo deixou.
export function celulasDosTipos({ tipos, etapas, atual, kgPorMetro, removidos = [] }) {
  const avisos = []
  const destino = {} // serviço → { etapa, fator }
  for (const s of SERVICOS_CALCULO) {
    // Etapa arquivada não recebe célula (o "calcular como" dela é antigo).
    const etapa = etapas.find((e) => e.calcular_como === s && e.ativa !== false)
    if (!etapa) { avisos.push(`${s}: nenhuma etapa calculada como ${s}.`); continue }
    const esperado = UNIDADE_DO_SERVICO[s]
    if (etapa.unidade === esperado) destino[s] = { etapa: etapa.nome, fator: 1 }
    else if (s === 'Armação' && etapa.unidade === 't') destino[s] = { etapa: etapa.nome, fator: 1 / 1000 }
    else avisos.push(`${s}: a etapa ${etapa.nome} está em ${etapa.unidade}, o serviço é em ${esperado}.`)
  }
  const ordemEtapa = (nome) => etapas.findIndex((e) => e.nome === nome)
  const ligados = Object.entries(destino).sort(([, x], [, y]) => ordemEtapa(x.etapa) - ordemEtapa(y.etapa))
  const linhas = []
  let digitadas = 0
  // Peça que está em algum tipo agora nunca é apagada por outro (mudou de tipo na mesma aplicação).
  const emAlgumTipo = new Set(tipos.flatMap((t) => t.pecas))
  // "Digitado à mão" = valor que NENHUM tipo (nem um apagado) gravou ali. A peça que mudou de tipo traz o valor
  // do tipo antigo: isso não é digitação.
  const gravadoPorTipo = new Set([...tipos, ...removidos].flatMap((t) => Object.entries(t.ultimo ?? {}).map(([k, v]) => `${k}=${v}`)))
  const digitada = (k, agora) => agora != null && !gravadoPorTipo.has(`${k}=${agora}`)
  const novosTipos = tipos.map((tipo) => {
    const valores = servicosDoTipo(tipo, kgPorMetro)
    const ultimo = {}
    const pecas = [...tipo.pecas].sort(ordemNatural)
    const sairam = (tipo.aplicadas ?? []).filter((p) => !emAlgumTipo.has(p)).sort(ordemNatural)
    const mudar = (rotulo, etapa, quantidade) => {
      const k = chaveDaCelula(rotulo, etapa)
      const agora = atual.get(k) ?? null
      if (agora === quantidade) return
      if (digitada(k, agora)) digitadas++
      linhas.push({ rotulo, etapa, quantidade })
    }
    for (const p of pecas) {
      for (const [s, { etapa, fator }] of ligados) {
        if (valores[s] == null) {
          // Sem valor (tipo sem aço): limpa só a célula que o próprio tipo gravou; a digitada à mão fica.
          const k = chaveDaCelula(p, etapa)
          if (tipo.ultimo?.[k] != null && atual.get(k) === tipo.ultimo[k]) mudar(p, etapa, null)
          continue
        }
        const q = arred(valores[s] * fator, 6)
        ultimo[chaveDaCelula(p, etapa)] = q
        mudar(p, etapa, q)
      }
    }
    for (const p of sairam) for (const [, { etapa }] of ligados) mudar(p, etapa, null)
    return { ...tipo, aplicadas: [...tipo.pecas], ultimo }
  })
  for (const tipo of removidos) {
    for (const k of Object.keys(tipo.ultimo ?? {})) {
      const [rotulo, etapa] = k.split('|')
      if (atual.get(k) == null || emAlgumTipo.has(rotulo) || linhas.some((l) => l.rotulo === rotulo && l.etapa === etapa)) continue
      if (digitada(k, atual.get(k))) digitadas++
      linhas.push({ rotulo, etapa, quantidade: null })
    }
  }
  return { linhas, avisos, trocadas: linhas.length, digitadas, tipos: novosTipos }
}

// Depois de marcar uma peça: a próxima da lista (em ordem de obra) que ainda não foi marcada nesta etapa.
export function proximaPeca(pecas, marcadasNaEtapa, atual) {
  const lista = [...pecas].sort(ordemNatural)
  const i = lista.indexOf(atual)
  for (let k = 1; k <= lista.length; k++) {
    const p = lista[(Math.max(i, -1) + k + lista.length) % lista.length]
    if (!marcadasNaEtapa.has(p)) return p
  }
  return null
}
