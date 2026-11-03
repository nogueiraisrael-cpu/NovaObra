// RDO passo 2 — frentes de serviço, gaveta "Preencher frente" e Fechar RDO (v1.0).
import { useState } from 'react'
import { listarFrentes, salvarFrente, obterPreenchimento, salvarPreenchimento, resumoFechamento, fecharRdo, uploadFoto } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { diasParada, separarFrentes, rotuloExecutor } from '../lib/frentes.js'
import { ETAPAS, EXECUTORES, SITUACOES_FRENTE_DIA, MOTIVOS_PARADA } from '../lib/listas.js'
import { hojeISO, formatarData } from '../lib/datas.js'
import { Carregando, ErroCarga, Gaveta, Icon, Pill, Stats, Vazio, useToast, encolherFoto, COR_FRENTE_DIA } from '../components/index.jsx'

function CartaoFrente({ f, hoje, abrir }) {
  const dias = diasParada(f, hoje)
  const parada = f.situacao === 'Parada'
  return (
    <button className={`item${parada ? ' alert' : ''}`} onClick={() => abrir(f.id)}>
      <div className="item-top">
        <div><h3>{f.nome}</h3><div className="meta">{f.etapa}</div><div className="meta">{rotuloExecutor(f)}</div></div>
        {f.preenchida_hoje ? <span className="check" title="Preenchida hoje"><Icon nome="check" /></span> : <Icon nome="chev" />}
      </div>
      <div className="row-wrap" style={{ marginTop: 14 }}>
        {parada ? <Pill cor="bad">Parada há {dias} {dias === 1 ? 'dia' : 'dias'}</Pill>
          : f.situacao === 'Em execução' ? <Pill cor="ok">Em execução</Pill> : <Pill>Não iniciada</Pill>}
        {parada && <span className="t-bad" style={{ fontWeight: 600, fontSize: 16 }}>{f.motivo_parada}</span>}
        {f.preenchida_hoje && f.situacao_hoje !== f.situacao && <span className="t-info" style={{ fontSize: 15, fontWeight: 600 }}>Hoje: {f.situacao_hoje}</span>}
        {f.preenchida_hoje && f.equipe_hoje > 0 && <span className="t-muted" style={{ fontSize: 15 }}>{f.equipe_hoje} {f.equipe_hoje === 1 ? 'pessoa' : 'pessoas'} hoje</span>}
        {!f.preenchida_hoje && f.situacao === 'Em execução' && <span className="t-warn" style={{ fontSize: 15, fontWeight: 600 }}>Falta preencher hoje</span>}
      </div>
    </button>
  )
}

function FormNovaFrente({ fechar, salvo }) {
  const [f, setF] = useState({ nome: '', etapa: '', executor: 'Equipe própria', empreiteiro: '' })
  const [erro, setErro] = useState(null)
  async function salvar() {
    const { erro: falhou } = await salvarFrente(f)
    if (falhou) return setErro(falhou)
    salvo()
  }
  return (
    <>
      <div className="eyebrow">Nova frente</div>
      <h2>Frente de serviço</h2>
      <label className="label" htmlFor="nf-nome">Nome</label>
      <input id="nf-nome" className="field" placeholder="Ex.: Fundação — sapatas" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <label className="label" htmlFor="nf-etapa">Etapa</label>
      <select id="nf-etapa" className="field" value={f.etapa} onChange={(e) => setF({ ...f, etapa: e.target.value })}>
        <option value="">Escolha…</option>
        {ETAPAS.map((x) => <option key={x}>{x}</option>)}
      </select>
      <div className="label">Executor</div>
      <div className="seg two">
        {EXECUTORES.map((x) => <button key={x} className={f.executor === x ? 'info' : ''} onClick={() => setF({ ...f, executor: x })}>{x}</button>)}
      </div>
      {f.executor === 'Terceirizado' && (
        <>
          <label className="label" htmlFor="nf-emp">Empreiteiro</label>
          <input id="nf-emp" className="field" placeholder="Ex.: Reboco Forte" value={f.empreiteiro} onChange={(e) => setF({ ...f, empreiteiro: e.target.value })} />
        </>
      )}
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar}>Salvar</button>
      </div>
    </>
  )
}

