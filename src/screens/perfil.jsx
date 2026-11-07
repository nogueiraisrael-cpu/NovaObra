// Meu perfil: quem está logado. A lista de usuários mora no Painel de admin. Trocar a senha fica
// aqui porque quem recebe uma senha provisória do administrador precisa pôr a dele.
import { useState } from 'react'
import { NOME_PERFIL } from '../lib/listas.js'
import { SENHA_MINIMA } from '../lib/login.js'
import { trocarSenha } from '../lib/dados.js'
import { Cabecalho, useToast } from '../components/index.jsx'

function TrocarSenha() {
  const toast = useToast()
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
    const { erro: falhou } = await trocarSenha(senha)
    setEnviando(false)
    if (falhou) return setErro(falhou)
    setSenha('')
    setRepetir('')
    toast('Senha trocada')
  }

  return (
    <form onSubmit={enviar} noValidate style={{ maxWidth: 420 }}>
      <div className="sec"><h2>Trocar minha senha</h2></div>
      <label className="label" htmlFor="ts-senha">Senha nova (pelo menos {SENHA_MINIMA} caracteres)</label>
      <input id="ts-senha" className="field" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
      <label className="label" htmlFor="ts-repetir">Repita a senha nova</label>
      <input id="ts-repetir" className="field" type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" />
      {erro && <div className="err">{erro}</div>}
      <button className="btn btn-ghost" style={{ marginTop: 12 }} disabled={enviando}>{enviando ? 'Salvando…' : 'Trocar senha'}</button>
    </form>
  )
}

export default function Perfil({ perfil, aoSair }) {
  return (
    <>
      <Cabecalho eyebrow={`Meu perfil · ${NOME_PERFIL[perfil.role]}`} titulo={perfil.nome} sub={perfil.email}
        acao={<button className="btn btn-ghost" onClick={aoSair}>Sair</button>} />
      <TrocarSenha />
    </>
  )
}
