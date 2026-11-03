// Perfil e Usuários. Usuários não depende de obra: é quem entra no sistema, e só o admin vê.
import { useState } from 'react'
import { NOME_PERFIL, SITUACOES_CONTA } from '../lib/listas.js'
import { rotuloDaConta } from '../lib/login.js'
import { precisaEscolherObras } from '../lib/permissoes.js'
import { listarUsuarios, salvarUsuario, listarObrasDoUsuario, salvarObrasDoUsuario, posso } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { Cabecalho, Carregando, ErroCarga, Gaveta, Pill, useToast } from '../components/index.jsx'

const COR_SITUACAO = { pendente: 'warn', ativo: 'info', bloqueado: 'idle' }
const NOME_SITUACAO = { pendente: 'Pendente', ativo: 'Ativo', bloqueado: 'Bloqueado' }

// O gerente vê só as obras liberadas para ele. O Engenheiro (admin) vê todas e não tem lista.
function ObrasLiberadas({ obras, marcadas, mudar }) {
  if (obras.carregando) return <Carregando />
  if (obras.erro) return <ErroCarga erro={obras.erro} tentar={obras.recarregar} />
  if (!obras.data.length) return <div className="hint">Nenhuma obra cadastrada.</div>
  return (
    <div className="lines">
      {obras.data.map((o) => (
        <label key={o.id} className="toggle-row">
          <span>{o.nome} <span className="t-muted">· {o.codigo}</span></span>
          <input type="checkbox" checked={marcadas.has(o.id)} onChange={() => mudar(o.id)} style={{ width: 22, height: 22 }} />
        </label>
      ))}
    </div>
  )
}

function EditarUsuario({ u, fechar, salvo }) {
  const [role, setRole] = useState(u.role)
  const [status, setStatus] = useState(u.status)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const obras = useDados(() => listarObrasDoUsuario(u.id), [u.id])
  const [marcadas, setMarcadas] = useState(null)
  const atuais = marcadas ?? new Set((obras.data ?? []).filter((o) => o.liberada).map((o) => o.id))

  function mudarObra(id) {
    const novo = new Set(atuais)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setMarcadas(novo)
  }

  async function salvar() {
    if (salvando) return
    setSalvando(true)
    setErro(null)
    const r = await salvarUsuario({ id: u.id, role, status })
    if (!r.erro && precisaEscolherObras(role) && marcadas) {
      const o = await salvarObrasDoUsuario(u.id, [...marcadas])
      if (o.erro) r.erro = `Perfil salvo, mas as obras não: ${o.erro}`
    }
    setSalvando(false)
    if (r.erro) return setErro(r.erro)
    salvo()
  }

  return (
    <>
      <div className="eyebrow">Usuário</div>
      <h2>{u.nome}</h2>
      <div className="sub">{u.email}</div>
      <div className="label">Perfil</div>
      <div className="seg three">
        <button className={role === 'admin_master' ? 'info' : ''} onClick={() => setRole('admin_master')}>Engenheiro</button>
        <button className={role === 'gerente' ? 'info' : ''} onClick={() => setRole('gerente')}>Gerente</button>
        <button disabled title="Chega na v1.1">Cliente (v1.1)</button>
      </div>
      {role === 'admin_master' && <div className="hint">O Engenheiro vê e faz tudo em todas as obras, inclusive Medições e Usuários.</div>}
      {precisaEscolherObras(role) && (
        <>
          <div className="hint">O Gerente toca só as obras marcadas abaixo, sem Medições, sem a foto da nota fiscal e sem Usuários.</div>
          <div className="label">Obras liberadas</div>
          <ObrasLiberadas obras={obras} marcadas={atuais} mudar={mudarObra} />
        </>
      )}
      <div className="label">Situação</div>
      <div className="seg three">
        {SITUACOES_CONTA.map((s) => (
          <button key={s} className={status === s ? (s === 'ativo' ? 'info' : 'warn') : ''} onClick={() => setStatus(s)}>{NOME_SITUACAO[s]}</button>
        ))}
      </div>
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </>
  )
}

function Usuarios({ perfil }) {
  const toast = useToast()
  const usuarios = useDados(listarUsuarios)
  const [editando, setEditando] = useState(null)
  return (
    <>
      <div className="sec"><h2>Usuários</h2></div>
      {usuarios.carregando && <Carregando />}
      {usuarios.erro && <ErroCarga erro={usuarios.erro} tentar={usuarios.recarregar} />}
      {usuarios.data && (
        <div className="list two">
          {usuarios.data.map((u) => (
            <button key={u.id} className="item" onClick={() => u.id !== perfil.id && setEditando(u)} disabled={u.id === perfil.id}>
              <div className="item-top">
                <div><h3>{u.nome}{u.id === perfil.id ? ' (você)' : ''}</h3><div className="meta">{u.email}</div></div>
                <Pill cor={COR_SITUACAO[u.status]}>{rotuloDaConta(u)}</Pill>
              </div>
            </button>
          ))}
        </div>
      )}
      <Gaveta aberta={Boolean(editando)} fechar={() => setEditando(null)} rotulo="Editar usuário">
        {editando && <EditarUsuario u={editando} fechar={() => setEditando(null)} salvo={() => { setEditando(null); toast('Usuário atualizado'); usuarios.recarregar() }} />}
      </Gaveta>
    </>
  )
}

export default function Perfil({ perfil, aoSair }) {
  return (
    <>
      <Cabecalho eyebrow={`Meu perfil · ${NOME_PERFIL[perfil.role]}`} titulo={perfil.nome} sub={perfil.email}
        acao={<button className="btn btn-ghost" onClick={aoSair}>Sair</button>} />
      {posso('usuarios.ver') && <Usuarios perfil={perfil} />}
    </>
  )
}
