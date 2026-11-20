// Gestão à Vista — tipos de sapata da planta: o engenheiro copia da prancha a lista de peças
// ("S1=S2=…=S22 (X11)"), as medidas do detalhe (em cm) e o bloco da tabela de aço; o app calcula por peça
// e, depois da conferência, grava no quadro de peças. As contas ficam em src/lib/sapataTipo.js.
import { useState } from 'react'
import { aplicarTiposDePeca, guardarTiposDePeca, posso } from '../lib/dados.js'
import {
  PESO_ACO_NBR, ROTULOS_DAS_MEDIDAS, MEDIDAS_PADRAO_CM, celulasDosTipos, lerListaDePecas, servicosDoTipo, tipoDoFormulario, validarTipo,
} from '../lib/sapataTipo.js'
import { chaveDaCelula } from '../lib/quantitativo.js'
import { SERVICOS_CALCULO, UNIDADE_DO_SERVICO } from '../lib/listas.js'
import { formatarQtd, lerNumero } from '../lib/plantas.js'
import { Gaveta, ErroCampo, useToast } from '../components/index.jsx'

const emCm = (m) => (m == null ? '' : String(Math.round(m * 10000) / 100).replace('.', ','))
const rascunhoDe = (tipo) => (tipo
  ? { ...tipo, medidas: Object.fromEntries(Object.keys(ROTULOS_DAS_MEDIDAS).map((k) => [k, emCm(tipo.medidas[k])])),
    aco: [...tipo.aco.map((l) => ({ bitola: String(l.bitola).replace('.', ','), comprimento_cm: String(l.comprimento_cm) })), { bitola: '', comprimento_cm: '' }] }
  : { nome: '', pecasTexto: '', medidas: { ...MEDIDAS_PADRAO_CM }, aco: [{ bitola: '', comprimento_cm: '' }], aplicadas: [], ultimo: {} })
const diferenca = (calc, prancha) => (prancha
  ? `${calc >= prancha ? '+' : ''}${(Math.round(((calc - prancha) / prancha) * 1000) / 10).toLocaleString('pt-BR')}%`
  : null)

