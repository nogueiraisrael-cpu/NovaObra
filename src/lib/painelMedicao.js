// Painel de medição (v1.3, etapa 2): as contas do que a tela mostra. Só leitura: nada aqui
// grava. Sem React e sem banco; as medições e as linhas chegam prontas da camada de dados.
//
// CONTRATO: o mesmo serviço é reconhecido entre medições pelo código do item ("2.2.6").
//   - Medido (na escolha) = soma do "no período" das medições escolhidas. "Todas" = o
//     acumulado da última, que é o que o boletim diz.
//   - Saldo = adequado − acumulado ATÉ A ÚLTIMA ESCOLHIDA: escolher só a 2ª não esconde o que
//     já foi medido na 1ª. O adequado vale o da última escolhida (a adequação pode mudar).
//   - % = medido (na escolha) ÷ adequado.
// EMPREITEIRO: cada medição vale sozinha; itens de medições diferentes nunca se somam como se
//   fossem o mesmo serviço (os itens mudam de uma medição para a outra). O previsto e o %
//   saem da última medição escolhida de cada empreiteiro; o executado é a soma dos períodos.

import { TOLERANCIA } from './medicoes.js'

const arred = (n, casas = 2) => Math.round(n * 10 ** casas) / 10 ** casas
const somar = (lista, f) => arred(lista.reduce((s, x) => s + Number(f(x) ?? 0), 0))
const pct = (parte, todo) => (todo > 0 ? arred((parte / todo) * 100, 1) : 0)
const porNumero = (a, b) => a.numero - b.numero
// Quantidade: abaixo disto é sobra de arredondamento, não diferença.
const FOLGA_QTD = 0.00005

// ---------------------------------------------------------------------------
// A escolha de medições (os botões "1ª · 2ª · … · Todas")
// ---------------------------------------------------------------------------

// `escolhidos` = lista de nº, ou null para "Todas". Tocar num nº liga ou desliga; desligar o
// último volta para Todas. Tocar em Todas (numero = null) volta para Todas.
export function alternarEscolha(escolhidos, numero) {
  if (numero === null) return null
  const atual = escolhidos ?? []
  const novo = atual.includes(numero) ? atual.filter((n) => n !== numero) : [...atual, numero].sort((a, b) => a - b)
  return novo.length ? novo : null
}

const escolhidas = (medicoes, escolhidos) =>
  [...medicoes].sort(porNumero).filter((m) => escolhidos === null || escolhidos.includes(m.numero))

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

function linhaDoServico(base, medido, acumulado) {
  const saldoQtd = arred(Number(base.qtd_contratada) - acumulado.qtd, 4)
  const saldoValor = arred(Number(base.valor_contratado) - acumulado.valor)
  return {
    item: base.item, descricao: base.descricao, unidade: base.unidade,
    etapa_codigo: base.etapa_codigo, etapa_nome: base.etapa_nome, subetapa_codigo: base.subetapa_codigo, subetapa_nome: base.subetapa_nome,
    qtd_prevista: Number(base.qtd_prevista), qtd_contratada: Number(base.qtd_contratada),
    qtd_medida: arred(medido.qtd, 4), saldo_qtd: saldoQtd, pct_qtd: pct(medido.qtd, Number(base.qtd_contratada)),
    valor_previsto: Number(base.valor_previsto), valor_contratado: Number(base.valor_contratado),
    valor_medido: arred(medido.valor), saldo_valor: saldoValor, pct_valor: pct(medido.valor, Number(base.valor_contratado)),
    valor_acumulado: arred(acumulado.valor),
    // Centavo de diferença é arredondamento da planilha (adequado R$ 26.468,46 e acumulado
    // R$ 26.468,47 com a mesma quantidade), não medição acima do contratado.
    acima: saldoValor < -TOLERANCIA || saldoQtd < -FOLGA_QTD,
    cresceu: Number(base.qtd_contratada) > Number(base.qtd_prevista) + FOLGA_QTD,
  }
}

// A ordem natural dos códigos: 2.2 antes de 2.10, 9 antes de 10.
const partes = (codigo) => String(codigo ?? '').split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p))
export function compararItens(a, b) {
  const pa = partes(a)
  const pb = partes(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1
    if (pb[i] === undefined) return 1
    if (pa[i] !== pb[i]) return typeof pa[i] === 'number' && typeof pb[i] === 'number' ? pa[i] - pb[i] : String(pa[i]).localeCompare(String(pb[i]))
  }
  return 0
}

