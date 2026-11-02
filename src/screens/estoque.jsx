// Estoque da obra (aba Materiais → Estoque): a tabela de insumos, a baixa manual e o
// histórico de um insumo. O saldo vem calculado das movimentações (src/lib/estoque.js);
// quem grava é a tela de Materiais, que junta pedidos e estoque.
import { useState } from 'react'
import { obterHistoricoInsumo } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { filtrarEstoque, validarBaixa, lerMinimo, validarMinimo, podeDesfazer } from '../lib/estoque.js'
import { filtrarQuantidade, formatarQuantidade, quantidadeComUnidade } from '../lib/materiais.js'
import { formatarData } from '../lib/datas.js'
import { Carregando, ErroCampo, ErroCarga, Pill, Vazio } from '../components/index.jsx'

const COR_SITUACAO = { 'Crítico': 'bad', 'Ok': 'ok', 'Sem mínimo': 'idle' }

// ---------- tabela: insumo | saldo | mínimo | situação ----------
export function VistaEstoque({ linhas, abrir }) {
  const [busca, setBusca] = useState('')
  const [soCriticos, setSoCriticos] = useState(false)

  if (!linhas.length) {
    return <Vazio icone="frente" titulo="Nenhum insumo no estoque desta obra"
      texto="O estoque começa sozinho: quando um pedido chega no almoxarifado, o material entra aqui." />
  }
  const visiveis = filtrarEstoque(linhas, { busca, soCriticos })
  return (
    <>
      <div className="estoque-filtros">
        <input className="field" type="search" placeholder="Buscar insumo" aria-label="Buscar insumo"
          value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className={`tab${soCriticos ? ' on' : ''}`} aria-pressed={soCriticos} onClick={() => setSoCriticos(!soCriticos)}>Só críticos</button>
      </div>
      {visiveis.length
        ? (
          <div className="block">
            <table className="tabela-estoque">
              <thead><tr><th>Insumo</th><th>Saldo</th><th>Mínimo</th><th>Situação</th></tr></thead>
              <tbody>
                {visiveis.map((l) => (
                  <tr key={l.id}>
                    <td><button className="link-insumo" onClick={() => abrir(l.id)}>{l.nome}</button></td>
                    <td>{quantidadeComUnidade(l.saldo, l.unidade)}</td>
                    <td>{l.saldo_minimo > 0 ? formatarQuantidade(l.saldo_minimo) : '—'}</td>
                    <td><Pill cor={COR_SITUACAO[l.situacao]}>{l.situacao}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        : <div className="note">Nenhum insumo com esse filtro.</div>}
    </>
  )
}

// ---------- baixa manual: insumo, quantidade, frente e data ----------
export function FormBaixa({ linhas, frentes, hoje, fechar, salvar }) {
  const [f, setF] = useState({ insumo_id: '', quantidade: '', frente: '', data: hoje })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const linha = linhas.find((l) => l.id === f.insumo_id)
  const erros = validarBaixa(f, linha, hoje)
  const mostrar = (campo) => (tentou || tocados[campo]) && erros[campo]
  const tocar = (campo) => setTocados((t) => ({ ...t, [campo]: true }))

  function enviar() {
    setTentou(true)
    if (Object.keys(erros).length) return
    salvar(f)
  }

  return (
    <>
      <div className="eyebrow">Baixa de estoque</div>
      <h2>Material que saiu do almoxarifado</h2>
      <label className="label" htmlFor="bx-insumo">Insumo</label>
      <select id="bx-insumo" className="field" value={f.insumo_id}
        onChange={(e) => { setF({ ...f, insumo_id: e.target.value }); tocar('insumo_id') }} onBlur={() => tocar('insumo_id')}>
        <option value="">Escolha…</option>
        {linhas.map((l) => (
          <option key={l.id} value={l.id} disabled={l.saldo <= 0}>
            {l.nome} — {l.saldo > 0 ? `${quantidadeComUnidade(l.saldo, l.unidade)} no estoque` : 'sem saldo'}
          </option>
        ))}
      </select>
      <ErroCampo erro={mostrar('insumo_id')} />
      <label className="label" htmlFor="bx-qtd">Quantidade{linha ? ` (${linha.unidade})` : ''}</label>
      <input id="bx-qtd" className="field" inputMode="decimal" autoComplete="off" placeholder="Ex.: 10"
        value={f.quantidade} onChange={(e) => { setF({ ...f, quantidade: filtrarQuantidade(e.target.value) }); tocar('quantidade') }} onBlur={() => tocar('quantidade')} />
      <ErroCampo erro={mostrar('quantidade')} />
      <label className="label" htmlFor="bx-frente">Frente</label>
      <input id="bx-frente" className="field" list="bx-frentes" placeholder="Ex.: Reboco fachada norte"
        value={f.frente} onChange={(e) => setF({ ...f, frente: e.target.value })} onBlur={() => tocar('frente')} />
      <datalist id="bx-frentes">{frentes.map((x) => <option key={x} value={x} />)}</datalist>
      <ErroCampo erro={mostrar('frente')} />
      <label className="label" htmlFor="bx-data">Data</label>
      <input id="bx-data" type="date" className="field" max={hoje} value={f.data}
        onChange={(e) => { setF({ ...f, data: e.target.value }); tocar('data') }} />
      <ErroCampo erro={mostrar('data')} />
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={enviar}>Dar baixa</button>
      </div>
    </>
  )
}

// ---------- histórico de um insumo, e o saldo mínimo dele ----------
export function HistoricoInsumo({ linha, fechar, salvarMinimo, desfazerBaixa }) {
  const hist = useDados(() => obterHistoricoInsumo(linha.id), [linha.id])
  const [confirmar, setConfirmar] = useState(null) // id da baixa que pede confirmação para desfazer

  async function desfazer(m) {
    setConfirmar(null)
    await desfazerBaixa(m)
    hist.recarregar()
  }
  const [minimo, setMinimo] = useState(linha.saldo_minimo > 0 ? formatarQuantidade(linha.saldo_minimo) : '')
  const erroMinimo = validarMinimo(minimo)
  const mudouMinimo = !erroMinimo && lerMinimo(minimo) !== linha.saldo_minimo

  return (
    <>
      <div className="eyebrow">Estoque</div>
      <h2>{linha.nome}</h2>
      <div className="row-wrap" style={{ marginTop: 8 }}>
        <span className="sub" style={{ marginTop: 0 }}>Saldo: <b>{quantidadeComUnidade(linha.saldo, linha.unidade)}</b></span>
        <Pill cor={COR_SITUACAO[linha.situacao]}>{linha.situacao}</Pill>
      </div>
      <label className="label" htmlFor="hi-minimo">Saldo mínimo ({linha.unidade})</label>
      <div className="minimo-linha">
        <input id="hi-minimo" className="field" inputMode="decimal" autoComplete="off" placeholder="0 = sem mínimo"
          value={minimo} onChange={(e) => setMinimo(filtrarQuantidade(e.target.value))} />
        <button className="btn btn-ghost" disabled={!mudouMinimo} onClick={() => salvarMinimo(linha.id, minimo)}>Salvar</button>
      </div>
      <ErroCampo erro={erroMinimo} />
      <div className="hint">Quando o saldo chega no mínimo, o insumo fica "Crítico".</div>
      <div className="label">Movimentações</div>
      {hist.carregando ? <Carregando />
        : hist.erro ? <ErroCarga erro={hist.erro} tentar={hist.recarregar} />
          : !hist.data.length ? <div className="t-muted">Nenhuma movimentação.</div>
            : hist.data.map((m) => (
              <div key={m.id}>
                <div className="linha-dia">
                  <span>
                    {formatarData(m.data)} · {m.tipo}{m.origem === 'Pedido' ? ' do pedido' : ' manual'}
                    {m.frente && <span className="t-muted"> · {m.frente}</span>}
                    {podeDesfazer(m) && confirmar !== m.id && (
                      <button className="link-insumo" style={{ marginLeft: 8 }} onClick={() => setConfirmar(m.id)}>Desfazer</button>
                    )}
                  </span>
                  <b className={m.tipo === 'Entrada' ? 't-ok' : 't-bad'} style={{ whiteSpace: 'nowrap' }}>
                    {m.tipo === 'Entrada' ? '+' : '−'}{quantidadeComUnidade(m.quantidade, linha.unidade)}
                  </b>
                </div>
                {confirmar === m.id && (
                  <div className="banner warn" style={{ marginTop: 4 }}>
                    Desfazer esta baixa? O material volta para o saldo.
                    <div className="sheet-actions" style={{ marginTop: 10 }}>
                      <button className="btn btn-ghost" onClick={() => setConfirmar(null)}>Não</button>
                      <button className="btn btn-danger" onClick={() => desfazer(m)}>Sim, desfazer</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
      <div className="sheet-actions" style={{ gridTemplateColumns: '1fr' }}>
        <button className="btn btn-ghost" onClick={fechar}>Fechar</button>
      </div>
    </>
  )
}
