// Gestão à Vista — os popups do editor: a peça (com a vida dela), o resumo do período e a
// configuração das etapas. As contas vêm de src/lib/plantas.js.
import { useEffect, useState } from 'react'
import { editarMarcacao, salvarEtapa, moverEtapa, apagarEtapa, contarMarcacoesDaEtapa, criarEtapasSugeridas, listarItensDoContrato, posso } from '../lib/dados.js'
import { mesmaUnidade } from '../lib/quantitativo.js'
import {
  historicoDaPeca, pedeQuantidade, resumoDoPeriodo, intervaloDoPeriodo, moverPeriodo, PERIODOS, formatarQtd, lerNumero, proximaCorDeEtapa,
  validarEtapa, ETAPAS_SUGERIDAS,
} from '../lib/plantas.js'
import { UNIDADES_ETAPA, SERVICOS_CALCULO, UNIDADE_DO_SERVICO } from '../lib/listas.js'
import { hojeISO, formatarData, formatarDiaMes } from '../lib/datas.js'
import { ErroCampo, Gaveta, useToast } from '../components/index.jsx'

// ---------------------------------------------------------------------------
// A peça: dados da marcação, rótulo editável e a vida dela (🕘)
// ---------------------------------------------------------------------------
function FormPeca({ marcacao, etapa, aoMudar, fechar }) {
  const toast = useToast()
  const [rotulo, setRotulo] = useState(marcacao.rotulo ?? '')
  const [qtd, setQtd] = useState(marcacao.quantidade == null ? '' : String(marcacao.quantidade).replace('.', ','))
  const [lote, setLote] = useState(marcacao.lote ?? '')
  const [nota, setNota] = useState(marcacao.nota ?? '')
  const [ocupado, setOcupado] = useState(false)
  const medida = pedeQuantidade(etapa, marcacao)
  const unidade = etapa?.unidade && etapa.unidade !== 'un' ? etapa.unidade : null
  async function salvar() {
    const quantidade = medida ? lerNumero(qtd) : null
    // Vazio pode: a peça com valor no quadro de peças soma de lá. Quem decide é editarMarcacao (dados.js), que
    // recusa com frase a peça medida sem quadro. Aqui só o texto que não é número.
    if (medida && qtd.trim() && quantidade === null) return toast(unidade ? `Quantidade em ${unidade}: escreva só o número.` : 'Quantidade: escreva só o número.', 'bad')
    setOcupado(true)
    const r = await editarMarcacao(marcacao.id, { rotulo, quantidade, lote, nota })
    setOcupado(false)
    if (r.erro) return toast(r.erro, 'bad')
    aoMudar(r.data)
    toast('Peça atualizada.')
    fechar()
  }
  return (
    <>
      <div className="form-2">
        <div><label className="label" htmlFor="pc-rotulo">Nome da peça</label>
          <input id="pc-rotulo" className="field" maxLength={40} value={rotulo} onChange={(e) => setRotulo(e.target.value)} placeholder="Ex.: P12" /></div>
        {medida && <div><label className="label" htmlFor="pc-qtd">Quantidade{unidade ? ` (${unidade})` : ''}</label>
          <input id="pc-qtd" className="field" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>}
      </div>
      <div className="form-2">
        <div><label className="label" htmlFor="pc-lote">Placa (BT)</label>
          <input id="pc-lote" className="field" value={lote} onChange={(e) => setLote(e.target.value)} autoComplete="off" /></div>
        <div><label className="label" htmlFor="pc-nota">Nota fiscal</label>
          <input id="pc-nota" className="field" value={nota} onChange={(e) => setNota(e.target.value)} autoComplete="off" /></div>
      </div>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar} disabled={ocupado}>Fechar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </>
  )
}

export function PainelPeca({ marcacao, marcacoes, etapasPorNome, aoMudar, fechar }) {
  const vida = marcacao ? historicoDaPeca(marcacoes, marcacao.id) : []
  return (
    <Gaveta aberta={Boolean(marcacao)} fechar={fechar} rotulo="Peça">
      {marcacao && (
        <>
          <div className="eyebrow">Peça</div>
          <h2>{marcacao.rotulo || 'Sem nome'}</h2>
          <div className="hint">{marcacao.etapa} desde {formatarData(marcacao.data)}{marcacao.por ? ` · marcou: ${marcacao.por}` : ''}</div>
          <div className="label">🕘 Vida da peça</div>
          <ol className="gv-vida">
            {vida.map((m) => (
              <li key={m.id}>
                <i style={{ background: etapasPorNome.get(m.etapa)?.cor ?? m.cor }} />
                <div><b>{m.etapa}</b> · {formatarData(m.data)}
                  {m.quantidade != null && ` · ${formatarQtd(m.quantidade, etapasPorNome.get(m.etapa)?.unidade)}`}
                  {(m.lote || m.nota) && ` · ${[m.lote, m.nota && `NF ${m.nota}`].filter(Boolean).join(' ')}`}
                  <div className="hint">{m.por ? `marcou: ${m.por}` : 'quem marcou: sem registro'}</div></div>
              </li>
            ))}
          </ol>
          {posso('pranchas.editar')
            ? <FormPeca key={marcacao.id} marcacao={marcacao} etapa={etapasPorNome.get(marcacao.etapa)} aoMudar={aoMudar} fechar={fechar} />
            : <div className="sheet-actions"><span /><button className="btn btn-ghost" onClick={fechar}>Fechar</button></div>}
        </>
      )}
    </Gaveta>
  )
}

