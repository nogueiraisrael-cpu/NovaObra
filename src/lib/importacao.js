// Importação de cronograma: confere as linhas lidas da planilha antes de virar atividades
// da EAP. Recebe tudo como TEXTO (planilhaCronograma.js cuida de ler assim). A hierarquia
// sai do código ITEM: "2.1" fica dentro de "2", em qualquer profundidade.
// Duração em dias CORRIDOS, contando o início e o término (02/11 a 02/11 = 1 dia).
// Sem React, sem banco.
import { somarDias, diasEntre } from './datas.js'

const PADRAO_ITEM = /^\d+(\.\d+)*$/

// "1.0" (planilha antiga) é o mesmo que "1". Espaços e ponto no fim saem. "1.10" fica como está.
export function normalizarItem(valor) {
  let s = String(valor ?? '').trim().replace(/\.+$/, '')
  if (/^\d+\.0$/.test(s)) s = s.slice(0, -2)
  return s
}

const doisDigitos = (n) => String(n).padStart(2, '0')

// "DD/MM/AAAA" (ou "D/M/AAAA", ou "AAAA-MM-DD") → "AAAA-MM-DD". Data que não existe → null.
export function lerData(valor) {
  const s = String(valor ?? '').trim()
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  let [d, mes, a] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : []
  if (!m) {
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return null
    ;[a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  }
  const data = new Date(a, mes - 1, d)
  if (data.getFullYear() !== a || data.getMonth() !== mes - 1 || data.getDate() !== d) return null
  return `${a}-${doisDigitos(mes)}-${doisDigitos(d)}`
}

const lerDuracao = (valor) => {
  const s = String(valor ?? '').trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Math.round(Number(s))
  return n >= 1 ? n : null
}

const partes = (item) => item.split('.').map(Number)
function compararItens(a, b) {
  const [x, y] = [partes(a), partes(b)]
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === undefined) return -1
    if (y[i] === undefined) return 1
    if (x[i] !== y[i]) return x[i] - y[i]
  }
  return 0
}

const paiDe = (item) => (item.includes('.') ? item.slice(0, item.lastIndexOf('.')) : null)

// Confere as linhas cruas ({ linha, item, titulo, inicio, fim, duracao }, tudo texto).
// Devolve as linhas em ordem de código, com nível, mãe, datas resolvidas e a lista de
// erros de cada uma; `erros` = total. A tela mostra; nada é gravado aqui.
export function conferirImportacao(cruas) {
  const linhas = cruas.map((c) => {
    const item = normalizarItem(c.item)
    const valido = PADRAO_ITEM.test(item)
    return {
      linha: c.linha, item, titulo: String(c.titulo ?? '').trim(), valido,
      nivel: valido ? partes(item).length - 1 : 0, pai: valido ? paiDe(item) : null,
      textoInicio: String(c.inicio ?? '').trim(), textoFim: String(c.fim ?? '').trim(),
      inicio: lerData(c.inicio), fim: lerData(c.fim), duracao: lerDuracao(c.duracao), erros: [],
    }
  })
  // Válidos em ordem de código; os sem código ou com código ruim vão para o fim, na ordem da planilha.
  linhas.sort((a, b) => (a.valido && b.valido ? compararItens(a.item, b.item) : a.valido ? -1 : b.valido ? 1 : a.linha - b.linha))

  const primeira = new Map()
  for (const l of linhas) {
    if (!l.item) { l.erros.push('Falta o código na coluna ITEM.'); continue }
    if (!l.valido) { l.erros.push(`Código "${l.item}" inválido: use números separados por ponto (ex.: 2.1).`); continue }
    if (primeira.has(l.item)) l.erros.push(`Código ${l.item} repetido (linha ${primeira.get(l.item)} também usa).`)
    else primeira.set(l.item, l.linha)
  }
  for (const l of linhas) {
    if (l.valido && l.pai && !primeira.has(l.pai)) l.erros.push(`Falta o item "${l.pai}" (o ${l.item} fica dentro dele).`)
    if (!l.titulo) l.erros.push('Atividade sem nome.')
  }

  // Datas: término em branco sai do início + duração (e vice-versa); duração em branco sai das datas.
  const temFilha = (l) => l.valido && linhas.some((x) => x.pai === l.item)
  for (const l of linhas) {
    if (l.textoInicio && !l.inicio) l.erros.push(`Data de início inválida: "${l.textoInicio}". Use DD/MM/AAAA.`)
    if (l.textoFim && !l.fim) l.erros.push(`Data de término inválida: "${l.textoFim}". Use DD/MM/AAAA.`)
    if (l.inicio && !l.fim && !l.textoFim && l.duracao) l.fim = somarDias(l.inicio, l.duracao - 1)
    if (l.fim && !l.inicio && !l.textoInicio && l.duracao) l.inicio = somarDias(l.fim, -(l.duracao - 1))
  }
  // Grupo sem datas pega o período das filhas (das mais fundas para cima).
  for (const l of [...linhas].sort((a, b) => b.nivel - a.nivel)) {
    if (!temFilha(l)) continue
    const filhas = linhas.filter((x) => x.pai === l.item)
    if (!l.inicio && !l.textoInicio) l.inicio = filhas.map((x) => x.inicio).filter(Boolean).sort()[0] ?? null
    if (!l.fim && !l.textoFim) l.fim = filhas.map((x) => x.fim).filter(Boolean).sort().at(-1) ?? null
  }
  for (const l of linhas) {
    if (!l.inicio && !l.textoInicio) l.erros.push('Falta a data de início.')
    if (!l.fim && !l.textoFim) l.erros.push('Falta a data de término (ou a duração).')
    if (l.inicio && l.fim) {
      if (l.fim < l.inicio) l.erros.push('O término é antes do início.')
      else l.duracao = diasEntre(l.inicio, l.fim) + 1
    }
  }
  return { linhas, erros: linhas.reduce((s, l) => s + l.erros.length, 0) }
}

// O que vai para o banco: `chave` (o código) e `paiChave` ligam mãe e filha; `ordem` é a
// posição entre as irmãs, na ordem dos códigos. Só para uma conferência sem erros.
export function paraGravar(conferencia) {
  if (conferencia.erros) throw new Error('A planilha ainda tem problemas.')
  const contador = new Map()
  return conferencia.linhas.map((l) => {
    const ordem = contador.get(l.pai) ?? 0
    contador.set(l.pai, ordem + 1)
    return { chave: l.item, paiChave: l.pai, ordem, titulo: l.titulo, data_inicio: l.inicio, data_fim: l.fim }
  })
}