function FormTipo({ inicial, outros, kgPorMetro, salvar, cancelar, ocupado }) {
  const [r, setR] = useState(() => rascunhoDe(inicial))
  const [tentou, setTentou] = useState(false)
  const lista = lerListaDePecas(r.pecasTexto)
  const { tipo, erro } = tipoDoFormulario(r)
  const problema = erro ?? (tipo ? validarTipo(tipo, outros) : null)
  let porPeca = null
  if (!problema) { try { porPeca = servicosDoTipo(tipo, kgPorMetro) } catch (e) { porPeca = { erro: e.message } } }
  const medida = (k, v) => setR({ ...r, medidas: { ...r.medidas, [k]: v } })
  const linha = (i, campo, v) => setR({ ...r, aco: r.aco.map((l, j) => (j === i ? { ...l, [campo]: v } : l)) })

  return (
    <>
      <label className="label" htmlFor="tp-nome">Nome do tipo</label>
      <input id="tp-nome" className="field" value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} placeholder="Ex.: Tipo 1" maxLength={40} />
      <label className="label" htmlFor="tp-pecas">Peças (como está na prancha)</label>
      <textarea id="tp-pecas" className="field" rows={2} autoCapitalize="characters" value={r.pecasTexto} onChange={(e) => setR({ ...r, pecasTexto: e.target.value })}
        placeholder="Ex.: S1=S2=S3=S4=S5 (X5)  ou  S1 a S5" />
      <div className={`hint${lista.aviso ? ' t-warn' : ''}`}>{lista.pecas.length} peça(s) lida(s){lista.aviso ? ` · ${lista.aviso}` : ''}</div>

      <div className="label">Medidas do detalhe (cm)</div>
      <div className="gv-campos">
        {Object.entries(ROTULOS_DAS_MEDIDAS).map(([k, rot]) => (
          <label key={k}>{rot}<input className="field" inputMode="decimal" value={r.medidas[k]} onChange={(e) => medida(k, e.target.value)} /></label>
        ))}
      </div>
      <div className="hint">Topo do tronco: em geral o pilar + 5 cm de cada lado. Sapata reta: altura total = rodapé.</div>

      <div className="label">Aço do tipo (bloco da tabela da prancha)</div>
      {r.aco.map((l, i) => (
        <div key={i} className="form-2" style={{ marginTop: 6 }}>
          <input className="field" inputMode="decimal" value={l.bitola} onChange={(e) => linha(i, 'bitola', e.target.value)} placeholder="Bitola (mm)" aria-label="Bitola" />
          <input className="field" inputMode="decimal" value={l.comprimento_cm} onChange={(e) => linha(i, 'comprimento_cm', e.target.value)} placeholder="Comprimento total (cm)" aria-label="Comprimento total" />
        </div>
      ))}
      <button className="link-insumo" onClick={() => setR({ ...r, aco: [...r.aco, { bitola: '', comprimento_cm: '' }] })}>+ Linha de aço</button>

      {porPeca && !porPeca.erro && (
        <div className="banner" style={{ marginTop: 12 }}>
          Por peça: {SERVICOS_CALCULO.map((s) => `${s} ${porPeca[s] == null ? '— (sem aço)' : formatarQtd(porPeca[s], UNIDADE_DO_SERVICO[s])}`).join(' · ')}
        </div>
      )}
      {/* Bitola fora da NBR (ex.: 4,2 mm): o tipo salva, e o peso por metro dela aparece na lista para preencher. */}
      {porPeca?.erro && <div className="banner warn">{porPeca.erro} Salve o tipo e preencha esse peso em Peso por metro, na lista de tipos.</div>}
      <ErroCampo erro={tentou && problema} />
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={cancelar} disabled={ocupado}>Cancelar</button>
        <button className="btn btn-primary" disabled={ocupado} onClick={() => { setTentou(true); if (!problema) salvar(tipo) }}>{ocupado ? 'Salvando…' : 'Salvar tipo'}</button>
      </div>
    </>
  )
}

function Conferencia({ resultado, tipos, kgPorMetro, voltar, aplicar, ocupado }) {
  const [prancha, setPrancha] = useState({ concreto: '', aco: '' })
  const totais = tipos.reduce((t, tipo) => {
    const v = servicosDoTipo(tipo, kgPorMetro)
    for (const s of SERVICOS_CALCULO) t[s] = (t[s] ?? 0) + (v[s] ?? 0) * tipo.pecas.length
    return t
  }, {})
  const dConcreto = diferenca(totais.Concreto, lerNumero(prancha.concreto))
  const dAco = diferenca(totais.Armação, lerNumero(prancha.aco))
  return (
    <>
      <div className="label">Conferência</div>
      <div className="tabela-rolagem">
        <table className="gv-tabela">
          <thead><tr><th>Tipo</th><th>Peças</th>{SERVICOS_CALCULO.map((s) => <th key={s}>{s} ({UNIDADE_DO_SERVICO[s]})</th>)}</tr></thead>
          <tbody>
            {tipos.map((t) => {
              const v = servicosDoTipo(t, kgPorMetro)
              return (
                <tr key={t.nome}>
                  <td><b>{t.nome}</b></td><td>{t.pecas.length}</td>
                  {SERVICOS_CALCULO.map((s) => (v[s] == null
                    ? <td key={s}>—<div className="hint">sem aço no tipo</div></td>
                    : <td key={s}>{formatarQtd(v[s])}<div className="hint">total {formatarQtd(v[s] * t.pecas.length)}</div></td>))}
                </tr>
              )
            })}
            <tr><td><b>Planta</b></td><td>{tipos.reduce((n, t) => n + t.pecas.length, 0)}</td>{SERVICOS_CALCULO.map((s) => <td key={s}><b>{formatarQtd(totais[s] ?? 0)}</b></td>)}</tr>
          </tbody>
        </table>
      </div>
      <div className="gv-campos">
        <label>Concreto da prancha (m³)<input className="field" inputMode="decimal" value={prancha.concreto} onChange={(e) => setPrancha({ ...prancha, concreto: e.target.value })} placeholder="Ex.: 16,9" /></label>
        <label>Aço da prancha (kg)<input className="field" inputMode="decimal" value={prancha.aco} onChange={(e) => setPrancha({ ...prancha, aco: e.target.value })} placeholder="Ex.: 345" /></label>
      </div>
      {(dConcreto || dAco) && <div className="hint">Diferença do calculado para a prancha: {[dConcreto && `concreto ${dConcreto}`, dAco && `aço ${dAco}`].filter(Boolean).join(' · ')}</div>}
      {resultado.avisos.map((a) => <div key={a} className="hint t-warn">{a}</div>)}
      <div className="banner" style={{ marginTop: 10 }}>
        {resultado.trocadas} célula(s) do quadro vão mudar{resultado.digitadas ? `; ${resultado.digitadas} tinha(m) valor digitado à mão` : ''}.
      </div>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={voltar} disabled={ocupado}>Voltar</button>
        <button className="btn btn-primary" onClick={aplicar} disabled={ocupado}>{ocupado ? 'Aplicando…' : 'Aplicar no quadro'}</button>
      </div>
    </>
  )
}

