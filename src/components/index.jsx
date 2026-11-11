// Peças reutilizáveis da interface. Nada de regra de negócio aqui.
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { textosDasObras } from '../lib/dados.js'
import { inicialDoNome } from '../lib/login.js'
import { CLIMAS } from '../lib/listas.js'

// ---------- ícones (SVG do preview.html) ----------
const ICONES = {
  obras: <path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-6h4v6" />,
  ocorr: <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17.5v.01" /></>,
  equip: <><circle cx="7" cy="17" r="3" /><circle cx="17" cy="17" r="3" /><path d="M10 17h4M4 14V8h8l3 6M12 8V5" /></>,
  pessoas: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.6" /><path d="M17.5 14.6c2.2.4 3.6 2 4 5.4" /></>,
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.2 4.2-6.5 8-6.5s7 2.3 8 6.5" /></>,
  chev: <path d="m9 6 6 6-6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  back: <path d="m15 6-6 6 6 6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5 12 5 5 9-10" />,
  sol: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  nublado: <path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z" />,
  chuva: <><path d="M7 14h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7a3.5 3.5 0 0 0 1 7z" /><path d="M9 17l-1 3M14 17l-1 3" /></>,
  chuvaf: <><path d="M7 13h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 6a3.5 3.5 0 0 0 1 7z" /><path d="M8 16l-1.5 4M12 16l-1.5 4M16 16l-1.5 4" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  galeria: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>,
  frente: <><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-5h6v5" /><path d="M12 9v.01" /></>,
  relogio: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  troca: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
  caixa: <><path d="m3 7 9-4 9 4v10l-9 4-9-4z" /><path d="m3 7 9 4 9-4M12 11v10" /></>,
  prancheta: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" /></>,
  planta: <><path d="M4 4h16v16H4z" /><path d="M4 11h7v9M11 4v4M15 11h5" /></>,
  escudo: <><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  caminhao: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
}

export function Icon({ nome, ...resto }) {
  return <svg viewBox="0 0 24 24" className="ico" aria-hidden="true" {...resto}>{ICONES[nome]}</svg>
}

// ---------- cor e ícone de cada situação (lançamento e histórico usam os mesmos) ----------
export const ICONE_CLIMA = { 'Bom': 'sol', 'Nublado': 'nublado', 'Chuva leve': 'chuva', 'Chuva forte': 'chuvaf' }
export const COR_EFETIVO = { Presente: 'ok', Falta: 'bad', Atestado: 'warn', Deslocado: 'info', 'Veio de outra obra': 'info' }
export const COR_EQUIP = { Operando: 'ok', Parado: 'warn', Quebrado: 'bad' }
// Clima da manhã e da tarde, com o "Praticável" de cada um. `valores` tem os quatro campos do
// RDO (clima_manha, clima_tarde, praticavel_manha, praticavel_tarde); `mudar` recebe só o que mudou.
export function BlocoClima({ valores, mudar }) {
  return (
    <section className="block">
      <div className="block-h"><h3>Clima</h3></div>
      {[['manha', 'Manhã'], ['tarde', 'Tarde']].map(([per, rotulo]) => (
        <div key={per}>
          <div className="period">{rotulo}</div>
          <div className="opts">
            {CLIMAS.map((c) => (
              <button key={c} className={`opt${valores[`clima_${per}`] === c ? ' on' : ''}`} onClick={() => mudar({ [`clima_${per}`]: c })}>
                <Icon nome={ICONE_CLIMA[c]} />{c}
              </button>
            ))}
          </div>
          <div className="toggle-row">
            Praticável
            <button className={`switch${valores[`praticavel_${per}`] ? ' on' : ''}`} role="switch" aria-checked={valores[`praticavel_${per}`]}
              aria-label={`Praticável — ${rotulo}`} onClick={() => mudar({ [`praticavel_${per}`]: !valores[`praticavel_${per}`] })} />
          </div>
        </div>
      ))}
    </section>
  )
}

export const COR_SITUACAO_DIARIO ={ 'Fechado': 'ok', 'Em andamento': 'warn', 'Não fechado': 'bad' }
export const COR_FRENTE_DIA = { 'Em execução': 'ok', 'Parada': 'bad', 'Concluída': 'info' }
// Restrições do Médio prazo: cada tipo com ícone e cor próprios (as cores em index.css, .tipo-*).
export const TIPO_RESTRICAO = {
  'Material': { icone: 'caixa', classe: 'material' },
  'Mão de obra': { icone: 'pessoas', classe: 'mao' },
  'Método': { icone: 'prancheta', classe: 'metodo' },
  'Equipamento': { icone: 'equip', classe: 'equipamento' },
  'Projeto': { icone: 'planta', classe: 'projeto' },
  'Segurança': { icone: 'escudo', classe: 'seguranca' },
  'Logística': { icone: 'caminhao', classe: 'logistica' },
}

export function TipoRestricao({ tipo }) {
  return <span className={`tipo tipo-${TIPO_RESTRICAO[tipo].classe}`}><Icon nome={TIPO_RESTRICAO[tipo].icone} />{tipo}</span>
}

// ---------- etiquetas e números ----------
export function Pill({ cor = 'idle', children }) {
  return <span className={`pill ${cor}`}>{children}</span>
}

export function Stats({ itens }) {
  return (
    <section className={`stats${itens.length === 4 ? ' four' : ''}`}>
      {itens.map((s) => {
        const miolo = (
          <>
            <div className={`n ${s.cor ?? ''}`}>{s.valor}{s.de !== undefined && <small>/{s.de}</small>}</div>
            <div className="l">{s.rotulo}</div>
          </>
        )
        // Com `aoTocar`, o número vira botão (ex.: "frentes paradas" abre a lista delas).
        return s.aoTocar
          ? <button className="stat" key={s.rotulo} onClick={s.aoTocar}>{miolo}</button>
          : <div className="stat" key={s.rotulo}>{miolo}</div>
      })}
    </section>
  )
}

