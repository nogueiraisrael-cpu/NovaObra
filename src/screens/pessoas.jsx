// Pessoas — o efetivo lotado na obra atual, e quem não está em obra nenhuma.
// Funcionário de outra obra não aparece aqui (regra multi-obra).
import { useState } from 'react'
import { listarPessoas, salvarFuncionario } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { useObra } from '../lib/ObraContext.jsx'
import { FUNCOES } from '../lib/listas.js'
import { Cabecalho, Carregando, ErroCarga, Gaveta, Pill, Vazio, useToast } from '../components/index.jsx'

function FormFuncionario({ inicial, fechar, salvo }) {
  const { obras } = useObra()
  const [f, setF] = useState({ nome: '', funcao: 'Pedreiro', ativo: true, ...inicial })
  const [erro, setErro] = useState(null)
  async function salvar() {
    const { erro: falhou } = await salvarFuncionario(f)
    if (falhou) return setErro(falhou)
    salvo()
  }
  return (
    <>
      <div className="eyebrow">{f.id ? 'Editar funcionário' : 'Novo funcionário'}</div>
      <h2>{f.id ? f.nome : 'Cadastrar funcionário'}</h2>
      <label className="label" htmlFor="pf-nome">Nome</label>
      <input id="pf-nome" className="field" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <label className="label" htmlFor="pf-funcao">Função</label>
      <select id="pf-funcao" className="field" value={f.funcao} onChange={(e) => setF({ ...f, funcao: e.target.value })}>
        {FUNCOES.map((x) => <option key={x}>{x}</option>)}
      </select>
      <label className="label" htmlFor="pf-obra">Obra em que está lotado</label>
      <select id="pf-obra" className="field" value={f.obra_id ?? ''} onChange={(e) => setF({ ...f, obra_id: e.target.value || null })}>
        <option value="">Sem obra</option>
        {obras.filter((o) => o.situacao !== 'Concluída').map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
      <div className="hint">Trocar a obra aqui é definitivo. Para um dia só, use “Deslocado” no RDO.</div>
      {f.id && (
        <div className="toggle-row" style={{ marginTop: 16 }}>
          Ativo
          <button className={`switch${f.ativo ? ' on' : ''}`} role="switch" aria-checked={f.ativo} aria-label="Ativo" onClick={() => setF({ ...f, ativo: !f.ativo })} />
        </div>
      )}
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar}>Salvar</button>
      </div>
    </>
  )
}

function Linha({ f, abrir }) {
  return (
    <button className="item" onClick={() => abrir(f)}>
      <div className="item-top">
        <div><h3>{f.nome}</h3><div className="meta">{f.funcao}</div></div>
        {!f.ativo && <Pill>Inativo</Pill>}
      </div>
    </button>
  )
}

export default function Pessoas() {
  const { obra, obraId } = useObra()
  const toast = useToast()
  const pessoas = useDados(listarPessoas)
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState(null)

  const cabecalho = (
    <Cabecalho eyebrow="Funcionários" titulo="Pessoas" sub={`Lotados em ${obra.nome}`}
      acao={<button className="btn btn-ghost" onClick={() => setForm({ obra_id: obraId })}>+ Funcionário</button>} />
  )
  const gaveta = (
    <Gaveta aberta={form !== null} fechar={() => setForm(null)} rotulo="Funcionário">
      {form !== null && <FormFuncionario inicial={form} fechar={() => setForm(null)} salvo={() => { setForm(null); toast('Funcionário salvo'); pessoas.recarregar() }} />}
    </Gaveta>
  )

  if (pessoas.carregando) return <>{cabecalho}<Carregando /></>
  if (pessoas.erro) return <>{cabecalho}<ErroCarga erro={pessoas.erro} tentar={pessoas.recarregar} /></>

  const filtro = (lista) => lista.filter((f) => f.nome.toLowerCase().includes(busca.trim().toLowerCase()))
  const daObra = filtro(pessoas.data.daObra)
  const semObra = filtro(pessoas.data.semObra)

  return (
    <>
      {cabecalho}
      <div className="note" style={{ textAlign: 'left', padding: '14px 16px', fontSize: 15 }}>Presença do mês chega na v1.1.</div>
      <label className="label" htmlFor="busca-pessoa">Buscar por nome</label>
      <input id="busca-pessoa" className="field" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: João" />
      <div className="sec"><h2>{obra.nome}</h2><span className="t-muted" style={{ fontSize: 15 }}>{daObra.length}</span></div>
      {daObra.length
        ? <div className="list two">{daObra.map((f) => <Linha key={f.id} f={f} abrir={setForm} />)}</div>
        : <Vazio pequeno icone="pessoas" titulo="Nenhum funcionário lotado nesta obra" texto="O efetivo do diário vem daqui. Toque em + Funcionário." />}
      {semObra.length > 0 && (
        <>
          <div className="sec"><h2>Sem obra</h2><span className="t-muted" style={{ fontSize: 15 }}>{semObra.length}</span></div>
          <div className="list two">{semObra.map((f) => <Linha key={f.id} f={f} abrir={setForm} />)}</div>
        </>
      )}
      {gaveta}
    </>
  )
}
