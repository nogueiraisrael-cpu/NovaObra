// Gestão à Vista — aba dentro da obra ("pranchas.*" no quadro). Lista as plantas da obra por
// pavimento (ordem do prédio), sobe planta nova (PDF ou imagem; um popup pede nome e pavimento) e
// abre o editor, onde o avanço é pintado por cima da planta.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { listarPlantas, subirPlanta, editarPlanta, apagarPlanta, contarMarcacoesDaPlanta, obterAndamentoDaObra, posso } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { agruparPorPavimento, validarPlanta, PAVIMENTOS_SUGERIDOS, formatarQtd } from '../lib/plantas.js'
import { formatarData } from '../lib/datas.js'
import { Carregando, ErroCarga, ErroCampo, Gaveta, Icon, Pill, Vazio, useToast } from '../components/index.jsx'
// O editor (gestos, zoom, varinha) só carrega quando alguém abre uma planta.
const PlantaEditor = lazy(() => import('./plantaEditor.jsx'))

const ACEITA = '.pdf,application/pdf,image/png,image/jpeg,image/webp'
// O pdfjs e o canvas só carregam quando alguém escolhe um arquivo.
const carregarPreparo = () => import('../lib/plantaImagem.js')
const semExtensao = (nome) => nome.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 60)

function FormPlanta({ titulo, inicial, arquivo, preparo, ocupado, cancelar, salvar }) {
  const [campos, setCampos] = useState(inicial)
  const [tentou, setTentou] = useState(false)
  const erros = validarPlanta(campos)
  function enviar() {
    setTentou(true)
    if (!erros.nome) salvar(campos)
  }
  return (
    <>
      <h2>{titulo}</h2>
      {arquivo && <div className="hint" style={{ wordBreak: 'break-word' }}>{arquivo}{preparo === 'lendo' ? ' · preparando a imagem…' : preparo === 'pronta' ? ' · pronta para subir' : ''}</div>}
      <label className="label" htmlFor="pl-nome">Nome</label>
      <input id="pl-nome" className="field" autoComplete="off" maxLength={80} value={campos.nome}
        onChange={(e) => setCampos({ ...campos, nome: e.target.value })} placeholder="Ex.: Locação das sapatas" />
      <ErroCampo erro={tentou && erros.nome} />
      <label className="label" htmlFor="pl-pav">Pavimento</label>
      <input id="pl-pav" className="field" list="pl-pavimentos" autoComplete="off" maxLength={40} value={campos.pavimento ?? ''}
        onChange={(e) => setCampos({ ...campos, pavimento: e.target.value })} placeholder="Ex.: Térreo" />
      <datalist id="pl-pavimentos">{PAVIMENTOS_SUGERIDOS.map((p) => <option key={p} value={p} />)}</datalist>
      <div className="hint">Os pavimentos aparecem na ordem do prédio: Fundação, Subsolo, Térreo, 1º, 2º… Cobertura.</div>
      {campos.conta_no_andamento !== undefined && (
        <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <input type="checkbox" checked={campos.conta_no_andamento} onChange={(e) => setCampos({ ...campos, conta_no_andamento: e.target.checked })} />
          <span>Conta no andamento da obra<div className="hint">Desligue numa planta que foi substituída por revisão, para não somar em dobro.</div></span>
        </label>
      )}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={cancelar} disabled={ocupado}>Cancelar</button>
        <button className="btn btn-primary" onClick={enviar} disabled={ocupado}>{ocupado ? 'Subindo…' : 'Salvar'}</button>
      </div>
    </>
  )
}

