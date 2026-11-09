// Diários (histórico do RDO): ordem da lista e o resumo de cada dia. Puras: sem React, sem banco.
import { contaComoPresenca, contaComoFalta } from './efetivo.js'
import { formatarMomento, somarDias } from './datas.js'
import { segundaDaSemana } from './planejamento.js'
import { CLIMAS, SITUACOES_EFETIVO_CORRIGIVEIS } from './listas.js'

// Do mais novo para o mais antigo. Data AAAA-MM-DD compara certo como texto.
export function ordenarDiarios(rdos) {
  return [...rdos].sort((a, b) => b.data.localeCompare(a.data))
}

// Os números do cartão. `efetivo`, `frentes` e `fotos` são as linhas daquele RDO.
export function resumirDiario({ efetivo, frentes, fotos }) {
  return {
    presentes: efetivo.filter((l) => contaComoPresenca(l.situacao)).length,
    total: efetivo.length,
    frentes_preenchidas: frentes.length,
    frentes_paradas: frentes.filter((f) => f.situacao === 'Parada').length,
    fotos: fotos.length,
  }
}

// Como o dia aparece no histórico: o de hoje aberto ainda está "Em andamento";
// um dia que já passou sem fechar é "Não fechado" (o mesmo aviso da lista de obras).
export function situacaoDiario(rdo, hoje) {
  if (rdo.status === 'Fechado') return 'Fechado'
  return rdo.data < hoje ? 'Não fechado' : 'Em andamento'
}

// Quem fechou e quando; ou, se ainda está aberto, quem abriu.
export function textoResponsavel(rdo) {
  if (rdo.status === 'Fechado') {
    return `Fechado em ${formatarMomento(rdo.fechado_em)}${rdo.fechado_por_nome ? ` por ${rdo.fechado_por_nome}` : ''}`
  }
  return `Aberto${rdo.criado_por_nome ? ` por ${rdo.criado_por_nome}` : ''}, ainda não fechado`
}

// "Bom" quando manhã e tarde iguais; "Bom → Nublado" quando mudou.
export function textoClima(rdo) {
  return rdo.clima_manha === rdo.clima_tarde ? rdo.clima_manha : `${rdo.clima_manha} → ${rdo.clima_tarde}`
}

// ---------------------------------------------------------------------------
// Corrigir um dia que já passou (aba Diários). O de hoje se corrige na aba Hoje.
// ---------------------------------------------------------------------------

export const efetivoCorrigivel = (situacao) => SITUACOES_EFETIVO_CORRIGIVEIS.includes(situacao)
export const podeCorrigirNoHistorico = (rdo, hoje) => rdo.data < hoje
// Fechar atrasado: só o dia que já passou e ficou sem fechar ("Não fechado").
export const podeFecharNoHistorico = (rdo, hoje) => situacaoDiario(rdo, hoje) === 'Não fechado'

// As linhas do efetivo que contam como presença com as situações escolhidas na correção
// (`situacoes`: { [linhaId]: situacao }). Só elas podem estar na equipe das frentes.
export const presentesNaCorrecao = (linhas, situacoes) => linhas.filter((l) => contaComoPresenca(situacoes[l.id] ?? l.situacao))

