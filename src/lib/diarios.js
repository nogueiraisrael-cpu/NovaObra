// Diários (histórico do RDO): ordem da lista e o resumo de cada dia. Puras: sem React, sem banco.
import { contaComoPresenca, contaComoFalta } from './efetivo.js'
import { formatarMomento, somarDias, formatarDiaMes } from './datas.js'
import { segundaDaSemana } from './planejamento.js'
import {
  CLIMAS, SITUACOES_EFETIVO_CORRIGIVEIS, SITUACOES_FRENTE_DIA, MOTIVOS_PARADA, SITUACOES_EQUIPAMENTO_TOQUE, SITUACAO_EQUIPAMENTO_CONCLUIDO,
} from './listas.js'

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

// ---------------------------------------------------------------------------
// Lançar um dia esquecido (aba Diários): o dia passou e ninguém abriu o diário.
// ---------------------------------------------------------------------------

export const textoJaTemDiario = (data) => `${formatarDiaMes(data)} já tem diário: abra ele na lista para corrigir.`
// O último dia que dá para escolher no campo de data.
export const ultimoDiaEsquecido = (hoje) => somarDias(hoje, -1)

// Só dia que já passou e que ainda não tem diário nesta obra. `datasComDiario`: as datas dos RDOs da obra.
export function validarDiaEsquecido(data, hoje, datasComDiario) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? '')) return 'Escolha a data do dia esquecido.'
  if (data === hoje) return 'O diário de hoje se lança na aba Hoje.'
  if (data > hoje) return 'Esse dia ainda não chegou.'
  if (datasComDiario.includes(data)) return textoJaTemDiario(data)
  return null
}

// Os equipamentos que hoje estão na obra e já estavam lá em `data`. `situacao_desde` é a data da
// última mudança: o que chegou depois daquele dia fica de fora. O que estava lá e já saiu o app não sabe.
export const equipamentosNoDia = (equipamentos, data) => equipamentos.filter((e) => !e.situacao_desde || e.situacao_desde <= data)

// A data que o campo já traz: o dia mais novo sem diário na última semana; se não faltar nenhum, ontem.
export function diaEsquecidoSugerido(hoje, datasComDiario) {
  const tem = new Set(datasComDiario)
  for (let n = 1; n <= 7; n++) {
    const dia = somarDias(hoje, -n)
    if (!tem.has(dia)) return dia
  }
  return ultimoDiaEsquecido(hoje)
}

// As linhas do efetivo que contam como presença com as situações escolhidas na correção
// (`situacoes`: { [linhaId]: situacao }). Só elas podem estar na equipe das frentes.
export const presentesNaCorrecao = (linhas, situacoes) => linhas.filter((l) => contaComoPresenca(situacoes[l.id] ?? l.situacao))