// Andamento da obra contra a medição do contrato (só o Engenheiro): uma linha por item ligado a etapa.
function Andamento() {
  const { data, erro, carregando, recarregar } = useDados(obterAndamentoDaObra)
  if (carregando) return null
  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />
  const { medicao, linhas } = data
  return (
    <section className="gv-andamento">
      <div className="eyebrow" style={{ margin: '18px 0 8px' }}>Andamento da obra · executado × medição do contrato</div>
      {!medicao && <div className="hint">Esta obra ainda não tem medição do contrato. Suba em Medições para comparar.</div>}
      {medicao && !linhas.length && <div className="hint">Nenhuma etapa ligada a item do contrato. Na planta, em ⚙ Etapas, escolha o item de cada etapa medida.</div>}
      {medicao && linhas.length > 0 && (
        <>
          <div className="tabela-rolagem">
            <table className="gv-tabela">
              <thead><tr><th>Item</th><th>Contratado</th><th>Executado</th><th>Medido</th><th>Saldo a medir</th><th>% executado</th></tr></thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.item}>
                    <td><b>{l.item}</b> {l.descricao ?? ''}<div className="hint">{l.etapas.join(' + ')}{l.avisoUnidade ? ' · unidade diferente da etapa' : ''}{l.semItem ? ' · item não está na última medição' : ''}</div></td>
                    <td>{l.contratado == null ? '—' : formatarQtd(l.contratado, l.unidade)}</td>
                    <td>{formatarQtd(l.executado, l.unidade)}</td>
                    <td>{l.medido == null ? '—' : formatarQtd(l.medido, l.unidade)}</td>
                    <td className={l.saldo < 0 ? 't-bad' : ''}>{l.saldo == null ? '—' : formatarQtd(l.saldo, l.unidade)}</td>
                    <td>{l.pct == null ? '—' : `${l.pct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hint">Medição nº {medicao.numero} de {formatarData(medicao.data_medicao)}. Saldo negativo: mediu-se mais do que está pintado nas plantas.</div>
        </>
      )}
    </section>
  )
}

export default function GestaoVista() {
  const toast = useToast()
  const { data: plantas, erro, carregando, recarregar } = useDados(listarPlantas)
  const [aberta, setAberta] = useState(null)
  const [nova, setNova] = useState(null) // { arquivo, preparo: 'lendo'|'pronta'|'erro', promessa }
  const [editando, setEditando] = useState(null)
  const [apagando, setApagando] = useState(null) // { planta, marcacoes }
  const [ocupado, setOcupado] = useState(false)
  // A tela ainda está aberta quando a planta termina de ser preparada? Liga no corpo do efeito: o
  // React monta, desmonta e monta de novo em desenvolvimento, e só desligar na saída deixaria desligado.
  const vivo = useRef(false)
  useEffect(() => {
    vivo.current = true
    return () => { vivo.current = false }
  }, [])

  const podeSubir = posso('pranchas.criar')

  // Escolheu o arquivo: abre o popup na hora e já prepara a imagem enquanto a pessoa digita.
  async function escolher(e) {
    const arquivo = e.target.files[0]
    e.target.value = ''
    if (!arquivo) return
    const promessa = carregarPreparo().then((m) => m.prepararPlanta(arquivo))
    setNova({ arquivo: arquivo.name, nome: semExtensao(arquivo.name), preparo: 'lendo', promessa })
    promessa.then(
      () => { if (vivo.current) setNova((n) => (n?.promessa === promessa ? { ...n, preparo: 'pronta' } : n)) },
      (falhou) => {
        if (!vivo.current) return
        setNova((n) => (n?.promessa === promessa ? null : n))
        toast(falhou.message, 'bad')
      },
    )
  }

  async function confirmarNova(campos) {
    setOcupado(true)
    let preparada
    try { preparada = await nova.promessa } catch { setOcupado(false); return }
    const r = await subirPlanta({ ...campos, preparada })
    setOcupado(false)
    if (r.erro) return toast(r.erro, 'bad')
    setNova(null)
    toast('Planta subida.')
    await recarregar()
    setAberta(r.data.id)
  }

  async function confirmarEdicao(campos) {
    setOcupado(true)
    const r = await editarPlanta(editando.id, campos)
    setOcupado(false)
    if (r.erro) return toast(r.erro, 'bad')
    setEditando(null)
    toast('Planta atualizada.')
    recarregar()
  }

  async function pedirApagar(planta) {
    const r = await contarMarcacoesDaPlanta(planta.id)
    if (r.erro) return toast(r.erro, 'bad')
    setApagando({ planta, marcacoes: r.data })
  }

  async function confirmarApagar() {
    setOcupado(true)
    const r = await apagarPlanta(apagando.planta.id)
    setOcupado(false)
    if (r.erro) return toast(r.erro, 'bad')
    setApagando(null)
    toast('Planta apagada.')
    recarregar()
  }

  if (aberta) return <Suspense fallback={<Carregando />}><PlantaEditor plantaId={aberta} voltar={() => { setAberta(null); recarregar() }} /></Suspense>
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />

  const botaoSubir = podeSubir && (
    <label className="btn btn-primary center" style={{ cursor: 'pointer', width: 'auto' }}>
      + Subir planta
      <input type="file" accept={ACEITA} hidden onChange={escolher} />
    </label>
  )

  return (
    <>
      <div className="sec">
        <div>
          <h2>Gestão à Vista</h2>
          <div className="hint" style={{ marginTop: 2 }}>A planta da obra com o avanço pintado por cima. PDF ou imagem.</div>
        </div>
        {plantas.length > 0 && botaoSubir}
      </div>

      {posso('medicoes.ver') && plantas.length > 0 && <Andamento />}

      {!plantas.length && (
        <Vazio icone="planta" titulo="Nenhuma planta nesta obra"
          texto={podeSubir ? 'Suba a planta (PDF ou imagem) e pinte o que foi feito: escavado, armado, concretado.' : 'Ainda não subiram planta nesta obra.'}
          acao={botaoSubir} />
      )}

      {agruparPorPavimento(plantas).map((g) => (
        <section key={g.pavimento}>
          <div className="eyebrow" style={{ margin: '22px 0 10px' }}>{g.pavimento}</div>
          <div className="list">
            {g.plantas.map((p) => (
              <div key={p.id} className="item gv-item">
                <button className="gv-abrir" onClick={() => setAberta(p.id)}>
                  <div className="item-top">
                    <b>{p.nome}</b>
                    {p.tem_textos && <Pill cor="info">PDF com nomes</Pill>}
                  </div>
                  <div className="hint">{p.largura} × {p.altura} px · subida em {formatarData(String(p.created_at).slice(0, 10))}</div>
                </button>
                <div className="gv-acoes">
                  {posso('pranchas.editar') && <button className="link-insumo" onClick={() => setEditando(p)}>Editar</button>}
                  {posso('pranchas.apagar') && <button className="link-remover" onClick={() => pedirApagar(p)}>Apagar</button>}
                  <button className="gv-seta" onClick={() => setAberta(p.id)} aria-label={`Abrir ${p.nome}`}><Icon nome="chev" /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <Gaveta aberta={Boolean(nova)} fechar={() => !ocupado && setNova(null)} rotulo="Nova planta">
        {nova && <FormPlanta key={nova.arquivo} titulo="Nova planta" arquivo={nova.arquivo} preparo={nova.preparo} ocupado={ocupado}
          inicial={{ nome: nova.nome, pavimento: '' }} cancelar={() => setNova(null)} salvar={confirmarNova} />}
      </Gaveta>

      <Gaveta aberta={Boolean(editando)} fechar={() => !ocupado && setEditando(null)} rotulo="Editar planta">
        {editando && <FormPlanta key={editando.id} titulo="Editar planta" ocupado={ocupado}
          inicial={{ nome: editando.nome, pavimento: editando.pavimento ?? '', conta_no_andamento: editando.conta_no_andamento !== false }} cancelar={() => setEditando(null)} salvar={confirmarEdicao} />}
      </Gaveta>

      <Gaveta aberta={Boolean(apagando)} fechar={() => !ocupado && setApagando(null)} rotulo="Apagar planta">
        {apagando && (
          <>
            <h2>Apagar “{apagando.planta.nome}”?</h2>
            <div className="banner bad">
              {apagando.marcacoes
                ? (apagando.marcacoes === 1 ? 'A marcação desta planta vai junto, com o histórico da peça.' : `As ${apagando.marcacoes} marcações desta planta vão junto, com o histórico de cada peça.`)
                : 'Esta planta não tem marcação.'} Não dá para desfazer.
            </div>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setApagando(null)} disabled={ocupado}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmarApagar} disabled={ocupado}>{ocupado ? 'Apagando…' : 'Apagar planta'}</button>
            </div>
          </>
        )}
      </Gaveta>
    </>
  )
}
