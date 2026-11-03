// Entrar, criar conta e "esqueci minha senha". Quem decide tudo é a camada de dados
// (src/lib/dados.js → Supabase Auth); a tela só mostra a frase que volta.
import { useState } from 'react'
import { entrar, criarConta, esqueciSenha } from '../lib/dados.js'
import { SENHA_MINIMA } from '../lib/login.js'
import { Icon } from '../components/index.jsx'

const TITULO = { entrar: 'Entrar', criar: 'Criar conta', esqueci: 'Esqueci minha senha' }
const BOTAO = { entrar: 'Entrar', criar: 'Criar conta', esqueci: 'Mandar o link' }

export default function Login({ aoEntrar, avisoInicial = null }) {
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(avisoInicial)
  const [recado, setRecado] = useState(null)
  const [enviando, setEnviando] = useState(false)

  function trocar(novo) {
    setModo(novo)
    setErro(null)
    setRecado(null)
  }

  async function enviar(e) {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro(null)
    setRecado(null)
    let r
    if (modo === 'entrar') r = await entrar(email, senha)
    else if (modo === 'criar') r = await criarConta({ nome, email, senha })
    else r = await esqueciSenha(email)
    setEnviando(false)
    if (r.erro) return setErro(r.erro)
    if (modo === 'esqueci') return setRecado('Se existir conta com este e-mail, o link para criar uma senha nova chega em alguns minutos. Confira também o spam.')
    if (r.data?.confirmar) {
      setSenha('')
      setModo('entrar')
      return setRecado(`Conta criada. Abra o link que mandamos para ${email.trim()} para confirmar o e-mail, e depois entre aqui.`)
    }
    aoEntrar(r.data)
  }

  return (
    <div className="login">
      <form className="login-box" onSubmit={enviar} noValidate>
        <div className="brand">
          <div className="brand-mark"><Icon nome="obras" /></div>
          <b>Nova Obra</b>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>{TITULO[modo]}</h1>
        {modo === 'esqueci' && <p className="sub">Informe o seu e-mail: mandamos um link para criar uma senha nova.</p>}
        {modo === 'criar' && (
          <>
            <label className="label" htmlFor="nome">Nome</label>
            <input id="nome" className="field" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
          </>
        )}
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        {modo !== 'esqueci' && (
          <>
            <label className="label" htmlFor="senha">Senha{modo === 'criar' ? ` (pelo menos ${SENHA_MINIMA} caracteres)` : ''}</label>
            <input id="senha" className="field" type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />
          </>
        )}
        {erro && <div className="err">{erro}</div>}
        {recado && <div className="ok-msg">{recado}</div>}
        <div className="cta">
          <button className="btn btn-primary center" disabled={enviando}>{enviando ? 'Aguarde…' : BOTAO[modo]}</button>
        </div>
        {modo === 'entrar' && (
          <>
            <button type="button" className="btn btn-full t-info" style={{ marginTop: 8 }} onClick={() => trocar('esqueci')}>Esqueci minha senha</button>
            <button type="button" className="btn btn-full t-info" onClick={() => trocar('criar')}>Criar conta</button>
          </>
        )}
        {modo !== 'entrar' && (
          <button type="button" className="btn btn-full t-info" style={{ marginTop: 8 }} onClick={() => trocar('entrar')}>Voltar para entrar</button>
        )}
      </form>
    </div>
  )
}
