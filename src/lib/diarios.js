// Diários (histórico do RDO): ordem da lista e o resumo de cada dia. Puras: sem React, sem banco.
import { contaComoPresenca } from './efetivo.js'
import { formatarMomento } from './datas.js'

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
