// Painel de admin: quem entra no app. Só o Engenheiro abre (quadro, usuarios.ver). Tudo o que mexe
// em conta passa pela função admin-usuarios, que confere de novo no servidor quem está pedindo.
import { useState } from 'react'
import { rotuloDaConta } from '../lib/login.js'
import { precisaEscolherObras } from '../lib/permissoes.js'
import { resumoDasObras, textoDoAcesso } from '../lib/painelAdmin.js'
import {
  listarUsuarios, listarObras, criarUsuario, redefinirSenha, mudarPerfil, mudarObras, bloquearUsuario, desbloquearUsuario, excluirUsuario, posso,
} from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { Cabecalho, Carregando, ErroCarga, Gaveta, Pill, useToast } from '../components/index.jsx'

const COR_SITUACAO = { pendente: 'warn', ativo: 'info', bloqueado: 'idle' }

function EscolherPerfil({ role, mudar }) {
  return (
    <div className="seg three">
      <button className={role === 'admin_master' ? 'info' : ''} onClick={() => mudar('admin_master')}>Engenheiro</button>
      <button className={role === 'gerente' ? 'info' : ''} onClick={() => mudar('gerente')}>Gerente</button>
      <button disabled title="Chega na v1.1">Cliente (v1.1)</button>
    </div>
  )
}

function EscolherObras({ obras, marcadas, mudar }) {
  if (!obras.length) return <div className="hint">Nenhuma obra cadastrada.</div>
  function alternar(id) {
    mudar(marcadas.includes(id) ? marcadas.filter((x) => x !== id) : [...marcadas, id])
  }
  return (
    <div className="lines">
      {obras.map((o) => (
        <label key={o.id} className="toggle-row">
          <span>{o.nome} <span className="t-muted">· {o.codigo}</span></span>
          <input type="checkbox" checked={marcadas.includes(o.id)} onChange={() => alternar(o.id)} style={{ width: 22, height: 22 }} />
        </label>
      ))}
    </div>
  )
}

// A senha provisória aparece uma vez só: fechou, não volta (o Supabase não guarda a senha aberta).
function SenhaProvisoria({ nome, email, senha, fechar }) {
  const [copiou, setCopiou] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(senha)
      setCopiou(true)
    } catch (_) { /* navegador sem permissão: a senha continua na tela para copiar à mão */ }
  }
  return (
    <>
      <div className="eyebrow">Senha provisória</div>
      <h2>{nome}</h2>
      <div className="sub">{email}</div>
      <div className="banner warn" style={{ marginTop: 14 }}>Esta senha aparece só agora. Copie e mande para a pessoa antes de fechar.</div>
      <div className="senha-provisoria" aria-label="Senha provisória">{senha}</div>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={copiar}>{copiou ? 'Copiada' : 'Copiar senha'}</button>
        <button className="btn btn-primary" onClick={fechar}>Já copiei, fechar</button>
      </div>
    </>
  )
}

function NovoUsuario({ obras, fechar, criado }) {
  const [form, setForm] = useState({ nome: '', email: '', role: 'gerente', obras: [] })
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const mudar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  async function criar() {
    if (enviando) return
    setEnviando(true)
    setErro(null)
    const { data, erro: falhou } = await criarUsuario(form)
    setEnviando(false)
    if (falhou) return setErro(falhou)
    criado({ nome: form.nome.trim(), email: form.email.trim(), senha: data.senha })
  }

  return (
    <>
      <div className="eyebrow">Novo usuário</div>
      <h2>Quem vai entrar no app?</h2>
      <label className="label" htmlFor="nu-nome">Nome</label>
      <input id="nu-nome" className="field" value={form.nome} autoComplete="off" onChange={(e) => mudar('nome', e.target.value)} />
      <label className="label" htmlFor="nu-email">E-mail</label>
      <input id="nu-email" className="field" type="email" value={form.email} autoComplete="off" onChange={(e) => mudar('email', e.target.value)} />
      <div className="label">Perfil</div>
      <EscolherPerfil role={form.role} mudar={(role) => mudar('role', role)} />
      {precisaEscolherObras(form.role) && (
        <>
          <div className="label">Obras liberadas</div>
          <EscolherObras obras={obras} marcadas={form.obras} mudar={(lista) => mudar('obras', lista)} />
        </>
      )}
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" disabled={enviando} onClick={criar}>{enviando ? 'Criando…' : 'Criar usuário'}</button>
      </div>
    </>
  )
}

