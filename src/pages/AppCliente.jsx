import { Icon } from '../components/index.jsx'
import Avanco from '../screens/avanco.jsx'

// Shell do Cliente. Na v1.1 ganha a barra Avanço · Fotos · Comentários · Perfil,
// e o seletor mostra só as obras dele (tabela membros).
export default function AppCliente({ perfil, aoSair }) {
  return (
    <div className="login">
      <div className="login-box">
        <div className="brand">
          <div className="brand-mark"><Icon nome="obras" /></div>
          <b>Nova Obra</b>
        </div>
        <Avanco perfil={perfil} />
        <div className="cta"><button className="btn btn-ghost btn-full" onClick={aoSair}>Sair</button></div>
      </div>
    </div>
  )
}
