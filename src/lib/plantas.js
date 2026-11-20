// Gestão à Vista — as regras da planta com o avanço pintado por cima. Sem React, sem banco, sem
// window: roda no Node (tests/plantas.mjs).
//
// A pintura vira dado: cada marcação é uma linha com etapa, data e (quando a etapa não é "un")
// quantidade. Avançar de etapa cria outra linha com `substitui` apontando a anterior; a anterior
// some da planta, mas continua contando como produção do dia em que foi feita.
//
// Duas leituras, de propósito diferentes:
// - "feito" (legenda, resumo, meta): toda marcação da etapa conta, inclusive as que já avançaram.
//   A sapata concretada também foi escavada; se a escavação descontasse, a meta andaria para trás.
// - "na planta agora": só as marcações que ninguém substituiu (o estado atual de cada peça).
import { somarDias, formatarDiaMes, MESES } from './datas.js'
import { segundaDaSemana } from './planejamento.js'
import { UNIDADES_ETAPA, TIPOS_MARCACAO, ESPESSURAS_MARCACAO } from './listas.js'

// Cores das etapas e, numa paleta SEPARADA, dos caminhões: no modo "por caminhão" a cor deixa de
// significar etapa, e usar as mesmas cores confundiria as duas leituras.
export const PALETA_ETAPAS = ['#E2574C', '#F2B23E', '#3D7DD8', '#3DC28C', '#9B6BD6', '#E07A2E', '#2CB5C0', '#D64F9A']
export const PALETA_LOTES = ['#FF3B30', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#00C7BE', '#FF2D55', '#5856D6', '#A2845E', '#30B0C7']
export const COR_SEM_LOTE = '#8E8E93'

export const ETAPAS_SUGERIDAS = [
  { nome: 'Escavado', cor: '#F2B23E', unidade: 'un' },
  { nome: 'Forma', cor: '#9B6BD6', unidade: 'un' },
  { nome: 'Armado', cor: '#3D7DD8', unidade: 'un' },
  { nome: 'Concretado', cor: '#3DC28C', unidade: 'un' },
]

// ---------------------------------------------------------------------------
// Pavimentos e peças: ordem de obra, não de dicionário
// ---------------------------------------------------------------------------

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
// Sugestões do campo Pavimento, na ordem do prédio (a ordem de verdade é posicaoDoPavimento).
export const PAVIMENTOS_SUGERIDOS = ['Fundação', 'Subsolo', 'Térreo', '1º Pavimento', '2º Pavimento', '3º Pavimento', 'Cobertura']

export const ordemNatural = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' })

// Posição do pavimento no prédio, de baixo para cima. null = fora da lista (vai depois, por nome).
export function posicaoDoPavimento(nome) {
  const s = semAcento(nome)
  if (!s) return null
  const numero = Number((s.match(/\d+/) ?? [])[0])
  if (/fundac|baldrame|sapata|estaca/.test(s)) return -1000
  if (/subsolo/.test(s)) return -(numero || 1) // o 2º subsolo fica abaixo do 1º
  if (/terreo/.test(s)) return 0
  if (/mezanino/.test(s)) return 0.5
  if (/cobertura|telhado|atico|barrilete|casa de maquinas/.test(s)) return 1000
  if (numero && /(pav|andar|piso|º|°|o\b|^\d+$)/.test(s)) return numero
  return null
}

// [{ pavimento, plantas }] na ordem do prédio; dentro de cada grupo, a ordem em que chegaram
// (a lista vem da mais nova para a mais antiga).
export function agruparPorPavimento(plantas) {
  const grupos = new Map()
  for (const p of plantas) {
    const chave = (p.pavimento ?? '').trim()
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave).push(p)
  }
  const peso = (nome) => {
    if (!nome) return [2, 0]
    const pos = posicaoDoPavimento(nome)
    return pos === null ? [1, 0] : [0, pos]
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => {
      const [ga, pa] = peso(a)
      const [gb, pb] = peso(b)
      return ga - gb || pa - pb || ordemNatural(a, b)
    })
    .map(([pavimento, lista]) => ({ pavimento: pavimento || 'Sem pavimento', plantas: lista }))
}

export const ordenarPecas = (nomes) => [...nomes].sort(ordemNatural)

// ---------------------------------------------------------------------------
// Quantidade e lote
// ---------------------------------------------------------------------------

// Etapa "un": cada marcação vale 1 (quantidade vazia). m², m³...: vale a quantidade lançada.
export const qtdDe = (m) => (m.quantidade == null ? 1 : Number(m.quantidade) || 0)

