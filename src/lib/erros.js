// Erro que não veio do banco nem de uma regra daqui: erro de programação, em inglês.
// Esse nunca vai para a tela; as frases das regras (em português), sim.
export const FRASE_ERRO_INTERNO = 'Algo deu errado nesta tela. Recarregue a página e tente de novo.'

export function fraseDoErroInterno(e) {
  if (e instanceof TypeError || e instanceof ReferenceError || e instanceof RangeError || e instanceof SyntaxError) return FRASE_ERRO_INTERNO
  return e?.message || FRASE_ERRO_INTERNO
}
