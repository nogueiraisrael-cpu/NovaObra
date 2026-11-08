// Entrar. Quem cria o login é o administrador, pelo Painel de admin: aqui não há cadastro.
import { useState } from 'react'
import { entrar } from '../lib/dados.js'
import { Icon } from '../components/index.jsx'

export default function Login({ aoEntrar, avisoInicial = null }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(avisoInicial)
  const [esqueci, setEsqueci] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro(null)
    const { data, erro: falhou } = await entrar(email, senha)
    setEnviando(false)
    if (falhou) return setErro(falhou)
    aoEntrar(data)
  }

  return (
    <div className="login">
      <form className="login-box" onSubmit={enviar} noValidate>
        <div className="brand">
          <div className="brand-mark"><Icon nome="obras" /></div>
          <b>Nova Obra</b>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Bora pra Obra</h1>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <label className="label" htmlFor="senha">Senha</label>
        <input id="senha" className="field" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
        {erro && <div className="err">{erro}</div>}
        <div className="cta">
          <button className="btn btn-primary center" disabled={enviando}>{enviando ? 'Aguarde…' : 'Entrar'}</button>
        </div>
        <button type="button" className="btn btn-full t-info" style={{ marginTop: 8 }} onClick={() => setEsqueci(true)}>Esqueci minha senha</button>
        {esqueci && <div className="hint">Peça uma senha nova ao administrador.</div>}
      </form>
    </div>
  )
}