function EditarConta({ conta, obras, fechar, salvo, mostrarSenha }) {
  const [role, setRole] = useState(conta.role)
  const [marcadas, setMarcadas] = useState(conta.obras)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [digitado, setDigitado] = useState('')

  async function fazer(acao, aoTerminar) {
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    const r = await acao()
    setOcupado(false)
    if (r.erro) return setErro(r.erro)
    aoTerminar(r.data)
  }

  const bloqueada = conta.status === 'bloqueado'
  const pendente = conta.status === 'pendente'
  return (
    <>
      <div className="eyebrow">{rotuloDaConta(conta)}</div>
      <h2>{conta.nome}</h2>
      <div className="sub">{conta.email}</div>

      <div className="label">Perfil</div>
      <EscolherPerfil role={role} mudar={setRole} />
      {role === 'admin_master' && <div className="hint">O Engenheiro vê e faz tudo em todas as obras, inclusive Medições e este painel.</div>}
      {role === 'gerente' && <div className="hint">O Gerente toca só as obras liberadas, sem Medições, sem a foto da nota fiscal e sem este painel.</div>}
      {(role !== conta.role || pendente) && (
        <button className="btn btn-primary btn-full" style={{ marginTop: 10 }} disabled={ocupado || !role}
          onClick={() => fazer(() => mudarPerfil(conta.id, role), () => salvo(pendente ? 'Conta liberada' : 'Perfil trocado'))}>
          {pendente ? 'Liberar conta' : 'Salvar perfil'}
        </button>
      )}

      {precisaEscolherObras(role) && (
        <>
          <div className="label">Obras liberadas</div>
          <EscolherObras obras={obras} marcadas={marcadas} mudar={setMarcadas} />
          <button className="btn btn-ghost btn-full" style={{ marginTop: 10 }} disabled={ocupado}
            onClick={() => fazer(() => mudarObras(conta.id, marcadas), () => salvo('Obras atualizadas'))}>Salvar obras</button>
        </>
      )}

      <div className="label">Acesso</div>
      <button className="btn btn-ghost btn-full" disabled={ocupado}
        onClick={() => fazer(() => redefinirSenha(conta.id), (d) => mostrarSenha({ nome: conta.nome, email: conta.email, senha: d.senha }))}>Redefinir senha</button>
      {posso('usuarios.bloquear') && (
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} disabled={ocupado}
          onClick={() => fazer(() => (bloqueada ? desbloquearUsuario(conta.id) : bloquearUsuario(conta.id)), () => salvo(bloqueada ? 'Conta desbloqueada' : 'Conta bloqueada'))}>
          {bloqueada ? 'Desbloquear' : 'Bloquear'}
        </button>
      )}
      <div className="hint">Quem saiu da equipe se bloqueia: perde o acesso e o que lançou continua no app.</div>

      {posso('usuarios.apagar') && !excluindo && (
        <button className="btn btn-full t-bad" style={{ marginTop: 10 }} onClick={() => setExcluindo(true)}>Excluir cadastro feito errado</button>
      )}
      {excluindo && (
        <>
          <div className="banner bad" style={{ marginTop: 12 }}>Excluir apaga o login de vez. Só funciona em conta sem nenhum registro lançado.</div>
          <label className="label" htmlFor="ex-nome">Para confirmar, digite: {conta.nome}</label>
          <input id="ex-nome" className="field" value={digitado} autoComplete="off" onChange={(e) => setDigitado(e.target.value)} />
          <div className="sheet-actions">
            <button className="btn btn-ghost" onClick={() => setExcluindo(false)}>Não</button>
            <button className="btn btn-danger" disabled={ocupado} onClick={() => fazer(() => excluirUsuario(conta.id, digitado), () => salvo('Conta excluída'))}>Excluir</button>
          </div>
        </>
      )}
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Fechar</button>
      </div>
    </>
  )
}

export default function PainelAdmin({ perfil }) {
  const toast = useToast()
  const usuarios = useDados(listarUsuarios)
  const obras = useDados(listarObras)
  const [gaveta, setGaveta] = useState(null) // {tipo:'novo'} | {tipo:'conta', id} | {tipo:'senha', nome, email, senha}
  const listaObras = obras.data ?? []
  const fechar = () => setGaveta(null)
  const aberta = gaveta?.tipo === 'conta' ? usuarios.data?.find((u) => u.id === gaveta.id) : null

  function depoisDeSalvar(frase) {
    fechar()
    toast(frase)
    usuarios.recarregar()
  }
  function mostrarSenha(dados) {
    setGaveta({ tipo: 'senha', ...dados })
    usuarios.recarregar()
  }

  return (
    <>
      <Cabecalho eyebrow="Painel de admin" titulo="Usuários" sub="Quem entra no app, com qual perfil e em quais obras"
        acao={<button className="btn btn-ghost" onClick={() => setGaveta({ tipo: 'novo' })}>+ Novo usuário</button>} />
      {(usuarios.carregando || obras.carregando) && <Carregando />}
      {usuarios.erro && <ErroCarga erro={usuarios.erro} tentar={usuarios.recarregar} />}
      {obras.erro && <ErroCarga erro={obras.erro} tentar={obras.recarregar} />}
      {usuarios.data && obras.data && (
        <div className="list two">
          {usuarios.data.map((u) => (
            <button key={u.id} className="item" disabled={u.id === perfil.id} onClick={() => setGaveta({ tipo: 'conta', id: u.id })}>
              <div className="item-top">
                <div><h3>{u.nome}{u.id === perfil.id ? ' (você)' : ''}</h3><div className="meta">{u.email}</div></div>
                <Pill cor={COR_SITUACAO[u.status]}>{rotuloDaConta(u)}</Pill>
              </div>
              <div className="lines">
                <div className="line"><span className="dot idle" />{resumoDasObras(u, listaObras)}</div>
                <div className="line"><span className="dot idle" />{textoDoAcesso(u.ultimo_acesso)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <Gaveta aberta={Boolean(gaveta)} fechar={fechar} rotulo="Usuário">
        {gaveta?.tipo === 'novo' && <NovoUsuario obras={listaObras} fechar={fechar} criado={mostrarSenha} />}
        {aberta && <EditarConta key={aberta.id} conta={aberta} obras={listaObras} fechar={fechar} salvo={depoisDeSalvar} mostrarSenha={mostrarSenha} />}
        {gaveta?.tipo === 'senha' && <SenhaProvisoria {...gaveta} fechar={fechar} />}
      </Gaveta>
    </>
  )
}
