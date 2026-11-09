// Regras do efetivo do dia (RDO passo 1). Puras: sem React, sem banco.
//
// `linhasDoDia` = todas as linhas de rdo_efetivo da data, de TODAS as obras.
// É a única leitura entre obras permitida fora de um comparativo: a trava de
// duas obras só existe se olhar as outras.

export const CONTA_COMO_PRESENCA = ['Presente', 'Veio de outra obra']

export const contaComoPresenca = (situacao) => CONTA_COMO_PRESENCA.includes(situacao)

// "Faltas" nos números do dia: falta e atestado juntos.
export const contaComoFalta = (situacao) => situacao === 'Falta' || situacao === 'Atestado'

// Linha de presença do funcionário em outra obra nesta data, ou null.
export function presencaEmOutraObra(funcionarioId, obraId, linhasDoDia) {
  return linhasDoDia.find((l) =>
    l.funcionario_id === funcionarioId && l.obra_id !== obraId && contaComoPresenca(l.situacao),
  ) ?? null
}

// A trava: o mesmo funcionário nunca fica presente em duas obras no mesmo dia.
export function podeMarcarPresenca(funcionarioId, obraId, linhasDoDia) {
  const outra = presencaEmOutraObra(funcionarioId, obraId, linhasDoDia)
  return outra ? { ok: false, obraId: outra.obra_id } : { ok: true, obraId: null }
}

// `quando`: "hoje" no RDO do dia; "em 05/11" ao corrigir um dia que já passou.
export function mensagemTrava(nomeFuncionario, nomeObra, quando = 'hoje') {
  return `${nomeFuncionario} já está presente ${quando} na obra ${nomeObra}`
}

// Monta a lista do efetivo de uma obra num dia.
// - Lotados ativos: a linha gravada, se existe. Sem linha: "Deslocado" se já está
//   presente em outra obra hoje; senão "Presente" (o padrão do passo 1).
// - Gente de outra obra: linha "Veio de outra obra" gravada aqui, ou uma linha
//   "Deslocado" de outra obra apontando para cá (o RDO daqui ainda não existia).
// `gravada` diz se a linha já existe no banco ou é só o padrão na tela.
export function montarEfetivo({ obraId, funcionarios, linhasDoDia }) {
  const porId = new Map(funcionarios.map((f) => [f.id, f]))
  const daqui = linhasDoDia.filter((l) => l.obra_id === obraId)
  const lista = []

  for (const f of funcionarios) {
    if (f.obra_id !== obraId || !f.ativo) continue
    const linha = daqui.find((l) => l.funcionario_id === f.id)
    if (linha) {
      lista.push({ funcionario: f, situacao: linha.situacao, obra_destino_id: linha.obra_destino_id ?? null, gravada: true })
      continue
    }
    const outra = presencaEmOutraObra(f.id, obraId, linhasDoDia)
    lista.push(outra
      ? { funcionario: f, situacao: 'Deslocado', obra_destino_id: outra.obra_id, gravada: false }
      : { funcionario: f, situacao: 'Presente', obra_destino_id: null, gravada: false })
  }

  const jaNaLista = new Set(lista.map((i) => i.funcionario.id))
  const vindos = [
    ...daqui.filter((l) => l.situacao === 'Veio de outra obra'),
    ...linhasDoDia.filter((l) => l.obra_id !== obraId && l.situacao === 'Deslocado' && l.obra_destino_id === obraId),
  ]
  for (const l of vindos) {
    const f = porId.get(l.funcionario_id)
    if (!f || jaNaLista.has(f.id)) continue
    jaNaLista.add(f.id)
    lista.push({ funcionario: f, situacao: 'Veio de outra obra', obra_destino_id: null, gravada: l.obra_id === obraId })
  }
  return lista
}

export function resumoEfetivo(lista) {
  return {
    total: lista.length,
    presentes: lista.filter((i) => contaComoPresenca(i.situacao)).length,
    faltas: lista.filter((i) => contaComoFalta(i.situacao)).length,
    deslocados: lista.filter((i) => i.situacao === 'Deslocado').length,
  }
}
