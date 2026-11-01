// Busca um dado da camada de dados ao abrir a tela, com os três estados:
// carregando, erro e pronto. `recarregar()` busca de novo depois de salvar.
import { useEffect, useState } from 'react'

export function useDados(buscar, deps = []) {
  const [estado, setEstado] = useState({ data: null, erro: null, carregando: true })

  async function recarregar() {
    const { data, erro } = await buscar()
    setEstado({ data, erro, carregando: false })
  }

  useEffect(() => { recarregar() }, deps)

  return { ...estado, recarregar }
}
