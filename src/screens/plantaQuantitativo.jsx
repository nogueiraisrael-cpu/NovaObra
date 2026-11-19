// Gestão à Vista — o painel 📋 Quantitativo: o quadro de peças da planta (quanto cada peça vale em
// cada etapa medida). As peças vêm dos nomes do PDF, das marcações e do próprio quadro; dá para
// acrescentar à mão (planta em imagem) e aplicar os mesmos valores em várias peças de uma vez.
// As contas e o que mudou ficam em src/lib/quantitativo.js; aqui é só a tabela.
import { useState } from 'react'
import { salvarQuantitativos, tirarPecaDoQuadro, posso } from '../lib/dados.js'
import { chaveDaCelula, linhasDoRascunho, linhasParaAplicar, previstoDaEtapa, quadroDe } from '../lib/quantitativo.js'
import { formatarQtd, limparRotulo, ordemNatural } from '../lib/plantas.js'
import { Gaveta, useToast } from '../components/index.jsx'

const paraTexto = (n) => (n == null ? '' : String(n).replace('.', ','))

function Tabela({ planta, etapas, pecas, quantitativos, fechar, aoMudar }) {
  const toast = useToast()
  const pode = posso('pranchas.editar')
  const original = new Map(quantitativos.map((q) => [chaveDaCelula(q.rotulo, q.etapa), Number(q.quantidade)]))
  const [rascunho, setRascunho] = useState(() => new Map([...original].map(([k, v]) => [k, paraTexto(v)])))
  const [extras, setExtras] = useState([])
  const [novaPeca, setNovaPeca] = useState('')
  const [marcadas, setMarcadas] = useState(() => new Set())
  const [aplicar, setAplicar] = useState({})
  const [ocupado, setOcupado] = useState(false)

  const linhas = [...new Set([...pecas, ...extras])].sort(ordemNatural)
  const celula = (rotulo, etapa) => rascunho.get(chaveDaCelula(rotulo, etapa)) ?? ''
  const mudar = (rotulo, etapa, texto) => setRascunho((r) => new Map(r).set(chaveDaCelula(rotulo, etapa), texto))
  const marcar = (rotulo) => setMarcadas((m) => { const n = new Set(m); if (n.has(rotulo)) n.delete(rotulo); else n.add(rotulo); return n })
  // O previsto do rodapé conta o que está gravado (o rascunho ainda não vale até Salvar).
  const quadro = quadroDe(quantitativos)

  function incluirPeca() {
    const nome = limparRotulo(novaPeca)
    if (!nome) return
    if (!linhas.includes(nome)) setExtras((e) => [...e, nome])
    setNovaPeca('')
  }

  function aplicarNasMarcadas() {
    const valores = Object.fromEntries(etapas.map((e) => [e.nome, aplicar[e.nome] ?? '']).filter(([, v]) => String(v).trim()))
    if (!marcadas.size || !Object.keys(valores).length) return toast('Marque as peças e preencha pelo menos um valor para aplicar.', 'bad')
    setRascunho((r) => {
      const n = new Map(r)
      for (const l of linhasParaAplicar([...marcadas], valores)) n.set(chaveDaCelula(l.rotulo, l.etapa), l.quantidade)
      return n
    })
    toast(`Valores aplicados em ${marcadas.size} peça(s). Toque em Salvar para gravar.`)
  }

  async function tirar(rotulo) {
    setOcupado(true)
    const r = await tirarPecaDoQuadro(planta.id, rotulo)
    setOcupado(false)
    if (r.erro) return toast(r.erro, 'bad')
    setExtras((e) => e.filter((x) => x !== rotulo))
    setRascunho((m) => new Map([...m].filter(([k]) => !k.startsWith(`${rotulo}|`))))
    await aoMudar()
  }

  async function salvar() {
    const { linhas: mudou, erro } = linhasDoRascunho(rascunho, original)
    if (erro) return toast(erro, 'bad')
    if (!mudou.length) return fechar()
    setOcupado(true)
    const r = await salvarQuantitativos(planta.id, mudou)
    setOcupado(false)
    if (r.erro) return toast(r.erro, 'bad')
    toast('Quadro de peças salvo.')
    await aoMudar()
    fechar()
  }

  if (!etapas.length) {
    return (
      <div className="banner warn" style={{ marginTop: 14 }}>
        Nenhuma etapa medida (m³, m², m, kg, t) nesta obra. Em <b>⚙ Etapas</b>, escolha a unidade de cada etapa que tem quantidade.
      </div>
    )
  }

  return (
    <>
      <div className="hint">Quanto cada peça vale em cada etapa. Na planta, marcou a peça, ela soma esse valor sozinha. Célula vazia = sem quantitativo.</div>
      <div className="tabela-rolagem" style={{ marginTop: 12 }}>
        <table className="gv-tabela gv-quadro">
          <thead>
            <tr>
              {pode && <th aria-label="Marcar" />}
              <th>Peça</th>
              {etapas.map((e) => <th key={e.nome}>{e.nome} ({e.unidade})</th>)}
              {pode && <th aria-label="Tirar" />}
            </tr>
          </thead>
          <tbody>
            {!linhas.length && <tr><td colSpan={etapas.length + 3} className="hint">Nenhuma peça ainda. O PDF não trouxe nomes: acrescente as peças abaixo.</td></tr>}
            {linhas.map((p) => (
              <tr key={p}>
                {pode && <td><input type="checkbox" checked={marcadas.has(p)} onChange={() => marcar(p)} aria-label={`Marcar ${p}`} /></td>}
                <td><b>{p}</b></td>
                {etapas.map((e) => (
                  <td key={e.nome}>
                    <input className="field gv-celula" inputMode="decimal" value={celula(p, e.nome)} disabled={!pode}
                      onChange={(ev) => mudar(p, e.nome, ev.target.value)} aria-label={`${p} ${e.nome}`} />
                  </td>
                ))}
                {pode && <td><button className="link-remover" disabled={ocupado} onClick={() => tirar(p)}>Tirar</button></td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {pode && <td />}
              <td><b>Previsto</b></td>
              {etapas.map((e) => {
                const prev = previstoDaEtapa(e, quadro, linhas, planta.id)
                return <td key={e.nome}><b>{formatarQtd(prev.previsto, e.unidade)}</b><div className="hint">{prev.pecas} peça(s)</div></td>
              })}
              {pode && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {pode && (
        <>
          <div className="label">Aplicar nas marcadas ({marcadas.size})</div>
          <div className="gv-campos">
            {etapas.map((e) => (
              <label key={e.nome}>{e.nome} ({e.unidade})
                <input className="field" inputMode="decimal" value={aplicar[e.nome] ?? ''} onChange={(ev) => setAplicar({ ...aplicar, [e.nome]: ev.target.value })} placeholder="Ex.: 0,72" />
              </label>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={aplicarNasMarcadas}>Aplicar nas marcadas</button>

          <div className="label">Acrescentar peça</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" value={novaPeca} onChange={(e) => setNovaPeca(e.target.value)} placeholder="Ex.: S21" maxLength={40}
              onKeyDown={(e) => { if (e.key === 'Enter') incluirPeca() }} />
            <button className="btn btn-ghost" onClick={incluirPeca}>+ Peça</button>
          </div>
        </>
      )}

      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar} disabled={ocupado}>{pode ? 'Cancelar' : 'Fechar'}</button>
        {pode && <button className="btn btn-primary" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button>}
      </div>
    </>
  )
}

export function PainelQuantitativo({ aberto, fechar, planta, etapas, pecas, quantitativos, aoMudar }) {
  return (
    <Gaveta aberta={aberto} fechar={fechar} rotulo="Quadro de peças">
      {aberto && (
        <>
          <div className="eyebrow">📋 Quantitativo · {planta.nome}</div>
          <h2>Quadro de peças</h2>
          <Tabela planta={planta} etapas={etapas} pecas={pecas} quantitativos={quantitativos} fechar={fechar} aoMudar={aoMudar} />
        </>
      )}
    </Gaveta>
  )
}
