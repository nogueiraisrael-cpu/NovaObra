// Perfil e Usuários. Usuários não depende de obra: é quem entra no sistema.
import { useState } from 'react'
import { listarUsuarios, salvarUsuario } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { Cabecalho, Carregando, ErroCarga, Gaveta, Pill, useToast } from '../components/index.jsx'

const COR_ROLE = { Pendente: 'warn', Engenheiro: 'info', Cliente: 'idle' }

function EditarUsuario({ u, fechar, salvo }) {
  const [role, setRole] = useState(u.role)
  const [ativo, setAtivo] = useState(u.ativo)
  async function salvar() {
    await salvarUsuario({ id: u.id, role, ativo })
    salvo()
  }
  return (
    <>
      <div className="eyebrow">Usuário</div>
      <h2>{u.nome}</h2>
      <div className="sub">{u.email}</div>
      <div className="label">Perfil</div>
      <div className="seg three">
        <button className={role === 'Engenheiro' ? 'info' : ''} onClick={() => setRole('Engenheiro')}>Engenheiro</button>
        <button disabled title="Chega na v1.1">Cliente (v1.1)</button>
        <button className={role === 'Pendente' ? 'warn' : ''} onClick={() => setRole('Pendente')}>Pendente</button>
      </div>
      <div className="toggle-row" style={{ marginTop: 16 }}>
        Ativo
        <button className={`switch${ativo ? ' on' : ''}`} role="switch" aria-checked={ativo} aria-label="Ativo" onClick={() => setAtivo(!ativo)} />
      </div>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar}>Salvar</button>
      </div>
    </>
  )
}

export default function Perfil({ perfil, aoSair }) {
  const toast = useToast()
  const usuarios = useDados(listarUsuarios)
  const [editando, setEditando] = useState(null)

  return (
    <>
      <Cabecalho eyebrow="Meu perfil" titulo={perfil.nome} sub={perfil.email}
        acao={<button className="btn btn-ghost" onClick={aoSair}>Sair</button>} />
      <div className="sec"><h2>Usuários</h2></div>
      {usuarios.carregando && <Carregando />}
      {usuarios.erro && <ErroCarga erro={usuarios.erro} tentar={usuarios.recarregar} />}
      {usuarios.data && (
        <div className="list two">
          {usuarios.data.map((u) => (
            <button key={u.id} className="item" onClick={() => u.id !== perfil.id && setEditando(u)} disabled={u.id === perfil.id}>
              <div className="item-top">
                <div><h3>{u.nome}{u.id === perfil.id ? ' (você)' : ''}</h3><div className="meta">{u.email}</div></div>
                <Pill cor={COR_ROLE[u.role]}>{u.ativo ? u.role : 'Inativo'}</Pill>
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