// ---------------------------------------------------------------------------
// 📊 Resumo: semana (começa na segunda), mês ou tudo, navegável com ‹ ›
// ---------------------------------------------------------------------------
export function PainelResumo({ aberto, fechar, etapas, marcacoes, planta, valores }) {
  const [tipo, setTipo] = useState('semana')
  const [ancora, setAncora] = useState(hojeISO())
  const intervalo = intervaloDoPeriodo(tipo, ancora)
  const r = aberto ? resumoDoPeriodo(etapas, marcacoes, intervalo, valores) : null
  const andou = r?.etapas.filter((e) => e.feito > 0) ?? []
  return (
    <Gaveta aberta={aberto} fechar={fechar} rotulo="Resumo">
      {r && (
        <>
          <div className="eyebrow">Resumo · {planta.nome}</div>
          <div className="seg" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 10 }}>
            {PERIODOS.map((p) => <button key={p} className={tipo === p ? 'info' : ''} onClick={() => setTipo(p)}>{p === 'tudo' ? 'Tudo' : p === 'mês' ? 'Mês' : 'Semana'}</button>)}
          </div>
          <div className="semana-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <button className="gv-chip" disabled={tipo === 'tudo'} onClick={() => setAncora(moverPeriodo(tipo, ancora, -1))} aria-label="Período anterior">‹</button>
            <b>{intervalo.titulo}</b>
            <button className="gv-chip" disabled={tipo === 'tudo'} onClick={() => setAncora(moverPeriodo(tipo, ancora, 1))} aria-label="Próximo período">›</button>
          </div>

          <div className="label">Por etapa</div>
          {!andou.length && <div className="hint">Nada marcado neste período.</div>}
          <div className="tabela-rolagem">
            <table className="gv-tabela">
              <thead><tr><th>Etapa</th><th>No período</th><th>Dias</th><th>Média/dia</th><th>Acumulado</th></tr></thead>
              <tbody>
                {r.etapas.filter((e) => e.feito > 0 || e.acumulado > 0).map((e) => (
                  <tr key={e.nome}>
                    <td><i style={{ background: e.cor }} />{e.nome}</td>
                    <td>{formatarQtd(e.feito, e.unidade)}</td>
                    <td>{e.dias}</td>
                    <td>{formatarQtd(e.media, e.unidade)}</td>
                    <td>{formatarQtd(e.acumulado, e.unidade)}{e.pct !== null && ` (${e.pct}%)`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hint">Média = o que saiu ÷ dias em que a etapa andou (não os dias corridos).</div>

          {andou.length > 0 && <div className="label">Peças que andaram</div>}
          {andou.map((e) => (
            <div key={e.nome} className="gv-pecas"><b>{e.nome}:</b> {e.pecas.join(', ') || '—'}{e.semNome ? ` (+${e.semNome} sem nome)` : ''}</div>
          ))}

          <div className="label">Viagens de concreto</div>
          {!r.viagens.length && <div className="hint">Nenhuma marcação com placa ou nota neste período.</div>}
          {r.viagens.map((v) => (
            <div key={`${v.data}|${v.chave}`} className="gv-leg">
              <i style={{ background: v.cor }} />
              <div><b>{formatarDiaMes(v.data)} · {[v.lote, v.nota && `NF ${v.nota}`].filter(Boolean).join(' · ')}</b>
                <div className="hint">{v.pecas} peça(s){v.quantidade !== v.pecas ? ` · ${formatarQtd(v.quantidade)}` : ''}{v.nomes.length ? ` · ${v.nomes.join(', ')}` : ''}</div></div>
            </div>
          ))}
          <div className="sheet-actions"><span /><button className="btn btn-ghost" onClick={fechar}>Fechar</button></div>
        </>
      )}
    </Gaveta>
  )
}

// ---------------------------------------------------------------------------
// ⚙ Etapas: renomear, cor, ordem, arquivar, meta e unidade
// ---------------------------------------------------------------------------
// `itens`: os itens da última medição do contrato (só para o Engenheiro); null = não mostra a ligação.
function FormEtapa({ inicial, existentes, itens, salvar, cancelar, ocupado }) {
  const [campos, setCampos] = useState(inicial)
  const [tentou, setTentou] = useState(false)
  const erros = validarEtapa(campos, existentes)
  const mudar = (k, v) => setCampos({ ...campos, [k]: v })
  return (
    <div className="gv-form-etapa">
      <div className="form-2">
        <div><label className="label" htmlFor="et-nome">Nome</label>
          <input id="et-nome" className="field" maxLength={40} value={campos.nome} onChange={(e) => mudar('nome', e.target.value)} placeholder="Ex.: Escavado" />
          <ErroCampo erro={tentou && erros.nome} /></div>
        <div><label className="label" htmlFor="et-cor">Cor</label>
          <input id="et-cor" type="color" className="field gv-campo-cor" value={campos.cor} onChange={(e) => mudar('cor', e.target.value.toUpperCase())} /></div>
      </div>
      <div className="form-2">
        <div><label className="label" htmlFor="et-un">Unidade</label>
          <select id="et-un" className="field" value={campos.unidade} onChange={(e) => setCampos({ ...campos, unidade: e.target.value, ...(e.target.value === 'un' ? { calcular_como: null } : {}) })}>
            {UNIDADES_ETAPA.map((u) => <option key={u} value={u}>{u === 'un' ? 'un (cada marcação vale 1)' : u}</option>)}
          </select></div>
        <div><label className="label" htmlFor="et-meta">Meta (opcional)</label>
          <input id="et-meta" className="field" inputMode="decimal" value={campos.meta ?? ''} onChange={(e) => mudar('meta', e.target.value)} placeholder={campos.unidade === 'un' ? 'Ex.: 80 peças' : `Ex.: 120 ${campos.unidade}`} />
          <ErroCampo erro={tentou && erros.meta} /></div>
      </div>
      {campos.unidade !== 'un' && (
        <>
          <label className="label" htmlFor="et-calc">Calcular como (sapata por tipo)</label>
          <select id="et-calc" className="field" value={campos.calcular_como ?? ''} onChange={(e) => mudar('calcular_como', e.target.value || null)}>
            <option value="">Não calcular</option>
            {SERVICOS_CALCULO.map((sv) => <option key={sv} value={sv}>{sv} ({UNIDADE_DO_SERVICO[sv]})</option>)}
          </select>
          {campos.calcular_como && UNIDADE_DO_SERVICO[campos.calcular_como] !== campos.unidade && !(campos.calcular_como === 'Armação' && campos.unidade === 't') && (
            <div className="hint t-warn">{campos.calcular_como} é calculado em {UNIDADE_DO_SERVICO[campos.calcular_como]}: mude a unidade da etapa, senão o tipo não grava aqui.</div>
          )}
        </>
      )}
      {itens && campos.unidade !== 'un' && (
        <>
          <label className="label" htmlFor="et-item">Item do contrato (para comparar com a medição)</label>
          {itens.length ? (
            <select id="et-item" className="field" value={campos.item_medicao ?? ''} onChange={(e) => mudar('item_medicao', e.target.value || null)}>
              <option value="">Nenhum</option>
              {itens.map((i) => <option key={i.item} value={i.item}>{i.item} · {i.descricao} ({i.unidade})</option>)}
            </select>
          ) : <div className="hint">Suba a medição do contrato em Medições para ligar esta etapa a um item.</div>}
          {(() => {
            const it = itens.find((i) => i.item === campos.item_medicao)
            return it && !mesmaUnidade(it.unidade, campos.unidade)
              ? <div className="hint t-warn">A etapa está em {campos.unidade} e o item em {it.unidade}: confira, senão a comparação não fecha.</div>
              : null
          })()}
        </>
      )}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={cancelar} disabled={ocupado}>Cancelar</button>
        <button className="btn btn-primary" disabled={ocupado} onClick={() => { setTentou(true); if (!Object.keys(erros).length) salvar(campos) }}>{ocupado ? 'Salvando…' : 'Salvar etapa'}</button>
      </div>
    </div>
  )
}

export function PainelEtapas({ aberto, fechar, etapas, aoMudar }) {
  const toast = useToast()
  const [editando, setEditando] = useState(null) // etapa ou {} para nova
  const [apagando, setApagando] = useState(null) // { etapa, usos }
  const [ocupado, setOcupado] = useState(false)
  const lista = [...etapas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  // Itens do contrato para ligar as etapas: só o Engenheiro (a medição é só dele).
  const [itens, setItens] = useState(null)
  useEffect(() => {
    if (!aberto || !posso('medicoes.ver')) return
    listarItensDoContrato().then((r) => setItens(r.data ?? []))
  }, [aberto])

  async function fazer(promessa, frase) {
    setOcupado(true)
    const r = await promessa
    setOcupado(false)
    if (r.erro) { toast(r.erro, 'bad'); return false }
    if (frase) toast(frase)
    await aoMudar()
    return true
  }

  async function pedirApagar(etapa) {
    const r = await contarMarcacoesDaEtapa(etapa.nome)
    if (r.erro) return toast(r.erro, 'bad')
    setApagando({ etapa, usos: r.data })
  }

  const fecharTudo = () => { setEditando(null); setApagando(null); fechar() }
  const meta = (e) => `${e.meta ? ` · meta ${formatarQtd(e.meta, e.unidade)}` : ''}${e.calcular_como ? ` · calcula ${e.calcular_como}` : ''}${e.item_medicao ? ` · item ${e.item_medicao}` : ''}`

  return (
    <Gaveta aberta={aberto} fechar={() => !ocupado && fecharTudo()} rotulo="Etapas">
      {aberto && (
        <>
          <div className="eyebrow">Etapas desta obra (valem para todas as plantas)</div>
          <h2>Etapas</h2>

          {apagando ? (
            <>
              <div className="banner warn" style={{ marginTop: 16 }}>
                Apagar a etapa “{apagando.etapa.nome}”?{' '}
                {apagando.usos
                  ? `${apagando.usos} ${apagando.usos === 1 ? 'marcação usa' : 'marcações usam'} esse nome: ${apagando.usos === 1 ? 'ela continua' : 'elas continuam'} na planta, como etapa antiga.`
                  : 'Nenhuma marcação usa esse nome.'}{' '}
                Para só tirar da barra, use Arquivar.
              </div>
              <div className="sheet-actions">
                <button className="btn btn-ghost" onClick={() => setApagando(null)} disabled={ocupado}>Cancelar</button>
                <button className="btn btn-danger" disabled={ocupado}
                  onClick={async () => { if (await fazer(apagarEtapa(apagando.etapa.id), 'Etapa apagada.')) setApagando(null) }}>Apagar etapa</button>
              </div>
            </>
          ) : editando ? (
            <FormEtapa key={editando.id ?? 'nova'} existentes={etapas} itens={itens} ocupado={ocupado} cancelar={() => setEditando(null)}
              inicial={editando.id
                ? { ...editando, meta: editando.meta == null ? '' : String(editando.meta).replace('.', ',') }
                : { nome: '', cor: proximaCorDeEtapa(etapas), unidade: 'un', meta: '', ativa: true }}
              salvar={async (campos) => { if (await fazer(salvarEtapa({ ...campos, id: editando.id }), 'Etapa salva.')) setEditando(null) }} />
          ) : (
            <>
              {!lista.length && (
                <div className="banner" style={{ marginTop: 14 }}>
                  Nenhuma etapa ainda. Comece pelas sugeridas ({ETAPAS_SUGERIDAS.map((e) => e.nome).join(', ')}) ou crie a sua.
                  <div><button className="btn btn-ghost" style={{ marginTop: 10 }} disabled={ocupado}
                    onClick={() => fazer(criarEtapasSugeridas(), 'Etapas criadas.')}>Usar as sugeridas</button></div>
                </div>
              )}
              <div className="gv-lista-etapas">
                {lista.map((e, i) => (
                  <div key={e.id} className={`gv-etapa-linha${e.ativa ? '' : ' apagada'}`}>
                    <i style={{ background: e.cor }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{e.nome}</b>{!e.ativa && <small> (arquivada)</small>}
                      <div className="hint">{e.unidade}{meta(e)}</div>
                    </div>
                    <button className="gv-chip" disabled={ocupado || i === 0} onClick={() => fazer(moverEtapa(e.id, 'subir'))} aria-label={`Subir ${e.nome}`}>↑</button>
                    <button className="gv-chip" disabled={ocupado || i === lista.length - 1} onClick={() => fazer(moverEtapa(e.id, 'descer'))} aria-label={`Descer ${e.nome}`}>↓</button>
                    <button className="link-insumo" disabled={ocupado} onClick={() => setEditando(e)}>Editar</button>
                    <button className="link-insumo" disabled={ocupado} onClick={() => fazer(salvarEtapa({ ...e, ativa: !e.ativa }), e.ativa ? (e.calcular_como ? `Etapa arquivada. O "Calcular como" (${e.calcular_como}) foi desligado.` : 'Etapa arquivada.') : 'Etapa de volta.')}>{e.ativa ? 'Arquivar' : 'Reativar'}</button>
                    <button className="link-remover" disabled={ocupado} onClick={() => pedirApagar(e)}>Apagar</button>
                  </div>
                ))}
              </div>
              <div className="sheet-actions">
                <button className="btn btn-ghost" onClick={fecharTudo}>Fechar</button>
                <button className="btn btn-primary" onClick={() => setEditando({})}>+ Nova etapa</button>
              </div>
            </>
          )}
        </>
      )}
    </Gaveta>
  )
}
