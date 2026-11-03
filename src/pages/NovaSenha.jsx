// Quem chegou pelo link de "esqueci minha senha" escolhe a senha nova aqui e já entra.
import { useState } from 'react'
import { trocarSenha } from '../lib/dados.js'
import { SENHA_MINIMA } from '../lib/login.js'
import { Icon } from '../components/index.jsx'

export default function NovaSenha({ aoEntrar }) {
  const [senha, setSenha] = useState('')
  const [repetir, setRepetir] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (enviando) return
    if (senha !== repetir) return setErro('As duas senhas não são iguais.')
    setEnviando(true)
    setErro(null)
    const { data, erro: falhou } = await trocarSenha(senha)
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
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Senha nova</h1>
        <label className="label" htmlFor="senha">Senha nova (pelo menos {SENHA_MINIMA} caracteres)</label>
        <input id="senha" className="field" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
        <label className="label" htmlFor="repetir">Repita a senha nova</label>
        <input id="repetir" className="field" type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" />
        {erro && <div className="err">{erro}</div>}
        <div className="cta">
          <button className="btn btn-primary center" disabled={enviando}>{enviando ? 'Aguarde…' : 'Salvar e entrar'}</button>
        </div>
      </form>
    </div>
  )
}
