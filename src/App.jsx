// Login de verdade (Supabase Auth): ao abrir, retoma a sessão guardada no aparelho; o
// perfil + a situação decidem a porta (src/lib/login.js). Nenhuma tela do app abre sem login.
import { useEffect, useState } from 'react'
import { sair, sessaoAtual, ouvirSessao } from './lib/dados.js'
import { portaDoPerfil, AVISO_BLOQUEADO } from './lib/login.js'
import { ObraProvider } from './lib/ObraContext.jsx'
import { Carregando, ToastProvider } from './components/index.jsx'
import Login from './pages/Login.jsx'
import NovaSenha from './pages/NovaSenha.jsx'
import Pendente from './pages/Pendente.jsx'
import AppEngenheiro from './pages/AppEngenheiro.jsx'
import AppCliente from './pages/AppCliente.jsx'

export default function App() {
  const [perfil, setPerfil] = useState(null)
  const [abrindo, setAbrindo] = useState(true)
  const [aviso, setAviso] = useState(null)
  const [novaSenha, setNovaSenha] = useState(false)

  useEffect(() => {
    let vivo = true
    sessaoAtual().then(({ data, erro }) => {
      if (!vivo) return
      setPerfil(data)
      setAviso(erro)
      setAbrindo(false)
    })
    const parar = ouvirSessao({
      aoChegarPeloLinkDeSenha: () => setNovaSenha(true),
      aoAcabarASessao: () => { setPerfil(null); setAviso('A sua sessão acabou. Entre de novo.') },
    })
    // Voltou para o app (outra aba, celular desbloqueado): confere de novo o perfil. Quem foi
    // bloqueado ou voltou a pendente no meio do uso cai na porta certa sem esperar o próximo login.
    // No máximo uma vez por minuto: trocar de aba ou abrir o seletor de arquivo também é "voltar".
    let ultima = Date.now()
    function conferir() {
      if (document.visibilityState !== 'visible' || Date.now() - ultima < 60_000) return
      ultima = Date.now()
      sessaoAtual().then(({ data, erro }) => {
        if (!vivo) return
        if (data) setPerfil(data)
        // Sem internet na volta não desloga ninguém; conta bloqueada, sim.
        else if (erro === AVISO_BLOQUEADO) { setPerfil(null); setAviso(erro) }
      })
    }
    window.addEventListener('focus', conferir)
    document.addEventListener('visibilitychange', conferir)
    return () => {
      vivo = false
      parar()
      window.removeEventListener('focus', conferir)
      document.removeEventListener('visibilitychange', conferir)
    }
  }, [])

  async function aoSair() {
    await sair()
    setPerfil(null)
    setAviso(null)
  }

  function aoEntrar(p) {
    setNovaSenha(false)
    setPerfil(p)
  }

  let tela
  if (abrindo) tela = <div className="login"><Carregando /></div>
  else if (novaSenha) tela = <NovaSenha aoEntrar={aoEntrar} />
  else {
    switch (portaDoPerfil(perfil)) {
      case 'pendente': tela = <Pendente perfil={perfil} aoSair={aoSair} />; break
      case 'cliente': tela = <AppCliente perfil={perfil} aoSair={aoSair} />; break
      case 'equipe': tela = <ObraProvider><AppEngenheiro perfil={perfil} aoSair={aoSair} /></ObraProvider>; break
      default: tela = <Login key={aviso ?? 'login'} aoEntrar={aoEntrar} avisoInicial={aviso} />
    }
  }

  return <ToastProvider>{tela}</ToastProvider>
}
