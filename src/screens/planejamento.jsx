// Planejamento (Last Planner) — aba dentro da obra, com quatro sub-abas.
// REGRA DE OURO: as quatro leem a MESMA lista de atividades (e o mesmo calendário), que
// mora aqui. Uma mudança numa sub-aba aparece em todas.
// Ciclo de uso: EAP → Longo prazo → Médio prazo → Curto prazo.
//
// GRAVAR É OTIMISTA: a tela muda no toque (a mudança vem de planejamentoLocal.js), o banco
// grava e a lista é relida. Se o banco recusar, a tela volta ao que era e avisa por quê.
// Enquanto o banco não responde, os botões de gravar esperam (evita o toque duplo).
import { useState } from 'react'
import { listarPlanejamento } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { Carregando, ErroCarga, useToast } from '../components/index.jsx'
import Eap from './eap.jsx'
import LongoPrazo from './longoPrazo.jsx'
import MedioPrazo from './medioPrazo.jsx'
import CurtoPrazo from './curtoPrazo.jsx'

const VISTAS = ['EAP', 'Longo prazo', 'Médio prazo', 'Curto prazo']

export default function Planejamento() {
  const toast = useToast()
  const planejamento = useDados(listarPlanejamento)
  const [dados, setDados] = useState(null) // o mais novo: o do toque, depois o relido do banco
  const [vista, setVista] = useState('EAP')
  const [ocupado, setOcupado] = useState(false)

  // Busca de novo sem sair da tela. Se nem isso der (internet caiu), fica como está.
  async function atualizar() {
    const { data } = await listarPlanejamento()
    if (data) setDados(data)
  }

  async function tentarDeNovo() {
    await planejamento.recarregar()
    setDados(null)
  }

  // `acao` grava (função de dados.js); `mudar` é o que a tela mostra já no toque.
  // `sucesso` pode ser uma frase ou uma função que recebe o que o banco devolveu.
  async function gravar(acao, { mudar, sucesso, falhou }) {
    const antes = dados ?? planejamento.data
    setOcupado(true)
    if (mudar) setDados(mudar(antes))
    const { data, erro } = await acao()
    if (erro) {
      setDados(antes)
      toast(`${falhou}: ${erro}`, 'bad')
    }
    await atualizar()
    setOcupado(false)
    if (!erro && sucesso) toast(typeof sucesso === 'function' ? sucesso(data) : sucesso)
    return { data, erro }
  }

  let corpo
  if (planejamento.carregando) corpo = <Carregando />
  else if (planejamento.erro) corpo = <ErroCarga erro={planejamento.erro} tentar={tentarDeNovo} />
  else {
    const { atividades, calendario, restricoes, semanas, subtarefas } = dados ?? planejamento.data
    const comum = { lista: atividades, gravar, ocupado, irParaEap: () => setVista('EAP') }
    if (vista === 'EAP') corpo = <Eap {...comum} calendario={calendario} atualizar={atualizar} />
    else if (vista === 'Longo prazo') corpo = <LongoPrazo {...comum} calendario={calendario} />
    else if (vista === 'Médio prazo') corpo = <MedioPrazo {...comum} restricoes={restricoes} />
    else corpo = <CurtoPrazo {...comum} semanas={semanas} subtarefas={subtarefas} />
  }

  return (
    <>
      <div className="tabs" role="tablist">
        {VISTAS.map((v) => (
          <button key={v} role="tab" aria-selected={vista === v} className={`tab${vista === v ? ' on' : ''}`} onClick={() => setVista(v)}>{v}</button>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>{corpo}</div>
    </>
  )
}
