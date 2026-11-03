import { Icon, Vazio } from '../components/index.jsx'

// Quem se cadastrou e ainda não foi liberado não vê dado nenhum.
export default function Pendente({ perfil, aoSair }) {
  return (
    <div className="login">
      <div className="login-box">
        <div className="brand">
          <div className="brand-mark"><Icon nome="obras" /></div>
          <b>Nova Obra</b>
        </div>
        <Vazio icone="relogio" titulo="Aguardando aprovação do administrador."
          texto={`Olá, ${perfil.nome}. Assim que o administrador liberar o seu acesso, as obras aparecem aqui. Saia e entre de novo para conferir.`}
          acao={<button className="btn btn-ghost" onClick={aoSair}>Sair</button>} />
      </div>
    </div>
  )
}