// A barra da etapa mostra o adequado em três partes: o medido na escolha (forte), o que já
// tinha sido medido antes dela (claro) e o saldo (cinza). `estourou`: passou do adequado.
const totaisDe = (servicos) => {
  const adequado = somar(servicos, (s) => s.valor_contratado)
  const medido = somar(servicos, (s) => s.valor_medido)
  const acumulado = somar(servicos, (s) => s.valor_acumulado)
  return {
    adequado, medido, acumulado, saldo: somar(servicos, (s) => s.saldo_valor), pct: pct(medido, adequado),
    barra: {
      escolha: adequado > 0 ? Math.min(100, (medido / adequado) * 100) : 0,
      antes: adequado > 0 ? Math.max(0, Math.min(100, (acumulado - medido) / adequado * 100)) : 0,
      estourou: acumulado > adequado + TOLERANCIA,
    },
  }
}

// `medicoes` = as do contrato da obra; `itens` = as linhas delas; `escolhidos` = nº ou null.
export function painelContrato(medicoes, itens, escolhidos = null) {
  const lista = escolhidas(medicoes, escolhidos)
  if (!lista.length) return null
  const ultima = lista[lista.length - 1]
  const todas = escolhidos === null
  const ateUltima = [...medicoes].sort(porNumero).filter((m) => m.numero <= ultima.numero)
  const doId = new Map()
  for (const i of itens) {
    if (!doId.has(i.medicao_id)) doId.set(i.medicao_id, [])
    doId.get(i.medicao_id).push(i)
  }

  // Cada serviço: o retrato mais novo até a última escolhida (adequado, descrição, etapa),
  // o acumulado da última em que ele aparece e o medido nas escolhidas.
  const porItem = new Map()
  for (const m of ateUltima) {
    const escolhida = lista.includes(m)
    for (const i of doId.get(m.id) ?? []) {
      const s = porItem.get(i.item) ?? { base: i, medido: { qtd: 0, valor: 0 }, acumulado: { qtd: 0, valor: 0 } }
      s.base = i
      s.acumulado = { qtd: Number(i.qtd_acumulada), valor: Number(i.valor_acumulado) }
      if (escolhida && !todas) {
        s.medido = { qtd: s.medido.qtd + Number(i.qtd_periodo), valor: s.medido.valor + Number(i.valor_periodo) }
      }
      porItem.set(i.item, s)
    }
  }
  const servicos = [...porItem.values()]
    .map((s) => linhaDoServico(s.base, todas ? s.acumulado : s.medido, s.acumulado))
    .sort((a, b) => compararItens(a.item, b.item))

  // Etapa → subetapa → serviço. Serviço sem subetapa fica direto na etapa (ex.: "12.1").
  const etapas = []
  const daEtapa = new Map()
  for (const s of servicos) {
    const codigo = s.etapa_codigo ?? '—'
    if (!daEtapa.has(codigo)) {
      const e = { codigo, nome: s.etapa_nome ?? 'Sem etapa', subetapas: [], servicos: [], subDoCodigo: new Map() }
      daEtapa.set(codigo, e)
      etapas.push(e)
    }
    const e = daEtapa.get(codigo)
    if (!s.subetapa_codigo) { e.servicos.push(s); continue }
    if (!e.subDoCodigo.has(s.subetapa_codigo)) {
      const sub = { codigo: s.subetapa_codigo, nome: s.subetapa_nome, servicos: [] }
      e.subDoCodigo.set(s.subetapa_codigo, sub)
      e.subetapas.push(sub)
    }
    e.subDoCodigo.get(s.subetapa_codigo).servicos.push(s)
  }
  const prontas = etapas.map(({ subDoCodigo: _s, ...e }) => {
    const subetapas = e.subetapas.map((sub) => ({ ...sub, ...totaisDe(sub.servicos), acima: sub.servicos.some((x) => x.acima) }))
    const todos = [...e.servicos, ...e.subetapas.flatMap((sub) => sub.servicos)]
    return { ...e, subetapas, ...totaisDe(todos), acima: todos.some((x) => x.acima) }
  })

  const t = totaisDe(servicos)
  return {
    ultima,
    totais: {
      previsto: somar(servicos, (s) => s.valor_previsto), ...t,
      ultimaPeriodo: Number(ultima.valor_periodo), ultimaPct: pct(Number(ultima.valor_periodo), t.adequado),
      acimaDoContratado: servicos.filter((s) => s.acima).length,
    },
    etapas: prontas,
    servicos,
  }
}

// ---------------------------------------------------------------------------
// Empreiteiro
// ---------------------------------------------------------------------------