// Confere a correção e diz o que muda no banco.
// `linhas`: rdo_efetivo do dia; `frentes`: rdo_frentes do dia; `equipeAtual`: { [rdoFrenteId]: [funcionarioId] }.
// `pedido`: clima, praticável e observações do dia, mais
//   efetivo: { [linhaId]: situacao } e frentes: { [rdoFrenteId]: { descricao, equipe } }.
// Quem deixa de estar presente sai das equipes do dia, como na aba Hoje.
export function planejarCorrecao({ linhas, frentes, equipeAtual, pedido }) {
  if (!CLIMAS.includes(pedido.clima_manha) || !CLIMAS.includes(pedido.clima_tarde)) return { erro: 'Escolha o clima da manhã e da tarde.' }
  const rdo = {
    clima_manha: pedido.clima_manha, clima_tarde: pedido.clima_tarde,
    praticavel_manha: Boolean(pedido.praticavel_manha), praticavel_tarde: Boolean(pedido.praticavel_tarde),
    observacoes: String(pedido.observacoes ?? ''),
  }

  const efetivo = []
  const viraramPresenca = []
  const pedidasEf = pedido.efetivo ?? {}
  for (const [id, situacao] of Object.entries(pedidasEf)) {
    const linha = linhas.find((l) => l.id === id)
    if (!linha) return { erro: 'Funcionário não está neste diário.' }
    if (situacao === linha.situacao) continue
    if (!efetivoCorrigivel(linha.situacao) || !efetivoCorrigivel(situacao)) {
      return { erro: 'Deslocamento entre obras não se corrige aqui: só Presente, Falta e Atestado.' }
    }
    efetivo.push({ id, situacao })
    if (contaComoPresenca(situacao)) viraramPresenca.push(linha.funcionario_id)
  }
  const presentes = new Set(presentesNaCorrecao(linhas, pedidasEf).map((l) => l.funcionario_id))

  // Equipe: só quem entra e quem sai, para o banco não apagar e regravar o time inteiro.
  const pedidas = pedido.frentes ?? {}
  if (Object.keys(pedidas).some((id) => !frentes.some((rf) => rf.id === id))) return { erro: 'Frente não está neste diário.' }
  const frentesQueMudam = []
  for (const rf of frentes) {
    const antes = equipeAtual[rf.id] ?? []
    const descricao = pedidas[rf.id] ? String(pedidas[rf.id].descricao ?? '') : rf.descricao ?? ''
    const equipe = [...new Set(pedidas[rf.id]?.equipe ?? antes)].filter((id) => presentes.has(id))
    const mudouDescricao = descricao !== (rf.descricao ?? '')
    const entra = equipe.filter((id) => !antes.includes(id))
    const sai = antes.filter((id) => !equipe.includes(id))
    if (mudouDescricao || entra.length || sai.length) frentesQueMudam.push({ id: rf.id, descricao, mudouDescricao, entra, sai })
  }
  return { rdo, efetivo, viraramPresenca, frentes: frentesQueMudam }
}

// ---------------------------------------------------------------------------
// Resumo de vários dias (impressão da semana ou dos dias escolhidos)
// ---------------------------------------------------------------------------

// Segunda a domingo da semana de `dia`; `deslocamento` -1 é a semana passada.
export function semanaDe(dia, deslocamento = 0) {
  const segunda = somarDias(segundaDaSemana(dia), 7 * deslocamento)
  return { de: segunda, ate: somarDias(segunda, 6) }
}

// Os diários (da lista) entre `de` e `ate`, inclusive.
export const idsNoIntervalo = (diarios, { de, ate }) => diarios.filter((r) => r.data >= de && r.data <= ate).map((r) => r.id)

// O resumo já abre com esta semana; se ela ainda não tem diário (segunda de manhã), com a passada.
export function escolhaInicial(diarios, hoje) {
  const desta = idsNoIntervalo(diarios, semanaDe(hoje))
  return desta.length ? desta : idsNoIntervalo(diarios, semanaDe(hoje, -1))
}

function textoPraticavel(d) {
  if (d.praticavel_manha && d.praticavel_tarde) return 'Sim'
  if (!d.praticavel_manha && !d.praticavel_tarde) return 'Não'
  return d.praticavel_manha ? 'Tarde não' : 'Manhã não'
}

// `dias`: diários completos (obterDiarios). Uma linha por dia, do mais antigo ao mais novo,
// e cada frente com o que foi lançado nela em cada dia.
export function resumirPeriodo(dias) {
  const ordem = [...dias].sort((a, b) => a.data.localeCompare(b.data))
  const linhas = ordem.map((d) => ({
    id: d.id,
    data: d.data,
    clima: textoClima(d),
    praticavel: d.praticavel_manha && d.praticavel_tarde,
    texto_praticavel: textoPraticavel(d),
    presentes: d.presentes,
    total: d.total,
    faltas: d.efetivo.filter((l) => contaComoFalta(l.situacao)).length,
    paradas: d.frentes_paradas,
    ocorrencias: d.observacoes ?? '',
    fechado: d.status === 'Fechado',
  }))
  const frentes = new Map()
  for (const d of ordem) {
    for (const f of d.frentes) {
      const chave = f.frente_id ?? f.nome
      if (!frentes.has(chave)) frentes.set(chave, { chave, nome: f.nome, etapa: f.etapa, dias: [] })
      frentes.get(chave).dias.push({ data: d.data, situacao: f.situacao, motivo_parada: f.motivo_parada, descricao: f.descricao ?? '' })
    }
  }
  const n = linhas.length
  return {
    de: linhas[0]?.data ?? null,
    ate: linhas[n - 1]?.data ?? null,
    linhas,
    frentes: [...frentes.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    totais: {
      dias: n,
      media_presentes: n ? Math.round((linhas.reduce((s, l) => s + l.presentes, 0) / n) * 10) / 10 : 0,
      faltas: linhas.reduce((s, l) => s + l.faltas, 0),
      dias_nao_praticaveis: linhas.filter((l) => !l.praticavel).length,
      nao_fechados: linhas.filter((l) => !l.fechado).length,
    },
  }
}
