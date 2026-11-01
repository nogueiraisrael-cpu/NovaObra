// A obra escolhida, compartilhada pelo app inteiro.
// - Guarda a escolha no aparelho: fechou e abriu, volta na mesma obra.
// - Avisa a camada de dados (definirObraAtual) ANTES de a tela remontar,
//   para nenhuma busca sair com a obra antiga.
import { createContext, useContext, useEffect, useState } from 'react'
import { listarObras, definirObraAtual } from './dados.js'
import { escolherObraInicial } from './obras.js'

const CHAVE = 'novaobra.obraId'

function lerGuardada() {
  try { return localStorage.getItem(CHAVE) } catch (_) { return null }
}
function guardar(id) {
  try {
    if (id) localStorage.setItem(CHAVE, id)
    else localStorage.removeItem(CHAVE)
  } catch (_) { /* aba anônima ou armazenamento bloqueado: segue sem lembrar */ }
}

const ObraCtx = createContext(null)

export function ObraProvider({ children }) {
  const [obras, setObras] = useState(null)
  const [obraId, setObraId] = useState(null)
  const [restaurada, setRestaurada] = useState(false)
  const [erro, setErro] = useState(null)
  // Lida uma vez só, na montagem: o efeito abaixo pode rodar duas vezes em
  // desenvolvimento e, na segunda, já acharia a obra que a primeira guardou.
  const [guardadaAoAbrir] = useState(lerGuardada)

  async function carregar(preferida) {
    const { data, erro: e } = await listarObras()
    if (e) { setErro(e); return }
    const guardada = preferida ?? guardadaAoAbrir
    const id = escolherObraInicial(data, guardada)
    definirObraAtual(id)
    guardar(id)
    setObras(data)
    setObraId(id)
    if (preferida === undefined) setRestaurada(Boolean(guardada) && id === guardada)
  }

  useEffect(() => { carregar() }, [])

  function trocarObra(id) {
    definirObraAtual(id)
    guardar(id)
    setObraId(id)
  }

  const valor = {
    obras: obras ?? [],
    obraId,
    obra: obras?.find((o) => o.id === obraId) ?? null,
    restaurada,
    trocarObra,
    recarregarObras: (preferida) => carregar(preferida ?? obraId),
  }

  if (erro) return <div className="login"><div className="note">{erro}</div></div>
  if (!obras) return <div className="login"><div className="note">Carregando obras…</div></div>
  return <ObraCtx.Provider value={valor}>{children}</ObraCtx.Provider>
}

export const useObra = () => useContext(ObraCtx)
