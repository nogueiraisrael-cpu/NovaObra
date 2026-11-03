// Fotos no Storage (migration 20261103-16): onde cada foto mora e como reconhecer as antigas.
// Na tabela fica só o CAMINHO dentro da pasta privada "fotos"; o endereço para mostrar é
// assinado na hora, vale 1 hora, e nunca é gravado.

export const PASTA_DE_FOTOS = 'fotos'
export const MODULOS_DE_FOTO = ['diario', 'nota-fiscal']
export const VALIDADE_DO_ENDERECO = 3600 // segundos
// Foto de celular tem uns 4 MB: encolhida, fica perto de 200 KB (plano grátis do Supabase).
export const LADO_MAIOR = 1200
export const QUALIDADE = 0.8

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// <obra_id>/<modulo>/<id>.jpg — o banco confere obra e módulo por este caminho.
export function caminhoDaFoto(obraId, modulo, id) {
  if (!UUID.test(obraId ?? '')) throw new Error('Foto sem obra válida.')
  if (!MODULOS_DE_FOTO.includes(modulo)) throw new Error(`Módulo de foto desconhecido: ${modulo}`)
  return `${obraId}/${modulo}/${id}.jpg`
}

// As fotos antigas (e as de exemplo) moram dentro da própria tabela, num endereço "data:".
// Essas aparecem como estão; só as do Storage precisam de endereço assinado.
export const estaNoStorage = (caminho) => Boolean(caminho) && !/^(data:|blob:|https?:)/.test(caminho)

// O caminho é de um arquivo desta obra e deste módulo? Só esses o app apaga: um caminho trocado
// na tabela (as tabelas de lançamento ainda estão abertas até a fase 5) não apaga foto de outro lugar.
export function caminhoEhDe(caminho, obraId, modulo) {
  if (!estaNoStorage(caminho)) return false
  const partes = caminho.split('/')
  return partes.length === 3 && partes[0] === obraId && partes[1] === modulo && /^[0-9a-f-]{36}\.jpg$/.test(partes[2])
}

// Erro do Storage em frase de gente. Falhou o envio: o resto do que a pessoa digitou não se perde.
export function mensagemDoEnvio(erro) {
  const texto = `${erro?.statusCode ?? ''} ${erro?.message ?? ''}`
  if (/fetch|network|load failed/i.test(texto)) return 'A foto não subiu: sem internet. O resto você pode salvar; tire a foto de novo depois.'
  if (/403|row-level security|unauthorized|not allowed/i.test(texto)) return 'A foto não subiu: você não tem permissão para mandar foto aqui.'
  if (/413|too large|exceeded/i.test(texto)) return 'A foto não subiu: ficou grande demais. Tente outra.'
  return 'A foto não subiu. O resto você pode salvar; tente a foto de novo depois.'
}
