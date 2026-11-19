// Gestão à Vista — o quantitativo: quanto vale cada peça em cada etapa medida (o "quadro de peças",
// tabela planta_quantitativos), o resumo da planta e o andamento da obra contra a medição do contrato.
// Sem React, sem banco, sem window: roda no Node (tests/quantitativo.mjs).
//
// Regras decididas com o Israel (19/11/2026, docs/superpowers/specs/2026-11-19-gestao-a-vista-quantitativo-design.md):
// - cada peça tem nome próprio (S1, S2…), e o tamanho de cada uma pode ser diferente;
// - o valor de uma marcação é CALCULADO na leitura, nunca gravado: corrigir o quadro corrige tudo;
// - quantidade digitada na marcação manda sobre o quadro;
// - a mesma peça conta uma vez por etapa (marcada duas vezes por engano não soma em dobro);
// - peça sem valor no quadro fica "sem quantitativo": não soma zero calado.
import { ordemNatural, lerNumero } from './plantas.js'
import { PADRAO_PECA } from './plantaGeometria.js'

const chave = (plantaId, rotulo, etapa) => `${plantaId ?? ''}|${rotulo}|${etapa}`
const arred = (n) => Math.round(n * 10000) / 10000
const porCriacao = (a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')) || String(a.id).localeCompare(String(b.id))
const medida = (etapa) => Boolean(etapa?.unidade) && etapa.unidade !== 'un'

// Mapa "planta|peça|etapa" → quantidade, a partir das linhas de planta_quantitativos.
export function quadroDe(quantitativos) {
  return new Map((quantitativos ?? []).filter((q) => q.quantidade != null).map((q) => [chave(q.planta_id, q.rotulo, q.etapa), Number(q.quantidade)]))
}

// As peças que o quadro oferece: os nomes que parecem peça na camada de texto do PDF, os nomes já
// usados em marcações e os que já estão no quadro. Sem repetir, em ordem de obra (S2 antes de S10).
export function pecasDaPlanta({ textos, marcacoes, quantitativos }) {
  const nomes = new Set()
  for (const t of textos ?? []) if (PADRAO_PECA.test(t.s ?? '')) nomes.add(t.s)
  for (const m of marcacoes ?? []) if (m.rotulo) nomes.add(m.rotulo)
  for (const q of quantitativos ?? []) if (q.rotulo) nomes.add(q.rotulo)
  return [...nomes].sort(ordemNatural)
}

// Quanto vale UMA marcação, sozinha: a digitada; etapa "un" vale 1; senão o quadro; senão null.
export function valorDaMarcacao(m, etapa, quadro) {
  if (m.quantidade != null) return Number(m.quantidade) || 0
  if (!medida(etapa)) return 1
  if (!m.rotulo) return null
  return quadro.get(chave(m.planta_id, m.rotulo, m.etapa ?? etapa.nome)) ?? null
}

// O valor de cada marcação (id → número, ou null = sem quantitativo), com a regra "a mesma peça
// conta uma vez por etapa": entre as marcações sem quantidade digitada de uma mesma peça na mesma
// etapa e planta, só a mais antiga vale; as outras valem 0 (já contadas, não "sem quantitativo").
// Peça com parte digitada e uma marcação vazia (0,36 num dia, "o resto" no outro): a vazia quer dizer
// "a peça fechou", e vale só o que falta para o valor do quadro (a peça soma o quadro, nunca mais
// que isso por causa da vazia; o digitado acima do quadro continua valendo, porque foi digitado).
export function valoresDasMarcacoes(marcacoes, etapasPorNome, quadro) {
  const valores = new Map()
  const digitado = new Map()
  for (const m of marcacoes) {
    if (m.quantidade != null && m.rotulo) {
      const k = chave(m.planta_id, m.rotulo, m.etapa)
      digitado.set(k, (digitado.get(k) ?? 0) + (Number(m.quantidade) || 0))
    }
  }
  const contadas = new Set()
  for (const m of [...marcacoes].sort(porCriacao)) {
    const etapa = etapasPorNome.get(m.etapa) ?? { nome: m.etapa, unidade: m.quantidade == null ? 'un' : '' }
    if (m.quantidade == null && m.rotulo) {
      const k = chave(m.planta_id, m.rotulo, m.etapa)
      if (contadas.has(k)) { valores.set(m.id, 0); continue }
      contadas.add(k)
      const v = valorDaMarcacao(m, etapa, quadro)
      valores.set(m.id, v != null && digitado.has(k) && medida(etapa) ? arred(Math.max(0, v - digitado.get(k))) : v)
      continue
    }
    valores.set(m.id, valorDaMarcacao(m, etapa, quadro))
  }
  return valores
}

// O que uma etapa já tem feito: peças (rótulos distintos; marcação sem nome conta sozinha), soma,
// marcações sem quantitativo, e o que entrou hoje.
export function somaDaEtapa(marcacoes, etapa, quadro, hoje, valores = null) {
  const daEtapa = marcacoes.filter((m) => m.etapa === etapa.nome)
  const val = valores ?? valoresDasMarcacoes(daEtapa, new Map([[etapa.nome, etapa]]), quadro)
  const pecasDe = (lista) => new Set(lista.map((m) => (m.rotulo ? `${m.planta_id ?? ''}|${m.rotulo}` : m.id))).size
  const soma = (lista) => arred(lista.reduce((s, m) => s + (val.get(m.id) ?? 0), 0))
  const deHoje = daEtapa.filter((m) => m.data === hoje)
  return {
    pecas: pecasDe(daEtapa), feito: soma(daEtapa),
    semQuantitativo: daEtapa.filter((m) => val.get(m.id) === null).length,
    hojePecas: pecasDe(deHoje), hojeFeito: soma(deHoje),
  }
}

// O previsto de uma etapa medida: as peças da lista que têm valor no quadro, e a soma delas.
export function previstoDaEtapa(etapa, quadro, pecas, plantaId = null) {
  const comValor = pecas.map((p) => quadro.get(chave(plantaId, p, etapa.nome))).filter((v) => v != null)
  return { pecas: comValor.length, previsto: arred(comValor.reduce((s, v) => s + v, 0)) }
}

// O quadro de resumo do editor, por etapa: feitas de total, feito de previsto, %, o de hoje e as
// marcações sem quantitativo. Etapa "un": o previsto é a meta da etapa (como a legenda antiga).
export function resumoDaPlanta(etapas, marcacoes, quantitativos, pecas, hoje) {
  const quadro = quadroDe(quantitativos)
  const plantaId = quantitativos?.[0]?.planta_id ?? marcacoes?.[0]?.planta_id ?? null
  const valores = valoresDasMarcacoes(marcacoes, new Map(etapas.map((e) => [e.nome, e])), quadro)
  return etapas.map((e) => {
    const s = somaDaEtapa(marcacoes, e, quadro, hoje, valores)
    // Etapa medida: o previsto é a soma do quadro; sem quadro, a meta da etapa (se houver) continua valendo.
    const doQuadro = medida(e) ? previstoDaEtapa(e, quadro, pecas, plantaId) : null
    const p = doQuadro?.previsto
      ? doQuadro
      : { pecas: medida(e) ? null : (e.meta ? Number(e.meta) : null), previsto: e.meta ? Number(e.meta) : null }
    return {
      nome: e.nome, cor: e.cor, unidade: e.unidade || 'un', legado: Boolean(e.legado),
      feitas: s.pecas, totalPecas: p.pecas, feito: s.feito, previsto: p.previsto,
      pct: p.previsto ? Math.round((s.feito / p.previsto) * 100) : null,
      hojePecas: s.hojePecas, hojeFeito: s.hojeFeito, semQuantitativo: s.semQuantitativo,
    }
  })
}

// O valor da peça nesta etapa, no quadro da planta (ou null).
export const valorNoQuadro = (quadro, plantaId, rotulo, etapa) => (rotulo ? quadro.get(chave(plantaId, rotulo, etapa)) ?? null : null)

// Chave de uma célula no rascunho do painel (peça + etapa, dentro de uma planta).
export const chaveDaCelula = (rotulo, etapa) => `${rotulo}|${etapa}`

// O que mudou entre o rascunho do painel (texto digitado) e o quadro gravado (números): só essas
// células vão para o banco. Texto vazio = apagar a célula. Texto que não é número: frase dizendo onde.
export function linhasDoRascunho(rascunho, original) {
  const linhas = []
  for (const [k, texto] of rascunho) {
    const [rotulo, etapa] = k.split('|')
    const vazio = !String(texto ?? '').trim()
    const quantidade = vazio ? null : lerNumero(texto)
    if (!vazio && quantidade === null) return { linhas: [], erro: `Número inválido em ${rotulo} · ${etapa}.` }
    if ((original.get(k) ?? null) === quantidade) continue
    linhas.push({ rotulo, etapa, quantidade })
  }
  return { linhas, erro: null }
}

// As células que vão para o banco estão certas? Erro (frase) ou null. Vazio (null) = apagar a célula.
export function conferirLinhasDoQuadro(linhas) {
  for (const l of linhas) {
    if (!String(l.rotulo ?? '').trim()) return 'Cada peça precisa de um nome.'
    if (!String(l.etapa ?? '').trim()) return 'Escolha a etapa.'
    if (l.quantidade != null && !(typeof l.quantidade === 'number' && Number.isFinite(l.quantidade) && l.quantidade >= 0)) {
      return 'A quantidade tem que ser um número maior ou igual a zero.'
    }
  }
  return null
}

// "Aplicar nas iguais": as mesmas quantidades (null = apagar a célula) em várias peças.
export function linhasParaAplicar(rotulos, valores) {
  return rotulos.flatMap((rotulo) => Object.entries(valores).map(([etapa, quantidade]) => ({ rotulo, etapa, quantidade })))
}

// A medição de referência: a de maior número entre as do contrato (empreiteiro não entra).
export function ultimaMedicaoDoContrato(medicoes) {
  return (medicoes ?? []).filter((m) => m.tipo === 'Contrato').sort((a, b) => b.numero - a.numero)[0] ?? null
}

// A unidade da etapa e a do item do contrato são a mesma? (A planilha escreve M3, M2; o app, m³, m².)
const normalUnidade = (u) => String(u ?? '').trim().toLowerCase().replace('³', '3').replace('²', '2')
export const mesmaUnidade = (a, b) => normalUnidade(a) === normalUnidade(b)

// O andamento da obra contra a medição do contrato: uma linha por item ligado a alguma etapa
// (etapas que apontam o mesmo item somam numa linha só). Executado = soma das marcações dessas etapas
// nas plantas que contam no andamento; contratado e medido = os do item na última medição.
export function andamentoDaObra({ etapas, plantas, marcacoes, quantitativos, itens }) {
  const contam = new Set((plantas ?? []).filter((p) => p.conta_no_andamento !== false).map((p) => p.id))
  const quadro = quadroDe(quantitativos)
  const daObra = (marcacoes ?? []).filter((m) => contam.has(m.planta_id))
  const valores = valoresDasMarcacoes(daObra, new Map(etapas.map((e) => [e.nome, e])), quadro)
  const porItem = new Map()
  for (const e of etapas) {
    if (!e.item_medicao) continue
    if (!porItem.has(e.item_medicao)) porItem.set(e.item_medicao, [])
    porItem.get(e.item_medicao).push(e)
  }
  const itemPorCodigo = new Map((itens ?? []).map((i) => [String(i.item), i]))
  return [...porItem.entries()].sort(([a], [b]) => ordemNatural(a, b)).map(([codigo, ligadas]) => {
    const it = itemPorCodigo.get(codigo)
    const nomes = new Set(ligadas.map((e) => e.nome))
    const executado = arred(daObra.filter((m) => nomes.has(m.etapa)).reduce((s, m) => s + (valores.get(m.id) ?? 0), 0))
    const contratado = it ? Number(it.qtd_contratada) : null
    const medido = it ? Number(it.qtd_acumulada) : null
    return {
      item: codigo, descricao: it?.descricao ?? null, unidade: it?.unidade ?? ligadas[0].unidade,
      etapas: ligadas.map((e) => e.nome), contratado, medido, executado,
      saldo: medido == null ? null : arred(executado - medido),
      pct: contratado ? Math.round((executado / contratado) * 100) : null,
      avisoUnidade: Boolean(it) && ligadas.some((e) => !mesmaUnidade(e.unidade, it.unidade)),
      semItem: !it,
    }
  })
}