function Tipos({ planta, etapas, quantitativos, fechar, aoMudar }) {
  const toast = useToast()
  const pode = posso('pranchas.editar')
  const guardado = planta.tipos_de_peca ?? { tipos: [], kg_por_metro: {} }
  const [tipos, setTipos] = useState(guardado.tipos ?? [])
  // Tipos apagados desde o último "Aplicar no quadro": o aplicar limpa as células deles.
  const [removidos, setRemovidos] = useState(guardado.removidos ?? [])
  const [pendente, setPendente] = useState(Boolean(guardado.pendente))
  // A versão dos tipos que esta gaveta leu: gravar em cima de outra (alguém mexeu ao mesmo tempo) é recusado.
  const [versao, setVersao] = useState(Number(guardado.versao ?? 0))
  const [kgEditado, setKgEditado] = useState(() => Object.fromEntries(Object.entries(guardado.kg_por_metro ?? {}).map(([b, v]) => [b, String(v).replace('.', ',')])))
  const [editando, setEditando] = useState(null) // { indice } ou { indice: -1 } para novo
  const [conferindo, setConferindo] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const kgUsuario = Object.fromEntries(Object.entries(kgEditado).map(([b, v]) => [b, lerNumero(v)]).filter(([, v]) => v > 0))
  const [kgGuardado, setKgGuardado] = useState(() => JSON.stringify(kgUsuario))
  const kgPorMetro = { ...PESO_ACO_NBR, ...kgUsuario }
  const bitolas = [...new Set(tipos.flatMap((t) => t.aco.map((l) => String(Number(l.bitola)))))]
  const atual = new Map(quantitativos.map((q) => [chaveDaCelula(q.rotulo, q.etapa), Number(q.quantidade)]))

  // Salvar tipo, apagar e peso por metro gravam na hora (fechar a gaveta não perde nada); o quadro só muda no aplicar.
  async function guardar(novosTipos, novosRemovidos) {
    setOcupado(true)
    const r = await guardarTiposDePeca(planta.id, { tipos: novosTipos, kg_por_metro: kgUsuario, removidos: novosRemovidos }, versao)
    setOcupado(false)
    if (r.erro) { toast(r.erro, 'bad'); return false }
    setTipos(novosTipos)
    setRemovidos(novosRemovidos)
    setKgGuardado(JSON.stringify(kgUsuario))
    setVersao(r.data.versao)
    setPendente(true)
    aoMudar()
    return true
  }

  async function salvarTipo(tipo) {
    const novos = editando.indice >= 0 ? tipos.map((t, i) => (i === editando.indice ? tipo : t)) : [...tipos, tipo]
    if (await guardar(novos, removidos)) setEditando(null)
  }

  function apagarTipo(i) {
    guardar(tipos.filter((_, j) => j !== i), [...removidos, tipos[i]])
  }

  function guardarPeso() {
    if (pode && JSON.stringify(kgUsuario) !== kgGuardado) guardar(tipos, removidos)
  }

  let resultado = null
  if (conferindo) {
    try { resultado = celulasDosTipos({ tipos, etapas, atual, kgPorMetro, removidos }) } catch (e) { resultado = { erro: e.message } }
  }

  async function aplicar() {
    setOcupado(true)
    const r = await aplicarTiposDePeca(planta.id, { tipos: resultado.tipos, kg_por_metro: kgUsuario }, resultado.linhas, versao)
    setOcupado(false)
    if (r.erro) return toast(r.erro, 'bad')
    setVersao(r.data.versao)
    setPendente(false)
    setRemovidos([])
    toast('Tipos aplicados no quadro de peças.')
    await aoMudar()
    fechar()
  }

  if (editando) {
    return <FormTipo inicial={editando.indice >= 0 ? tipos[editando.indice] : null} outros={tipos.filter((_, i) => i !== editando.indice)}
      kgPorMetro={kgPorMetro} salvar={salvarTipo} cancelar={() => setEditando(null)} ocupado={ocupado} />
  }
  if (resultado && !resultado.erro) {
    return <Conferencia resultado={resultado} tipos={tipos} kgPorMetro={kgPorMetro} voltar={() => setConferindo(false)} aplicar={aplicar} ocupado={ocupado} />
  }

  return (
    <>
      <div className="hint">Cadastre cada tipo de sapata uma vez (a lista de peças, as medidas do detalhe e o aço). O app calcula por peça e preenche o quadro.</div>
      {resultado?.erro && <div className="banner bad">{resultado.erro}</div>}
      {pendente && <div className="banner warn" style={{ marginTop: 10 }}>Tipos guardados, mas o quadro de peças ainda não mudou: toque em <b>Conferir e aplicar</b>.</div>}
      {!tipos.length && <div className="hint" style={{ marginTop: 10 }}>Nenhum tipo ainda.</div>}
      <div className="gv-lista-etapas">
        {tipos.map((t, i) => (
          <div key={t.nome} className="gv-etapa-linha">
            <div style={{ flex: 1, minWidth: 0 }}><b>{t.nome}</b><div className="hint">{t.pecas.length} peça(s) · {t.pecas.slice(0, 6).join(', ')}{t.pecas.length > 6 ? '…' : ''}</div></div>
            {pode && <button className="link-insumo" onClick={() => setEditando({ indice: i })}>Editar</button>}
            {pode && <button className="link-remover" disabled={ocupado} onClick={() => apagarTipo(i)}>Apagar</button>}
          </div>
        ))}
      </div>
      {pode && <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setEditando({ indice: -1 })}>+ Tipo</button>}

      {bitolas.length > 0 && (
        <>
          <div className="label">Peso por metro (kg/m) · o padrão é o da NBR 7480</div>
          <div className="gv-campos">
            {bitolas.map((b) => (
              <label key={b}>{b.replace('.', ',')} mm
                <input className="field" inputMode="decimal" value={kgEditado[b] ?? ''} placeholder={String(PESO_ACO_NBR[b] ?? '').replace('.', ',')}
                  onChange={(e) => setKgEditado({ ...kgEditado, [b]: e.target.value })} onBlur={guardarPeso} disabled={!pode} />
              </label>
            ))}
          </div>
        </>
      )}

      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Fechar</button>
        {pode && <button className="btn btn-primary" disabled={ocupado || (!tipos.length && !removidos.length)} onClick={() => setConferindo(true)}>Conferir e aplicar</button>}
      </div>
    </>
  )
}

export function PainelTipos({ aberto, fechar, planta, etapas, quantitativos, aoMudar }) {
  return (
    <Gaveta aberta={aberto} fechar={fechar} rotulo="Tipos de peça">
      {aberto && (
        <>
          <div className="eyebrow">🧱 Tipos de peça · {planta.nome}</div>
          <h2>Sapatas por tipo</h2>
          <Tipos planta={planta} etapas={etapas} quantitativos={quantitativos} fechar={fechar} aoMudar={aoMudar} />
        </>
      )}
    </Gaveta>
  )
}
