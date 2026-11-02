import { useState } from 'react'
import { entrar, criarConta } from '../lib/dados.js'
import { Icon } from '../components/index.jsx'

export default function Login({ aoEntrar }) {
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { data, erro: falhou } = modo === 'entrar' ? await entrar(email, senha) : await criarConta({ nome, email, senha })
    setEnviando(false)
    if (falhou) return setErro(falhou)
    aoEntrar(data)
  }

  async function entrarComo(emailTeste) {
    const { data, erro: falhou } = await entrar(emailTeste, 'teste')
    if (falhou) return setErro(falhou)
    aoEntrar(data)
  }

  return (
    <div className="login">
      <form className="login-box" onSubmit={enviar}>
        <div className="brand">
          <div className="brand-mark"><Icon nome="obras" /></div>
          <b>Nova Obra</b>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
        {modo === 'criar' && (
          <>
            <label className="label" htmlFor="nome">Nome</label>
            <input id="nome" className="field" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
          </>
        )}
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <label className="label" htmlFor="senha">Senha</label>
        <input id="senha" className="field" type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
          autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />
        {erro && <div className="err">{erro}</div>}
        <div className="cta">
          <button className="btn btn-primary center" disabled={enviando}>
            {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </div>
        <button type="button" className="btn btn-full t-info" style={{ marginTop: 8 }}
          onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setErro(null) }}>
          {modo === 'entrar' ? 'Criar conta' : 'Já tenho conta'}
        </button>

        <div className="demo">
          <p>Modo de teste: os dados já vêm do banco, mas o login de verdade só chega no passo 10. Entre direto como:</p>
          <button type="button" className="btn btn-ghost" onClick={() => entrarComo('eng@novaobra.test')}>Engenheiro</button>
          <button type="button" className="btn btn-ghost" onClick={() => entrarComo('helena@novaobra.test')}>Cliente (Dra. Helena)</button>
          <button type="button" className="btn btn-ghost" onClick={() => entrarComo('fulano@novaobra.test')}>Conta pendente</button>
        </div>
      </form>
    </div>
  )
}
