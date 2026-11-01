// Shell do Engenheiro: menu (barra inferior no celular, lateral no computador),
// seletor de obra fixo no topo e o roteamento por estado.
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { Icon, SeletorObra, Vazio } from '../components/index.jsx'
import Obras from '../screens/obras.jsx'
import Obra from '../screens/obra.jsx'
import Ocorrencias from '../screens/ocorrencias.jsx'
import Equipamentos from '../screens/equipamentos.jsx'
import Pessoas from '../screens/pessoas.jsx'
import Presenca from '../screens/presenca.jsx'
import Perfil from '../screens/perfil.jsx'

const MENU = [
  { id: 'obras', rotulo: 'Obras', curto: 'Obras', telas: ['obras', 'obra'] },
  { id: 'ocorrencias', rotulo: 'Ocorrências', curto: 'Ocorrênc.', icone: 'ocorr', telas: ['ocorrencias'] },
  { id: 'equipamentos', rotulo: 'Equipamentos', curto: 'Equipam.', icone: 'equip', telas: ['equipamentos'] },
  { id: 'pessoas', rotulo: 'Pessoas', curto: 'Pessoas', telas: ['pessoas', 'presenca'] },
  { id: 'perfil', rotulo: 'Perfil', curto: 'Perfil', telas: ['perfil'] },
]

// Telas que só fazem sentido dentro de uma obra escolhida.
const PRECISAM_DE_OBRA = ['obra', 'ocorrencias', 'equipamentos', 'pessoas', 'presenca']

export default function AppEngenheiro({ perfil, aoSair }) {
  const { obraId, restaurada, trocarObra } = useObra()
  // Voltou numa obra guardada → abre direto nela. Primeira vez → o comparativo.
  const [route, setRoute] = useState(() => ({ screen: restaurada && obraId ? 'obra' : 'obras', params: {} }))
  const goto = (screen, params = {}) => { setRoute({ screen, params }); window.scrollTo(0, 0) }

  // Trocar de obra: a camada de dados já aponta para a nova, os parâmetros da
  // tela (passo, aba) zeram, e o `key={obraId}` abaixo remonta tudo do zero.
  function aoTrocarObra(id) {
    trocarObra(id)
    setRoute((r) => ({ screen: r.screen, params: {} }))
    window.scrollTo(0, 0)
  }
  function abrirObra(id) {
    if (id !== obraId) trocarObra(id)
    goto('obra')
  }

  let corpo
  if (!obraId && PRECISAM_DE_OBRA.includes(route.screen)) {
    corpo = <Vazio icone="obras" titulo="Nenhuma obra cadastrada" texto="Toque em + Nova obra para começar."
      acao={<button className="btn btn-primary" onClick={() => goto('obras')}>Ir para Obras</button>} />
  } else {
    switch (route.screen) {
      case 'obra': corpo = <Obra goto={goto} params={route.params} />; break
      case 'ocorrencias': corpo = <Ocorrencias />; break
      case 'equipamentos': corpo = <Equipamentos />; break
      case 'pessoas': corpo = <Pessoas goto={goto} />; break
      case 'presenca': corpo = <Presenca goto={goto} />; break
      case 'perfil': corpo = <Perfil perfil={perfil} aoSair={aoSair} />; break
      default: corpo = <Obras goto={goto} abrirObra={abrirObra} />
    }
  }

  const ativo = MENU.find((m) => m.telas.includes(route.screen))?.id
  const icone = (m) => <Icon nome={m.icone ?? m.id} />

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="brand-mark"><Icon nome="obras" /></div>
          <b>Nova Obra</b>
        </div>
        <nav>
          {MENU.map((m) => (
            <button key={m.id} className={ativo === m.id ? 'on' : ''} onClick={() => goto(m.id)}>{icone(m)}{m.rotulo}</button>
          ))}
        </nav>
        <div className="who">{perfil.nome}<small>Engenheiro · todas as obras</small></div>
      </aside>

      <main className="main">
        <div className="wrap">
          <SeletorObra aoTrocar={aoTrocarObra} aoComparar={() => goto('obras')} />
          <div key={obraId ?? 'sem-obra'}>{corpo}</div>
        </div>
      </main>

      <nav className="bottom">
        {MENU.map((m) => (
          <button key={m.id} className={ativo === m.id ? 'on' : ''} onClick={() => goto(m.id)}>
            {icone(m)}<span className="long">{m.rotulo}</span><span className="short">{m.curto}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
