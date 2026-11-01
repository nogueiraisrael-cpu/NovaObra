// Datas sempre no fuso local. Nunca usar toISOString() para "hoje":
// ela vira UTC e, à noite no Brasil, pula para o dia seguinte.

const doisDigitos = (n) => String(n).padStart(2, '0')

export function hojeISO(agora = new Date()) {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`
}

function paraData(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function somarDias(iso, dias) {
  const d = paraData(iso)
  d.setDate(d.getDate() + dias)
  return hojeISO(d)
}

// Dias corridos de `de` até `ate` (ate − de). Ignora horário de verão.
export function diasEntre(de, ate) {
  return Math.round((paraData(ate) - paraData(de)) / 86400000)
}

export function formatarData(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export function formatarDiaMes(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// "Sábado · 31 out 2026"
export function formatarDataLonga(iso) {
  const d = paraData(iso)
  return `${DIAS[d.getDay()]} · ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

// "30/10 às 17:42"
export function formatarMomento(instante) {
  const d = new Date(instante)
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)} às ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
}
