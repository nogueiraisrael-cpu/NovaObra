// O Supabase devolve no máximo 1.000 linhas por pedido, sem avisar: lê em páginas até vir uma
// página incompleta. `buscar(de, ate)` traz as linhas desse intervalo.
export const PAGINA = 1000

export async function lerTudo(buscar, tamanho = PAGINA) {
  const linhas = []
  for (let de = 0; ; de += tamanho) {
    const pagina = await buscar(de, de + tamanho - 1)
    linhas.push(...pagina)
    if (pagina.length < tamanho) return linhas
  }
}