// Confere a correção e diz o que muda no banco. Tudo que vem da tela é conferido aqui.
// Contexto (o que está no banco):
//   linhas: rdo_efetivo do dia; frentes: rdo_frentes do dia; equipeAtual: { [rdoFrenteId]: [funcionarioId] };
//   linhasEquip: rdo_equipamentos do dia; frentesDaObra: ids das frentes da obra;
//   equipamentosPossiveis: ids que podem entrar no dia (na obra ou no depósito);
//   comFoto: ids de rdo_frentes com foto; podeTirarFrente: Engenheiro e dia não fechado.
// `pedido`: clima, praticável e observações do dia, mais
//   efetivo: { [linhaId]: situacao }
//   frentes: { [rdoFrenteId]: { descricao, equipe, situacao, motivo_parada } }
//   frentes_novas: [{ frente_id, situacao, motivo_parada, descricao, equipe }]   frentes_tiradas: [rdoFrenteId]
//   equipamentos: { [linhaId]: { situacao, observacao } }
//   equipamentos_novos: [{ equipamento_id, situacao, observacao }]   equipamentos_tirados: [linhaId]
// Quem deixa de estar presente sai das equipes do dia, como na aba Hoje.
// Repetir a mesma correção depois de cair no meio completa: frente ou equipamento "novo" que já
// entrou vira edição da linha, e o que já saiu é ignorado.
export function planejarCorrecao(contexto) {
  const { linhas, frentes, equipeAtual, pedido } = contexto
  const linhasEquip = contexto.linhasEquip ?? []
  const frentesDaObra = new Set(contexto.frentesDaObra ?? frentes.map((rf) => rf.frente_id))
  const equipamentosPossiveis = new Set(contexto.equipamentosPossiveis ?? [])
  const comFoto = new Set(contexto.comFoto ?? [])
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

  // ---- Frentes ----
  const frentesTiradas = []
  for (const id of new Set(pedido.frentes_tiradas ?? [])) {
    if (!frentes.some((x) => x.id === id)) continue // já saiu
    if (!contexto.podeTirarFrente) return { erro: 'Só o Engenheiro tira frente do diário, e só de dia não fechado.' }
    if (comFoto.has(id)) return { erro: 'Esta frente tem foto neste dia: ela não sai do diário.' }
    frentesTiradas.push(id)
  }
  // Frente "nova" que já está no dia (repetir depois de cair no meio) vira edição da linha.
  const pedidas = { ...(pedido.frentes ?? {}) }
  const frentesNovas = []
  for (const nova of pedido.frentes_novas ?? []) {
    if (!frentesDaObra.has(nova.frente_id)) return { erro: 'Frente não encontrada nesta obra.' }
    const ja = frentes.find((rf) => rf.frente_id === nova.frente_id)
    if (ja) { pedidas[ja.id] = { ...nova, ...pedidas[ja.id] }; continue }
    if (frentesNovas.some((x) => x.frente_id === nova.frente_id)) continue
    const erro = erroDaSituacao(nova)
    if (erro) return { erro }
    frentesNovas.push({
      frente_id: nova.frente_id, situacao: nova.situacao, motivo_parada: nova.situacao === 'Parada' ? nova.motivo_parada : null,
      descricao: String(nova.descricao ?? ''), equipe: [...new Set(nova.equipe ?? [])].filter((id) => presentes.has(id)),
    })
  }
  // A tela manda todas as linhas, também a que pediu para tirar: essa, se já saiu, é ignorada.
  const tiradasPedidas = new Set(pedido.frentes_tiradas ?? [])
  for (const id of Object.keys(pedidas)) {
    if (frentes.some((rf) => rf.id === id)) continue
    if (!tiradasPedidas.has(id)) return { erro: 'Frente não está neste diário.' }
    delete pedidas[id]
  }
  // Equipe: só quem entra e quem sai, para o banco não apagar e regravar o time inteiro.
  const frentesQueMudam = []
  for (const rf of frentes) {
    if (frentesTiradas.includes(rf.id)) continue
    const pedida = pedidas[rf.id]
    const antes = equipeAtual[rf.id] ?? []
    const descricao = pedida ? String(pedida.descricao ?? '') : rf.descricao ?? ''
    const situacao = pedida?.situacao ?? rf.situacao
    const motivo = situacao !== 'Parada' ? null : (pedida?.situacao ? pedida.motivo_parada : rf.motivo_parada) ?? null
    const mudouSituacao = situacao !== rf.situacao || motivo !== (rf.motivo_parada ?? null)
    if (mudouSituacao) {
      const erro = erroDaSituacao({ situacao, motivo_parada: motivo })
      if (erro) return { erro }
    }
    const equipe = [...new Set(pedida?.equipe ?? antes)].filter((id) => presentes.has(id))
    const mudouDescricao = descricao !== (rf.descricao ?? '')
    const entra = equipe.filter((id) => !antes.includes(id))
    const sai = antes.filter((id) => !equipe.includes(id))
    if (mudouDescricao || mudouSituacao || entra.length || sai.length) {
      frentesQueMudam.push({ id: rf.id, descricao, mudouDescricao, situacao, motivo_parada: motivo, mudouSituacao, entra, sai })
    }
  }

  // ---- Equipamentos ----
  const equipamentosTirados = []
  for (const id of new Set(pedido.equipamentos_tirados ?? [])) {
    const linha = linhasEquip.find((l) => l.id === id)
    if (!linha) continue // já saiu
    if (linha.situacao === SITUACAO_EQUIPAMENTO_CONCLUIDO) return { erro: 'Equipamento concluído não sai do diário por aqui.' }
    equipamentosTirados.push(id)
  }
  const pedidosEq = { ...(pedido.equipamentos ?? {}) }
  const equipamentosNovos = []
  for (const novo of pedido.equipamentos_novos ?? []) {
    const ja = linhasEquip.find((l) => l.equipamento_id === novo.equipamento_id)
    if (ja) { pedidosEq[ja.id] = { ...novo, ...pedidosEq[ja.id] }; continue }
    if (!equipamentosPossiveis.has(novo.equipamento_id)) return { erro: 'Esse equipamento não pode entrar neste diário.' }
    if (equipamentosNovos.some((x) => x.equipamento_id === novo.equipamento_id)) continue
    if (!SITUACOES_EQUIPAMENTO_TOQUE.includes(novo.situacao)) return { erro: 'Escolha Operando, Parado ou Quebrado.' }
    equipamentosNovos.push({ equipamento_id: novo.equipamento_id, situacao: novo.situacao, observacao: observacaoDoEquipamento(novo.situacao, novo.observacao) })
  }
  const equipamentos = []
  const tiradosPedidos = new Set(pedido.equipamentos_tirados ?? [])
  for (const [id, pedidoEq] of Object.entries(pedidosEq)) {
    if (tiradosPedidos.has(id)) continue
    const linha = linhasEquip.find((l) => l.id === id)
    if (!linha) return { erro: 'Equipamento não está neste diário.' }
    const situacao = pedidoEq.situacao ?? linha.situacao
    const observacao = observacaoDoEquipamento(situacao, pedidoEq.observacao ?? linha.observacao)
    if (situacao === linha.situacao && observacao === (linha.observacao ?? '')) continue
    if (linha.situacao === SITUACAO_EQUIPAMENTO_CONCLUIDO || !SITUACOES_EQUIPAMENTO_TOQUE.includes(situacao)) {
      return { erro: 'O Concluído não se corrige por aqui: só Operando, Parado e Quebrado.' }
    }
    equipamentos.push({ id, situacao, observacao })
  }

  return {
    rdo, efetivo, viraramPresenca, frentes: frentesQueMudam, frentesNovas, frentesTiradas,
    equipamentos, equipamentosNovos, equipamentosTirados,
  }
}

// Operando não leva observação (como na aba Hoje).
const observacaoDoEquipamento = (situacao, observacao) => (situacao === 'Operando' ? '' : String(observacao ?? ''))

// As frentes do dia que dá para tirar: quem pode tirar, e só as sem foto.
export const frentesQueSaem = (rdoFrentes, comFoto, podeTirar) => (podeTirar ? rdoFrentes.filter((rf) => !comFoto.includes(rf.id)).map((rf) => rf.id) : [])

function erroDaSituacao({ situacao, motivo_parada }) {
  if (!SITUACOES_FRENTE_DIA.includes(situacao)) return 'Escolha a situação da frente.'
  if (situacao === 'Parada' && !MOTIVOS_PARADA.includes(motivo_parada)) return 'Escolha o motivo da parada.'
  return null
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