function PreencherFrente({ inicial, fechar, salvo }) {
  const [p, setP] = useState({ situacao: inicial.situacao, motivo_parada: inicial.motivo_parada, descricao: inicial.descricao, equipe: new Set(inicial.equipe), fotos: inicial.fotos })
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmarConclusao, setConfirmarConclusao] = useState(false)
  const { frente } = inicial

  function alternar(id) {
    const equipe = new Set(p.equipe)
    if (equipe.has(id)) equipe.delete(id)
    else equipe.add(id)
    setP({ ...p, equipe })
  }

  // A prévia aparece na hora; a foto encolhe e sobe para o Storage logo depois. Se não subir,
  // ela sai da lista com o aviso, e o resto do que foi preenchido continua para salvar.
  const enviando = p.fotos.some((ft) => !ft.caminho)
  function anexar(e) {
    const arquivos = [...e.target.files].slice(0, 5 - p.fotos.length)
    e.target.value = ''
    for (const arquivo of arquivos) {
      const chave = crypto.randomUUID()
      const previa = URL.createObjectURL(arquivo)
      setP((atual) => ({ ...atual, fotos: [...atual.fotos, { chave, url: previa, caminho: null, legenda: '' }] }))
      encolherFoto(arquivo)
        .then((foto) => uploadFoto(foto, 'diario'))
        .catch((falhou) => ({ erro: falhou.message }))
        .then(({ data, erro: falhou }) => {
          setP((atual) => ({
            ...atual,
            fotos: falhou ? atual.fotos.filter((ft) => ft.chave !== chave) : atual.fotos.map((ft) => (ft.chave === chave ? { ...ft, caminho: data.caminho } : ft)),
          }))
          if (falhou) setErro(falhou)
        })
    }
  }

  async function salvar() {
    if (enviando) return
    if (p.situacao === 'Concluída' && !confirmarConclusao) return setConfirmarConclusao(true)
    setSalvando(true)
    const { erro: falhou } = await salvarPreenchimento(frente.id, { ...p, equipe: [...p.equipe] })
    setSalvando(false)
    if (falhou) return setErro(falhou)
    salvo()
  }

  return (
    <>
      <div className="eyebrow">Preencher frente</div>
      <h2>{frente.nome}</h2>
      <div className="sub">{rotuloExecutor(frente)}</div>
      <div className="label">Situação hoje</div>
      <div className="seg three">
        {SITUACOES_FRENTE_DIA.map((s) => (
          <button key={s} className={p.situacao === s ? COR_FRENTE_DIA[s] : ''} onClick={() => { setP({ ...p, situacao: s }); setConfirmarConclusao(false) }}>{s}</button>
        ))}
      </div>
      {p.situacao === 'Parada' && (
        <>
          <div className="label">Motivo da parada</div>
          <div className="chips">
            {MOTIVOS_PARADA.map((m) => <button key={m} className={`chip${p.motivo_parada === m ? ' on' : ''}`} onClick={() => setP({ ...p, motivo_parada: m })}>{m}</button>)}
          </div>
        </>
      )}
      <label className="label" htmlFor="pf-desc">O que foi feito hoje</label>
      <textarea id="pf-desc" className="field" style={{ minHeight: 76 }} placeholder="Ex.: chapisco e emboço 2º pavimento, 40 m²"
        value={p.descricao} onChange={(e) => setP({ ...p, descricao: e.target.value })} />
      <div className="label">Equipe</div>
      {inicial.presentes.length === 0
        ? <p className="t-muted">Ninguém presente hoje. Marque o efetivo no passo 1.</p>
        : (
          <div className="chips">
            {inicial.presentes.map((x) => (
              <button key={x.id} className={`chip${p.equipe.has(x.id) ? ' on' : ''}`} onClick={() => alternar(x.id)}>
                {x.nome}{x.tambem_em.length > 0 && <small>também em: {x.tambem_em.join(', ')}</small>}
              </button>
            ))}
          </div>
        )}
      <div className="label">Fotos ({p.fotos.length} de 5)</div>
      <div className="photo-row">
        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
          <Icon nome="camera" />Tirar foto
          <input type="file" accept="image/*" capture="environment" hidden onChange={anexar} disabled={p.fotos.length >= 5} />
        </label>
        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
          <Icon nome="galeria" />Da galeria
          <input type="file" accept="image/*" multiple hidden onChange={anexar} disabled={p.fotos.length >= 5} />
        </label>
      </div>
      {p.fotos.length > 0 && (
        <div className="thumbs">
          {p.fotos.map((ft, i) => (
            <div className={`thumb${ft.caminho ? '' : ' subindo'}`} key={ft.chave ?? ft.id ?? ft.caminho}>
              <img src={ft.url ?? ft.caminho} alt={`Foto ${i + 1}${ft.caminho ? '' : ' (subindo)'}`} />
              <button aria-label={`Tirar foto ${i + 1}`} onClick={() => setP({ ...p, fotos: p.fotos.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
        </div>
      )}
      {confirmarConclusao && <div className="banner warn">Marcar {frente.nome} como concluída? Toque em Salvar de novo para confirmar.</div>}
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando || enviando}>{enviando ? 'Subindo foto…' : salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </>
  )
}

function ResumoFechar({ fechar, fechado }) {
  const resumo = useDados(resumoFechamento)
  const [erro, setErro] = useState(null)
  const [fechando, setFechando] = useState(false)
  async function confirmar() {
    setFechando(true)
    const { erro: falhou } = await fecharRdo()
    setFechando(false)
    if (falhou) return setErro('Não foi possível fechar o diário. Verifique a internet e tente de novo.')
    fechado()
  }
  if (resumo.carregando) return <Carregando />
  const r = resumo.data
  return (
    <>
      <div className="eyebrow">Fechar RDO</div>
      <h2>Resumo do dia</h2>
      <div className="lines" style={{ marginTop: 16 }}>
        <div className="line"><span className="dot ok" />{r.presentes} presentes de {r.total}</div>
        <div className="line"><span className="dot info" />{r.frentes_preenchidas} {r.frentes_preenchidas === 1 ? 'frente preenchida' : 'frentes preenchidas'}</div>
        <div className={`line${r.frentes_paradas ? ' t-bad' : ''}`}><span className={`dot ${r.frentes_paradas ? 'bad' : 'idle'}`} />{r.frentes_paradas} paradas hoje</div>
        <div className="line"><span className="dot idle" />{r.fotos} {r.fotos === 1 ? 'foto' : 'fotos'}</div>
        {r.equipamentos_quebrados > 0 && <div className="line t-warn"><span className="dot warn" />{r.equipamentos_quebrados} equipamento(s) quebrado(s)</div>}
      </div>
      {r.frentes_preenchidas === 0 && <div className="banner warn">Nenhuma frente preenchida hoje. Fechar mesmo assim?</div>}
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={confirmar} disabled={fechando}>{fechando ? 'Fechando…' : 'Confirmar e fechar'}</button>
      </div>
    </>
  )
}

export default function RdoPasso2({ aoMudarRdo, aoFechar }) {
  const toast = useToast()
  const frentes = useDados(listarFrentes)
  const [gaveta, setGaveta] = useState(null) // {tipo:'nova'} | {tipo:'preencher', dados} | {tipo:'fechar'}
  const [verConcluidas, setVerConcluidas] = useState(false)
  const hoje = hojeISO()

  async function abrirFrente(id) {
    const { data, erro } = await obterPreenchimento(id)
    if (erro) return toast(erro, 'bad')
    setGaveta({ tipo: 'preencher', dados: data })
  }

  function depoisDeSalvar(msg) {
    setGaveta(null)
    toast(msg)
    frentes.recarregar()
    aoMudarRdo()
  }

  if (frentes.carregando) return <Carregando />
  if (frentes.erro) return <ErroCarga erro={frentes.erro} tentar={frentes.recarregar} />

  const { ativas, concluidas } = separarFrentes(frentes.data, hoje)
  const gavetas = (
    <>
      <Gaveta aberta={gaveta?.tipo === 'nova'} fechar={() => setGaveta(null)} rotulo="Nova frente">
        {gaveta?.tipo === 'nova' && <FormNovaFrente fechar={() => setGaveta(null)} salvo={() => depoisDeSalvar('Frente criada')} />}
      </Gaveta>
      <Gaveta aberta={gaveta?.tipo === 'preencher'} fechar={() => setGaveta(null)} rotulo="Preencher frente">
        {gaveta?.tipo === 'preencher' && <PreencherFrente inicial={gaveta.dados} fechar={() => setGaveta(null)} salvo={() => depoisDeSalvar('Frente salva')} />}
      </Gaveta>
      <Gaveta aberta={gaveta?.tipo === 'fechar'} fechar={() => setGaveta(null)} rotulo="Fechar RDO">
        {gaveta?.tipo === 'fechar' && <ResumoFechar fechar={() => setGaveta(null)} fechado={() => { setGaveta(null); toast('Diário de hoje fechado'); aoFechar() }} />}
      </Gaveta>
    </>
  )

  if (frentes.data.length === 0) {
    return (
      <>
        <Vazio titulo="Nenhuma frente de serviço" texto="Crie a primeira, ex.: Fundação — sapatas."
          acao={<button className="btn btn-primary" onClick={() => setGaveta({ tipo: 'nova' })}>+ Criar a primeira frente</button>} />
        <div className="cta"><button className="btn btn-ghost btn-full" onClick={() => setGaveta({ tipo: 'fechar' })}>Fechar RDO sem frentes</button></div>
        {gavetas}
      </>
    )
  }

  return (
    <>
      <Stats itens={[
        { valor: ativas.filter((f) => f.situacao === 'Parada').length, rotulo: 'frentes paradas', cor: 'bad' },
        { valor: ativas.filter((f) => f.situacao === 'Em execução').length, rotulo: 'em execução', cor: 'ok' },
        { valor: ativas.filter((f) => f.preenchida_hoje).length, de: ativas.length, rotulo: 'preenchidas hoje', cor: 'accent' },
      ]} />
      <div className="sec"><h2>Frentes de serviço</h2><button className="link" onClick={() => setGaveta({ tipo: 'nova' })}>+ Nova frente</button></div>
      <div className="list two">{ativas.map((f) => <CartaoFrente key={f.id} f={f} hoje={hoje} abrir={abrirFrente} />)}</div>
      {concluidas.length > 0 && (
        <>
          <button className="collapsed" onClick={() => setVerConcluidas(!verConcluidas)}>
            <span>Concluídas ({concluidas.length})</span><Icon nome={verConcluidas ? 'down' : 'chev'} />
          </button>
          {verConcluidas && (
            <div className="list two" style={{ marginTop: 12 }}>
              {concluidas.map((f) => (
                <div key={f.id} className="item"><h3>{f.nome}</h3><div className="meta">{f.etapa} · concluída em {formatarData(f.data_conclusao)}</div></div>
              ))}
            </div>
          )}
        </>
      )}
      <div className="cta"><button className="btn btn-primary" onClick={() => setGaveta({ tipo: 'fechar' })}>Fechar RDO <Icon nome="arrow" /></button></div>
      {gavetas}
    </>
  )
}
