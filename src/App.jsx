// Checa o login e o perfil e mostra a shell certa.
// No mock, o login é de mentira (dados.entrar); na Etapa 7 vira o Supabase Auth.
import { useState } from 'react'
import { sair } from './lib/dados.js'
import { ObraProvider } from './lib/ObraContext.jsx'
import { ToastProvider } from './components/index.jsx'
import Login from './pages/Login.jsx'
import Pendente from './pages/Pendente.jsx'
import AppEngenheiro from './pages/AppEngenheiro.jsx'
import AppCliente from './pages/AppCliente.jsx'

export default function App() {
  const [perfil, setPerfil] = useState(null)

  async function aoSair() {
    await sair()
    setPerfil(null)
  }

  let tela
  if (!perfil) tela = <Login aoEntrar={setPerfil} />
  else if (perfil.role === 'Engenheiro') tela = <ObraProvider><AppEngenheiro perfil={perfil} aoSair={aoSair} /></ObraProvider>
  else if (perfil.role === 'Cliente') tela = <AppCliente perfil={perfil} aoSair={aoSair} />
  else tela = <Pendente perfil={perfil} aoSair={aoSair} />

  return <ToastProvider>{tela}</ToastProvider>
}