export function Cabecalho({ eyebrow, titulo, sub, acao, voltar }) {
  return (
    <header className="head" style={voltar ? { paddingTop: 8 } : undefined}>
      {voltar && <button className="back" onClick={voltar.onClick}><Icon nome="back" />{voltar.rotulo}</button>}
      <div className="head-row">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{titulo}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {acao}
      </div>
    </header>
  )
}

export function Vazio({ icone = 'frente', titulo, texto, acao, pequeno }) {
  return (
    <div className={`empty${pequeno ? ' small' : ''}`}>
      <div className="empty-ico"><Icon nome={icone} /></div>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {acao}
    </div>
  )
}

// Aviso vermelho embaixo de um campo de formulário.
export function ErroCampo({ erro }) {
  return erro ? <div className="err">{erro}</div> : null
}

export function Carregando() {
  return <div className="note" style={{ minHeight: 160 }}>Carregando…</div>
}

export function ErroCarga({ erro, tentar }) {
  return (
    <div className="banner bad">
      {erro || 'Não foi possível carregar. Verifique a internet e tente de novo.'}
      {tentar && <div><button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={tentar}>Tentar de novo</button></div>}
    </div>
  )
}

// Telas que chegam nas próximas fases.
export function EmBreve({ titulo, fase, texto }) {
  return (
    <Vazio icone="relogio" titulo={`${titulo} chega na ${fase}`} texto={texto} />
  )
}

// ---------- gaveta ----------
export function Gaveta({ aberta, fechar, children, rotulo }) {
  // Esc fecha a gaveta (computador).
  useEffect(() => {
    if (!aberta) return
    const aoTeclar = (e) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberta, fechar])

  if (!aberta) return null
  return (
    <>
      <div className="sheet-bg" onClick={fechar} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={rotulo}>
        <div className="grab" />
        {children}
      </div>
    </>
  )
}

// ---------- aviso rápido ----------
const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)
  function mostrar(texto, cor) {
    setMsg({ texto, cor })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), cor === 'bad' ? 3500 : 2000)
  }
  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      {msg && <div className={`toast ${msg.cor ?? ''}`} role="status">{msg.texto}</div>}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

// ---------- seletor de obra (sempre visível no topo) ----------
const COR_SITUACAO = { 'Em andamento': 'ok', 'Parada': 'warn', 'Concluída': 'idle' }

// O ícone redondo do topo: nome, papel e as saídas da conta. Sem `aoAbrirPainel`, o item some.
export function MenuConta({ nome, papel, aoAbrirPainel, aoSair }) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)
  useEffect(() => {
    if (!aberto) return
    const aoClicarFora = (e) => { if (!caixa.current?.contains(e.target)) setAberto(false) }
    const aoTeclar = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', aoClicarFora)
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  return (
    <div className="conta" ref={caixa}>
      <button className="conta-bola" aria-label={`Conta de ${nome}`} aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        {inicialDoNome(nome)}
      </button>
      {aberto && (
        <div className="conta-menu" role="menu">
          <div className="conta-quem"><b>{nome}</b><span>{papel}</span></div>
          {aoAbrirPainel && <button role="menuitem" onClick={() => { setAberto(false); aoAbrirPainel() }}>Painel de admin</button>}
          <button role="menuitem" onClick={aoSair}>Sair</button>
        </div>
      )}
    </div>
  )
}

export function SeletorObra({ aoTrocar, aoComparar, conta }) {
  const { obras, obra, obraId } = useObra()
  const [aberto, setAberto] = useState(false)
  const grupos = [
    ['Em andamento', obras.filter((o) => o.situacao === 'Em andamento')],
    ['Paradas', obras.filter((o) => o.situacao === 'Parada')],
    ['Concluídas', obras.filter((o) => o.situacao === 'Concluída')],
  ].filter(([, lista]) => lista.length)

  return (
    <div className="obra-bar">
      <button className="obra-pick" onClick={() => setAberto(true)} aria-label="Trocar de obra">
        <div className="grow">
          <div className="lbl">Você está na obra</div>
          <div className="nm">{obra ? obra.nome : textosDasObras().semObra}</div>
        </div>
        {obra && <span className="cod">{obra.codigo}</span>}
        <Icon nome="down" />
      </button>
      {conta}
      <Gaveta aberta={aberto} fechar={() => setAberto(false)} rotulo="Escolher obra">
        <div className="eyebrow">Trocar de obra</div>
        <h2>Em qual obra você está?</h2>
        <div className="sub">A tela inteira passa a mostrar só a obra escolhida.</div>
        {grupos.map(([titulo, lista]) => (
          <div key={titulo}>
            <div className="label">{titulo}</div>
            <div className="pick-list">
              {lista.map((o) => (
                <button key={o.id} className={`pick${o.id === obraId ? ' on' : ''}`}
                  onClick={() => { setAberto(false); if (o.id !== obraId) aoTrocar(o.id) }}>
                  <div><b>{o.nome}</b><span>{o.codigo} · {o.tipo} · {o.cidade}</span></div>
                  {o.id === obraId ? <Pill cor="info">Atual</Pill> : <Pill cor={COR_SITUACAO[o.situacao]}>{o.situacao}</Pill>}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="cta">
          <button className="btn btn-ghost btn-full" onClick={() => { setAberto(false); aoComparar() }}>{textosDasObras().comparar}</button>
        </div>
      </Gaveta>
    </div>
  )
}
