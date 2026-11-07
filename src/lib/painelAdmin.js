// O que a lista do Painel de admin mostra. Sem React e sem banco.
import { formatarMomento } from './datas.js'

// Pendentes primeiro: são os que esperam o admin. Bloqueados por último.
const ORDEM = { pendente: 0, ativo: 1, bloqueado: 2 }

export const ordenarUsuarios = (lista) => [...lista].sort((a, b) =>
  (ORDEM[a.status] - ORDEM[b.status]) || a.nome.localeCompare(b.nome, 'pt-BR'))

export function resumoDasObras(conta, obras) {
  if (conta.role === 'admin_master') return 'Todas as obras'
  const nomes = obras.filter((o) => conta.obras.includes(o.id)).map((o) => o.codigo)
  return nomes.length ? nomes.join(' · ') : 'Nenhuma obra liberada'
}

export const textoDoAcesso = (instante) => (instante ? `Último acesso: ${formatarMomento(instante)}` : 'Ainda não entrou')