// `medicoes` = as do empreiteiro (ou de todos); `escolhidos` = nº ou null. Com vários
// empreiteiros juntos ("Todos"), a escolha por nº não faz sentido: vale sempre Todas.
export function painelEmpreiteiro(medicoes, itens, escolhidos = null) {
  const varios = new Set(medicoes.map((m) => m.empreiteiro)).size > 1
  const lista = varios ? [...medicoes].sort(porNumero) : escolhidas(medicoes, escolhidos)
  if (!lista.length) return null
  const doId = new Map()
  for (const i of itens) {
    if (!doId.has(i.medicao_id)) doId.set(i.medicao_id, [])
    doId.get(i.medicao_id).push(i)
  }
  const porData = (a, b) => a.data_medicao.localeCompare(b.data_medicao) || a.empreiteiro.localeCompare(b.empreiteiro, 'pt-BR') || porNumero(a, b)
  // Um empreiteiro: na ordem dos nº (as datas da planilha às vezes se repetem). Todos: por data.
  const grupos = [...lista].sort(varios ? porData : porNumero).map((m) => {
    const linhas = (doId.get(m.id) ?? []).sort((a, b) => a.linha_planilha - b.linha_planilha).map((i) => {
      const saldoQtd = arred(Number(i.qtd_contratada) - Number(i.qtd_acumulada), 4)
      const saldoValor = arred(Number(i.valor_contratado) - Number(i.valor_acumulado))
      return {
        item: i.item, descricao: i.descricao, unidade: i.unidade,
        qtd_prevista: Number(i.qtd_prevista), qtd_executada: Number(i.qtd_periodo), saldo_qtd: saldoQtd,
        valor_previsto: Number(i.valor_contratado), valor_executado: Number(i.valor_periodo), saldo_valor: saldoValor,
        pct: pct(Number(i.valor_acumulado), Number(i.valor_contratado)),
        acima: saldoValor < -TOLERANCIA || saldoQtd < -FOLGA_QTD,
      }
    })
    const pago = m.valor_a_pagar ?? arred(Number(m.valor_periodo) - Number(m.desconto ?? 0))
    return { medicao: m, pago: Number(pago), linhas }
  })

  // Previsto e % pela última escolhida de cada empreiteiro (é ela que diz o contrato de agora).
  const ultimas = new Map()
  for (const g of grupos) {
    const atual = ultimas.get(g.medicao.empreiteiro)
    if (!atual || g.medicao.numero > atual.medicao.numero) ultimas.set(g.medicao.empreiteiro, g)
  }
  const previsto = somar([...ultimas.values()], (g) => somar(g.linhas, (l) => l.valor_previsto))
  const acumulado = somar([...ultimas.values()], (g) => somar(doId.get(g.medicao.id) ?? [], (i) => i.valor_acumulado))
  return {
    varios,
    totais: {
      previsto,
      executado: somar(grupos, (g) => g.medicao.valor_periodo),
      descontos: somar(grupos, (g) => g.medicao.desconto),
      pago: somar(grupos, (g) => g.pago),
      pct: pct(acumulado, previsto),
      acimaDoContratado: grupos.reduce((s, g) => s + g.linhas.filter((l) => l.acima).length, 0),
    },
    barras: grupos.map((g) => ({ id: g.medicao.id, numero: g.medicao.numero, empreiteiro: g.medicao.empreiteiro, valor: g.pago })),
    grupos,
  }
}

// ---------------------------------------------------------------------------
// Busca e filtro da tabela
// ---------------------------------------------------------------------------

const simples = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Serve às duas tabelas: a linha passa se a descrição (ou o item) tem o texto buscado e, com
// "Só com saldo negativo", se está acima do contratado.
export function passaNoFiltro(linha, { busca = '', soNegativo = false }) {
  if (soNegativo && !linha.acima) return false
  const b = simples(busca).trim()
  return !b || simples(linha.descricao).includes(b) || simples(linha.item).startsWith(b)
}

// A árvore do contrato só com o que passa no filtro (etapa e subetapa vazias somem).
export function filtrarEtapas(etapas, filtro) {
  if (!filtro.busca?.trim() && !filtro.soNegativo) return etapas
  return etapas.map((e) => ({
    ...e,
    servicos: e.servicos.filter((s) => passaNoFiltro(s, filtro)),
    subetapas: e.subetapas.map((sub) => ({ ...sub, servicos: sub.servicos.filter((s) => passaNoFiltro(s, filtro)) })).filter((sub) => sub.servicos.length),
  })).filter((e) => e.servicos.length || e.subetapas.length)
}