// "1,5" ou "1.5" → 1.5. Vazio ou inválido → null. Aceita zero (peça marcada sem medir ainda).
export function lerNumero(texto) {
  const t = String(texto ?? '').trim().replace(/\s/g, '')
  if (!t) return null
  const limpo = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null
  return Number(limpo)
}

export function formatarQtd(n, unidade = 'un') {
  const v = Math.round((Number(n) || 0) * 100) / 100
  const texto = v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  return !unidade || unidade === 'un' ? texto : `${texto} ${unidade}`
}

// Placa/nota chega escrita de todo jeito ("bt 1111", "BT-1111"). Normalizar é o que faz duas
// grafias do mesmo caminhão virarem uma cor só.
export function normalizarLote(v) {
  const s = String(v ?? '').toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g, '')
  return s || null
}

// A MESMA placa volta à usina, carrega e volta: duas viagens, um BT. Quem separa uma da outra é a
// NOTA — por isso ela manda na identidade.
export function chaveDoLote(m) {
  return normalizarLote(m?.nota) || normalizarLote(m?.lote)
}

const porCriacao = (a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')) || ordemNatural(a.id, b.id)

// Os lotes de um dia, na ordem em que o primeiro caminhão chegou (não alfabética): a legenda lê
// como a sequência da concretagem. Cor escolhida à mão ganha da paleta; passando de 10 lotes, a
// paleta reinicia (melhor repetir cor do que inventar tom ilegível).
export function lotesDoDia(marcacoes, dia) {
  const lotes = []
  const vistos = new Map()
  for (const m of [...marcacoes].filter((x) => x.data === dia).sort(porCriacao)) {
    const chave = chaveDoLote(m)
    if (!chave) continue
    let lote = vistos.get(chave)
    if (!lote) {
      lote = { chave, data: dia, lote: normalizarLote(m.lote), nota: normalizarLote(m.nota), corManual: null, marcacoes: [] }
      vistos.set(chave, lote)
      lotes.push(lote)
    }
    if (!lote.corManual && m.lote_cor) lote.corManual = m.lote_cor
    lote.marcacoes.push(m)
  }
  return lotes.map((l, i) => ({ ...l, cor: l.corManual ?? PALETA_LOTES[i % PALETA_LOTES.length] }))
}

// "o que este caminhão fez": peças, quantidade e os nomes das peças.
export function resumoDoLote(lote) {
  return {
    chave: lote.chave, data: lote.data, lote: lote.lote, nota: lote.nota, cor: lote.cor,
    pecas: lote.marcacoes.length,
    quantidade: lote.marcacoes.reduce((s, m) => s + qtdDe(m), 0),
    nomes: ordenarPecas(lote.marcacoes.map((m) => m.rotulo).filter(Boolean)),
  }
}

// Todos os lotes de um conjunto de marcações, dia por dia (mais antigo primeiro).
export function lotesDe(marcacoes) {
  const dias = [...new Set(marcacoes.filter((m) => chaveDoLote(m)).map((m) => m.data))].sort()
  return dias.flatMap((dia) => lotesDoDia(marcacoes, dia))
}

// Mapa "data|chave" → cor, para o modo "por caminhão" recolorir a planta. Com `dia`, só os
// caminhões daquele dia ganham cor (a legenda mostra um dia; os outros ficam cinza, senão um
// caminhão de outro dia teria a mesma cor de um da legenda).
export function coresDosLotes(marcacoes, dia = null) {
  const lotes = dia ? lotesDoDia(marcacoes, dia) : lotesDe(marcacoes)
  return new Map(lotes.map((l) => [`${l.data}|${l.chave}`, l.cor]))
}
export function corPorLote(m, cores) {
  const chave = chaveDoLote(m)
  return (chave && cores.get(`${m.data}|${chave}`)) || COR_SEM_LOTE
}

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------

// As etapas da configuração (por ordem) e, depois, cada etapa que aparece nas marcações mas não
// está mais na configuração, como legado (ativa: false): nenhuma marcação antiga some da planta.
export function etapasComLegado(etapas, marcacoes) {
  const lista = [...etapas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || ordemNatural(a.nome, b.nome))
  const nomes = new Set(lista.map((e) => e.nome))
  const legado = new Map()
  for (const m of [...marcacoes].sort(porCriacao)) {
    if (nomes.has(m.etapa)) continue
    legado.set(m.etapa, { id: null, nome: m.etapa, cor: m.cor, unidade: m.quantidade == null ? 'un' : '', meta: null, ativa: false, legado: true })
  }
  return [...lista, ...legado.values()]
}

export function validarEtapa(dados, existentes = []) {
  const erros = {}
  const nome = String(dados.nome ?? '').trim()
  if (!nome) erros.nome = 'Dê um nome à etapa.'
  else if (existentes.some((e) => e.id !== dados.id && semAcento(e.nome) === semAcento(nome))) erros.nome = 'Já existe uma etapa com esse nome.'
  if (!/^#[0-9A-Fa-f]{6}$/.test(dados.cor ?? '')) erros.cor = 'Escolha uma cor.'
  if (!UNIDADES_ETAPA.includes(dados.unidade)) erros.unidade = 'Escolha a unidade.'
  if (dados.meta !== '' && dados.meta != null) {
    const meta = typeof dados.meta === 'number' ? dados.meta : lerNumero(dados.meta)
    if (!(meta > 0)) erros.meta = 'A meta tem que ser um número maior que zero (ou fique em branco).'
  }
  return erros
}

// Os campos que vão para o banco a partir do que foi digitado.
export function camposDaEtapa(dados) {
  const meta = dados.meta === '' || dados.meta == null ? null : (typeof dados.meta === 'number' ? dados.meta : lerNumero(dados.meta))
  return { nome: String(dados.nome).trim(), cor: dados.cor, unidade: dados.unidade, meta, ativa: dados.ativa ?? true }
}

// Próxima cor livre da paleta das etapas.
export function proximaCorDeEtapa(etapas) {
  const usadas = new Set(etapas.map((e) => e.cor?.toUpperCase()))
  return PALETA_ETAPAS.find((c) => !usadas.has(c.toUpperCase())) ?? PALETA_ETAPAS[etapas.length % PALETA_ETAPAS.length]
}

export const proximaOrdemDeEtapa = (etapas) => etapas.reduce((m, e) => Math.max(m, e.ordem ?? 0), -1) + 1

// Subir ou descer uma etapa: as duas ordens que trocam. null = já está na ponta.
export function trocaDeOrdemEtapa(etapas, id, direcao) {
  const lista = [...etapas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || ordemNatural(a.nome, b.nome))
  const i = lista.findIndex((e) => e.id === id)
  const j = i + (direcao === 'subir' ? -1 : 1)
  if (i < 0 || j < 0 || j >= lista.length) return null
  // Ordens repetidas (etapas antigas) viram a posição na lista, para a troca sempre andar.
  return [{ id: lista[i].id, ordem: j }, { id: lista[j].id, ordem: i }]
}

// ---------------------------------------------------------------------------
// O que aparece na planta
// ---------------------------------------------------------------------------

// Ids das marcações que alguém substituiu (avançou de etapa), dentro de `lista`.
export const cobertasPor = (lista) => new Set(lista.map((m) => m.substitui).filter(Boolean))

// O estado atual de cada peça: as marcações que ninguém substituiu.
export function marcacoesAtuais(marcacoes) {
  const cobertas = cobertasPor(marcacoes)
  return marcacoes.filter((m) => !cobertas.has(m.id))
}

// O que se desenha: some a etapa oculta (👁); e, entre as que sobram, esconde a que foi
// substituída. Ocultar "Concretado" mostra a peça como estava antes (Armado): é de propósito.
export function marcacoesNaTela(marcacoes, ocultas = new Set()) {
  const visiveis = marcacoes.filter((m) => !ocultas.has(m.etapa))
  const cobertas = cobertasPor(visiveis)
  return visiveis.filter((m) => !cobertas.has(m.id)).sort(porCriacao)
}

// ---------------------------------------------------------------------------
// Criar e avançar
// ---------------------------------------------------------------------------

// A quantidade que a marcação grava: null na etapa "un"; a digitada nas outras.
export function quantidadeParaEtapa(etapa, texto) {
  if (!etapa || etapa.unidade === 'un' || !etapa.unidade) return null
  return lerNumero(texto)
}

// A marcação guarda quantidade? Sim se a etapa é medida (m², m³...) ou se ela já tem uma
// (etapa antiga apagada da configuração, ou que mudou de unidade depois): nunca se perde número.
export const pedeQuantidade = (etapa, marcacao = null) =>
  Boolean(etapa?.unidade && etapa.unidade !== 'un') || marcacao?.quantidade != null

// O nome da peça como se grava: sem espaço sobrando, até 40 letras, vazio = sem nome.
// Nome de peça: sempre em maiúsculas (como o projeto escreve e o PDF traz). "s2", digitado no celular, é a
// mesma S2; sem isso o quadro ganhava S2 e s2 e o previsto somava as duas. Dono único da regra.
export const limparRotulo = (texto) => String(texto ?? '').trim().toUpperCase().slice(0, 40) || null

// O desenho que chega para gravar está inteiro? Erro (frase) ou null. (A camada de dados confere
// de novo antes de gravar, para nenhuma tela gravar coisa fora da lista.)
export function conferirMarcacao(campos) {
  if (!TIPOS_MARCACAO.includes(campos.tipo)) return 'Desenho de tipo desconhecido.'
  if (!ESPESSURAS_MARCACAO.includes(Number(campos.espessura ?? 1))) return 'Espessura fora da lista.'
  if (!campos.etapa || !campos.cor) return 'Escolha a etapa antes de marcar.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(campos.data ?? '')) return 'Escolha a data da marcação.'
  return null
}

// Erro (frase) ou null. `temNoQuadro`: a peça tem valor desta etapa no quadro de peças, então
// numa etapa medida a quantidade pode ficar vazia (o valor vem do quadro, quantitativo.js).
export function validarMarcacao(campos, etapa, temNoQuadro = false) {
  if (!etapa) return 'Escolha a etapa antes de marcar.'
  if (!campos.data || !/^\d{4}-\d{2}-\d{2}$/.test(campos.data)) return 'Escolha a data da marcação.'
  if (etapa.unidade && etapa.unidade !== 'un' && campos.quantidade == null && !temNoQuadro) {
    return `A etapa ${etapa.nome} é medida em ${etapa.unidade}: preencha a quantidade antes de marcar.`
  }
  return null
}

// Os campos comuns que a próxima marcação leva: data, espessura, quantidade, placa e nota.
export function extrasDaMarcacao({ etapa, data, espessura = 1, quantidadeTexto = '', lote = '', nota = '', loteCor = null }) {
  return {
    etapa: etapa?.nome, cor: etapa?.cor, data, espessura,
    quantidade: quantidadeParaEtapa(etapa, quantidadeTexto),
    lote: normalizarLote(lote), nota: normalizarLote(nota), lote_cor: (normalizarLote(lote) || normalizarLote(nota)) ? loteCor : null,
  }
}

// Avançar a peça para outra etapa: uma linha NOVA que herda forma, rótulo, rotação e espessura e
// aponta a anterior em `substitui`. Nunca um UPDATE da etapa: isso apagaria o histórico.
export function avancoDe(anterior, extras) {
  if (anterior.etapa === extras.etapa) return { erro: `Esta peça já está em ${extras.etapa}.` }
  return {
    campos: {
      planta_id: anterior.planta_id, tipo: anterior.tipo, pontos: anterior.pontos, rotulo: anterior.rotulo ?? null,
      rotacao: anterior.rotacao ?? 0, espessura: anterior.espessura ?? 1,
      etapa: extras.etapa, cor: extras.cor, data: extras.data, quantidade: extras.quantidade ?? null,
      lote: extras.lote ?? null, nota: extras.nota ?? null, lote_cor: extras.lote_cor ?? null,
      substitui: anterior.id,
    },
  }
}

// A vida da peça, da primeira etapa à atual: sobe por `substitui` até a raiz e desce pelos filhos.
export function historicoDaPeca(marcacoes, id) {
  const porId = new Map(marcacoes.map((m) => [m.id, m]))
  let atual = porId.get(id)
  if (!atual) return []
  const vistos = new Set()
  while (atual.substitui && porId.has(atual.substitui) && !vistos.has(atual.id)) {
    vistos.add(atual.id)
    atual = porId.get(atual.substitui)
  }
  const cadeia = [atual]
  const usados = new Set([atual.id])
  for (;;) {
    const filhos = marcacoes.filter((m) => m.substitui === cadeia.at(-1).id && !usados.has(m.id)).sort(porCriacao)
    if (!filhos.length) break
    const proximo = filhos.at(-1)
    usados.add(proximo.id)
    cadeia.push(proximo)
  }
  return cadeia
}

// ---------------------------------------------------------------------------
// Resumo por período (semana começando na segunda, mês, ou tudo)
// ---------------------------------------------------------------------------

export const PERIODOS = ['semana', 'mês', 'tudo']

function ultimoDiaDoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

// { de, ate, titulo } do período que contém `ancora`. 'tudo' não tem limite.
export function intervaloDoPeriodo(tipo, ancora) {
  if (tipo === 'tudo') return { de: null, ate: null, titulo: 'Desde o começo' }
  if (tipo === 'semana') {
    const de = segundaDaSemana(ancora)
    const ate = somarDias(de, 6)
    return { de, ate, titulo: `Semana de ${formatarDiaMes(de)} a ${formatarDiaMes(ate)}` }
  }
  const [ano, mes] = ancora.split('-').map(Number)
  const mm = String(mes).padStart(2, '0')
  return { de: `${ano}-${mm}-01`, ate: `${ano}-${mm}-${String(ultimoDiaDoMes(ano, mes)).padStart(2, '0')}`, titulo: `${MESES[mes - 1]}/${ano}` }
}

// A âncora do período anterior (passo -1) ou seguinte (+1).
export function moverPeriodo(tipo, ancora, passo) {
  if (tipo === 'semana') return somarDias(ancora, 7 * passo)
  if (tipo === 'mês') {
    const [ano, mes] = ancora.split('-').map(Number)
    const d = new Date(Date.UTC(ano, mes - 1 + passo, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
  }
  return ancora
}

const dentro = (data, { de, ate }) => (!de || data >= de) && (!ate || data <= ate)

// Por etapa, no período: quanto saiu, em quantos dias trabalhados, a média diária REAL (produção
// ÷ dias em que a etapa andou, não ÷ dias corridos), o acumulado até o fim do período, a % da
// meta e as peças que andaram. E as viagens de concreto do período.
// `valores` (id → número) vem de valoresDasMarcacoes (quantitativo.js), com o quadro de peças e a
// regra "a mesma peça conta uma vez"; sem ele, cada marcação vale a quantidade digitada ou 1.
export function resumoDoPeriodo(etapas, marcacoes, intervalo, valores = null) {
  const qtd = (m) => (valores ? valores.get(m.id) ?? 0 : qtdDe(m))
  const noPeriodo = marcacoes.filter((m) => dentro(m.data, intervalo))
  const ateOFim = marcacoes.filter((m) => !intervalo.ate || m.data <= intervalo.ate)
  const porEtapa = etapas.map((e) => {
    const daEtapa = noPeriodo.filter((m) => m.etapa === e.nome)
    const feito = daEtapa.reduce((s, m) => s + qtd(m), 0)
    const dias = new Set(daEtapa.map((m) => m.data)).size
    const acumulado = ateOFim.filter((m) => m.etapa === e.nome).reduce((s, m) => s + qtd(m), 0)
    return {
      nome: e.nome, cor: e.cor, unidade: e.unidade || 'un', meta: e.meta ?? null,
      feito, dias, media: dias ? feito / dias : 0, acumulado,
      pct: e.meta ? Math.round((acumulado / Number(e.meta)) * 100) : null,
      pecas: ordenarPecas([...new Set(daEtapa.map((m) => m.rotulo).filter(Boolean))]),
      semNome: daEtapa.filter((m) => !m.rotulo).length,
    }
  })
  return { etapas: porEtapa, viagens: lotesDe(noPeriodo).map(resumoDoLote) }
}

// ---------------------------------------------------------------------------
// Planta e cor
// ---------------------------------------------------------------------------

export function validarPlanta({ nome }) {
  const erros = {}
  if (!String(nome ?? '').trim()) erros.nome = 'Dê um nome à planta (ex.: Fundação, Forma do 1º pavimento).'
  return erros
}

export const camposDaPlanta = ({ nome, pavimento }) => ({ nome: String(nome).trim(), pavimento: String(pavimento ?? '').trim() || null })

// A cor de uma marcação na tela: a da etapa como está configurada hoje (trocar a cor da etapa
// recolore a planta); etapa que saiu da configuração fica com a cor que tinha ao marcar.
export function corDaMarcacao(m, etapasPorNome) {
  return etapasPorNome.get(m.etapa)?.cor ?? m.cor
}

// Erro do Storage ao subir a planta, em frase de gente.
export function mensagemDoEnvioDaPlanta(erro) {
  const texto = `${erro?.statusCode ?? ''} ${erro?.message ?? ''}`
  if (/fetch|network|load failed/i.test(texto)) return 'A planta não subiu: sem internet. Tente de novo quando a conexão voltar.'
  if (/403|row-level security|unauthorized|not allowed/i.test(texto)) return 'A planta não subiu: você não tem permissão para mandar planta nesta obra.'
  if (/413|too large|exceeded/i.test(texto)) return 'A planta não subiu: o arquivo ficou grande demais. Tente exportar a planta com menos detalhe.'
  if (/mime|type/i.test(texto)) return 'A planta não subiu: formato não aceito. Use PDF, PNG ou JPG.'
  return 'A planta não subiu. Tente de novo.'
}
